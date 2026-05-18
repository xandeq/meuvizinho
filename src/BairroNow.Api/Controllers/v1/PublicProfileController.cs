using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Authorize]
[EnableRateLimiting("authenticated")]
public class PublicProfileController : ControllerBase
{
    private readonly AppDbContext _db;
    public PublicProfileController(AppDbContext db) => _db = db;

    // GET /api/v1/users/{id}/public
    // Returns public info for any user; full business fields if IsBusinessAccount
    [HttpGet("/api/v1/users/{userId:guid}/public")]
    public async Task<IActionResult> GetPublic(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users.AsNoTracking()
            .Include(u => u.Bairro)
            .FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, ct);

        if (user == null) return NotFound();

        // Ratings aggregate
        var ratingData = await _db.BusinessRatings.AsNoTracking()
            .Where(r => r.BusinessUserId == userId)
            .GroupBy(r => r.BusinessUserId)
            .Select(g => new { Average = (double?)g.Average(r => r.Stars), Total = g.Count() })
            .FirstOrDefaultAsync(ct);

        return Ok(new {
            userId = user.Id,
            user.DisplayName,
            user.PhotoUrl,
            user.IsVerified,
            user.IsBusinessAccount,
            user.BusinessName,
            user.BusinessCategory,
            user.BusinessDescription,
            user.BusinessPhone,
            user.BusinessWebsite,
            BairroNome = user.Bairro?.Nome,
            RatingAverage = ratingData?.Average,
            RatingTotal = ratingData?.Total ?? 0,
        });
    }
}
