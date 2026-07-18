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

// Wave S — Reserva de áreas comuns de condomínio.
// Vínculo morador↔condomínio (espelha o fluxo de CondominiumClaim: Pending →
// aprovação pelo síndico ou admin) + CRUD de áreas comuns + reservas com
// detecção de conflito de horário. Todos os horários trafegam em UTC.
[ApiController]
[Route("api/v1/condominiums")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class CondominiumReservationsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICondominiumAccessService _access;
    private readonly INotificationService _notifications;
    private readonly ILogger<CondominiumReservationsController> _logger;
    private const int DefaultPageSize = 20;
    private const int MaxAvailabilityRangeDays = 60;

    public CondominiumReservationsController(
        AppDbContext db,
        ICondominiumAccessService access,
        INotificationService notifications,
        ILogger<CondominiumReservationsController> logger)
    {
        _db = db;
        _access = access;
        _notifications = notifications;
        _logger = logger;
    }

    // ─── Vínculo de morador ──────────────────────────────────────────────────

    // POST /api/v1/condominiums/{id}/residents — solicitar vínculo de morador.
    [HttpPost("{id:int}/residents")]
    public async Task<IActionResult> RequestResidency(int id, [FromBody] CreateResidentRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (req.Unit != null && req.Unit.Length > 60)
            return BadRequest(new { error = "A unidade deve ter no máximo 60 caracteres." });

        var condo = await _db.Condominiums.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null, ct);
        if (condo == null) return NotFound();

        var hasActive = await _db.CondominiumResidents
            .AnyAsync(r => r.CondominiumId == id && r.UserId == userId.Value
                        && (r.Status == CondominiumResidentStatus.Pending || r.Status == CondominiumResidentStatus.Approved), ct);
        if (hasActive) return Conflict(new { error = "Você já tem um vínculo ativo ou solicitação pendente neste condomínio." });

        var resident = new CondominiumResident
        {
            CondominiumId = id,
            UserId = userId.Value,
            Unit = req.Unit?.Trim(),
            Status = CondominiumResidentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _db.CondominiumResidents.Add(resident);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Backstop do índice único filtrado (CondominiumId, UserId) contra corrida TOCTOU.
            return Conflict(new { error = "Você já tem um vínculo ativo ou solicitação pendente neste condomínio." });
        }

        if (condo.SindicoUserId != null)
            await _notifications.NotifyResidentRequestAsync(condo.SindicoUserId.Value, userId.Value, id, condo.Name, ct);

        return Created($"/api/v1/condominiums/{id}/residents/{resident.Id}",
            new { resident.Id, Status = resident.Status.ToString() });
    }

    // GET /api/v1/condominiums/{id}/residents/me — status do vínculo do usuário logado.
    [HttpGet("{id:int}/residents/me")]
    public async Task<IActionResult> GetMyResidency(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var resident = await _db.CondominiumResidents.AsNoTracking()
            .Where(r => r.CondominiumId == id && r.UserId == userId.Value)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new { r.Id, Status = r.Status.ToString(), r.Unit, r.CreatedAt, r.ReviewedAt })
            .FirstOrDefaultAsync(ct);

        if (resident == null) return Ok(new { Status = "None" });
        return Ok(resident);
    }

    // GET /api/v1/condominiums/{id}/residents — gestão (síndico/admin).
    [HttpGet("{id:int}/residents")]
    public async Task<IActionResult> ListResidents(
        int id,
        [FromQuery] CondominiumResidentStatus? status,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (page < 1) page = 1;

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var query = _db.CondominiumResidents.AsNoTracking()
            .Where(r => r.CondominiumId == id);
        if (status.HasValue) query = query.Where(r => r.Status == status.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(r => new
            {
                r.Id,
                r.UserId,
                ResidentName = r.User != null ? r.User.DisplayName : null,
                ResidentVerified = r.User != null && r.User.IsVerified,
                r.Unit,
                Status = r.Status.ToString(),
                r.ReviewNote,
                r.ReviewedAt,
                r.CreatedAt
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // POST /api/v1/condominiums/{id}/residents/{residentId}/approve — síndico/admin.
    [HttpPost("{id:int}/residents/{residentId:int}/approve")]
    public async Task<IActionResult> ApproveResident(int id, int residentId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var resident = await _db.CondominiumResidents
            .FirstOrDefaultAsync(r => r.Id == residentId && r.CondominiumId == id, ct);
        if (resident == null) return NotFound();
        if (resident.Status != CondominiumResidentStatus.Pending)
            return BadRequest(new { error = "Esta solicitação já foi processada." });

        resident.Status = CondominiumResidentStatus.Approved;
        resident.ReviewedByUserId = userId.Value;
        resident.ReviewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _notifications.NotifyResidentReviewedAsync(resident.UserId, userId.Value, id, access.Condo.Name, "aprovado", ct);
        return Ok(new { approved = true });
    }

    // POST /api/v1/condominiums/{id}/residents/{residentId}/reject — síndico/admin.
    [HttpPost("{id:int}/residents/{residentId:int}/reject")]
    public async Task<IActionResult> RejectResident(int id, int residentId, [FromBody] ReviewResidentRequest? req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var resident = await _db.CondominiumResidents
            .FirstOrDefaultAsync(r => r.Id == residentId && r.CondominiumId == id, ct);
        if (resident == null) return NotFound();
        if (resident.Status != CondominiumResidentStatus.Pending)
            return BadRequest(new { error = "Esta solicitação já foi processada." });

        resident.Status = CondominiumResidentStatus.Rejected;
        resident.ReviewedByUserId = userId.Value;
        resident.ReviewedAt = DateTime.UtcNow;
        resident.ReviewNote = req?.Note?.Trim();
        await _db.SaveChangesAsync(ct);

        await _notifications.NotifyResidentReviewedAsync(resident.UserId, userId.Value, id, access.Condo.Name, "recusado", ct);
        return Ok(new { rejected = true });
    }

    // POST /api/v1/condominiums/{id}/residents/{residentId}/revoke — síndico/admin.
    // Cancela reservas futuras Pending/Approved do morador; passadas ficam no histórico.
    [HttpPost("{id:int}/residents/{residentId:int}/revoke")]
    public async Task<IActionResult> RevokeResident(int id, int residentId, [FromBody] ReviewResidentRequest? req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var resident = await _db.CondominiumResidents
            .FirstOrDefaultAsync(r => r.Id == residentId && r.CondominiumId == id, ct);
        if (resident == null) return NotFound();
        if (resident.Status != CondominiumResidentStatus.Approved)
            return BadRequest(new { error = "Só é possível revogar um vínculo aprovado." });

        var now = DateTime.UtcNow;
        resident.Status = CondominiumResidentStatus.Revoked;
        resident.ReviewedByUserId = userId.Value;
        resident.ReviewedAt = now;
        resident.ReviewNote = req?.Note?.Trim();

        var futureReservations = await _db.AreaReservations
            .Where(r => r.CondominiumId == id && r.UserId == resident.UserId
                     && r.StartUtc > now
                     && (r.Status == AreaReservationStatus.Pending || r.Status == AreaReservationStatus.Approved))
            .ToListAsync(ct);
        foreach (var r in futureReservations)
        {
            r.Status = AreaReservationStatus.Cancelled;
            r.CancelledAt = now;
        }

        await _db.SaveChangesAsync(ct);

        await _notifications.NotifyResidentReviewedAsync(resident.UserId, userId.Value, id, access.Condo.Name, "revogado", ct);
        return Ok(new { revoked = true, cancelledReservations = futureReservations.Count });
    }

    // ─── Áreas comuns ────────────────────────────────────────────────────────

    // GET /api/v1/condominiums/{id}/common-areas — morador aprovado/síndico/admin.
    [HttpGet("{id:int}/common-areas")]
    public async Task<IActionResult> ListCommonAreas(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return ForbidWithHint();

        var query = _db.CommonAreas.AsNoTracking()
            .Where(a => a.CondominiumId == id && a.DeletedAt == null);
        // Morador vê só as ativas; gestão vê todas (para reativar).
        if (!access.CanManage) query = query.Where(a => a.IsActive);

        var items = await query
            .OrderBy(a => a.Name)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Description,
                a.Capacity,
                a.CoverImageUrl,
                a.RequiresApproval,
                a.OpenTime,
                a.CloseTime,
                a.MinAdvanceHours,
                a.MaxAdvanceDays,
                a.MaxDurationMinutes,
                a.IsActive
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // GET /api/v1/condominiums/{id}/common-areas/{areaId} — detalhe + regras.
    [HttpGet("{id:int}/common-areas/{areaId:int}")]
    public async Task<IActionResult> GetCommonArea(int id, int areaId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return ForbidWithHint();

        var area = await _db.CommonAreas.AsNoTracking()
            .Where(a => a.Id == areaId && a.CondominiumId == id && a.DeletedAt == null)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Description,
                a.Rules,
                a.Capacity,
                a.CoverImageUrl,
                a.RequiresApproval,
                a.OpenTime,
                a.CloseTime,
                a.MinAdvanceHours,
                a.MaxAdvanceDays,
                a.MaxDurationMinutes,
                a.IsActive,
                a.CreatedAt
            })
            .FirstOrDefaultAsync(ct);

        if (area == null) return NotFound();
        return Ok(area);
    }

    // POST /api/v1/condominiums/{id}/common-areas — síndico/admin.
    [HttpPost("{id:int}/common-areas")]
    public async Task<IActionResult> CreateCommonArea(int id, [FromBody] CreateCommonAreaRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var error = ValidateAreaFields(req.Name, req.Description, req.Rules, req.Capacity,
            req.OpenTime, req.CloseTime, req.MinAdvanceHours, req.MaxAdvanceDays, req.MaxDurationMinutes);
        if (error != null) return BadRequest(new { error });

        var name = req.Name.Trim();
        var dup = await _db.CommonAreas
            .AnyAsync(a => a.CondominiumId == id && a.Name == name && a.DeletedAt == null, ct);
        if (dup) return Conflict(new { error = "Já existe uma área comum com esse nome neste condomínio." });

        var area = new CommonArea
        {
            CondominiumId = id,
            Name = name,
            Description = req.Description?.Trim(),
            Rules = req.Rules?.Trim(),
            Capacity = req.Capacity,
            CoverImageUrl = req.CoverImageUrl,
            RequiresApproval = req.RequiresApproval ?? true,
            OpenTime = req.OpenTime,
            CloseTime = req.CloseTime,
            MinAdvanceHours = req.MinAdvanceHours ?? 0,
            MaxAdvanceDays = req.MaxAdvanceDays ?? 90,
            MaxDurationMinutes = req.MaxDurationMinutes,
            IsActive = true,
            CreatedByUserId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        _db.CommonAreas.Add(area);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Backstop do índice único (CondominiumId, Name) contra corrida TOCTOU.
            return Conflict(new { error = "Já existe uma área comum com esse nome neste condomínio." });
        }

        return Created($"/api/v1/condominiums/{id}/common-areas/{area.Id}", new { area.Id, area.Name });
    }

    // PUT /api/v1/condominiums/{id}/common-areas/{areaId} — síndico/admin.
    [HttpPut("{id:int}/common-areas/{areaId:int}")]
    public async Task<IActionResult> UpdateCommonArea(int id, int areaId, [FromBody] UpdateCommonAreaRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var area = await _db.CommonAreas
            .FirstOrDefaultAsync(a => a.Id == areaId && a.CondominiumId == id && a.DeletedAt == null, ct);
        if (area == null) return NotFound();

        var error = ValidateAreaFields(req.Name ?? area.Name, req.Description, req.Rules, req.Capacity,
            req.OpenTime ?? area.OpenTime, req.CloseTime ?? area.CloseTime,
            req.MinAdvanceHours, req.MaxAdvanceDays, req.MaxDurationMinutes);
        if (error != null) return BadRequest(new { error });

        if (req.Name != null)
        {
            var name = req.Name.Trim();
            var dup = await _db.CommonAreas
                .AnyAsync(a => a.CondominiumId == id && a.Id != areaId && a.Name == name && a.DeletedAt == null, ct);
            if (dup) return Conflict(new { error = "Já existe uma área comum com esse nome neste condomínio." });
            area.Name = name;
        }
        if (req.Description != null) area.Description = req.Description.Trim();
        if (req.Rules != null) area.Rules = req.Rules.Trim();
        if (req.Capacity.HasValue) area.Capacity = req.Capacity;
        if (req.CoverImageUrl != null) area.CoverImageUrl = req.CoverImageUrl;
        if (req.RequiresApproval.HasValue) area.RequiresApproval = req.RequiresApproval.Value;
        if (req.OpenTime.HasValue) area.OpenTime = req.OpenTime;
        if (req.CloseTime.HasValue) area.CloseTime = req.CloseTime;
        if (req.MinAdvanceHours.HasValue) area.MinAdvanceHours = req.MinAdvanceHours.Value;
        if (req.MaxAdvanceDays.HasValue) area.MaxAdvanceDays = req.MaxAdvanceDays.Value;
        if (req.MaxDurationMinutes.HasValue) area.MaxDurationMinutes = req.MaxDurationMinutes;
        if (req.IsActive.HasValue) area.IsActive = req.IsActive.Value;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/condominiums/{id}/common-areas/{areaId} — soft delete + cancela futuras.
    [HttpDelete("{id:int}/common-areas/{areaId:int}")]
    public async Task<IActionResult> DeleteCommonArea(int id, int areaId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var area = await _db.CommonAreas
            .FirstOrDefaultAsync(a => a.Id == areaId && a.CondominiumId == id && a.DeletedAt == null, ct);
        if (area == null) return NotFound();

        var now = DateTime.UtcNow;
        area.DeletedAt = now;
        area.IsActive = false;

        var futureReservations = await _db.AreaReservations
            .Where(r => r.CommonAreaId == areaId
                     && r.StartUtc > now
                     && (r.Status == AreaReservationStatus.Pending || r.Status == AreaReservationStatus.Approved))
            .ToListAsync(ct);
        foreach (var r in futureReservations)
        {
            r.Status = AreaReservationStatus.Cancelled;
            r.CancelledAt = now;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { deleted = true, cancelledReservations = futureReservations.Count });
    }

    // GET /api/v1/condominiums/{id}/common-areas/{areaId}/availability?from=&to=
    // Intervalos ocupados (Pending+Approved) para o calendário. Máx 60 dias.
    [HttpGet("{id:int}/common-areas/{areaId:int}/availability")]
    public async Task<IActionResult> GetAvailability(
        int id, int areaId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return ForbidWithHint();

        var areaExists = await _db.CommonAreas.AsNoTracking()
            .AnyAsync(a => a.Id == areaId && a.CondominiumId == id && a.DeletedAt == null, ct);
        if (!areaExists) return NotFound();

        var fromUtc = AsUtc(from ?? DateTime.UtcNow);
        var toUtc = AsUtc(to ?? fromUtc.AddDays(30));
        if (fromUtc >= toUtc) return BadRequest(new { error = "Intervalo inválido: 'from' deve ser antes de 'to'." });
        if ((toUtc - fromUtc).TotalDays > MaxAvailabilityRangeDays)
            return BadRequest(new { error = $"O intervalo máximo de consulta é de {MaxAvailabilityRangeDays} dias." });

        var busy = await _db.AreaReservations.AsNoTracking()
            .Where(r => r.CommonAreaId == areaId
                     && (r.Status == AreaReservationStatus.Pending || r.Status == AreaReservationStatus.Approved)
                     && r.StartUtc < toUtc && fromUtc < r.EndUtc)
            .OrderBy(r => r.StartUtc)
            .Select(r => new
            {
                r.StartUtc,
                r.EndUtc,
                Status = r.Status.ToString(),
                Mine = r.UserId == userId.Value
            })
            .ToListAsync(ct);

        return Ok(new { from = fromUtc, to = toUtc, busy });
    }

    // ─── Reservas ────────────────────────────────────────────────────────────

    // POST /api/v1/condominiums/{id}/common-areas/{areaId}/reservations — morador aprovado.
    [HttpPost("{id:int}/common-areas/{areaId:int}/reservations")]
    public async Task<IActionResult> CreateReservation(int id, int areaId, [FromBody] CreateReservationRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return ForbidWithHint();

        if (req.Title != null && req.Title.Length > 120)
            return BadRequest(new { error = "O motivo deve ter no máximo 120 caracteres." });
        if (req.GuestsCount is < 0)
            return BadRequest(new { error = "Número de convidados inválido." });

        var area = await _db.CommonAreas.AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == areaId && a.CondominiumId == id && a.DeletedAt == null && a.IsActive, ct);
        if (area == null) return NotFound(new { error = "Área comum não encontrada ou inativa." });

        var startUtc = AsUtc(req.StartUtc);
        var endUtc = AsUtc(req.EndUtc);
        var error = ValidateReservationWindow(area, startUtc, endUtc, req.GuestsCount, DateTime.UtcNow);
        if (error != null) return BadRequest(new { error });

        if (await HasConflictAsync(areaId, startUtc, endUtc, excludeReservationId: null, approvedOnly: false, ct))
            return Conflict(new { error = "Já existe uma reserva neste horário para esta área." });

        var reservation = new AreaReservation
        {
            CommonAreaId = areaId,
            CondominiumId = id,
            UserId = userId.Value,
            Title = req.Title?.Trim(),
            GuestsCount = req.GuestsCount,
            StartUtc = startUtc,
            EndUtc = endUtc,
            // Aprovação automática vs manual é decidida por área.
            Status = area.RequiresApproval ? AreaReservationStatus.Pending : AreaReservationStatus.Approved,
            CreatedAt = DateTime.UtcNow
        };
        _db.AreaReservations.Add(reservation);
        await _db.SaveChangesAsync(ct);

        if (reservation.Status == AreaReservationStatus.Pending && access.Condo.SindicoUserId != null)
            await _notifications.NotifyReservationPendingAsync(access.Condo.SindicoUserId.Value, userId.Value, id, area.Name, ct);

        return Created($"/api/v1/condominiums/{id}/reservations/{reservation.Id}",
            new { reservation.Id, Status = reservation.Status.ToString() });
    }

    // GET /api/v1/condominiums/{id}/reservations/mine — as próprias reservas.
    [HttpGet("{id:int}/reservations/mine")]
    public async Task<IActionResult> MyReservations(
        int id,
        [FromQuery] string? scope,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (page < 1) page = 1;

        var now = DateTime.UtcNow;
        var query = _db.AreaReservations.AsNoTracking()
            .Where(r => r.CondominiumId == id && r.UserId == userId.Value);

        query = scope?.ToLowerInvariant() switch
        {
            "upcoming" => query.Where(r => r.EndUtc >= now),
            "past" => query.Where(r => r.EndUtc < now),
            _ => query
        };

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.StartUtc)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(r => new
            {
                r.Id,
                r.CommonAreaId,
                AreaName = r.CommonArea != null ? r.CommonArea.Name : null,
                r.Title,
                r.GuestsCount,
                r.StartUtc,
                r.EndUtc,
                Status = r.Status.ToString(),
                r.ReviewNote,
                r.CreatedAt
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // POST /api/v1/condominiums/{id}/reservations/{reservationId}/cancel
    // Dono (antes do início) OU síndico/admin (a qualquer momento).
    [HttpPost("{id:int}/reservations/{reservationId:int}/cancel")]
    public async Task<IActionResult> CancelReservation(int id, int reservationId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();

        var reservation = await _db.AreaReservations
            .FirstOrDefaultAsync(r => r.Id == reservationId && r.CondominiumId == id, ct);
        if (reservation == null) return NotFound();

        var isOwner = reservation.UserId == userId.Value;
        if (!isOwner && !access.CanManage) return Forbid();

        if (reservation.Status is not (AreaReservationStatus.Pending or AreaReservationStatus.Approved))
            return BadRequest(new { error = "Esta reserva não pode mais ser cancelada." });

        var now = DateTime.UtcNow;
        if (isOwner && !access.CanManage && reservation.StartUtc <= now)
            return BadRequest(new { error = "A reserva só pode ser cancelada antes do horário de início." });

        reservation.Status = AreaReservationStatus.Cancelled;
        reservation.CancelledAt = now;
        await _db.SaveChangesAsync(ct);

        return Ok(new { cancelled = true });
    }

    // GET /api/v1/condominiums/{id}/reservations — agenda completa (síndico/admin).
    [HttpGet("{id:int}/reservations")]
    public async Task<IActionResult> ListReservations(
        int id,
        [FromQuery] int? areaId,
        [FromQuery] AreaReservationStatus? status,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (page < 1) page = 1;

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var query = _db.AreaReservations.AsNoTracking()
            .Where(r => r.CondominiumId == id);
        if (areaId.HasValue) query = query.Where(r => r.CommonAreaId == areaId.Value);
        if (status.HasValue) query = query.Where(r => r.Status == status.Value);
        if (from.HasValue)
        {
            var fromUtc = AsUtc(from.Value);
            query = query.Where(r => r.EndUtc >= fromUtc);
        }
        if (to.HasValue)
        {
            var toUtc = AsUtc(to.Value);
            query = query.Where(r => r.StartUtc <= toUtc);
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(r => r.StartUtc)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(r => new
            {
                r.Id,
                r.CommonAreaId,
                AreaName = r.CommonArea != null ? r.CommonArea.Name : null,
                r.UserId,
                ResidentName = r.User != null ? r.User.DisplayName : null,
                r.Title,
                r.GuestsCount,
                r.StartUtc,
                r.EndUtc,
                Status = r.Status.ToString(),
                r.ReviewNote,
                r.CreatedAt
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GET /api/v1/condominiums/{id}/reservations/pending — fila de aprovação (síndico/admin).
    [HttpGet("{id:int}/reservations/pending")]
    public async Task<IActionResult> PendingReservations(int id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        if (page < 1) page = 1;

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var items = await _db.AreaReservations.AsNoTracking()
            .Where(r => r.CondominiumId == id && r.Status == AreaReservationStatus.Pending)
            .OrderBy(r => r.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(r => new
            {
                r.Id,
                r.CommonAreaId,
                AreaName = r.CommonArea != null ? r.CommonArea.Name : null,
                r.UserId,
                ResidentName = r.User != null ? r.User.DisplayName : null,
                r.Title,
                r.GuestsCount,
                r.StartUtc,
                r.EndUtc,
                r.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // POST /api/v1/condominiums/{id}/reservations/{reservationId}/approve — síndico/admin.
    // Revalida conflito contra Approved no momento da aprovação (não aprova duas no mesmo horário).
    [HttpPost("{id:int}/reservations/{reservationId:int}/approve")]
    public async Task<IActionResult> ApproveReservation(int id, int reservationId, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var reservation = await _db.AreaReservations
            .Include(r => r.CommonArea)
            .FirstOrDefaultAsync(r => r.Id == reservationId && r.CondominiumId == id, ct);
        if (reservation == null) return NotFound();
        if (reservation.Status != AreaReservationStatus.Pending)
            return BadRequest(new { error = "Esta reserva já foi processada." });

        if (await HasConflictAsync(reservation.CommonAreaId, reservation.StartUtc, reservation.EndUtc,
                excludeReservationId: reservation.Id, approvedOnly: true, ct))
            return Conflict(new { error = "O horário já foi ocupado por outra reserva aprovada." });

        reservation.Status = AreaReservationStatus.Approved;
        reservation.ReviewedByUserId = userId.Value;
        reservation.ReviewedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _notifications.NotifyReservationReviewedAsync(reservation.UserId, userId.Value, id,
            reservation.CommonArea?.Name ?? "área comum", approved: true, ct);
        return Ok(new { approved = true });
    }

    // POST /api/v1/condominiums/{id}/reservations/{reservationId}/reject — síndico/admin.
    [HttpPost("{id:int}/reservations/{reservationId:int}/reject")]
    public async Task<IActionResult> RejectReservation(int id, int reservationId, [FromBody] ReviewReservationRequest? req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var access = await LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var reservation = await _db.AreaReservations
            .Include(r => r.CommonArea)
            .FirstOrDefaultAsync(r => r.Id == reservationId && r.CondominiumId == id, ct);
        if (reservation == null) return NotFound();
        if (reservation.Status != AreaReservationStatus.Pending)
            return BadRequest(new { error = "Esta reserva já foi processada." });

        reservation.Status = AreaReservationStatus.Rejected;
        reservation.ReviewedByUserId = userId.Value;
        reservation.ReviewedAt = DateTime.UtcNow;
        reservation.ReviewNote = req?.Note?.Trim();
        await _db.SaveChangesAsync(ct);

        await _notifications.NotifyReservationReviewedAsync(reservation.UserId, userId.Value, id,
            reservation.CommonArea?.Name ?? "área comum", approved: false, ct);
        return Ok(new { rejected = true });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    // Wave T: autorização extraída para ICondominiumAccessService (compartilhada
    // com CondominiumAnnouncementsController) — zero duplicação da lógica.
    private Task<CondoAccess?> LoadAccessAsync(int condominiumId, Guid userId, CancellationToken ct)
        => _access.LoadAccessAsync(condominiumId, userId, ct);

    // 403 com dica de próximo passo para quem ainda não é morador aprovado.
    private static ObjectResult ForbidWithHint() => CondominiumAccessService.ForbidWithHint();

    private static string? ValidateAreaFields(
        string name, string? description, string? rules, int? capacity,
        TimeOnly? openTime, TimeOnly? closeTime,
        int? minAdvanceHours, int? maxAdvanceDays, int? maxDurationMinutes)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
            return "O nome deve ter entre 1 e 120 caracteres.";
        if (description != null && description.Length > 1000)
            return "Descrição muito longa (máx 1000 caracteres).";
        if (rules != null && rules.Length > 2000)
            return "Regras muito longas (máx 2000 caracteres).";
        if (capacity is <= 0)
            return "A capacidade deve ser maior que zero.";
        if (openTime.HasValue && closeTime.HasValue && openTime.Value >= closeTime.Value)
            return "O horário de abertura deve ser antes do fechamento.";
        if (minAdvanceHours is < 0)
            return "A antecedência mínima não pode ser negativa.";
        if (maxAdvanceDays is <= 0 or > 365)
            return "A antecedência máxima deve ser entre 1 e 365 dias.";
        if (maxDurationMinutes is <= 0)
            return "A duração máxima deve ser maior que zero.";
        return null;
    }

    private static string? ValidateReservationWindow(CommonArea area, DateTime startUtc, DateTime endUtc, int? guestsCount, DateTime nowUtc)
    {
        if (startUtc >= endUtc)
            return "O horário de início deve ser antes do término.";
        if (startUtc < nowUtc.AddHours(area.MinAdvanceHours))
            return area.MinAdvanceHours > 0
                ? $"A reserva exige antecedência mínima de {area.MinAdvanceHours} hora(s)."
                : "Não é possível reservar no passado.";
        if (startUtc > nowUtc.AddDays(area.MaxAdvanceDays))
            return $"A reserva pode ser feita com no máximo {area.MaxAdvanceDays} dias de antecedência.";
        if (area.MaxDurationMinutes.HasValue && (endUtc - startUtc).TotalMinutes > area.MaxDurationMinutes.Value)
            return $"A duração máxima da reserva é de {area.MaxDurationMinutes.Value} minutos.";
        if (guestsCount.HasValue && area.Capacity.HasValue && guestsCount.Value > area.Capacity.Value)
            return $"A lotação máxima desta área é de {area.Capacity.Value} pessoas.";

        if (area.OpenTime.HasValue || area.CloseTime.HasValue)
        {
            // Com janela diária definida, a reserva não pode cruzar a meia-noite.
            if (startUtc.Date != endUtc.Date)
                return "A reserva não pode cruzar a meia-noite fora da janela de funcionamento.";
            var start = TimeOnly.FromDateTime(startUtc);
            var end = TimeOnly.FromDateTime(endUtc);
            if (area.OpenTime.HasValue && start < area.OpenTime.Value)
                return $"A área abre às {area.OpenTime.Value:HH:mm} (UTC).";
            if (area.CloseTime.HasValue && end > area.CloseTime.Value)
                return $"A área fecha às {area.CloseTime.Value:HH:mm} (UTC).";
        }
        return null;
    }

    // Colisão de intervalos [StartA,EndA) x [StartB,EndB): StartA<EndB AND StartB<EndA.
    private Task<bool> HasConflictAsync(int areaId, DateTime startUtc, DateTime endUtc, int? excludeReservationId, bool approvedOnly, CancellationToken ct)
    {
        var query = _db.AreaReservations
            .Where(r => r.CommonAreaId == areaId && r.StartUtc < endUtc && startUtc < r.EndUtc);
        query = approvedOnly
            ? query.Where(r => r.Status == AreaReservationStatus.Approved)
            : query.Where(r => r.Status == AreaReservationStatus.Approved || r.Status == AreaReservationStatus.Pending);
        if (excludeReservationId.HasValue)
            query = query.Where(r => r.Id != excludeReservationId.Value);
        return query.AnyAsync(ct);
    }

    // Normaliza para UTC: Unspecified é tratado como UTC (contrato da API).
    private static DateTime AsUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
    };

    private Guid? GetUserId() => User.GetUserId();
}

public record CreateResidentRequest(string? Unit);

public record ReviewResidentRequest(string? Note);

public record CreateCommonAreaRequest(
    string Name, string? Description, string? Rules, int? Capacity, string? CoverImageUrl,
    bool? RequiresApproval, TimeOnly? OpenTime, TimeOnly? CloseTime,
    int? MinAdvanceHours, int? MaxAdvanceDays, int? MaxDurationMinutes);

public record UpdateCommonAreaRequest(
    string? Name, string? Description, string? Rules, int? Capacity, string? CoverImageUrl,
    bool? RequiresApproval, TimeOnly? OpenTime, TimeOnly? CloseTime,
    int? MinAdvanceHours, int? MaxAdvanceDays, int? MaxDurationMinutes, bool? IsActive);

public record CreateReservationRequest(
    DateTime StartUtc, DateTime EndUtc, string? Title, int? GuestsCount);

public record ReviewReservationRequest(string? Note);
