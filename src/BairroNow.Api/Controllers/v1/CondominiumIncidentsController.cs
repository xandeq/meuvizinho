using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

// Wave U — Ocorrências do condomínio. Abrir: quem pode usar o condomínio
// (morador aprovado, síndico, admin). Ler: o morador vê só as próprias; a gestão
// (síndico/admin) vê todas e muda o status com uma resposta. Autorização via
// ICondominiumAccessService, igual reservas e comunicados.
[ApiController]
[Route("api/v1/condominiums")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class CondominiumIncidentsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICondominiumAccessService _access;
    private readonly ILogger<CondominiumIncidentsController> _logger;

    internal const int TitleMin = 4;
    internal const int TitleMax = 120;
    internal const int DescriptionMin = 10;
    internal const int DescriptionMax = 2000;
    internal const int LocationMax = 120;
    internal const int ResponseMax = 1000;
    // Evita spam: no máximo N ocorrências em aberto por morador no mesmo condomínio.
    internal const int MaxOpenPerReporter = 5;

    public CondominiumIncidentsController(
        AppDbContext db,
        ICondominiumAccessService access,
        ILogger<CondominiumIncidentsController> logger)
    {
        _db = db;
        _access = access;
        _logger = logger;
    }

    // POST /api/v1/condominiums/{id}/incidents — abrir ocorrência.
    [HttpPost("{id:int}/incidents")]
    public async Task<IActionResult> Create(int id, [FromBody] CreateIncidentRequest req, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return CondominiumAccessService.ForbidWithHint();

        if (!Enum.TryParse<CondominiumIncidentCategory>(req.Category, ignoreCase: true, out var category)
            || !Enum.IsDefined(category))
            return BadRequest(new { error = "Categoria inválida." });

        var title = req.Title?.Trim() ?? string.Empty;
        var description = req.Description?.Trim() ?? string.Empty;
        var location = string.IsNullOrWhiteSpace(req.Location) ? null : req.Location.Trim();

        if (title.Length < TitleMin || title.Length > TitleMax)
            return BadRequest(new { error = $"O título deve ter entre {TitleMin} e {TitleMax} caracteres." });
        if (description.Length < DescriptionMin || description.Length > DescriptionMax)
            return BadRequest(new { error = $"Descreva a ocorrência com {DescriptionMin} a {DescriptionMax} caracteres." });
        if (location != null && location.Length > LocationMax)
            return BadRequest(new { error = $"O local deve ter no máximo {LocationMax} caracteres." });

        var openCount = await _db.CondominiumIncidents.CountAsync(i =>
            i.CondominiumId == id && i.ReporterUserId == userId.Value
            && (i.Status == CondominiumIncidentStatus.Aberta || i.Status == CondominiumIncidentStatus.EmAndamento), ct);
        if (openCount >= MaxOpenPerReporter)
            return Conflict(new { error = $"Você já tem {MaxOpenPerReporter} ocorrências em aberto neste condomínio. Aguarde o síndico responder." });

        var incident = new CondominiumIncident
        {
            CondominiumId = id,
            ReporterUserId = userId.Value,
            Category = category,
            Title = title,
            Description = description,
            Location = location,
            Status = CondominiumIncidentStatus.Aberta,
            CreatedAt = DateTime.UtcNow,
        };
        _db.CondominiumIncidents.Add(incident);
        await _db.SaveChangesAsync(ct);

        return Created($"/api/v1/condominiums/{id}/incidents/{incident.Id}", await ProjectAsync(incident.Id, ct));
    }

    // GET /api/v1/condominiums/{id}/incidents/mine — ocorrências que eu abri.
    [HttpGet("{id:int}/incidents/mine")]
    public async Task<IActionResult> ListMine(int id, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return CondominiumAccessService.ForbidWithHint();

        var items = await Project(_db.CondominiumIncidents.AsNoTracking()
                .Where(i => i.CondominiumId == id && i.ReporterUserId == userId.Value)
                .OrderByDescending(i => i.CreatedAt))
            .Take(100)
            .ToListAsync(ct);
        return Ok(items);
    }

    // GET /api/v1/condominiums/{id}/incidents?status= — painel da gestão.
    // Sem filtro: abertas e em andamento primeiro, depois as encerradas recentes.
    [HttpGet("{id:int}/incidents")]
    public async Task<IActionResult> ListForManagement(int id, [FromQuery] string? status = null, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var query = _db.CondominiumIncidents.AsNoTracking().Where(i => i.CondominiumId == id);
        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<CondominiumIncidentStatus>(status, ignoreCase: true, out var st) || !Enum.IsDefined(st))
                return BadRequest(new { error = "Status inválido." });
            query = query.Where(i => i.Status == st);
        }

        var items = await Project(query
                .OrderBy(i => i.Status == CondominiumIncidentStatus.Aberta ? 0
                            : i.Status == CondominiumIncidentStatus.EmAndamento ? 1 : 2)
                .ThenByDescending(i => i.CreatedAt))
            .Take(200)
            .ToListAsync(ct);
        return Ok(items);
    }

    // GET /api/v1/condominiums/{id}/incidents/{incidentId} — detalhe (autor ou gestão).
    [HttpGet("{id:int}/incidents/{incidentId:int}")]
    public async Task<IActionResult> Get(int id, int incidentId, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();

        var incident = await _db.CondominiumIncidents.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == incidentId && i.CondominiumId == id, ct);
        if (incident == null) return NotFound();
        if (incident.ReporterUserId != userId.Value && !access.CanManage) return Forbid();

        return Ok(await ProjectAsync(incidentId, ct));
    }

    // POST /api/v1/condominiums/{id}/incidents/{incidentId}/status — gestão responde.
    [HttpPost("{id:int}/incidents/{incidentId:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, int incidentId, [FromBody] UpdateIncidentStatusRequest req, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        if (!Enum.TryParse<CondominiumIncidentStatus>(req.Status, ignoreCase: true, out var status) || !Enum.IsDefined(status))
            return BadRequest(new { error = "Status inválido." });

        var note = string.IsNullOrWhiteSpace(req.ResponseNote) ? null : req.ResponseNote.Trim();
        if (note != null && note.Length > ResponseMax)
            return BadRequest(new { error = $"A resposta deve ter no máximo {ResponseMax} caracteres." });
        // Recusar sem explicar frustra o morador: exige resposta.
        if (status == CondominiumIncidentStatus.Recusada && note == null)
            return BadRequest(new { error = "Explique ao morador por que a ocorrência foi recusada." });

        var incident = await _db.CondominiumIncidents
            .FirstOrDefaultAsync(i => i.Id == incidentId && i.CondominiumId == id, ct);
        if (incident == null) return NotFound();

        var now = DateTime.UtcNow;
        incident.Status = status;
        incident.UpdatedAt = now;
        incident.ClosedAt = status is CondominiumIncidentStatus.Resolvida or CondominiumIncidentStatus.Recusada ? now : null;
        if (note != null)
        {
            incident.ResponseNote = note;
            incident.RespondedByUserId = userId.Value;
            incident.RespondedAt = now;
        }
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Incident {IncidentId} in condominium {CondominiumId} set to {Status} by {UserId}",
            incidentId, id, status, userId.Value);
        return Ok(await ProjectAsync(incidentId, ct));
    }

    private Task<IncidentDto?> ProjectAsync(int incidentId, CancellationToken ct) =>
        Project(_db.CondominiumIncidents.AsNoTracking().Where(i => i.Id == incidentId)).FirstOrDefaultAsync(ct);

    private static IQueryable<IncidentDto> Project(IQueryable<CondominiumIncident> q) =>
        q.Select(i => new IncidentDto(
            i.Id,
            i.CondominiumId,
            i.Category.ToString(),
            i.Title,
            i.Description,
            i.Location,
            i.Status.ToString(),
            i.ResponseNote,
            i.RespondedBy != null ? i.RespondedBy.DisplayName : null,
            i.RespondedAt,
            i.Reporter != null ? i.Reporter.DisplayName : null,
            i.Reporter != null && i.Reporter.IsVerified,
            i.CreatedAt,
            i.UpdatedAt,
            i.ClosedAt));
}

public record CreateIncidentRequest(string? Category, string? Title, string? Description, string? Location);

public record UpdateIncidentStatusRequest(string? Status, string? ResponseNote);

public record IncidentDto(
    int Id,
    int CondominiumId,
    string Category,
    string Title,
    string Description,
    string? Location,
    string Status,
    string? ResponseNote,
    string? RespondedByName,
    DateTime? RespondedAt,
    string? ReporterName,
    bool ReporterVerified,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ClosedAt);
