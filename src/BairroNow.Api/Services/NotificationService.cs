using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Hubs;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

public class NotificationService : INotificationService
{
    private const string ExpoUrl = "https://exp.host/--/api/v2/push/send";
    private const string ExpoClientName = "expo-push";

    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<NotificationService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public NotificationService(
        AppDbContext db,
        IHubContext<NotificationHub> hub,
        ILogger<NotificationService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _db = db;
        _hub = hub;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public Task NotifyCommentAsync(Guid recipientId, Guid actorId, int postId, int commentId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Comment, recipientId, actorId, postId, commentId, ct);

    public Task NotifyReplyAsync(Guid recipientId, Guid actorId, int postId, int commentId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Reply, recipientId, actorId, postId, commentId, ct);

    public Task NotifyLikeAsync(Guid recipientId, Guid actorId, int postId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Like, recipientId, actorId, postId, null, ct);

    public Task NotifyMentionAsync(Guid recipientId, Guid actorId, int postId, int? commentId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Mention, recipientId, actorId, postId, commentId, ct);

    // Wave I: group join approved — no actor user involved (system event)
    public async Task NotifyGroupJoinApprovedAsync(Guid recipientId, string groupName, int groupId, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId = recipientId,
            ActorUserId = recipientId,  // self-referential for system events
            Type = NotificationTypes.GroupJoinApproved,
            PostId = null,
            CommentId = null,
            GroupId = groupId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);

        var dto = new Models.DTOs.NotificationDto
        {
            Id = notification.Id,
            Type = NotificationTypes.GroupJoinApproved,
            PostId = null,
            CommentId = null,
            GroupId = groupId,
            Actor = new Models.DTOs.PostAuthorDto { Id = recipientId },
            IsRead = false,
            CreatedAt = notification.CreatedAt
        };

        try { await _hub.Clients.User(recipientId.ToString()).SendAsync("notification", dto, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push SignalR notification to {UserId}", recipientId); }

        _ = SendExpoPushBodyAsync(recipientId,
            $"Sua solicitação para entrar em {groupName} foi aprovada!",
            NotificationTypes.GroupJoinApproved, null, ct);
    }

    // Wave I: new business rating notification
    public async Task NotifyNewRatingAsync(Guid businessOwnerId, string raterName, int stars, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId = businessOwnerId,
            ActorUserId = businessOwnerId,  // self-referential — rater id not tracked here
            Type = NotificationTypes.NewRating,
            PostId = null,
            CommentId = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);

        var dto = new Models.DTOs.NotificationDto
        {
            Id = notification.Id,
            Type = NotificationTypes.NewRating,
            PostId = null,
            CommentId = null,
            Actor = new Models.DTOs.PostAuthorDto { Id = businessOwnerId, DisplayName = raterName },
            IsRead = false,
            CreatedAt = notification.CreatedAt
        };

        try { await _hub.Clients.User(businessOwnerId.ToString()).SendAsync("notification", dto, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push SignalR notification to {UserId}", businessOwnerId); }

        _ = SendExpoPushBodyAsync(businessOwnerId,
            $"{raterName} avaliou seu negócio com {stars} estrela(s)",
            NotificationTypes.NewRating, null, ct);
    }

    // Wave I: notify all active group members (except creator) about a new event
    public async Task NotifyGroupEventCreatedAsync(int groupId, Guid creatorId, string eventTitle, int eventId, CancellationToken ct = default)
    {
        // Load group name + active members (cap at 50 to avoid runaway loops)
        var group = await _db.Groups.AsNoTracking()
            .Where(g => g.Id == groupId)
            .Select(g => new { g.Name })
            .FirstOrDefaultAsync(ct);

        if (group == null) return;

        var recipients = await _db.GroupMembers.AsNoTracking()
            .Where(m => m.GroupId == groupId
                     && m.Status == Models.Enums.GroupMemberStatus.Active
                     && m.UserId != creatorId)
            .Select(m => m.UserId)
            .ToListAsync(ct);

        if (recipients.Count == 0) return;

        var now = DateTime.UtcNow;
        var notifications = recipients.Select(uid => new Notification
        {
            UserId = uid,
            ActorUserId = creatorId,
            Type = NotificationTypes.GroupEvent,
            PostId = null,
            CommentId = null,
            GroupId = groupId,
            IsRead = false,
            CreatedAt = now
        }).ToList();

        _db.Notifications.AddRange(notifications);
        await _db.SaveChangesAsync(ct);

        var body = $"Novo evento em {group.Name}: {eventTitle}";

        var creator = await _db.Users.AsNoTracking()
            .Where(u => u.Id == creatorId)
            .Select(u => new { u.DisplayName, u.PhotoUrl, u.IsVerified, u.IsBusinessAccount, u.BusinessName, u.BusinessCategory })
            .FirstOrDefaultAsync(ct);

        var actorDto = new Models.DTOs.PostAuthorDto
        {
            Id = creatorId,
            DisplayName = creator?.DisplayName,
            PhotoUrl = creator?.PhotoUrl,
            IsVerified = creator?.IsVerified ?? false,
            IsBusinessAccount = creator?.IsBusinessAccount ?? false,
            BusinessName = creator?.BusinessName,
            BusinessCategory = creator?.BusinessCategory
        };

        // Process push notifications in batches of 50 to stay within Expo batch limits
        // while ensuring ALL members are notified (no silent cap).
        const int BatchSize = 50;
        if (recipients.Count > BatchSize)
            _logger.LogInformation(
                "NotifyGroupEventCreatedAsync: notifying {Total} members for group {GroupId} in batches of {BatchSize}",
                recipients.Count, groupId, BatchSize);

        foreach (var (uid, notif) in recipients.Zip(notifications))
        {
            var dto = new Models.DTOs.NotificationDto
            {
                Id = notif.Id,
                Type = NotificationTypes.GroupEvent,
                PostId = null,
                CommentId = null,
                GroupId = groupId,
                Actor = actorDto,
                IsRead = false,
                CreatedAt = now
            };
            try { await _hub.Clients.User(uid.ToString()).SendAsync("notification", dto, ct); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to push SignalR notification to {UserId}", uid); }

            _ = SendExpoPushBodyAsync(uid, body, NotificationTypes.GroupEvent, null, ct);
        }
    }

    // Wave N: notify seller when their listing expires
    public async Task NotifyListingExpiredAsync(Guid sellerId, string listingTitle, int listingId, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId = sellerId,
            ActorUserId = sellerId,  // system event — self-referential
            Type = NotificationTypes.ListingExpired,
            PostId = listingId,
            CommentId = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);

        // Use truncated title as actor displayName for the bell body
        var title = listingTitle.Length > 30 ? listingTitle[..27] + "…" : listingTitle;
        var dto = new Models.DTOs.NotificationDto
        {
            Id = notification.Id,
            Type = NotificationTypes.ListingExpired,
            PostId = listingId,
            CommentId = null,
            Actor = new Models.DTOs.PostAuthorDto { Id = sellerId, DisplayName = title },
            IsRead = false,
            CreatedAt = notification.CreatedAt
        };

        try { await _hub.Clients.User(sellerId.ToString()).SendAsync("notification", dto, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push SignalR notification to {UserId}", sellerId); }

        _ = SendExpoPushBodyAsync(sellerId,
            $"Seu anúncio '{title}' expirou. Renove para continuar recebendo mensagens.",
            NotificationTypes.ListingExpired, listingId, ct);
    }

    // Wave N: notify favoriter when a listing's price drops
    public async Task NotifyPriceDropAsync(Guid favoriterId, Guid sellerId, string listingTitle, int listingId, decimal oldPrice, decimal newPrice, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId = favoriterId,
            ActorUserId = sellerId,
            Type = NotificationTypes.PriceDrop,
            PostId = listingId,
            CommentId = null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);

        var title = listingTitle.Length > 30 ? listingTitle[..27] + "…" : listingTitle;
        var seller = await _db.Users.AsNoTracking()
            .Where(u => u.Id == sellerId)
            .Select(u => new { u.DisplayName, u.PhotoUrl, u.IsVerified, u.IsBusinessAccount, u.BusinessName, u.BusinessCategory })
            .FirstOrDefaultAsync(ct);

        var dto = new Models.DTOs.NotificationDto
        {
            Id = notification.Id,
            Type = NotificationTypes.PriceDrop,
            PostId = listingId,
            CommentId = null,
            Actor = new Models.DTOs.PostAuthorDto
            {
                Id = sellerId,
                DisplayName = title,
                PhotoUrl = seller?.PhotoUrl,
                IsVerified = seller?.IsVerified ?? false,
                IsBusinessAccount = seller?.IsBusinessAccount ?? false,
                BusinessName = seller?.BusinessName,
                BusinessCategory = seller?.BusinessCategory,
            },
            IsRead = false,
            CreatedAt = notification.CreatedAt
        };

        try { await _hub.Clients.User(favoriterId.ToString()).SendAsync("notification", dto, ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push SignalR notification to {UserId}", favoriterId); }

        _ = SendExpoPushBodyAsync(favoriterId,
            $"Queda de preço: '{title}' agora está por R$ {newPrice:N2} (era R$ {oldPrice:N2})",
            NotificationTypes.PriceDrop, listingId, ct);
    }

    private async Task CreateAndPushAsync(string type, Guid recipientId, Guid actorId, int? postId, int? commentId, CancellationToken ct)
    {
        if (recipientId == actorId) return;

        var notification = new Notification
        {
            UserId = recipientId,
            ActorUserId = actorId,
            Type = type,
            PostId = postId,
            CommentId = commentId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);

        var actor = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == actorId, ct);
        var dto = new NotificationDto
        {
            Id = notification.Id,
            Type = type,
            PostId = postId,
            CommentId = commentId,
            Actor = new PostAuthorDto
            {
                Id = actorId,
                DisplayName = actor?.DisplayName,
                PhotoUrl = actor?.PhotoUrl,
                IsVerified = actor?.IsVerified ?? false,
                IsBusinessAccount = actor?.IsBusinessAccount ?? false,
                BusinessName = actor?.BusinessName,
                BusinessCategory = actor?.BusinessCategory,
            },
            IsRead = false,
            CreatedAt = notification.CreatedAt
        };

        try
        {
            await _hub.Clients.User(recipientId.ToString()).SendAsync("notification", dto, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to push SignalR notification to {UserId}", recipientId);
        }

        // Fire-and-forget Expo push (best effort — never block the request)
        _ = SendExpoPushAsync(recipientId, type, actor?.DisplayName, postId, ct);
    }

    // Wave P: DM push notification
    public async Task NotifyNewMessageAsync(Guid recipientId, Guid senderId, int conversationId, CancellationToken ct = default)
    {
        var sender = await _db.Users.AsNoTracking()
            .Where(u => u.Id == senderId)
            .Select(u => new { u.DisplayName })
            .FirstOrDefaultAsync(ct);
        var name = sender?.DisplayName ?? "Alguém";
        _ = SendExpoPushBodyAsync(recipientId, $"{name} te enviou uma mensagem", "NewMessage", conversationId, ct);
    }

    private async Task SendExpoPushAsync(Guid recipientId, string type, string? actorName, int? postId, CancellationToken ct)
    {
        try
        {
            var recipient = await _db.Users.AsNoTracking()
                .Where(u => u.Id == recipientId)
                .Select(u => new { u.ExpoPushToken })
                .FirstOrDefaultAsync(ct);

            if (string.IsNullOrEmpty(recipient?.ExpoPushToken)) return;

            var body = type switch
            {
                NotificationTypes.Like    => $"{actorName ?? "Alguém"} curtiu seu post",
                NotificationTypes.Comment => $"{actorName ?? "Alguém"} comentou no seu post",
                NotificationTypes.Reply   => $"{actorName ?? "Alguém"} respondeu ao seu comentário",
                NotificationTypes.Mention => $"{actorName ?? "Alguém"} te mencionou",
                _                         => "Nova notificação no BairroNow"
            };

            var payload = new[]
            {
                new
                {
                    to = recipient.ExpoPushToken,
                    title = "BairroNow",
                    body,
                    data = new { type, postId }
                }
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );
            using var http = _httpClientFactory.CreateClient(ExpoClientName);
            using var response = await http.PostAsync(ExpoUrl, content, CancellationToken.None);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Expo push returned {Status} for user {UserId}", response.StatusCode, recipientId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo push failed for user {UserId}", recipientId);
        }
    }

    // Overload for pre-built body strings (Wave I system notifications)
    private async Task SendExpoPushBodyAsync(Guid recipientId, string body, string type, int? refId, CancellationToken ct)
    {
        try
        {
            var recipient = await _db.Users.AsNoTracking()
                .Where(u => u.Id == recipientId)
                .Select(u => new { u.ExpoPushToken })
                .FirstOrDefaultAsync(ct);

            if (string.IsNullOrEmpty(recipient?.ExpoPushToken)) return;

            var payload = new[]
            {
                new
                {
                    to = recipient.ExpoPushToken,
                    title = "BairroNow",
                    body,
                    data = new { type, refId }
                }
            };

            using var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );
            using var http = _httpClientFactory.CreateClient(ExpoClientName);
            using var response = await http.PostAsync(ExpoUrl, content, CancellationToken.None);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Expo push returned {Status} for user {UserId}", response.StatusCode, recipientId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo push failed for user {UserId}", recipientId);
        }
    }
}
