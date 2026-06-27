using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotificationsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("")]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var rows = await _db.Notifications.AsNoTracking()
            .Include(n => n.Actor)
            .Where(n => n.UserId == userId.Value)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                PostId = n.PostId,
                CommentId = n.CommentId,
                GroupId = n.GroupId,
                Actor = new PostAuthorDto
                {
                    Id = n.ActorUserId,
                    DisplayName = n.Actor!.DisplayName,
                    PhotoUrl = n.Actor.PhotoUrl,
                    IsVerified = n.Actor.IsVerified,
                    IsBusinessAccount = n.Actor.IsBusinessAccount,
                    BusinessName = n.Actor.BusinessName,
                    BusinessCategory = n.Actor.BusinessCategory,
                },
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var n = await _db.Notifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId.Value, ct);
        if (n == null) return NotFound();
        n.IsRead = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> ReadAll(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        await _db.Notifications
            .Where(n => n.UserId == userId.Value && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
