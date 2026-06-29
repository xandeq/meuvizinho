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

// Wave Q — Alertas de segurança geolocalizados do bairro.
// Moradores verificados reportam; qualquer um lê; admins resolvem.
// Wave R — notifica todos os moradores verificados do bairro ao criar um alerta.
[ApiController]
[Route("api/v1/security-alerts")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class SecurityAlertsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly INotificationService _notifications;
    private const int DefaultPageSize = 20;

    public SecurityAlertsController(AppDbContext db, INotificationService notifications)
    {
        _db = db;
        _notifications = notifications;
    }

    // GET /api/v1/security-alerts?bairroId={n}&kind=&status=Active&page=
    // Lista alertas do bairro. Público (anônimo pode ver).
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(
        [FromQuery] int bairroId,
        [FromQuery] string? kind,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;

        // Por padrão mostra apenas ativos — morador pode pedir Resolved passando status=Resolved.
        SecurityAlertStatus filterStatus = SecurityAlertStatus.Active;
        if (!string.IsNullOrWhiteSpace(status))
            Enum.TryParse(status, true, out filterStatus);

        var query = _db.SecurityAlerts
            .AsNoTracking()
            .Where(a => a.BairroId == bairroId
                     && a.DeletedAt == null
                     && a.Status == filterStatus);

        if (!string.IsNullOrWhiteSpace(kind) && Enum.TryParse<SecurityAlertKind>(kind, true, out var k))
            query = query.Where(a => a.Kind == k);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(a => new
            {
                a.Id,
                a.BairroId,
                Kind = a.Kind.ToString(),
                a.Description,
                a.LocationDescription,
                a.Latitude,
                a.Longitude,
                Status = a.Status.ToString(),
                a.UpvoteCount,
                ReportedBy = a.ReportedByUser != null ? a.ReportedByUser.DisplayName : null,
                a.CreatedAt,
                a.ResolvedAt,
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GET /api/v1/security-alerts/{id}
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(int id, CancellationToken ct = default)
    {
        var a = await _db.SecurityAlerts
            .AsNoTracking()
            .Where(x => x.Id == id && x.DeletedAt == null)
            .Select(x => new
            {
                x.Id,
                x.BairroId,
                Kind = x.Kind.ToString(),
                x.Description,
                x.LocationDescription,
                x.Latitude,
                x.Longitude,
                Status = x.Status.ToString(),
                x.ResolutionNote,
                x.UpvoteCount,
                x.ReportedByUserId,
                ReportedBy = x.ReportedByUser != null ? x.ReportedByUser.DisplayName : null,
                x.CreatedAt,
                x.ResolvedAt,
            })
            .FirstOrDefaultAsync(ct);

        return a == null ? NotFound() : Ok(a);
    }

    // POST /api/v1/security-alerts — morador verificado cria alerta.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSecurityAlertRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId.Value)
            .Select(u => new { u.IsVerified, u.BairroId })
            .FirstOrDefaultAsync(ct);

        if (user == null) return Unauthorized();
        if (!user.IsVerified) return Forbid();

        if (string.IsNullOrWhiteSpace(req.Description) || req.Description.Length > 1000)
            return BadRequest(new { error = "Descrição deve ter entre 1 e 1000 caracteres." });
        if (req.BairroId <= 0)
            return BadRequest(new { error = "Bairro inválido." });
        if (req.LocationDescription?.Length > 300)
            return BadRequest(new { error = "Descrição do local deve ter no máximo 300 caracteres." });

        var alert = new SecurityAlert
        {
            BairroId = req.BairroId,
            Kind = req.Kind,
            Description = req.Description.Trim(),
            LocationDescription = req.LocationDescription?.Trim(),
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Status = SecurityAlertStatus.Active,
            ReportedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
        };
        _db.SecurityAlerts.Add(alert);
        await _db.SaveChangesAsync(ct);

        // Fire-and-forget: notify all verified bairro residents (Wave R).
        // Uses Portuguese label matching the frontend enum labels.
        var kindLabel = alert.Kind switch
        {
            SecurityAlertKind.Furto     => "Furto",
            SecurityAlertKind.Suspeito  => "Pessoa Suspeita",
            SecurityAlertKind.Incendio  => "Incêndio",
            SecurityAlertKind.Acidente  => "Acidente",
            _                           => "Ocorrência",
        };
        _ = _notifications.NotifySecurityAlertAsync(
            alert.BairroId, userId.Value, alert.Id, kindLabel, alert.Description, ct);

        return Created($"/api/v1/security-alerts/{alert.Id}",
            new { alert.Id, Kind = alert.Kind.ToString(), Status = alert.Status.ToString() });
    }

    // POST /api/v1/security-alerts/{id}/upvote — "Eu também vi" (autenticado).
    [HttpPost("{id:int}/upvote")]
    public async Task<IActionResult> Upvote(int id, CancellationToken ct = default)
    {
        var exists = await _db.SecurityAlerts
            .AnyAsync(a => a.Id == id && a.DeletedAt == null && a.Status == SecurityAlertStatus.Active, ct);
        if (!exists) return NotFound();

        await _db.SecurityAlerts
            .Where(a => a.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.UpvoteCount, a => a.UpvoteCount + 1), ct);

        var upvoteCount = await _db.SecurityAlerts.AsNoTracking()
            .Where(a => a.Id == id).Select(a => a.UpvoteCount).FirstAsync(ct);

        return Ok(new { upvoteCount });
    }

    // POST /api/v1/security-alerts/{id}/resolve — admin encerra o alerta.
    [HttpPost("{id:int}/resolve")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveSecurityAlertRequest? req, CancellationToken ct = default)
    {
        var alert = await _db.SecurityAlerts.FirstOrDefaultAsync(a => a.Id == id && a.DeletedAt == null, ct);
        if (alert == null) return NotFound();

        alert.Status = SecurityAlertStatus.Resolved;
        alert.ResolutionNote = req?.Note?.Trim();
        alert.ResolvedByUserId = GetUserId();
        alert.ResolvedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new { resolved = true });
    }

    // DELETE /api/v1/security-alerts/{id} — autor ou admin (soft delete).
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var alert = await _db.SecurityAlerts.FirstOrDefaultAsync(a => a.Id == id && a.DeletedAt == null, ct);
        if (alert == null) return NotFound();

        var isAdmin = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId.Value).Select(u => u.IsAdmin).FirstOrDefaultAsync(ct);
        if (alert.ReportedByUserId != userId && !isAdmin) return Forbid();

        alert.DeletedAt = DateTime.UtcNow;
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

public record CreateSecurityAlertRequest(
    int BairroId,
    SecurityAlertKind Kind,
    string Description,
    string? LocationDescription,
    double? Latitude,
    double? Longitude);

public record ResolveSecurityAlertRequest(string? Note);
