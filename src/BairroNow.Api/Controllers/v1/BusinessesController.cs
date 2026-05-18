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
public class BusinessesController : ControllerBase
{
    private readonly AppDbContext _db;
    public BusinessesController(AppDbContext db) => _db = db;

    // GET /api/v1/businesses
    // Paginated list of business accounts, optionally filtered by bairroId and category
    [HttpGet("/api/v1/businesses")]
    [AllowAnonymous]
    [EnableRateLimiting("anonymous")]
    public async Task<IActionResult> List(
        [FromQuery] int? bairroId,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(1, page);

        var query = _db.Users.AsNoTracking()
            .Include(u => u.Bairro)
            .Where(u =>
                u.IsBusinessAccount &&
                u.IsActive &&
                !string.IsNullOrEmpty(u.BusinessName));

        if (bairroId.HasValue)
            query = query.Where(u => u.BairroId == bairroId.Value);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(u => u.BusinessCategory == category);

        var totalCount = await query.CountAsync(ct);
        Response.Headers["X-Total-Count"] = totalCount.ToString();

        // Join with BusinessRatings to compute aggregates
        var items = await query
            .Select(u => new
            {
                u.Id,
                u.DisplayName,
                u.BusinessName,
                u.BusinessCategory,
                u.PhotoUrl,
                u.IsVerified,
                BairroNome = u.Bairro != null ? u.Bairro.Nome : null,
                RatingAverage = _db.BusinessRatings
                    .Where(r => r.BusinessUserId == u.Id)
                    .Average(r => (double?)r.Stars),
                RatingTotal = _db.BusinessRatings
                    .Count(r => r.BusinessUserId == u.Id),
            })
            .OrderByDescending(u => u.RatingAverage.HasValue ? u.RatingAverage : null)
            .ThenBy(u => u.BusinessName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var result = items.Select(u => new
        {
            userId = u.Id,
            u.DisplayName,
            u.BusinessName,
            u.BusinessCategory,
            u.PhotoUrl,
            u.IsVerified,
            u.BairroNome,
            u.RatingAverage,
            u.RatingTotal,
        });

        return Ok(result);
    }
}
