using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Authorize]
[EnableRateLimiting("authenticated")]
public class BusinessAnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public BusinessAnalyticsController(AppDbContext db) => _db = db;

    // POST /api/v1/users/{id}/analytics/view — record a profile view (fire and forget, public)
    [HttpPost("/api/v1/users/{id:guid}/analytics/view")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> RecordView(Guid id, CancellationToken ct)
    {
        // Only track views on business accounts
        var exists = await _db.Users.AsNoTracking()
            .AnyAsync(u => u.Id == id && u.IsBusinessAccount, ct);
        if (!exists) return NotFound();

        Guid? viewerUserId = null;
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (Guid.TryParse(sub, out var parsed)) viewerUserId = parsed;

        // Deduplicate: skip if same IP viewed in the last hour
        var ip = GetIpAddress();
        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var alreadyViewed = await _db.ProfileViews
            .AnyAsync(v => v.BusinessUserId == id && v.ViewerIp == ip && v.ViewedAt >= oneHourAgo, ct);

        if (!alreadyViewed)
        {
            _db.ProfileViews.Add(new ProfileView
            {
                BusinessUserId = id,
                ViewerIp = ip,
                ViewerUserId = viewerUserId,
                ViewedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(ct);
        }

        return Ok();
    }

    // GET /api/v1/users/{id}/analytics — full analytics (owner or admin only)
    [HttpGet("/api/v1/users/{id:guid}/analytics")]
    public async Task<IActionResult> GetAnalytics(Guid id, CancellationToken ct)
    {
        var callerId = GetUserId();
        if (callerId == null) return Unauthorized();

        var isAdmin = User.FindFirst("is_admin")?.Value == "true";
        if (callerId.Value != id && !isAdmin)
            return Forbid();

        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);
        var sevenDaysAgo = now.AddDays(-7);

        // Fetch all views in last 30 days in one query
        var views = await _db.ProfileViews
            .AsNoTracking()
            .Where(v => v.BusinessUserId == id && v.ViewedAt >= thirtyDaysAgo)
            .Select(v => v.ViewedAt)
            .ToListAsync(ct);

        var totalViews = await _db.ProfileViews
            .AsNoTracking()
            .CountAsync(v => v.BusinessUserId == id, ct);

        var viewsThisWeek = views.Count(v => v >= sevenDaysAgo);
        var viewsLast30Days = views.Count;

        // Group by date (UTC date)
        var viewsByDay = Enumerable.Range(0, 30)
            .Select(i => now.AddDays(-29 + i).Date)
            .Select(date => new
            {
                date = date.ToString("yyyy-MM-dd"),
                count = views.Count(v => v.Date == date)
            })
            .ToList();

        // Ratings
        var ratings = await _db.BusinessRatings
            .AsNoTracking()
            .Where(r => r.BusinessUserId == id)
            .Select(r => r.Stars)
            .ToListAsync(ct);

        var ratingAverage = ratings.Count > 0 ? ratings.Average() : (double?)null;
        var ratingTotal = ratings.Count;

        var ratingDistribution = Enumerable.Range(1, 5).Select(star => new
        {
            stars = star,
            count = ratings.Count(r => r == star)
        }).ToList();

        return Ok(new
        {
            totalViews,
            viewsThisWeek,
            viewsLast30Days,
            viewsByDay,
            ratingAverage,
            ratingTotal,
            ratingDistribution
        });
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "unknown";
}
