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

    public NotificationHub(AppDbContext db, ILogger<NotificationHub> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task JoinBairro(string bairroId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"bairro-{bairroId}");
    }

    // ─── Phase 4 (D-12): Chat group join/leave on the existing hub.
    // No parallel ChatHub is created.
    public async Task JoinConversation(int conversationId)
    {
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
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conv:{conversationId}");
    }

    // Phase 5 (05-01): Group rooms for group feed real-time updates
    public async Task JoinGroup(int groupId)
    {
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
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"group:{groupId}");
    }

    private Guid? GetUserId()
    {
        var sub = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? Context.User?.FindFirst("sub")?.Value
                  ?? Context.UserIdentifier;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
