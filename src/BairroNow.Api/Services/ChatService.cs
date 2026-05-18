using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Hubs;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

public class ChatService : IChatService
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _files;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        AppDbContext db,
        IFileStorageService files,
        IHubContext<NotificationHub> hub,
        ILogger<ChatService> logger)
    {
        _db = db;
        _files = files;
        _hub = hub;
        _logger = logger;
    }

    public async Task<ConversationDto> CreateOrGetAsync(Guid buyerId, CreateConversationRequest dto, CancellationToken ct = default)
    {
        var listing = await _db.Listings.AsNoTracking()
            .Include(l => l.Photos)
            .Include(l => l.Seller)
            .FirstOrDefaultAsync(l => l.Id == dto.ListingId, ct)
            ?? throw new ChatNotFoundException("Anúncio não encontrado.");

        if (listing.SellerId == buyerId)
            throw new ChatForbiddenException("Não é possível iniciar conversa consigo mesmo.");

        var buyer = await _db.Users.AsNoTracking()
            .Select(u => new { u.Id, u.BairroId, u.IsBanned })
            .FirstOrDefaultAsync(u => u.Id == buyerId, ct)
            ?? throw new ChatForbiddenException("Usuário não encontrado.");

        if (buyer.IsBanned)
            throw new ChatForbiddenException("Sua conta está suspensa.");
        if (buyer.BairroId != listing.BairroId)
            throw new ChatForbiddenException("Anúncio fora do seu bairro.");

        var existing = await _db.Conversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ListingId == dto.ListingId && c.BuyerId == buyerId && c.SellerId == listing.SellerId, ct);
        if (existing != null)
            return await BuildConvDtoAsync(existing.Id, buyerId, ct) ?? throw new ChatNotFoundException();

        try
        {
            var conv = new Conversation
            {
                ListingId = listing.Id,
                BuyerId = buyerId,
                SellerId = listing.SellerId,
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
            };
            _db.Conversations.Add(conv);
            await _db.SaveChangesAsync(ct);

            _db.ConversationParticipants.AddRange(
                new ConversationParticipant { ConversationId = conv.Id, UserId = buyerId },
                new ConversationParticipant { ConversationId = conv.Id, UserId = listing.SellerId }
            );
            await _db.SaveChangesAsync(ct);

            return await BuildConvDtoAsync(conv.Id, buyerId, ct, knownUnread: 0) ?? throw new ChatNotFoundException();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            _logger.LogDebug("CreateOrGetAsync race condition for listing {ListingId} buyer {BuyerId}", dto.ListingId, buyerId);
            _db.ChangeTracker.Clear();
            var winner = await _db.Conversations.AsNoTracking()
                .FirstOrDefaultAsync(c => c.ListingId == dto.ListingId && c.BuyerId == buyerId && c.SellerId == listing.SellerId, ct)
                ?? throw new ChatNotFoundException();
            return await BuildConvDtoAsync(winner.Id, buyerId, ct) ?? throw new ChatNotFoundException();
        }
    }

    public async Task<List<ConversationDto>> ListAsync(Guid userId, CancellationToken ct = default)
    {
        var convIds = await _db.ConversationParticipants
            .AsNoTracking()
            .Where(p => p.UserId == userId && !p.SoftDeleted)
            .Select(p => p.ConversationId)
            .ToListAsync(ct);

        if (convIds.Count == 0) return [];

        var conversations = await _db.Conversations.AsNoTracking()
            .Include(c => c.Listing)!.ThenInclude(l => l!.Photos)
            .Include(c => c.Buyer)
            .Include(c => c.Seller)
            .Where(c => convIds.Contains(c.Id))
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync(ct);

        // Single query for all unread counts — replaces N*2 individual queries
        var unreadByConv = await _db.ConversationParticipants
            .AsNoTracking()
            .Where(p => p.UserId == userId && convIds.Contains(p.ConversationId))
            .SelectMany(
                p => _db.Messages.Where(m =>
                    m.ConversationId == p.ConversationId
                    && m.SenderId != userId
                    && m.DeletedAt == null
                    && (p.LastReadAt == null || m.SentAt > p.LastReadAt)),
                (p, m) => new { p.ConversationId, m.Id })
            .GroupBy(x => x.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ConversationId, x => x.Count, ct);

        return conversations
            .Select(c => MapConv(c, userId, unreadByConv.GetValueOrDefault(c.Id, 0)))
            .ToList();
    }

    public async Task<List<MessageDto>> GetHistoryAsync(Guid userId, int conversationId, DateTime? before, int limit, CancellationToken ct = default)
    {
        await EnsureParticipantAsync(userId, conversationId, ct);
        limit = Math.Clamp(limit, 1, 100);

        // Force UTC to avoid silent comparison errors against SentAt (always UTC)
        var beforeUtc = before.HasValue
            ? DateTime.SpecifyKind(before.Value, DateTimeKind.Utc)
            : (DateTime?)null;

        var q = _db.Messages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId && m.DeletedAt == null);
        if (beforeUtc.HasValue) q = q.Where(m => m.SentAt < beforeUtc.Value);

        var rows = await q.OrderByDescending(m => m.SentAt).Take(limit).ToListAsync(ct);
        return rows.Select(MapMsg).ToList();
    }

    public async Task<MessageDto> SendAsync(Guid senderId, int conversationId, string? text, IFormFile? image, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text) && image == null)
            throw new ChatValidationException("Mensagem vazia.");
        if (!string.IsNullOrWhiteSpace(text) && text.Length > 2000)
            throw new ChatValidationException("Mensagem muito longa.");

        // Verify sender is not banned before any DB work
        var senderBanned = await _db.Users.AsNoTracking()
            .Where(u => u.Id == senderId)
            .Select(u => u.IsBanned)
            .FirstOrDefaultAsync(ct);
        if (senderBanned)
            throw new ChatForbiddenException("Sua conta está suspensa.");

        var conv = await _db.Conversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new ChatNotFoundException();
        await EnsureParticipantAsync(senderId, conversationId, ct);

        if (conv.ListingId.HasValue)
        {
            var listing = await _db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == conv.ListingId.Value, ct)
                ?? throw new ChatNotFoundException("Anúncio não encontrado.");
            var sender = await _db.Users.AsNoTracking()
                .Select(u => new { u.Id, u.BairroId })
                .FirstOrDefaultAsync(u => u.Id == senderId, ct);
            if (sender == null || sender.BairroId != listing.BairroId)
                throw new ChatForbiddenException("Anúncio fora do seu bairro.");
        }

        string? imagePath = null;
        if (image != null && image.Length > 0)
        {
            if (!IsAllowedImageType(image.ContentType, image.FileName))
                throw new ChatValidationException("Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF.");

            using var s = image.OpenReadStream();
            imagePath = await _files.SaveImageAsync(s, image.FileName, image.ContentType, "chat", ct);
        }

        var msg = new Message
        {
            ConversationId = conversationId,
            SenderId = senderId,
            Text = string.IsNullOrWhiteSpace(text) ? null : text.Trim(),
            ImagePath = imagePath,
            SentAt = DateTime.UtcNow,
        };
        _db.Messages.Add(msg);
        conv.LastMessageAt = msg.SentAt;
        await _db.SaveChangesAsync(ct);

        var dto = MapMsg(msg);

        try
        {
            await _hub.Clients.Group($"conv:{conversationId}").SendAsync("MessageReceived", dto, ct);
            var recipientId = conv.BuyerId == senderId ? conv.SellerId : conv.BuyerId;
            var newUnread = await GetUnreadCountAsync(recipientId, ct);
            await _hub.Clients.User(recipientId.ToString()).SendAsync("UnreadChanged", new { total = newUnread }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast chat message {MessageId}", msg.Id);
        }

        return dto;
    }

    public async Task MarkReadAsync(Guid userId, int conversationId, CancellationToken ct = default)
    {
        var participant = await _db.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationId == conversationId && p.UserId == userId, ct)
            ?? throw new ChatForbiddenException("Not a participant");
        participant.LastReadAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        try
        {
            await _hub.Clients.Group($"conv:{conversationId}").SendAsync("ConversationRead",
                new { conversationId, readerId = userId, readAt = participant.LastReadAt }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast ConversationRead for {ConvId}", conversationId);
        }
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
    {
        // Single JOIN query replacing N individual COUNTs
        return await _db.ConversationParticipants
            .AsNoTracking()
            .Where(p => p.UserId == userId && !p.SoftDeleted)
            .SelectMany(
                p => _db.Messages.Where(m =>
                    m.ConversationId == p.ConversationId
                    && m.SenderId != userId
                    && m.DeletedAt == null
                    && (p.LastReadAt == null || m.SentAt > p.LastReadAt)),
                (p, m) => m.Id)
            .CountAsync(ct);
    }

    public async Task<ConversationDto> CreateDirectAsync(Guid initiatorId, Guid recipientId, CancellationToken ct = default)
    {
        if (initiatorId == recipientId)
            throw new ChatForbiddenException("Não é possível iniciar conversa consigo mesmo.");

        // Check initiator ban status
        var initiatorBanned = await _db.Users.AsNoTracking()
            .Where(u => u.Id == initiatorId)
            .Select(u => u.IsBanned)
            .FirstOrDefaultAsync(ct);
        if (initiatorBanned)
            throw new ChatForbiddenException("Sua conta está suspensa.");

        // Verify recipient exists and is not banned
        var recipientExists = await _db.Users.AsNoTracking()
            .AnyAsync(u => u.Id == recipientId && !u.IsBanned && u.DeletedAt == null, ct);
        if (!recipientExists)
            throw new ChatNotFoundException("Usuário não encontrado.");

        var existing = await _db.Conversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.ListingId == null &&
                ((c.BuyerId == initiatorId && c.SellerId == recipientId) ||
                 (c.BuyerId == recipientId && c.SellerId == initiatorId)), ct);
        if (existing != null)
            return await BuildConvDtoAsync(existing.Id, initiatorId, ct) ?? throw new ChatNotFoundException();

        try
        {
            var conv = new Conversation
            {
                ListingId = null,
                BuyerId = initiatorId,
                SellerId = recipientId,
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
            };
            _db.Conversations.Add(conv);
            await _db.SaveChangesAsync(ct);

            _db.ConversationParticipants.AddRange(
                new ConversationParticipant { ConversationId = conv.Id, UserId = initiatorId },
                new ConversationParticipant { ConversationId = conv.Id, UserId = recipientId }
            );
            await _db.SaveChangesAsync(ct);

            return await BuildConvDtoAsync(conv.Id, initiatorId, ct, knownUnread: 0) ?? throw new ChatNotFoundException();
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            // Concurrent request won the race — return the conversation it created
            _logger.LogDebug("CreateDirectAsync race condition for ({A},{B})", initiatorId, recipientId);
            _db.ChangeTracker.Clear();
            var winner = await _db.Conversations.AsNoTracking()
                .FirstOrDefaultAsync(c => c.ListingId == null &&
                    ((c.BuyerId == initiatorId && c.SellerId == recipientId) ||
                     (c.BuyerId == recipientId && c.SellerId == initiatorId)), ct)
                ?? throw new ChatNotFoundException();
            return await BuildConvDtoAsync(winner.Id, initiatorId, ct) ?? throw new ChatNotFoundException();
        }
    }

    // ─── helpers ───

    private async Task EnsureParticipantAsync(Guid userId, int conversationId, CancellationToken ct)
    {
        var ok = await _db.ConversationParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId && !p.SoftDeleted, ct);
        if (!ok) throw new ChatForbiddenException("Not a participant");
    }

    private async Task<ConversationDto?> BuildConvDtoAsync(int conversationId, Guid userId, CancellationToken ct, int? knownUnread = null)
    {
        var c = await _db.Conversations.AsNoTracking()
            .Include(c => c.Listing)!.ThenInclude(l => l!.Photos)
            .Include(c => c.Buyer)
            .Include(c => c.Seller)
            .FirstOrDefaultAsync(x => x.Id == conversationId, ct);
        if (c == null) return null;

        // Skip the 2-query unread calculation for newly-created conversations
        int unread = knownUnread ?? await UnreadForConversationAsync(userId, conversationId, ct);
        return MapConv(c, userId, unread);
    }

    private async Task<int> UnreadForConversationAsync(Guid userId, int conversationId, CancellationToken ct)
    {
        var lastRead = await _db.ConversationParticipants.AsNoTracking()
            .Where(p => p.ConversationId == conversationId && p.UserId == userId)
            .Select(p => p.LastReadAt)
            .FirstOrDefaultAsync(ct);
        return await _db.Messages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId
                     && m.SenderId != userId
                     && m.DeletedAt == null
                     && (lastRead == null || m.SentAt > lastRead))
            .CountAsync(ct);
    }

    private static ConversationDto MapConv(Conversation c, Guid currentUserId, int unread)
    {
        var isBuyer = c.BuyerId == currentUserId;
        var other = isBuyer ? c.Seller : c.Buyer;
        var thumb = c.Listing?.Photos.OrderBy(p => p.OrderIndex).FirstOrDefault()?.ThumbnailPath;
        return new ConversationDto
        {
            Id = c.Id,
            ListingId = c.ListingId,
            ListingTitle = c.Listing?.Title,
            ListingThumbnailUrl = thumb,
            OtherUserId = isBuyer ? c.SellerId : c.BuyerId,
            OtherUserDisplayName = other?.DisplayName,
            OtherUserPhotoUrl = other?.PhotoUrl,
            OtherUserIsVerified = other?.IsVerified ?? false,
            LastMessageAt = c.LastMessageAt,
            UnreadCount = unread,
        };
    }

    private static MessageDto MapMsg(Message m) => new()
    {
        Id = m.Id,
        ConversationId = m.ConversationId,
        SenderId = m.SenderId,
        Text = m.Text,
        ImageUrl = m.ImagePath,
        SentAt = m.SentAt,
    };

    private static bool IsUniqueConstraintViolation(DbUpdateException ex)
    {
        // SQL Server: 2627 = unique constraint, 2601 = unique index violation
        var sqlEx = ex.InnerException as SqlException;
        return sqlEx?.Number is 2627 or 2601;
    }

    private static readonly HashSet<string> _allowedImageTypes =
        ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

    private static readonly HashSet<string> _allowedImageExtensions =
        [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    private static bool IsAllowedImageType(string contentType, string fileName)
    {
        if (!_allowedImageTypes.Contains(contentType.ToLowerInvariant())) return false;
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return _allowedImageExtensions.Contains(ext);
    }
}
