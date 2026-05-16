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
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(5) };
    private const string ExpoUrl = "https://exp.host/--/api/v2/push/send";

    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(AppDbContext db, IHubContext<NotificationHub> hub, ILogger<NotificationService> logger)
    {
        _db = db;
        _hub = hub;
        _logger = logger;
    }

    public Task NotifyCommentAsync(Guid recipientId, Guid actorId, int postId, int commentId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Comment, recipientId, actorId, postId, commentId, ct);

    public Task NotifyReplyAsync(Guid recipientId, Guid actorId, int postId, int commentId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Reply, recipientId, actorId, postId, commentId, ct);

    public Task NotifyLikeAsync(Guid recipientId, Guid actorId, int postId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Like, recipientId, actorId, postId, null, ct);

    public Task NotifyMentionAsync(Guid recipientId, Guid actorId, int postId, int? commentId, CancellationToken ct = default)
        => CreateAndPushAsync(NotificationTypes.Mention, recipientId, actorId, postId, commentId, ct);

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
                IsVerified = actor?.IsVerified ?? false
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
            using var response = await _http.PostAsync(ExpoUrl, content, CancellationToken.None);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Expo push returned {Status} for user {UserId}", response.StatusCode, recipientId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Expo push failed for user {UserId}", recipientId);
        }
    }
}
