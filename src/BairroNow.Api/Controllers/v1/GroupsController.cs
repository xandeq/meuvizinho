using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Hubs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/groups")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private const int DefaultPageSize = 20;

    public GroupsController(AppDbContext db, IHubContext<NotificationHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // GRP-004 — list groups with optional search/filter/pagination
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int bairroId,
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1)
    {
        IQueryable<Group> groups = _db.Groups
            .AsNoTracking()
            .Where(g => g.BairroId == bairroId && g.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(category) && Enum.TryParse<GroupCategory>(category, true, out var cat))
            groups = groups.Where(g => g.Category == cat);

        if (!string.IsNullOrWhiteSpace(search))
        {
            // EF Core 8 FTS workaround: use IgnoreQueryFilters + manual soft-delete filter
            groups = _db.Groups
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(g => g.DeletedAt == null
                         && g.BairroId == bairroId
                         && (EF.Functions.Like(g.Name, $"%{search}%")
                             || EF.Functions.Like(g.Description, $"%{search}%")));
        }

        var total = await groups.CountAsync();
        var items = await groups
            .OrderByDescending(g => g.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Description,
                g.Category,
                g.JoinPolicy,
                g.Scope,
                g.CoverImageUrl,
                g.CreatedAt,
                MemberCount = g.Members.Count(m => m.Status == GroupMemberStatus.Active)
            })
            .ToListAsync();

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GRP-001 — create group, auto-add creator as Owner
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGroupRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var group = new Group
        {
            BairroId = req.BairroId,
            Name = req.Name,
            Description = req.Description,
            Category = req.Category,
            JoinPolicy = req.JoinPolicy,
            Scope = req.Scope ?? GroupScope.Bairro,
            Rules = req.Rules,
            CoverImageUrl = req.CoverImageUrl,
            CreatedAt = DateTime.UtcNow
        };
        _db.Groups.Add(group);
        await _db.SaveChangesAsync();

        var ownerMember = new GroupMember
        {
            GroupId = group.Id,
            UserId = userId.Value,
            Role = GroupMemberRole.Owner,
            Status = GroupMemberStatus.Active,
            JoinedAt = DateTime.UtcNow
        };
        _db.GroupMembers.Add(ownerMember);
        await _db.SaveChangesAsync();

        return Created($"/api/v1/groups/{group.Id}", new { group.Id, group.Name });
    }

    // GET /api/v1/groups/{id} — group detail
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
    {
        var group = await _db.Groups
            .AsNoTracking()
            .Where(g => g.Id == id && g.DeletedAt == null)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Description,
                g.Category,
                g.JoinPolicy,
                g.Scope,
                g.Rules,
                g.CoverImageUrl,
                g.CreatedAt,
                MemberCount = g.Members.Count(m => m.Status == GroupMemberStatus.Active)
            })
            .FirstOrDefaultAsync();

        if (group == null) return NotFound();
        return Ok(group);
    }

    // PUT /api/v1/groups/{id} — update (owner/admin only)
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateGroupRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active);

        if (member == null || member.Role == GroupMemberRole.Member)
            return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group == null || group.DeletedAt != null) return NotFound();

        if (req.Name != null) group.Name = req.Name;
        if (req.Description != null) group.Description = req.Description;
        if (req.Rules != null) group.Rules = req.Rules;
        if (req.CoverImageUrl != null) group.CoverImageUrl = req.CoverImageUrl;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE /api/v1/groups/{id} — soft delete (owner only)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value);

        if (member == null || member.Role != GroupMemberRole.Owner)
            return Forbid();

        var group = await _db.Groups.FindAsync(id);
        if (group == null) return NotFound();

        group.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET /api/v1/groups/{id}/members
    [HttpGet("{id:int}/members")]
    public async Task<IActionResult> GetMembers(int id, [FromQuery] int page = 1)
    {
        var members = await _db.GroupMembers
            .AsNoTracking()
            .Where(m => m.GroupId == id && m.Status == GroupMemberStatus.Active)
            .OrderBy(m => m.JoinedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(m => new
            {
                m.Id,
                m.UserId,
                m.Role,
                m.Status,
                m.JoinedAt,
                DisplayName = m.User!.DisplayName,
                PhotoUrl = m.User.PhotoUrl
            })
            .ToListAsync();

        return Ok(members);
    }

    // POST /api/v1/groups/{id}/members — join group
    // GRP-002: Open=Active immediately, Closed=PendingApproval
    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> Join(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var group = await _db.Groups
            .AsNoTracking()
            .Where(g => g.Id == id && g.DeletedAt == null)
            .FirstOrDefaultAsync();

        if (group == null) return NotFound();

        // Check existing membership
        var existing = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value);

        if (existing != null)
        {
            if (existing.Status == GroupMemberStatus.Active)
                return Conflict(new { error = "Already a member" });
            if (existing.Status == GroupMemberStatus.Banned)
                return StatusCode(403, new { error = "Banned from this group" });
            // Re-activate pending or previously removed
            existing.Status = group.JoinPolicy == GroupJoinPolicy.Open
                ? GroupMemberStatus.Active
                : GroupMemberStatus.PendingApproval;
            await _db.SaveChangesAsync();
            return Ok(new { existing.Status });
        }

        // GRP-008: CrossBairro — check adjacency (MVP: allow if empty)
        if (group.Scope == GroupScope.CrossBairro)
        {
            var user = await _db.Users.AsNoTracking().Select(u => new { u.Id, u.BairroId }).FirstOrDefaultAsync(u => u.Id == userId.Value);
            if (user?.BairroId != group.BairroId)
            {
                // Check adjacency table — if no adjacency records exist, allow (MVP fallback)
                // For now adjacency is not seeded so cross-bairro joins are allowed
            }
        }

        var member = new GroupMember
        {
            GroupId = id,
            UserId = userId.Value,
            Role = GroupMemberRole.Member,
            Status = group.JoinPolicy == GroupJoinPolicy.Open
                ? GroupMemberStatus.Active
                : GroupMemberStatus.PendingApproval,
            JoinedAt = DateTime.UtcNow
        };
        _db.GroupMembers.Add(member);
        await _db.SaveChangesAsync();

        return Created($"/api/v1/groups/{id}/members/{member.Id}", new { member.Status });
    }

    // DELETE /api/v1/groups/{id}/members/{userId} — leave or remove member
    // GRP-005: Owner/Admin can remove; Admin cannot remove Owner
    [HttpDelete("{id:int}/members/{targetUserId:guid}")]
    public async Task<IActionResult> RemoveMember(int id, Guid targetUserId)
    {
        var actorId = GetUserId();
        if (actorId == null) return Unauthorized();

        var actorMember = await _db.GroupMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == actorId.Value && m.Status == GroupMemberStatus.Active);

        var targetMember = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == targetUserId);

        if (targetMember == null) return NotFound();

        // Self-leave is always allowed
        if (actorId.Value == targetUserId)
        {
            _db.GroupMembers.Remove(targetMember);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // Must be owner or admin to remove others
        if (actorMember == null || actorMember.Role == GroupMemberRole.Member)
            return Forbid();

        // Admin cannot remove Owner
        if (actorMember.Role == GroupMemberRole.Admin && targetMember.Role == GroupMemberRole.Owner)
            return Forbid();

        _db.GroupMembers.Remove(targetMember);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/v1/groups/{id}/members/{userId}/role
    [HttpPut("{id:int}/members/{targetUserId:guid}/role")]
    public async Task<IActionResult> UpdateMemberRole(int id, Guid targetUserId, [FromBody] UpdateMemberRoleRequest req)
    {
        var actorId = GetUserId();
        if (actorId == null) return Unauthorized();

        var actorMember = await _db.GroupMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == actorId.Value && m.Status == GroupMemberStatus.Active);

        if (actorMember == null || actorMember.Role == GroupMemberRole.Member)
            return Forbid();

        var targetMember = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == targetUserId);

        if (targetMember == null) return NotFound();

        // Admin cannot promote to Owner or demote Owner
        if (actorMember.Role == GroupMemberRole.Admin && req.Role == GroupMemberRole.Owner)
            return Forbid();
        if (actorMember.Role == GroupMemberRole.Admin && targetMember.Role == GroupMemberRole.Owner)
            return Forbid();

        targetMember.Role = req.Role;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // PUT /api/v1/groups/{id}/members/{userId}/notifications
    [HttpPut("{id:int}/members/{targetUserId:guid}/notifications")]
    public async Task<IActionResult> UpdateNotifications(int id, Guid targetUserId, [FromBody] UpdateNotificationPrefRequest req)
    {
        var actorId = GetUserId();
        if (actorId == null) return Unauthorized();
        if (actorId.Value != targetUserId) return Forbid();

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == actorId.Value);

        if (member == null) return NotFound();

        member.NotificationPreference = req.Preference;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GRP-003 — group feed
    [HttpGet("{id:int}/posts")]
    public async Task<IActionResult> GetPosts(int id, [FromQuery] int page = 1)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Must be member to see posts
        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active);

        if (!isMember) return Forbid();

        var posts = await _db.GroupPosts
            .AsNoTracking()
            .Where(p => p.GroupId == id && p.DeletedAt == null && p.IsPublished)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(p => new
            {
                p.Id,
                p.Body,
                p.Category,
                p.CreatedAt,
                p.EditedAt,
                AuthorId = p.AuthorId,
                AuthorName = p.Author!.DisplayName,
                AuthorPhoto = p.Author.PhotoUrl,
                LikeCount = p.Likes.Count,
                CommentCount = p.Comments.Count(c => c.DeletedAt == null)
            })
            .ToListAsync();

        return Ok(posts);
    }

    // GRP-003 — create group post; SignalR push to group:{id}
    [HttpPost("{id:int}/posts")]
    public async Task<IActionResult> CreatePost(int id, [FromBody] CreateGroupPostRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active);

        if (!isMember) return Forbid();

        var post = new GroupPost
        {
            GroupId = id,
            AuthorId = userId.Value,
            Category = req.Category,
            Body = req.Body,
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.GroupPosts.Add(post);
        await _db.SaveChangesAsync();

        // SignalR: push to group room
        await _hub.Clients.Group($"group:{id}")
            .SendAsync("NewGroupPost", new { post.Id, post.Body, post.AuthorId, post.CreatedAt });

        return Created($"/api/v1/groups/{id}/posts/{post.Id}", new { post.Id });
    }

    // GRP-005 — soft delete group post
    [HttpDelete("{id:int}/posts/{postId:int}")]
    public async Task<IActionResult> DeletePost(int id, int postId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.GroupPosts.FindAsync(postId);
        if (post == null || post.GroupId != id) return NotFound();

        var actorMember = await _db.GroupMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active);

        bool isAuthor = post.AuthorId == userId.Value;
        bool isModerator = actorMember != null && actorMember.Role != GroupMemberRole.Member;

        if (!isAuthor && !isModerator) return Forbid();

        post.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Toggle like
    [HttpPost("{id:int}/posts/{postId:int}/likes")]
    public async Task<IActionResult> ToggleLike(int id, int postId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var existing = await _db.GroupPostLikes
            .FirstOrDefaultAsync(l => l.GroupPostId == postId && l.UserId == userId.Value);

        if (existing != null)
        {
            _db.GroupPostLikes.Remove(existing);
            await _db.SaveChangesAsync();
            return Ok(new { liked = false });
        }

        _db.GroupPostLikes.Add(new GroupPostLike { GroupPostId = postId, UserId = userId.Value });
        await _db.SaveChangesAsync();
        return Ok(new { liked = true });
    }

    // GET threaded comments
    [HttpGet("{id:int}/posts/{postId:int}/comments")]
    public async Task<IActionResult> GetComments(int id, int postId)
    {
        // Load top-level comments + replies together, then group client-side
        var allComments = await _db.GroupComments
            .AsNoTracking()
            .Where(c => c.GroupPostId == postId && c.DeletedAt == null)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new
            {
                c.Id,
                c.Body,
                c.AuthorId,
                AuthorName = c.Author!.DisplayName,
                c.CreatedAt,
                c.ParentCommentId
            })
            .ToListAsync();

        var topLevel = allComments
            .Where(c => c.ParentCommentId == null)
            .Select(c => new
            {
                c.Id,
                c.Body,
                c.AuthorId,
                c.AuthorName,
                c.CreatedAt,
                Replies = allComments.Where(r => r.ParentCommentId == c.Id).ToList()
            })
            .ToList();

        return Ok(topLevel);
    }

    // POST comment
    [HttpPost("{id:int}/posts/{postId:int}/comments")]
    public async Task<IActionResult> AddComment(int id, int postId, [FromBody] AddGroupCommentRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var comment = new GroupComment
        {
            GroupPostId = postId,
            AuthorId = userId.Value,
            Body = req.Body,
            ParentCommentId = req.ParentCommentId,
            CreatedAt = DateTime.UtcNow
        };
        _db.GroupComments.Add(comment);
        await _db.SaveChangesAsync();

        return Created($"/api/v1/groups/{id}/posts/{postId}/comments/{comment.Id}", new { comment.Id });
    }

    // GRP-007 — list events
    [HttpGet("{id:int}/events")]
    public async Task<IActionResult> GetEvents(int id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var events = await _db.GroupEvents
            .AsNoTracking()
            .Where(e => e.GroupId == id && e.DeletedAt == null)
            .OrderBy(e => e.StartsAt)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                e.Location,
                e.StartsAt,
                e.EndsAt,
                e.ReminderAt,
                AttendingCount = e.Rsvps.Count(r => r.IsAttending),
                MyRsvp = e.Rsvps
                    .Where(r => r.UserId == userId)
                    .Select(r => (bool?)r.IsAttending)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return Ok(events);
    }

    // GRP-007 — create event
    [HttpPost("{id:int}/events")]
    public async Task<IActionResult> CreateEvent(int id, [FromBody] CreateGroupEventRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active);

        if (!isMember) return Forbid();

        var ev = new GroupEvent
        {
            GroupId = id,
            CreatedByUserId = userId.Value,
            Title = req.Title,
            Description = req.Description,
            Location = req.Location,
            StartsAt = req.StartsAt,
            EndsAt = req.EndsAt,
            ReminderAt = req.ReminderAt,
            ReminderSent = false,
            CreatedAt = DateTime.UtcNow
        };
        _db.GroupEvents.Add(ev);
        await _db.SaveChangesAsync();

        return Created($"/api/v1/groups/{id}/events/{ev.Id}", new { ev.Id });
    }

    // GRP-007 — upsert RSVP
    [HttpPost("{id:int}/events/{eventId:int}/rsvp")]
    public async Task<IActionResult> Rsvp(int id, int eventId, [FromBody] RsvpRequest req)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var existing = await _db.GroupEventRsvps
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId.Value);

        if (existing != null)
        {
            existing.IsAttending = req.IsAttending;
            existing.RespondedAt = DateTime.UtcNow;
        }
        else
        {
            _db.GroupEventRsvps.Add(new GroupEventRsvp
            {
                EventId = eventId,
                UserId = userId.Value,
                IsAttending = req.IsAttending,
                RespondedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { req.IsAttending });
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public record CreateGroupRequest(
    int BairroId, string Name, string Description,
    GroupCategory Category, GroupJoinPolicy JoinPolicy,
    GroupScope? Scope, string? Rules, string? CoverImageUrl);

public record UpdateGroupRequest(string? Name, string? Description, string? Rules, string? CoverImageUrl);

public record UpdateMemberRoleRequest(GroupMemberRole Role);

public record UpdateNotificationPrefRequest(GroupNotificationPreference Preference);

public record CreateGroupPostRequest(PostCategory Category, string Body);

public record AddGroupCommentRequest(string Body, int? ParentCommentId);

public record CreateGroupEventRequest(
    string Title, string? Description, string? Location,
    DateTime StartsAt, DateTime? EndsAt, DateTime? ReminderAt);

public record RsvpRequest(bool IsAttending);
