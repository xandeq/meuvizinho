using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Authorize(Policy = "Admin")]
[EnableRateLimiting("authenticated")]
public class AdminStatsController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminStatsController(AppDbContext db) => _db = db;

    // GET /api/v1/admin/stats
    // Returns aggregate stats for the admin dashboard
    [HttpGet("/api/v1/admin/stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        // Check admin
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!Guid.TryParse(sub, out var userId)) return Unauthorized();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || !user.IsAdmin) return Forbid();

        var now = DateTime.UtcNow;
        var last7Days = now.AddDays(-7);

        // Posts per day (last 7 days) — ignore global query filter for soft-deleted posts
        var postsPerDay = await _db.Posts
            .IgnoreQueryFilters()
            .Where(p => p.CreatedAt >= last7Days && p.DeletedAt == null)
            .GroupBy(p => p.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync(ct);

        // New users per day (last 7 days) — IgnoreQueryFilters because User has IsActive filter
        var usersPerDay = await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.CreatedAt >= last7Days && u.IsActive)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync(ct);

        // Totals
        var totalUsers = await _db.Users.CountAsync(ct); // respects IsActive query filter
        var totalPosts = await _db.Posts.CountAsync(ct); // respects DeletedAt query filter
        var pendingReports = await _db.Reports.CountAsync(r => r.Status == "pending", ct);
        var pendingVerifications = await _db.Verifications.CountAsync(v => v.Status == "pending", ct);
        var totalGroups = await _db.Groups.CountAsync(ct);
        var totalListings = await _db.Listings.CountAsync(ct);

        return Ok(new {
            totals = new {
                users = totalUsers,
                posts = totalPosts,
                pendingReports,
                pendingVerifications,
                groups = totalGroups,
                listings = totalListings
            },
            postsPerDay = postsPerDay.Select(x => new { date = x.date.ToString("MM/dd"), count = x.count }),
            usersPerDay = usersPerDay.Select(x => new { date = x.date.ToString("MM/dd"), count = x.count })
        });
    }
}
