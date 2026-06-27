using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Hubs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using Microsoft.AspNetCore.RateLimiting;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/groups")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class GroupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<NotificationHub> _hub;
    private readonly INotificationService _notifications;
    private readonly ILogger<GroupsController> _logger;
    private const int DefaultPageSize = 20;

    public GroupsController(AppDbContext db, IHubContext<NotificationHub> hub, INotificationService notifications, ILogger<GroupsController> logger)
    {
        _db = db;
        _hub = hub;
        _notifications = notifications;
        _logger = logger;
    }

    // GRP-004 — list groups with optional search/filter/pagination
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int bairroId,
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        IQueryable<Group> groups = _db.Groups
            .AsNoTracking()
            .Where(g => g.BairroId == bairroId && g.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(category) && Enum.TryParse<GroupCategory>(category, true, out var cat))
            groups = groups.Where(g => g.Category == cat);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var safeSearch = EscapeLike(search.Trim());
            // EF Core 8 FTS workaround: use IgnoreQueryFilters + manual soft-delete filter
            groups = _db.Groups
                .AsNoTracking()
                .IgnoreQueryFilters()
                .Where(g => g.DeletedAt == null
                         && g.BairroId == bairroId
                         && (EF.Functions.Like(g.Name, $"%{safeSearch}%")
                             || EF.Functions.Like(g.Description, $"%{safeSearch}%")));
        }

        var total = await groups.CountAsync(ct);
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
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GRP-001 — create group, auto-add creator as Owner
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateGroupRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Length > 80)
            return BadRequest(new { error = "O nome do grupo deve ter entre 1 e 80 caracteres." });
        if (string.IsNullOrWhiteSpace(req.Description) || req.Description.Length > 500)
            return BadRequest(new { error = "A descrição deve ter entre 1 e 500 caracteres." });

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
        var ownerMember = new GroupMember
        {
            Group = group,
            UserId = userId.Value,
            Role = GroupMemberRole.Owner,
            Status = GroupMemberStatus.Active,
            JoinedAt = DateTime.UtcNow
        };
        _db.Groups.Add(group);
        _db.GroupMembers.Add(ownerMember);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/v1/groups/{group.Id}", new { group.Id, group.Name });
    }

    // GET /api/v1/groups/{id} — group detail
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();

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
                MemberCount = g.Members.Count(m => m.Status == GroupMemberStatus.Active),
                MyStatus = userId == null ? null :
                    g.Members
                        .Where(m => m.UserId == userId.Value)
                        .Select(m => m.Status.ToString())
                        .FirstOrDefault(),
                MyRole = userId == null ? null :
                    g.Members
                        .Where(m => m.UserId == userId.Value && m.Status == GroupMemberStatus.Active)
                        .Select(m => m.Role.ToString())
                        .FirstOrDefault()
            })
            .FirstOrDefaultAsync(ct);

        if (group == null) return NotFound();
        return Ok(group);
    }

    // PUT /api/v1/groups/{id} — update (owner/admin only)
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateGroupRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);

        if (member == null || member.Role == GroupMemberRole.Member)
            return Forbid();

        var group = await _db.Groups.FindAsync([id], ct);
        if (group == null || group.DeletedAt != null) return NotFound();

        if (req.Name != null) group.Name = req.Name;
        if (req.Description != null) group.Description = req.Description;
        if (req.Rules != null) group.Rules = req.Rules;
        if (req.CoverImageUrl != null) group.CoverImageUrl = req.CoverImageUrl;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/groups/{id} — soft delete (owner only)
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value, ct);

        if (member == null || member.Role != GroupMemberRole.Owner)
            return Forbid();

        var group = await _db.Groups.FindAsync([id], ct);
        if (group == null) return NotFound();

        group.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // GET /api/v1/groups/{id}/members
    // Optional ?status=pending — returns pending members (owner/admin only)
    [HttpGet("{id:int}/members")]
    public async Task<IActionResult> GetMembers(int id, [FromQuery] string? status, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.Equals(status, "pending", StringComparison.OrdinalIgnoreCase))
        {
            var callerMember = await _db.GroupMembers.AsNoTracking()
                .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
            if (callerMember == null || callerMember.Role == GroupMemberRole.Member) return Forbid();

            var pending = await _db.GroupMembers.AsNoTracking()
                .Where(m => m.GroupId == id && m.Status == GroupMemberStatus.PendingApproval)
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
                .ToListAsync(ct);

            return Ok(pending);
        }

        var baseQuery = _db.GroupMembers
            .AsNoTracking()
            .Where(m => m.GroupId == id && m.Status == GroupMemberStatus.Active);

        var total = await baseQuery.CountAsync(ct);
        var members = await baseQuery
            .OrderBy(m => m.JoinedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(m => new
            {
                m.Id,
                UserId = m.UserId,
                Role = m.Role.ToString().ToLower(),
                m.JoinedAt,
                DisplayName = m.User!.DisplayName,
                PhotoUrl = m.User.PhotoUrl
            })
            .ToListAsync(ct);

        return Ok(new { items = members, total });
    }

    // GET /api/v1/groups/{id}/pending — list pending join requests (owner/admin only)
    [HttpGet("{id:int}/pending")]
    public async Task<IActionResult> GetPending(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Must be Owner or Admin
        var callerMember = await _db.GroupMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (callerMember == null || callerMember.Role == GroupMemberRole.Member) return Forbid();

        var pending = await _db.GroupMembers.AsNoTracking()
            .Include(m => m.User)
            .Where(m => m.GroupId == id && m.Status == GroupMemberStatus.PendingApproval)
            .OrderBy(m => m.JoinedAt)
            .Select(m => new {
                m.UserId,
                m.User!.DisplayName,
                m.User.PhotoUrl,
                m.User.IsVerified,
                m.JoinedAt
            })
            .ToListAsync(ct);

        return Ok(pending);
    }

    // POST /api/v1/groups/{id}/members/{targetUserId}/approve
    [HttpPost("{id:int}/members/{targetUserId:guid}/approve")]
    public async Task<IActionResult> ApproveMember(int id, Guid targetUserId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var callerMember = await _db.GroupMembers.FirstOrDefaultAsync(
            m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (callerMember == null || callerMember.Role == GroupMemberRole.Member) return Forbid();

        var target = await _db.GroupMembers.FirstOrDefaultAsync(
            m => m.GroupId == id && m.UserId == targetUserId && m.Status == GroupMemberStatus.PendingApproval, ct);
        if (target == null) return NotFound(new { error = "Solicitação não encontrada." });

        var group = await _db.Groups.AsNoTracking()
            .Where(g => g.Id == id)
            .Select(g => new { g.Name })
            .FirstOrDefaultAsync(ct);

        target.Status = GroupMemberStatus.Active;
        await _db.SaveChangesAsync(ct);

        if (group != null)
            await _notifications.NotifyGroupJoinApprovedAsync(targetUserId, group.Name, id, ct);

        return Ok(new { approved = true });
    }

    // POST /api/v1/groups/{id}/members/{targetUserId}/reject
    [HttpPost("{id:int}/members/{targetUserId:guid}/reject")]
    public async Task<IActionResult> RejectMember(int id, Guid targetUserId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var callerMember = await _db.GroupMembers.FirstOrDefaultAsync(
            m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (callerMember == null || callerMember.Role == GroupMemberRole.Member) return Forbid();

        var target = await _db.GroupMembers.FirstOrDefaultAsync(
            m => m.GroupId == id && m.UserId == targetUserId && m.Status == GroupMemberStatus.PendingApproval, ct);
        if (target == null) return NotFound(new { error = "Solicitação não encontrada." });

        _db.GroupMembers.Remove(target);
        await _db.SaveChangesAsync(ct);
        return Ok(new { rejected = true });
    }

    // POST /api/v1/groups/{id}/members — join group
    // GRP-002: Open=Active immediately, Closed=PendingApproval
    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> Join(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var group = await _db.Groups
            .AsNoTracking()
            .Where(g => g.Id == id && g.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (group == null) return NotFound();

        // Check existing membership
        var existing = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value, ct);

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
            await _db.SaveChangesAsync(ct);
            return Ok(new { existing.Status });
        }

        // GRP-008: CrossBairro — check adjacency (MVP: allow if empty)
        if (group.Scope == GroupScope.CrossBairro)
        {
            var user = await _db.Users.AsNoTracking().Select(u => new { u.Id, u.BairroId }).FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
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
        await _db.SaveChangesAsync(ct);

        return Created($"/api/v1/groups/{id}/members/{member.Id}", new { member.Status });
    }

    // DELETE /api/v1/groups/{id}/members/{userId} — leave or remove member
    // GRP-005: Owner/Admin can remove; Admin cannot remove Owner
    [HttpDelete("{id:int}/members/{targetUserId:guid}")]
    public async Task<IActionResult> RemoveMember(int id, Guid targetUserId, CancellationToken ct = default)
    {
        var actorId = GetUserId();
        if (actorId == null) return Unauthorized();

        var actorMember = await _db.GroupMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == actorId.Value && m.Status == GroupMemberStatus.Active, ct);

        var targetMember = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == targetUserId, ct);

        if (targetMember == null) return NotFound();

        // Self-leave is always allowed
        if (actorId.Value == targetUserId)
        {
            _db.GroupMembers.Remove(targetMember);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // Must be owner or admin to remove others
        if (actorMember == null || actorMember.Role == GroupMemberRole.Member)
            return Forbid();

        // Admin cannot remove Owner
        if (actorMember.Role == GroupMemberRole.Admin && targetMember.Role == GroupMemberRole.Owner)
            return Forbid();

        _db.GroupMembers.Remove(targetMember);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // PUT /api/v1/groups/{id}/members/{userId}/role
    [HttpPut("{id:int}/members/{targetUserId:guid}/role")]
    public async Task<IActionResult> UpdateMemberRole(int id, Guid targetUserId, [FromBody] UpdateMemberRoleRequest req, CancellationToken ct = default)
    {
        var actorId = GetUserId();
        if (actorId == null) return Unauthorized();

        var actorMember = await _db.GroupMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == actorId.Value && m.Status == GroupMemberStatus.Active, ct);

        if (actorMember == null || actorMember.Role == GroupMemberRole.Member)
            return Forbid();

        var targetMember = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == targetUserId, ct);

        if (targetMember == null) return NotFound();

        // Admin cannot promote to Owner or demote Owner
        if (actorMember.Role == GroupMemberRole.Admin && req.Role == GroupMemberRole.Owner)
            return Forbid();
        if (actorMember.Role == GroupMemberRole.Admin && targetMember.Role == GroupMemberRole.Owner)
            return Forbid();

        targetMember.Role = req.Role;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // PUT /api/v1/groups/{id}/members/{userId}/notifications
    [HttpPut("{id:int}/members/{targetUserId:guid}/notifications")]
    public async Task<IActionResult> UpdateNotifications(int id, Guid targetUserId, [FromBody] UpdateNotificationPrefRequest req, CancellationToken ct = default)
    {
        var actorId = GetUserId();
        if (actorId == null) return Unauthorized();
        if (actorId.Value != targetUserId) return Forbid();

        var member = await _db.GroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == actorId.Value, ct);

        if (member == null) return NotFound();

        member.NotificationPreference = req.Preference;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // GRP-003 — group feed
    [HttpGet("{id:int}/posts")]
    public async Task<IActionResult> GetPosts(int id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Must be member to see posts
        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);

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
                GroupId = p.GroupId,
                p.Body,
                p.Category,
                p.CreatedAt,
                p.EditedAt,
                p.IsFlagged,
                Author = new
                {
                    Id = p.AuthorId,
                    DisplayName = p.Author!.DisplayName,
                    PhotoUrl = p.Author.PhotoUrl,
                    IsVerified = p.Author.IsVerified
                },
                LikeCount = p.Likes.Count,
                CommentCount = p.Comments.Count(c => c.DeletedAt == null),
                IsLikedByMe = p.Likes.Any(l => l.UserId == userId),
                Images = p.Images.OrderBy(i => i.Order)
                    .Select(i => new { i.Url, i.Order }).ToList()
            })
            .ToListAsync(ct);

        return Ok(posts);
    }

    // GRP-003 — create group post; SignalR push to group:{id}
    [HttpPost("{id:int}/posts")]
    public async Task<IActionResult> CreatePost(int id, [FromBody] CreateGroupPostRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Body) || req.Body.Length > 2000)
            return BadRequest(new { error = "O corpo da publicação deve ter entre 1 e 2000 caracteres." });

        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);

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
        await _db.SaveChangesAsync(ct);

        // SignalR: push to group room with full author shape (best-effort — post is already persisted)
        try
        {
            var authorInfo = await _db.Users.AsNoTracking()
                .Where(u => u.Id == userId.Value)
                .Select(u => new { u.DisplayName, u.PhotoUrl, u.IsVerified })
                .FirstOrDefaultAsync(ct);

            await _hub.Clients.Group($"group:{id}").SendAsync("NewGroupPost", new
            {
                post.Id,
                GroupId = id,
                post.Body,
                post.Category,
                post.CreatedAt,
                EditedAt = (DateTime?)null,
                IsFlagged = false,
                Author = new
                {
                    Id = userId.Value,
                    DisplayName = authorInfo?.DisplayName,
                    PhotoUrl = authorInfo?.PhotoUrl,
                    IsVerified = authorInfo?.IsVerified ?? false
                },
                LikeCount = 0,
                CommentCount = 0,
                IsLikedByMe = false,
                Images = Array.Empty<object>()
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SignalR push failed for group {GroupId} post {PostId}", id, post.Id);
        }

        return Created($"/api/v1/groups/{id}/posts/{post.Id}", new { post.Id });
    }

    // GRP-005 — soft delete group post
    [HttpDelete("{id:int}/posts/{postId:int}")]
    public async Task<IActionResult> DeletePost(int id, int postId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var post = await _db.GroupPosts.FindAsync([postId], ct);
        if (post == null || post.GroupId != id) return NotFound();

        var actorMember = await _db.GroupMembers
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);

        bool isAuthor = post.AuthorId == userId.Value;
        bool isModerator = actorMember != null && actorMember.Role != GroupMemberRole.Member;

        if (!isAuthor && !isModerator) return Forbid();

        post.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // Toggle like
    [HttpPost("{id:int}/posts/{postId:int}/likes")]
    public async Task<IActionResult> ToggleLike(int id, int postId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var existing = await _db.GroupPostLikes
            .FirstOrDefaultAsync(l => l.GroupPostId == postId && l.UserId == userId.Value, ct);

        if (existing != null)
        {
            _db.GroupPostLikes.Remove(existing);
            await _db.SaveChangesAsync(ct);
            return Ok(new { liked = false });
        }

        _db.GroupPostLikes.Add(new GroupPostLike { GroupPostId = postId, UserId = userId.Value });
        await _db.SaveChangesAsync(ct);
        return Ok(new { liked = true });
    }

    // GET threaded comments
    [HttpGet("{id:int}/posts/{postId:int}/comments")]
    public async Task<IActionResult> GetComments(int id, int postId, CancellationToken ct = default)
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
            .ToListAsync(ct);

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
    public async Task<IActionResult> AddComment(int id, int postId, [FromBody] AddGroupCommentRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Body) || req.Body.Length > 1000)
            return BadRequest(new { error = "O comentário deve ter entre 1 e 1000 caracteres." });

        var comment = new GroupComment
        {
            GroupPostId = postId,
            AuthorId = userId.Value,
            Body = req.Body,
            ParentCommentId = req.ParentCommentId,
            CreatedAt = DateTime.UtcNow
        };
        _db.GroupComments.Add(comment);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/v1/groups/{id}/posts/{postId}/comments/{comment.Id}", new { comment.Id });
    }

    // GRP-007 — list events
    [HttpGet("{id:int}/events")]
    public async Task<IActionResult> GetEvents(int id, CancellationToken ct = default)
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
            .ToListAsync(ct);

        return Ok(events);
    }

    // GRP-007 — create event
    [HttpPost("{id:int}/events")]
    public async Task<IActionResult> CreateEvent(int id, [FromBody] CreateGroupEventRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Title) || req.Title.Length > 120)
            return BadRequest(new { error = "O título do evento deve ter entre 1 e 120 caracteres." });
        if (req.StartsAt <= DateTime.UtcNow)
            return BadRequest(new { error = "A data de início deve ser no futuro." });
        if (req.EndsAt.HasValue && req.EndsAt <= req.StartsAt)
            return BadRequest(new { error = "A data de término deve ser após o início." });

        var isMember = await _db.GroupMembers
            .AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);

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
        await _db.SaveChangesAsync(ct);

        _ = _notifications.NotifyGroupEventCreatedAsync(id, userId.Value, ev.Title, ev.Id);

        return Created($"/api/v1/groups/{id}/events/{ev.Id}", new { ev.Id });
    }

    // GRP-007 — upsert RSVP
    [HttpPost("{id:int}/events/{eventId:int}/rsvp")]
    public async Task<IActionResult> Rsvp(int id, int eventId, [FromBody] RsvpRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var existing = await _db.GroupEventRsvps
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId.Value, ct);

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

        await _db.SaveChangesAsync(ct);
        return Ok(new { req.IsAttending });
    }

    // ─── Wave O: Group Polls (enquetes) ──────────────────────────────────────

    // GRP-POL-001 — list polls for a group
    [HttpGet("{id:int}/polls")]
    public async Task<IActionResult> ListPolls(int id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var isMember = await _db.GroupMembers.AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (!isMember) return Forbid();

        var now = DateTime.UtcNow;
        var polls = await _db.GroupPolls.AsNoTracking()
            .Where(p => p.GroupId == id && p.DeletedAt == null)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(p => new
            {
                p.Id, p.Question, p.CreatedAt, p.ExpiresAt,
                IsClosed = p.IsClosed || (p.ExpiresAt != null && p.ExpiresAt < now),
                p.CreatedByUserId,
                CreatedByName = p.CreatedByUser!.DisplayName,
                TotalVotes = p.Votes.Count,
                UserVoteOptionId = p.Votes
                    .Where(v => v.UserId == userId.Value)
                    .Select(v => (int?)v.GroupPollOptionId)
                    .FirstOrDefault(),
                Options = p.Options
                    .OrderBy(o => o.DisplayOrder)
                    .Select(o => new { o.Id, o.Text, VoteCount = o.Votes.Count })
            })
            .ToListAsync(ct);

        return Ok(polls);
    }

    // GRP-POL-002 — create a poll (members only)
    [HttpPost("{id:int}/polls")]
    public async Task<IActionResult> CreatePoll(int id, [FromBody] CreateGroupPollRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (req.Options == null || req.Options.Count < 2 || req.Options.Count > 6)
            return BadRequest(new { error = "A enquete deve ter entre 2 e 6 opções." });
        if (req.Options.Any(o => string.IsNullOrWhiteSpace(o) || o.Length > 100))
            return BadRequest(new { error = "Opções devem ter entre 1 e 100 caracteres." });
        if (string.IsNullOrWhiteSpace(req.Question) || req.Question.Length > 200)
            return BadRequest(new { error = "A pergunta deve ter entre 1 e 200 caracteres." });

        var isMember = await _db.GroupMembers.AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (!isMember) return Forbid();

        var poll = new GroupPoll
        {
            GroupId = id,
            CreatedByUserId = userId.Value,
            Question = req.Question.Trim(),
            ExpiresAt = req.ExpiresAt,
            CreatedAt = DateTime.UtcNow
        };
        _db.GroupPolls.Add(poll);
        await _db.SaveChangesAsync(ct);

        int order = 0;
        foreach (var text in req.Options)
            _db.GroupPollOptions.Add(new GroupPollOption { GroupPollId = poll.Id, Text = text.Trim(), DisplayOrder = order++ });
        await _db.SaveChangesAsync(ct);

        var dto = await BuildPollDto(poll.Id, userId.Value, DateTime.UtcNow, ct);

        try { await _hub.Clients.Group($"group:{id}").SendAsync("NewGroupPoll", dto); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push NewGroupPoll to group {GroupId}", id); }

        return Created($"/api/v1/groups/{id}/polls/{poll.Id}", dto);
    }

    // GRP-POL-003 — vote (upsert — re-voting changes the vote)
    [HttpPost("{id:int}/polls/{pollId:int}/vote")]
    public async Task<IActionResult> Vote(int id, int pollId, [FromBody] GroupPollVoteRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var isMember = await _db.GroupMembers.AsNoTracking()
            .AnyAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (!isMember) return Forbid();

        var now = DateTime.UtcNow;
        var poll = await _db.GroupPolls
            .Where(p => p.Id == pollId && p.GroupId == id && p.DeletedAt == null)
            .FirstOrDefaultAsync(ct);
        if (poll == null) return NotFound();
        if (poll.IsClosed || (poll.ExpiresAt != null && poll.ExpiresAt < now))
            return BadRequest(new { error = "Esta enquete está encerrada." });

        var optionValid = await _db.GroupPollOptions
            .AnyAsync(o => o.Id == req.OptionId && o.GroupPollId == pollId, ct);
        if (!optionValid) return BadRequest(new { error = "Opção inválida." });

        var existing = await _db.GroupPollVotes
            .FirstOrDefaultAsync(v => v.GroupPollId == pollId && v.UserId == userId.Value, ct);
        if (existing != null)
        {
            existing.GroupPollOptionId = req.OptionId;
            existing.CreatedAt = now;
        }
        else
        {
            _db.GroupPollVotes.Add(new GroupPollVote
            {
                GroupPollId = pollId,
                GroupPollOptionId = req.OptionId,
                UserId = userId.Value,
                CreatedAt = now
            });
        }
        await _db.SaveChangesAsync(ct);

        var updated = await BuildPollDto(pollId, userId.Value, now, ct);
        try { await _hub.Clients.Group($"group:{id}").SendAsync("GroupPollUpdated", updated); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push GroupPollUpdated to group {GroupId}", id); }

        return Ok(updated);
    }

    // GRP-POL-004 — remove own vote
    [HttpDelete("{id:int}/polls/{pollId:int}/vote")]
    public async Task<IActionResult> RemoveVote(int id, int pollId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var vote = await _db.GroupPollVotes
            .FirstOrDefaultAsync(v => v.GroupPollId == pollId && v.UserId == userId.Value, ct);
        if (vote == null) return NoContent();

        _db.GroupPollVotes.Remove(vote);
        await _db.SaveChangesAsync(ct);

        var now = DateTime.UtcNow;
        var updated = await BuildPollDto(pollId, userId.Value, now, ct);
        try { await _hub.Clients.Group($"group:{id}").SendAsync("GroupPollUpdated", updated); }
        catch (Exception ex) { _logger.LogWarning(ex, "Failed to push GroupPollUpdated to group {GroupId}", id); }

        return Ok(updated);
    }

    // GRP-POL-005 — close a poll (creator / admin / owner)
    [HttpPost("{id:int}/polls/{pollId:int}/close")]
    public async Task<IActionResult> ClosePoll(int id, int pollId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var poll = await _db.GroupPolls
            .FirstOrDefaultAsync(p => p.Id == pollId && p.GroupId == id && p.DeletedAt == null, ct);
        if (poll == null) return NotFound();

        var member = await _db.GroupMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (member == null) return Forbid();

        if (poll.CreatedByUserId != userId.Value && member.Role is not (GroupMemberRole.Admin or GroupMemberRole.Owner))
            return Forbid();

        poll.IsClosed = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // GRP-POL-006 — soft-delete a poll (creator / admin / owner)
    [HttpDelete("{id:int}/polls/{pollId:int}")]
    public async Task<IActionResult> DeletePoll(int id, int pollId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var poll = await _db.GroupPolls
            .FirstOrDefaultAsync(p => p.Id == pollId && p.GroupId == id && p.DeletedAt == null, ct);
        if (poll == null) return NotFound();

        var member = await _db.GroupMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.GroupId == id && m.UserId == userId.Value && m.Status == GroupMemberStatus.Active, ct);
        if (member == null) return Forbid();

        if (poll.CreatedByUserId != userId.Value && member.Role is not (GroupMemberRole.Admin or GroupMemberRole.Owner))
            return Forbid();

        poll.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // Admin: GET /api/v1/groups/flagged-posts?bairroId={n}
    [HttpGet("flagged-posts")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> FlaggedPosts([FromQuery] int bairroId, CancellationToken ct = default)
    {
        var posts = await _db.GroupPosts.AsNoTracking()
            .IgnoreQueryFilters()
            .Where(p => p.IsFlagged && p.DeletedAt == null && p.Group!.BairroId == bairroId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(100)
            .Select(p => new
            {
                p.Id,
                GroupId   = p.GroupId,
                GroupName = p.Group!.Name,
                AuthorName = p.Author!.DisplayName ?? p.Author.Email,
                p.Body,
                p.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(posts);
    }

    private async Task<object?> BuildPollDto(int pollId, Guid userId, DateTime now, CancellationToken ct = default)
    {
        return await _db.GroupPolls.AsNoTracking()
            .Where(p => p.Id == pollId)
            .Select(p => new
            {
                p.Id, p.Question, p.CreatedAt, p.ExpiresAt,
                IsClosed = p.IsClosed || (p.ExpiresAt != null && p.ExpiresAt < now),
                p.CreatedByUserId,
                CreatedByName = p.CreatedByUser!.DisplayName,
                TotalVotes = p.Votes.Count,
                UserVoteOptionId = p.Votes
                    .Where(v => v.UserId == userId)
                    .Select(v => (int?)v.GroupPollOptionId)
                    .FirstOrDefault(),
                Options = p.Options
                    .OrderBy(o => o.DisplayOrder)
                    .Select(o => new { o.Id, o.Text, VoteCount = o.Votes.Count })
            })
            .FirstOrDefaultAsync(ct);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    // Escape SQL Server LIKE wildcards so user input is treated as literals.
    private static string EscapeLike(string s) =>
        s.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

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

// Wave O — polls
public record CreateGroupPollRequest(string Question, List<string>? Options, DateTime? ExpiresAt);

public record GroupPollVoteRequest(int OptionId);

public record RsvpRequest(bool IsAttending);
