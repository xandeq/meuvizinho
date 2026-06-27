using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Controllers.v1;

// Wave P — Diretório de grupos de WhatsApp do bairro (diferencial Meu Vizinho).
// Moradores submetem links; admin verifica; só grupos Verified ficam públicos.
[ApiController]
[Route("api/v1/whatsapp-groups")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class WhatsAppGroupsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<WhatsAppGroupsController> _logger;
    private const int DefaultPageSize = 20;

    public WhatsAppGroupsController(AppDbContext db, ILogger<WhatsAppGroupsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/v1/whatsapp-groups?bairroId={n}&kind=&search=&page=
    // Lista apenas grupos verificados do bairro.
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(
        [FromQuery] int bairroId,
        [FromQuery] string? kind,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;

        var query = _db.WhatsAppGroups
            .AsNoTracking()
            .Where(g => g.BairroId == bairroId
                     && g.DeletedAt == null
                     && g.Status == WhatsAppGroupStatus.Verified);

        if (!string.IsNullOrWhiteSpace(kind) && Enum.TryParse<WhatsAppGroupKind>(kind, true, out var k))
            query = query.Where(g => g.Kind == k);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var safe = EscapeLike(search.Trim());
            query = query.Where(g => EF.Functions.Like(g.Name, $"%{safe}%")
                                  || EF.Functions.Like(g.Description!, $"%{safe}%"));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(g => g.IsManagedByPlatform)
            .ThenByDescending(g => g.MemberCountApprox)
            .ThenByDescending(g => g.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Description,
                Kind = g.Kind.ToString(),
                g.CoverImageUrl,
                g.MemberCountApprox,
                g.IsManagedByPlatform,
                g.ClickCount,
                g.CondominiumId,
                CondominiumName = g.Condominium != null ? g.Condominium.Name : null,
                g.CreatedAt
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GET /api/v1/whatsapp-groups/{id} — detalhe (inclui o link de convite).
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        var isAdmin = await IsAdminAsync(userId, ct);

        var g = await _db.WhatsAppGroups
            .AsNoTracking()
            .Where(x => x.Id == id && x.DeletedAt == null)
            .Select(x => new
            {
                x.Id,
                x.BairroId,
                x.Name,
                x.Description,
                Kind = x.Kind.ToString(),
                x.InviteUrl,
                x.CoverImageUrl,
                x.MemberCountApprox,
                x.IsManagedByPlatform,
                x.ClickCount,
                Status = x.Status.ToString(),
                x.CondominiumId,
                CondominiumName = x.Condominium != null ? x.Condominium.Name : null,
                x.SubmittedByUserId,
                x.VerifiedAt,
                x.CreatedAt
            })
            .FirstOrDefaultAsync(ct);

        if (g == null) return NotFound();

        // Grupos não verificados só são visíveis ao autor ou admin.
        if (g.Status != WhatsAppGroupStatus.Verified.ToString()
            && g.SubmittedByUserId != userId && !isAdmin)
            return NotFound();

        return Ok(g);
    }

    // POST /api/v1/whatsapp-groups — submeter um grupo (vai para moderação).
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitWhatsAppGroupRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Length > 120)
            return BadRequest(new { error = "O nome deve ter entre 1 e 120 caracteres." });
        if (req.BairroId <= 0)
            return BadRequest(new { error = "Bairro inválido." });
        if (!IsValidInviteUrl(req.InviteUrl))
            return BadRequest(new { error = "O link deve ser um convite válido do WhatsApp (https://chat.whatsapp.com/...)." });
        if (req.Description != null && req.Description.Length > 500)
            return BadRequest(new { error = "A descrição deve ter no máximo 500 caracteres." });

        // Evita duplicidade do mesmo link no mesmo bairro (rejeitados podem reenviar).
        var normalized = req.InviteUrl.Trim();
        var dup = await _db.WhatsAppGroups
            .AnyAsync(g => g.BairroId == req.BairroId && g.InviteUrl == normalized
                        && g.DeletedAt == null && g.Status != WhatsAppGroupStatus.Rejected, ct);
        if (dup) return Conflict(new { error = "Este grupo já foi cadastrado." });

        if (req.CondominiumId.HasValue)
        {
            var condoOk = await _db.Condominiums.AnyAsync(c => c.Id == req.CondominiumId && c.DeletedAt == null, ct);
            if (!condoOk) return BadRequest(new { error = "Condomínio inválido." });
        }

        var group = new WhatsAppGroup
        {
            BairroId = req.BairroId,
            CondominiumId = req.CondominiumId,
            Name = req.Name.Trim(),
            Description = req.Description?.Trim(),
            InviteUrl = normalized,
            Kind = req.Kind ?? WhatsAppGroupKind.Bairro,
            CoverImageUrl = req.CoverImageUrl,
            MemberCountApprox = req.MemberCountApprox,
            Status = WhatsAppGroupStatus.PendingReview,
            SubmittedByUserId = userId.Value,
            CreatedAt = DateTime.UtcNow
        };
        _db.WhatsAppGroups.Add(group);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Backstop do índice único (BairroId, InviteUrl) contra corrida TOCTOU.
            return Conflict(new { error = "Este grupo já foi cadastrado." });
        }

        return Created($"/api/v1/whatsapp-groups/{group.Id}", new { group.Id, Status = group.Status.ToString() });
    }

    // POST /api/v1/whatsapp-groups/{id}/click — registra clique e retorna o link.
    [HttpPost("{id:int}/click")]
    [AllowAnonymous]
    public async Task<IActionResult> Click(int id, CancellationToken ct = default)
    {
        var inviteUrl = await _db.WhatsAppGroups.AsNoTracking()
            .Where(g => g.Id == id && g.DeletedAt == null && g.Status == WhatsAppGroupStatus.Verified)
            .Select(g => g.InviteUrl)
            .FirstOrDefaultAsync(ct);
        if (inviteUrl == null) return NotFound();

        // Incremento atômico — não perde cliques sob concorrência (vs. read-modify-write).
        await _db.WhatsAppGroups
            .Where(g => g.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(g => g.ClickCount, g => g.ClickCount + 1), ct);

        var clickCount = await _db.WhatsAppGroups.AsNoTracking()
            .Where(g => g.Id == id).Select(g => g.ClickCount).FirstAsync(ct);

        return Ok(new { inviteUrl, clickCount });
    }

    // PUT /api/v1/whatsapp-groups/{id} — autor ou admin.
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateWhatsAppGroupRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var group = await _db.WhatsAppGroups.FirstOrDefaultAsync(g => g.Id == id && g.DeletedAt == null, ct);
        if (group == null) return NotFound();

        var isAdmin = await IsAdminAsync(userId, ct);
        if (group.SubmittedByUserId != userId && !isAdmin) return Forbid();

        if (req.Name != null)
        {
            if (req.Name.Length is < 1 or > 120) return BadRequest(new { error = "Nome inválido." });
            group.Name = req.Name.Trim();
        }
        if (req.Description != null)
        {
            if (req.Description.Length > 500) return BadRequest(new { error = "Descrição muito longa." });
            group.Description = req.Description.Trim();
        }
        if (req.InviteUrl != null)
        {
            if (!IsValidInviteUrl(req.InviteUrl)) return BadRequest(new { error = "Link do WhatsApp inválido." });
            group.InviteUrl = req.InviteUrl.Trim();
        }
        if (req.Kind.HasValue) group.Kind = req.Kind.Value;
        if (req.CoverImageUrl != null) group.CoverImageUrl = req.CoverImageUrl;
        if (req.MemberCountApprox.HasValue) group.MemberCountApprox = req.MemberCountApprox;

        // Qualquer edição de conteúdo por não-admin re-exige verificação — evita
        // publicar conteúdo abusivo editando um grupo já aprovado (bypass de moderação).
        var contentChanged = req.Name != null || req.Description != null
                          || req.InviteUrl != null || req.CoverImageUrl != null;
        if (!isAdmin && contentChanged)
            group.Status = WhatsAppGroupStatus.PendingReview;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // DELETE /api/v1/whatsapp-groups/{id} — autor ou admin (soft delete).
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var group = await _db.WhatsAppGroups.FirstOrDefaultAsync(g => g.Id == id && g.DeletedAt == null, ct);
        if (group == null) return NotFound();

        var isAdmin = await IsAdminAsync(userId, ct);
        if (group.SubmittedByUserId != userId && !isAdmin) return Forbid();

        group.DeletedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Moderação (admin) ───────────────────────────────────────────────────

    // GET /api/v1/whatsapp-groups/pending?bairroId={n}
    [HttpGet("pending")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Pending([FromQuery] int? bairroId, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        var query = _db.WhatsAppGroups.AsNoTracking()
            .Where(g => g.DeletedAt == null && g.Status == WhatsAppGroupStatus.PendingReview);
        if (bairroId.HasValue) query = query.Where(g => g.BairroId == bairroId.Value);

        var items = await query
            .OrderBy(g => g.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(g => new
            {
                g.Id,
                g.BairroId,
                g.Name,
                g.Description,
                Kind = g.Kind.ToString(),
                g.InviteUrl,
                g.MemberCountApprox,
                g.CondominiumId,
                SubmittedBy = g.SubmittedByUser != null ? g.SubmittedByUser.DisplayName : null,
                g.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // POST /api/v1/whatsapp-groups/{id}/verify
    [HttpPost("{id:int}/verify")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Verify(int id, [FromBody] VerifyWhatsAppGroupRequest? req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        var group = await _db.WhatsAppGroups.FirstOrDefaultAsync(g => g.Id == id && g.DeletedAt == null, ct);
        if (group == null) return NotFound();

        group.Status = WhatsAppGroupStatus.Verified;
        group.VerifiedByUserId = userId;
        group.VerifiedAt = DateTime.UtcNow;
        group.RejectionReason = null;
        if (req?.IsManagedByPlatform.HasValue == true) group.IsManagedByPlatform = req.IsManagedByPlatform.Value;
        await _db.SaveChangesAsync(ct);

        return Ok(new { verified = true });
    }

    // POST /api/v1/whatsapp-groups/{id}/reject
    [HttpPost("{id:int}/reject")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectWhatsAppGroupRequest req, CancellationToken ct = default)
    {
        var group = await _db.WhatsAppGroups.FirstOrDefaultAsync(g => g.Id == id && g.DeletedAt == null, ct);
        if (group == null) return NotFound();

        group.Status = WhatsAppGroupStatus.Rejected;
        group.RejectionReason = string.IsNullOrWhiteSpace(req?.Reason) ? "Não atende às diretrizes." : req!.Reason!.Trim();
        // Limpa marcas de verificação para não deixar estado inconsistente.
        group.VerifiedAt = null;
        group.VerifiedByUserId = null;
        await _db.SaveChangesAsync(ct);

        return Ok(new { rejected = true });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    internal static bool IsValidInviteUrl(string? url) =>
        !string.IsNullOrWhiteSpace(url)
        && Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps
        && uri.Host.Equals("chat.whatsapp.com", StringComparison.OrdinalIgnoreCase)
        && uri.AbsolutePath.Trim('/').Length >= 6;

    private static string EscapeLike(string s) =>
        s.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");

    private async Task<bool> IsAdminAsync(Guid? userId, CancellationToken ct)
    {
        if (userId == null) return false;
        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId.Value)
            .Select(u => u.IsAdmin)
            .FirstOrDefaultAsync(ct);
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public record SubmitWhatsAppGroupRequest(
    int BairroId, string Name, string InviteUrl,
    WhatsAppGroupKind? Kind, string? Description,
    string? CoverImageUrl, int? MemberCountApprox, int? CondominiumId);

public record UpdateWhatsAppGroupRequest(
    string? Name, string? Description, string? InviteUrl,
    WhatsAppGroupKind? Kind, string? CoverImageUrl, int? MemberCountApprox);

public record VerifyWhatsAppGroupRequest(bool? IsManagedByPlatform);

public record RejectWhatsAppGroupRequest(string? Reason);
