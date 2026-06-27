using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/map")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class MapController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICoordinateFuzzingService _fuzz;

    public MapController(AppDbContext db, ICoordinateFuzzingService fuzz)
    {
        _db = db;
        _fuzz = fuzz;
    }

    // MAP-001, MAP-002, MAP-003, MAP-004, MAP-005
    // GET /api/v1/map/pins?bairroId={id}&filter={verified|new|businesses}
    [HttpGet("pins")]
    public async Task<IActionResult> GetPins([FromQuery] int bairroId, [FromQuery] string? filter, CancellationToken ct)
    {
        var query = _db.Users
            .AsNoTracking()
            .Where(u => u.BairroId == bairroId && u.ShowOnMap && u.EmailConfirmed);

        if (filter == "verified")
            query = query.Where(u => u.IsVerified);
        else if (filter == "new")
            query = query.Where(u => u.CreatedAt >= DateTime.UtcNow.AddMonths(-1));
        else if (filter == "businesses")
            query = query.Where(u => u.IsBusinessAccount);

        // Join to get stored coordinates from Verification (no live geocoding)
        var pins = await query
            .Join(_db.Verifications.IgnoreQueryFilters().Where(v => v.Status == "approved" && !v.IsDeleted),
                  u => u.Id, v => v.UserId,
                  (u, v) => new
                  {
                      UserId = u.Id,
                      u.DisplayName,
                      u.PhotoUrl,
                      u.IsVerified,
                      u.IsBusinessAccount,
                      u.Bio,
                      RawLat = v.ApprovedLat,
                      RawLng = v.ApprovedLng
                  })
            .Where(x => x.RawLat != null && x.RawLng != null)
            .ToListAsync(ct);

        var result = pins.Select(p =>
        {
            var (fLat, fLng) = _fuzz.FuzzCoordinates(p.RawLat!.Value, p.RawLng!.Value, p.UserId);
            return new
            {
                p.UserId,
                p.DisplayName,
                p.PhotoUrl,
                p.IsVerified,
                p.IsBusinessAccount,
                p.Bio,
                Lat = fLat,
                Lng = fLng
            };
        });

        return Ok(result);
    }

    // MAP-006 — heatmap: aggregate post count by ~0.002° grid cell
    [HttpGet("heatmap")]
    public async Task<IActionResult> GetHeatmap([FromQuery] int bairroId, CancellationToken ct)
    {
        var data = await _db.Verifications
            .AsNoTracking()
            .IgnoreQueryFilters()
            .Where(v => v.BairroId == bairroId && v.Status == "approved" && !v.IsDeleted
                     && v.ApprovedLat != null && v.ApprovedLng != null)
            .Join(_db.Posts.AsNoTracking().IgnoreQueryFilters().Where(p => p.BairroId == bairroId && p.DeletedAt == null),
                  v => v.UserId, p => p.AuthorId, (v, p) => v)
            .GroupBy(v => new
            {
                LatCell = Math.Round(v.ApprovedLat!.Value / 0.002) * 0.002,
                LngCell = Math.Round(v.ApprovedLng!.Value / 0.002) * 0.002
            })
            .Select(g => new { g.Key.LatCell, g.Key.LngCell, Count = g.Count() })
            .ToListAsync(ct);

        return Ok(data);
    }

    // MAP-007 — POIs (admin-only create, anyone can read)
    [HttpGet("pois")]
    public async Task<IActionResult> GetPois([FromQuery] int bairroId, CancellationToken ct)
    {
        var pois = await _db.PointsOfInterest
            .AsNoTracking()
            .Where(p => p.BairroId == bairroId && p.DeletedAt == null)
            .Select(p => new { p.Id, p.Name, p.Description, p.Category, p.Lat, p.Lng })
            .ToListAsync(ct);
        return Ok(pois);
    }

    [HttpPost("pois")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> CreatePoi([FromBody] CreatePoiRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var poi = new PointOfInterest
        {
            BairroId = req.BairroId,
            Name = req.Name,
            Description = req.Description,
            Category = req.Category,
            Lat = req.Lat,
            Lng = req.Lng,
            CreatedByUserId = userId.Value
        };
        _db.PointsOfInterest.Add(poi);
        await _db.SaveChangesAsync(ct);
        return Created($"/api/v1/map/pois/{poi.Id}", poi);
    }

    // MAP-004 — opt out toggle
    [HttpPut("preference")]
    public async Task<IActionResult> UpdateMapPreference([FromBody] MapPreferenceRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var user = await _db.Users.FindAsync(new object[] { userId.Value }, ct);
        if (user == null) return NotFound();
        user.ShowOnMap = req.ShowOnMap;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public record CreatePoiRequest(int BairroId, string Name, string? Description,
    PoiCategory Category, double Lat, double Lng);
public record MapPreferenceRequest(bool ShowOnMap);
