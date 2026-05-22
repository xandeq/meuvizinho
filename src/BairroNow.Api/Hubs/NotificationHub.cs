using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Hubs;

[Authorize]
public class NotificationHub : Hub
{
    private readonly AppDbContext _db;
    private readonly ILogger<NotificationHub> _logger;

    // Rate limit: max 15 join/leave calls per method per connection per 60s window
    private const int RlMax = 15;
    private const long RlWindowMs = 60_000;

    public NotificationHub(AppDbContext db, ILogger<NotificationHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task JoinBairro(string bairroId)
    {
        ThrottleOrThrow("JoinBairro");

        var userId = GetUserId();
        if (userId == null) throw new HubException("Unauthorized");

        if (!int.TryParse(bairroId, out var bairroIdInt))
            throw new HubException("Invalid bairroId");

        var isMember = await _db.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == userId.Value && u.BairroId == bairroIdInt && u.IsActive);

        if (!isMember)
        {
            _logger.LogWarning("Unauthorized JoinBairro attempt: userId={UserId} bairroId={BairroId}", userId, bairroId);
            throw new HubException("Not a member of this bairro");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, $"bairro-{bairroId}");
    }

    // ─── Phase 4 (D-12): Chat group join/leave on the existing hub.
    // No parallel ChatHub is created.
    public async Task JoinConversation(int conversationId)
    {
        ThrottleOrThrow("JoinConversation");
        var userId = GetUserId();
        if (userId == null) throw new HubException("Unauthorized");

        var isParticipant = await _db.ConversationParticipants
            .AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversationId && p.UserId == userId.Value && !p.SoftDeleted);

        if (!isParticipant)
        {
            _logger.LogWarning("Unauthorized JoinConversation attempt: userId={UserId} conversationId={ConvId}", userId, conversationId);
            throw new HubException("Not a participant");
        }

        _logger.LogDebug("JoinConversation: userId={UserId} convId={ConvId} connId={ConnId}",
            userId, conversationId, Context.ConnectionId);
        await Groups.AddToGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    public async Task LeaveConversation(int conversationId)
    {
        ThrottleOrThrow("LeaveConversation");
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    // Phase 5 (05-01): Group rooms for group feed real-time updates
    public async Task JoinGroup(int groupId)
    {
        ThrottleOrThrow("JoinGroup");
        var userId = GetUserId();
        if (userId == null) throw new HubException("Unauthorized");

        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId.Value
                        && m.Status == GroupMemberStatus.Active);
        if (!isMember) throw new HubException("Not a group member");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"group:{groupId}");
    }

    public async Task LeaveGroup(int groupId)
    {
        ThrottleOrThrow("LeaveGroup");
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"group:{groupId}");
    }

    private void ThrottleOrThrow(string method)
    {
        var key = $"rl:{method}";
        var nowMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        if (Context.Items.TryGetValue(key, out var raw) && raw is long[] window)
        {
            // window[0] = count, window[1] = resetAt epoch ms
            if (nowMs > window[1])
            {
                window[0] = 1;
                window[1] = nowMs + RlWindowMs;
            }
            else
            {
                window[0]++;
                if (window[0] > RlMax)
                    throw new HubException("Too many requests.");
            }
        }
        else
        {
            Context.Items[key] = new long[] { 1, nowMs + RlWindowMs };
        }
    }

    private Guid? GetUserId()
    {
        var sub = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst("sub")?.Value
                  ?? Context.UserIdentifier;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
