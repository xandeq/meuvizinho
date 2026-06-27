using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/search")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class SearchController : ControllerBase
{
    private readonly IFeedQueryService _feed;
    private readonly AppDbContext _db;

    public SearchController(IFeedQueryService feed, AppDbContext db)
    {
        _feed = feed;
        _db = db;
    }

    // Uses EF.Functions.Like (SQL LIKE) for body matching, scoped to caller bairro.
    [HttpGet("")]
    public async Task<IActionResult> Search([FromQuery] SearchRequest request, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var results = await _feed.SearchAsync(userId.Value, request, ct);
        return Ok(new { items = results, total = results.Count });
    }

    // GET /api/v1/search/users?q=termo&skip=0&take=20
    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q = "", [FromQuery] int skip = 0, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (q.Length > 100) return BadRequest(new { error = "Termo de busca muito longo." });

        var caller = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (caller == null || !caller.BairroId.HasValue) return Ok(new { items = Array.Empty<object>(), total = 0 });

        take = Math.Clamp(take, 1, 50);
        skip = Math.Max(skip, 0);
        var qTrim = q.Trim();

        var query = _db.Users.AsNoTracking()
            .Where(u => u.BairroId == caller.BairroId.Value && u.IsActive);

        if (!string.IsNullOrEmpty(qTrim))
        {
            var safe = EscapeLike(qTrim);
            query = query.Where(u =>
                EF.Functions.Like(u.DisplayName ?? "", "%" + safe + "%") ||
                EF.Functions.Like(u.BusinessName ?? "", "%" + safe + "%"));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(u => u.DisplayName)
            .Skip(skip).Take(take)
            .Select(u => new {
                u.Id,
                u.DisplayName,
                u.PhotoUrl,
                u.IsVerified,
                u.IsBusinessAccount,
                u.BusinessName,
                u.BusinessCategory,
            })
            .ToListAsync(ct);

        return Ok(new { items, total });
    }

    // GET /api/v1/search/listings?q=termo&skip=0&take=20
    [HttpGet("listings")]
    public async Task<IActionResult> SearchListings([FromQuery] string q = "", [FromQuery] int skip = 0, [FromQuery] int take = 20, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (q.Length > 100) return BadRequest(new { error = "Termo de busca muito longo." });

        var caller = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (caller == null || !caller.BairroId.HasValue) return Ok(new { items = Array.Empty<object>(), total = 0 });

        take = Math.Clamp(take, 1, 50);
        skip = Math.Max(skip, 0);
        var qTrim = q.Trim();

        var query = _db.Listings.AsNoTracking()
            .Include(l => l.Seller)
            .Where(l => l.BairroId == caller.BairroId.Value && l.DeletedAt == null);

        if (!string.IsNullOrEmpty(qTrim))
        {
            var safe = EscapeLike(qTrim);
            query = query.Where(l =>
                EF.Functions.Like(l.Title, "%" + safe + "%") ||
                EF.Functions.Like(l.Description, "%" + safe + "%"));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip).Take(take)
            .Select(l => new {
                l.Id,
                l.Title,
                l.Price,
                l.CategoryCode,
                l.Status,
                l.CreatedAt,
                SellerId = l.SellerId,
                SellerName = l.Seller!.DisplayName,
            })
            .ToListAsync(ct);

        return Ok(new { items, total });
    }

    private static string EscapeLike(string s) =>
        s.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
