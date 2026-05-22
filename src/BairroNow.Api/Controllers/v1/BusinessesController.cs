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
    private readonly ILogger<BusinessesController> _logger;

    public BusinessesController(AppDbContext db, ILogger<BusinessesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/v1/businesses
    [HttpGet("/api/v1/businesses")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> List(
        [FromQuery] int? bairroId,
        [FromQuery] string? category,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        try
        {
            pageSize = Math.Clamp(pageSize, 1, 50);
            page = Math.Max(1, page);

            var usersQuery = _db.Users.AsNoTracking()
                .Where(u => u.IsBusinessAccount && u.IsActive && u.BusinessName != null && u.BusinessName != "");

            if (bairroId.HasValue)
                usersQuery = usersQuery.Where(u => u.BairroId == bairroId.Value);

            if (!string.IsNullOrWhiteSpace(category))
                usersQuery = usersQuery.Where(u => u.BusinessCategory == category);

            var totalCount = await usersQuery.CountAsync(ct);

            // Fetch users (simple projection, no navigation properties)
            var users = await usersQuery
                .OrderBy(u => u.BusinessName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new {
                    u.Id,
                    u.DisplayName,
                    u.BusinessName,
                    u.BusinessCategory,
                    u.PhotoUrl,
                    u.IsVerified,
                    u.BairroId,
                })
                .ToListAsync(ct);

            if (users.Count == 0)
                return Ok(new { totalCount, items = Array.Empty<object>() });

            // Fetch bairro names separately
            var bairroIds = users.Where(u => u.BairroId.HasValue).Select(u => u.BairroId!.Value).Distinct().ToList();
            var bairros = bairroIds.Count > 0
                ? await _db.Bairros.AsNoTracking()
                    .Where(b => bairroIds.Contains(b.Id))
                    .Select(b => new { b.Id, b.Nome })
                    .ToDictionaryAsync(b => b.Id, b => b.Nome, ct)
                : new Dictionary<int, string>();

            // Fetch ratings aggregates
            var userIds = users.Select(u => u.Id).ToList();
            var ratingRows = await _db.BusinessRatings.AsNoTracking()
                .Where(r => userIds.Contains(r.BusinessUserId))
                .GroupBy(r => r.BusinessUserId)
                .Select(g => new { UserId = g.Key, Avg = g.Average(r => (double?)r.Stars), Cnt = g.Count() })
                .ToListAsync(ct);
            var ratingsMap = ratingRows.ToDictionary(r => r.UserId);

            var items = users
                .Select(u => new {
                    userId = u.Id,
                    u.DisplayName,
                    u.BusinessName,
                    u.BusinessCategory,
                    u.PhotoUrl,
                    u.IsVerified,
                    BairroNome = u.BairroId.HasValue && bairros.TryGetValue(u.BairroId.Value, out var bn) ? bn : null,
                    RatingAverage = ratingsMap.TryGetValue(u.Id, out var rv) ? rv.Avg : null,
                    RatingTotal = ratingsMap.TryGetValue(u.Id, out var rv2) ? rv2.Cnt : 0,
                })
                .OrderByDescending(u => u.RatingAverage ?? -1)
                .ThenBy(u => u.BusinessName)
                .ToList();

            return Ok(new { totalCount, items });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing businesses for bairro");
            return StatusCode(500, new { error = "Erro ao carregar negócios. Tente novamente." });
        }
    }
}
