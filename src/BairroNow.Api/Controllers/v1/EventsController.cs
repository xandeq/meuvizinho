using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Controllers.v1;

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
}
