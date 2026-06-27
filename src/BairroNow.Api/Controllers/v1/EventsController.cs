using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Controllers.v1;

public class EventRsvpRequest
{
    [Required] public bool Attending { get; set; }
}

[ApiController]
[Authorize]
[EnableRateLimiting("authenticated")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;
    public EventsController(AppDbContext db) => _db = db;

    // GET /api/v1/events/upcoming
    // Returns upcoming events from public (Open) groups in the caller's bairro
    // Max 10 events, next 30 days
    [HttpGet("/api/v1/events/upcoming")]
    public async Task<IActionResult> GetUpcoming(CancellationToken ct)
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var caller = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (caller == null || !caller.BairroId.HasValue)
            return Ok(Array.Empty<object>());

        var now = DateTime.UtcNow;
        var cutoff = now.AddDays(30);

        var events = await _db.GroupEvents.AsNoTracking()
            .Include(e => e.Group)
            .Include(e => e.CreatedByUser)
            .Where(e =>
                e.DeletedAt == null &&
                e.StartsAt >= now &&
                e.StartsAt <= cutoff &&
                e.Group!.BairroId == caller.BairroId.Value &&
                e.Group.JoinPolicy == GroupJoinPolicy.Open &&
                e.Group.DeletedAt == null)
            .OrderBy(e => e.StartsAt)
            .Take(10)
            .Select(e => new {
                e.Id,
                e.Title,
                e.Description,
                e.Location,
                e.StartsAt,
                e.EndsAt,
                GroupId = e.GroupId,
                GroupName = e.Group!.Name,
                AttendingCount = e.Rsvps.Count(r => r.IsAttending),
            })
            .ToListAsync(ct);

        return Ok(events);
    }

    // GET /api/v1/events
    // Full paginated events list for the caller's bairro
    [HttpGet("/api/v1/events")]
    public async Task<IActionResult> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool upcoming = true,
        CancellationToken ct = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(1, page);

        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var caller = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (caller == null || !caller.BairroId.HasValue)
            return Ok(Array.Empty<object>());

        var callerBairroId = caller.BairroId.Value;
        var now = DateTime.UtcNow;

        var query = _db.GroupEvents.AsNoTracking()
            .Where(e =>
                e.DeletedAt == null &&
                e.Group!.BairroId == callerBairroId &&
                e.Group.DeletedAt == null &&
                (e.Group.JoinPolicy == GroupJoinPolicy.Open ||
                 e.Group.Members.Any(m => m.UserId == userId && m.Status == Models.Enums.GroupMemberStatus.Active)));

        if (upcoming)
            query = query.Where(e => e.StartsAt >= now);

        var totalCount = await query.CountAsync(ct);
        Response.Headers["X-Total-Count"] = totalCount.ToString();

        IOrderedQueryable<Models.Entities.GroupEvent> ordered = upcoming
            ? query.OrderBy(e => e.StartsAt)
            : query.OrderByDescending(e => e.StartsAt);

        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new
            {
                e.Id,
                e.Title,
                e.Description,
                e.Location,
                e.StartsAt,
                e.EndsAt,
                GroupId = e.GroupId,
                GroupName = e.Group!.Name,
                GroupJoinPolicy = e.Group.JoinPolicy,
                AttendingCount = e.Rsvps.Count(r => r.IsAttending),
                IsCallerAttending = e.Rsvps.Any(r => r.UserId == userId && r.IsAttending),
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // POST /api/v1/events/{eventId}/rsvp
    // Upsert RSVP for the caller on a specific event
    [HttpPost("/api/v1/events/{eventId:int}/rsvp")]
    public async Task<IActionResult> Rsvp(int eventId, [FromBody] EventRsvpRequest req, CancellationToken ct)
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();

        var ev = await _db.GroupEvents
            .Include(e => e.Group)
            .FirstOrDefaultAsync(e => e.Id == eventId && e.DeletedAt == null, ct);
        if (ev == null) return NotFound(new { error = "Evento não encontrado." });

        // Closed groups: only active members may RSVP
        if (ev.Group!.JoinPolicy == GroupJoinPolicy.Closed)
        {
            var isMember = await _db.GroupMembers.AsNoTracking()
                .AnyAsync(m => m.GroupId == ev.GroupId && m.UserId == userId && m.Status == Models.Enums.GroupMemberStatus.Active, ct);
            if (!isMember)
                return StatusCode(403, new { error = "Apenas membros ativos podem confirmar presença neste evento." });
        }

        var existing = await _db.GroupEventRsvps
            .FirstOrDefaultAsync(r => r.EventId == eventId && r.UserId == userId, ct);

        if (existing != null)
        {
            existing.IsAttending = req.Attending;
            existing.RespondedAt = DateTime.UtcNow;
        }
        else
        {
            _db.GroupEventRsvps.Add(new GroupEventRsvp
            {
                EventId = eventId,
                UserId = userId,
                IsAttending = req.Attending,
                RespondedAt = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync(ct);

        var attendingCount = await _db.GroupEventRsvps.AsNoTracking()
            .CountAsync(r => r.EventId == eventId && r.IsAttending, ct);

        return Ok(new { attending = req.Attending, attendingCount });
    }
}
