using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

// Wave T — Comunicados oficiais do síndico (mural do condomínio).
// Escrita (publicar/editar/apagar/fixar) restrita a CanManage (síndico/admin);
// leitura para CanUse (morador aprovado + gestão). Autorização compartilhada
// via ICondominiumAccessService (mesma lógica das reservas — zero duplicação).
// Todos os DateTime trafegam em UTC.
[ApiController]
[Route("api/v1/condominiums")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class CondominiumAnnouncementsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICondominiumAccessService _access;
    private readonly INotificationService _notifications;
    private readonly ILogger<CondominiumAnnouncementsController> _logger;
    private const int DefaultPageSize = 20;
    private const int TitleMaxLength = 160;
    private const int BodyMaxLength = 20000;
    private const int BodyPreviewLength = 280;

    public CondominiumAnnouncementsController(
        AppDbContext db,
        ICondominiumAccessService access,
        INotificationService notifications,
        ILogger<CondominiumAnnouncementsController> logger)
    {
        _db = db;
        _access = access;
        _notifications = notifications;
        _logger = logger;
    }

    // POST /api/v1/condominiums/{id}/announcements — publicar (síndico/admin).
    [HttpPost("{id:int}/announcements")]
    public async Task<IActionResult> CreateAnnouncement(int id, [FromBody] CreateAnnouncementRequest req, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var now = DateTime.UtcNow;
        var error = ValidateAnnouncementFields(req.Title, req.Body, req.ExpiresAt, now, titleRequired: true, bodyRequired: true);
        if (error != null) return BadRequest(new { error });

        var announcement = new CondominiumAnnouncement
        {
            CondominiumId = id,
            Title = req.Title!.Trim(),
            Body = req.Body!.Trim(),
            AuthorUserId = userId.Value,
            IsImportant = req.IsImportant ?? false,
            IsPinned = req.IsPinned ?? false,
            PublishedAt = now,
            ExpiresAt = req.ExpiresAt.HasValue ? AsUtc(req.ExpiresAt.Value) : null,
            CreatedAt = now
        };
        _db.Announcements.Add(announcement);
        await _db.SaveChangesAsync(ct);

        // Batch a todos os moradores aprovados: rows aguardadas dentro do método;
        // pushes Expo são fire-and-forget lá dentro (não bloqueiam a resposta).
        await _notifications.NotifyAnnouncementPublishedAsync(
            id, userId.Value, announcement.Id, announcement.Title, access.Condo.Name, announcement.IsImportant, ct);

        return Created($"/api/v1/condominiums/{id}/announcements/{announcement.Id}", new { announcement.Id });
    }

    // GET /api/v1/condominiums/{id}/announcements — listagem do morador.
    // Exclui apagados e expirados. Fixados primeiro, depois recentes.
    [HttpGet("{id:int}/announcements")]
    public async Task<IActionResult> ListAnnouncements(int id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        if (page < 1) page = 1;

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return CondominiumAccessService.ForbidWithHint();

        var now = DateTime.UtcNow;
        var query = _db.Announcements.AsNoTracking()
            .Where(a => a.CondominiumId == id
                     && a.DeletedAt == null
                     && (a.ExpiresAt == null || a.ExpiresAt > now));

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.IsPinned)
            .ThenByDescending(a => a.PublishedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(a => new
            {
                a.Id,
                a.Title,
                BodyPreview = a.Body.Length <= BodyPreviewLength ? a.Body : a.Body.Substring(0, BodyPreviewLength),
                a.IsImportant,
                a.IsPinned,
                a.PublishedAt,
                a.ExpiresAt,
                AuthorName = a.Author != null ? a.Author.DisplayName : null,
                AuthorVerified = a.Author != null && a.Author.IsVerified
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GET /api/v1/condominiums/{id}/announcements/manage — painel de gestão.
    // Inclui expirados (histórico, flag isExpired); ?includeDeleted=true inclui soft-deleted.
    [HttpGet("{id:int}/announcements/manage")]
    public async Task<IActionResult> ListAnnouncementsForManagement(
        int id,
        [FromQuery] bool includeDeleted = false,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();
        if (page < 1) page = 1;

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var now = DateTime.UtcNow;
        var query = _db.Announcements.AsNoTracking()
            .Where(a => a.CondominiumId == id);
        if (!includeDeleted) query = query.Where(a => a.DeletedAt == null);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(a => a.IsPinned)
            .ThenByDescending(a => a.PublishedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(a => new
            {
                a.Id,
                a.Title,
                BodyPreview = a.Body.Length <= BodyPreviewLength ? a.Body : a.Body.Substring(0, BodyPreviewLength),
                a.IsImportant,
                a.IsPinned,
                a.PublishedAt,
                a.ExpiresAt,
                IsExpired = a.ExpiresAt != null && a.ExpiresAt <= now,
                a.DeletedAt,
                AuthorName = a.Author != null ? a.Author.DisplayName : null,
                AuthorVerified = a.Author != null && a.Author.IsVerified,
                a.CreatedAt,
                a.UpdatedAt
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GET /api/v1/condominiums/{id}/announcements/{announcementId} — detalhe completo.
    // Morador: 404 se apagado ou expirado. Gestão: vê expirado (não apagado).
    [HttpGet("{id:int}/announcements/{announcementId:int}")]
    public async Task<IActionResult> GetAnnouncement(int id, int announcementId, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanUse) return CondominiumAccessService.ForbidWithHint();

        var announcement = await _db.Announcements.AsNoTracking()
            .Where(a => a.Id == announcementId && a.CondominiumId == id && a.DeletedAt == null)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.Body,
                a.IsImportant,
                a.IsPinned,
                a.PublishedAt,
                a.ExpiresAt,
                AuthorName = a.Author != null ? a.Author.DisplayName : null,
                AuthorVerified = a.Author != null && a.Author.IsVerified,
                a.CreatedAt,
                a.UpdatedAt
            })
            .FirstOrDefaultAsync(ct);

        if (announcement == null) return NotFound();

        // Expirado some para o morador; gestão mantém acesso (histórico).
        var isExpired = announcement.ExpiresAt != null && announcement.ExpiresAt <= DateTime.UtcNow;
        if (isExpired && !access.CanManage) return NotFound();

        return Ok(announcement);
    }

    // PUT /api/v1/condominiums/{id}/announcements/{announcementId} — editar (patch).
    // Edição é silenciosa: NÃO re-notifica moradores.
    [HttpPut("{id:int}/announcements/{announcementId:int}")]
    public async Task<IActionResult> UpdateAnnouncement(int id, int announcementId, [FromBody] UpdateAnnouncementRequest req, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var announcement = await _db.Announcements
            .FirstOrDefaultAsync(a => a.Id == announcementId && a.CondominiumId == id && a.DeletedAt == null, ct);
        if (announcement == null) return NotFound();

        var now = DateTime.UtcNow;
        var error = ValidateAnnouncementFields(req.Title, req.Body, req.ExpiresAt, now, titleRequired: false, bodyRequired: false);
        if (error != null) return BadRequest(new { error });

        if (req.Title != null) announcement.Title = req.Title.Trim();
        if (req.Body != null) announcement.Body = req.Body.Trim();
        if (req.IsImportant.HasValue) announcement.IsImportant = req.IsImportant.Value;
        if (req.IsPinned.HasValue) announcement.IsPinned = req.IsPinned.Value;
        if (req.ExpiresAt.HasValue) announcement.ExpiresAt = AsUtc(req.ExpiresAt.Value);
        announcement.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/condominiums/{id}/announcements/{announcementId} — soft delete.
    [HttpDelete("{id:int}/announcements/{announcementId:int}")]
    public async Task<IActionResult> DeleteAnnouncement(int id, int announcementId, CancellationToken ct = default)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var announcement = await _db.Announcements
            .FirstOrDefaultAsync(a => a.Id == announcementId && a.CondominiumId == id && a.DeletedAt == null, ct);
        if (announcement == null) return NotFound();

        announcement.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { deleted = true });
    }

    // POST /api/v1/condominiums/{id}/announcements/{announcementId}/pin — fixar no topo.
    [HttpPost("{id:int}/announcements/{announcementId:int}/pin")]
    public Task<IActionResult> PinAnnouncement(int id, int announcementId, CancellationToken ct = default)
        => SetPinnedAsync(id, announcementId, pinned: true, ct);

    // POST /api/v1/condominiums/{id}/announcements/{announcementId}/unpin — desafixar.
    [HttpPost("{id:int}/announcements/{announcementId:int}/unpin")]
    public Task<IActionResult> UnpinAnnouncement(int id, int announcementId, CancellationToken ct = default)
        => SetPinnedAsync(id, announcementId, pinned: false, ct);

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private async Task<IActionResult> SetPinnedAsync(int id, int announcementId, bool pinned, CancellationToken ct)
    {
        var userId = User.GetUserId();
        if (userId == null) return Unauthorized();

        var access = await _access.LoadAccessAsync(id, userId.Value, ct);
        if (access == null) return NotFound();
        if (!access.CanManage) return Forbid();

        var announcement = await _db.Announcements
            .FirstOrDefaultAsync(a => a.Id == announcementId && a.CondominiumId == id && a.DeletedAt == null, ct);
        if (announcement == null) return NotFound();

        announcement.IsPinned = pinned;
        announcement.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(new { pinned });
    }

    // Erros em português, no mesmo estilo de ValidateAreaFields (reservas).
    private static string? ValidateAnnouncementFields(string? title, string? body, DateTime? expiresAt, DateTime nowUtc, bool titleRequired, bool bodyRequired)
    {
        if (titleRequired || title != null)
        {
            if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > TitleMaxLength)
                return $"O título deve ter entre 1 e {TitleMaxLength} caracteres.";
        }
        if (bodyRequired || body != null)
        {
            if (string.IsNullOrWhiteSpace(body) || body.Trim().Length > BodyMaxLength)
                return $"O texto do comunicado deve ter entre 1 e {BodyMaxLength} caracteres.";
        }
        if (expiresAt.HasValue && AsUtc(expiresAt.Value) <= nowUtc)
            return "A data de expiração deve ser no futuro.";
        return null;
    }

    // Normaliza para UTC: Unspecified é tratado como UTC (contrato da API).
    private static DateTime AsUtc(DateTime dt) => dt.Kind switch
    {
        DateTimeKind.Utc => dt,
        DateTimeKind.Local => dt.ToUniversalTime(),
        _ => DateTime.SpecifyKind(dt, DateTimeKind.Utc)
    };
}

public record CreateAnnouncementRequest(
    string? Title, string? Body, bool? IsImportant, bool? IsPinned, DateTime? ExpiresAt);

public record UpdateAnnouncementRequest(
    string? Title, string? Body, bool? IsImportant, bool? IsPinned, DateTime? ExpiresAt);
