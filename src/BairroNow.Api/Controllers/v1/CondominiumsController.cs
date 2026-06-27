using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Controllers.v1;

// Wave P — Perfis de condomínio + reivindicação de síndico.
// O síndico assume o perfil; o WhatsApp comercial @meuvizinho permanece admin
// dos grupos (controle humano da transferência via aprovação de admin).
[ApiController]
[Route("api/v1/condominiums")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class CondominiumsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<CondominiumsController> _logger;
    private const int DefaultPageSize = 20;

    public CondominiumsController(AppDbContext db, ILogger<CondominiumsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    // GET /api/v1/condominiums?bairroId={n}&search=&page=
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List(
        [FromQuery] int bairroId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;

        var query = _db.Condominiums
            .AsNoTracking()
            .Where(c => c.BairroId == bairroId && c.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var safe = EscapeLike(search.Trim());
            query = query.Where(c => EF.Functions.Like(c.Name, $"%{safe}%")
                                  || EF.Functions.Like(c.AddressLine!, $"%{safe}%"));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.Description,
                c.AddressLine,
                c.Cep,
                c.CoverImageUrl,
                c.UnitsCount,
                Status = c.Status.ToString(),
                SindicoName = c.SindicoUser != null ? c.SindicoUser.DisplayName : null,
                GroupCount = c.WhatsAppGroups.Count(g => g.DeletedAt == null && g.Status == WhatsAppGroupStatus.Verified),
                c.CreatedAt
            })
            .ToListAsync(ct);

        Response.Headers["X-Pagination"] = $"page={page},total={total}";
        return Ok(items);
    }

    // GET /api/v1/condominiums/{id} — detalhe + grupos verificados + minha reivindicação.
    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();

        var condo = await _db.Condominiums
            .AsNoTracking()
            .Where(c => c.Id == id && c.DeletedAt == null)
            .Select(c => new
            {
                c.Id,
                c.BairroId,
                c.Name,
                c.Description,
                c.AddressLine,
                c.Cep,
                c.CoverImageUrl,
                c.UnitsCount,
                Status = c.Status.ToString(),
                c.SindicoUserId,
                SindicoName = c.SindicoUser != null ? c.SindicoUser.DisplayName : null,
                SindicoRole = c.SindicoRole != null ? c.SindicoRole.ToString() : null,
                c.IsManagedByPlatform,
                c.CreatedAt,
                Groups = c.WhatsAppGroups
                    .Where(g => g.DeletedAt == null && g.Status == WhatsAppGroupStatus.Verified)
                    .OrderByDescending(g => g.IsManagedByPlatform)
                    .Select(g => new
                    {
                        g.Id,
                        g.Name,
                        Kind = g.Kind.ToString(),
                        g.MemberCountApprox,
                        g.IsManagedByPlatform
                    }).ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (condo == null) return NotFound();

        string? myClaimStatus = null;
        if (userId != null)
        {
            myClaimStatus = await _db.CondominiumClaims.AsNoTracking()
                .Where(cl => cl.CondominiumId == id && cl.UserId == userId.Value)
                .OrderByDescending(cl => cl.CreatedAt)
                .Select(cl => cl.Status.ToString())
                .FirstOrDefaultAsync(ct);
        }

        return Ok(new { condo.Id, condo.BairroId, condo.Name, condo.Description, condo.AddressLine,
            condo.Cep, condo.CoverImageUrl, condo.UnitsCount, condo.Status, condo.SindicoUserId,
            condo.SindicoName, condo.SindicoRole, condo.IsManagedByPlatform, condo.CreatedAt,
            condo.Groups, MyClaimStatus = myClaimStatus,
            IsMySindico = userId != null && condo.SindicoUserId == userId });
    }

    // POST /api/v1/condominiums — cadastrar um condomínio.
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCondominiumRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Name) || req.Name.Length > 120)
            return BadRequest(new { error = "O nome deve ter entre 1 e 120 caracteres." });
        if (req.BairroId <= 0)
            return BadRequest(new { error = "Bairro inválido." });
        if (req.Description != null && req.Description.Length > 1000)
            return BadRequest(new { error = "Descrição muito longa." });

        var name = req.Name.Trim();
        var dup = await _db.Condominiums
            .AnyAsync(c => c.BairroId == req.BairroId && c.Name == name && c.DeletedAt == null, ct);
        if (dup) return Conflict(new { error = "Já existe um condomínio com esse nome neste bairro." });

        var condo = new Condominium
        {
            BairroId = req.BairroId,
            Name = name,
            Description = req.Description?.Trim(),
            AddressLine = req.AddressLine?.Trim(),
            Cep = req.Cep?.Trim(),
            CoverImageUrl = req.CoverImageUrl,
            UnitsCount = req.UnitsCount,
            Status = CondominiumStatus.Unclaimed,
            CreatedByUserId = userId.Value,
            IsManagedByPlatform = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Condominiums.Add(condo);
        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Backstop do índice único (BairroId, Name) contra corrida TOCTOU.
            return Conflict(new { error = "Já existe um condomínio com esse nome neste bairro." });
        }

        return Created($"/api/v1/condominiums/{condo.Id}", new { condo.Id, condo.Name });
    }

    // PUT /api/v1/condominiums/{id} — síndico do condomínio ou admin.
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCondominiumRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var condo = await _db.Condominiums.FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null, ct);
        if (condo == null) return NotFound();

        var isAdmin = await IsAdminAsync(userId, ct);
        if (condo.SindicoUserId != userId && !isAdmin) return Forbid();

        if (req.Name != null)
        {
            if (req.Name.Length is < 1 or > 120) return BadRequest(new { error = "Nome inválido." });
            condo.Name = req.Name.Trim();
        }
        if (req.Description != null) condo.Description = req.Description.Trim();
        if (req.AddressLine != null) condo.AddressLine = req.AddressLine.Trim();
        if (req.Cep != null) condo.Cep = req.Cep.Trim();
        if (req.CoverImageUrl != null) condo.CoverImageUrl = req.CoverImageUrl;
        if (req.UnitsCount.HasValue) condo.UnitsCount = req.UnitsCount;

        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ─── Reivindicação (claim) ───────────────────────────────────────────────

    // POST /api/v1/condominiums/{id}/claims — solicitar virar síndico.
    [HttpPost("{id:int}/claims")]
    public async Task<IActionResult> Claim(int id, [FromBody] CreateClaimRequest req, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(req.Justification) || req.Justification.Length is < 10 or > 1000)
            return BadRequest(new { error = "Explique por que você administra este condomínio (10 a 1000 caracteres)." });

        var condo = await _db.Condominiums.FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null, ct);
        if (condo == null) return NotFound();
        if (condo.SindicoUserId == userId) return Conflict(new { error = "Você já é o síndico deste condomínio." });

        var hasPending = await _db.CondominiumClaims
            .AnyAsync(cl => cl.CondominiumId == id && cl.UserId == userId.Value && cl.Status == CondominiumClaimStatus.Pending, ct);
        if (hasPending) return Conflict(new { error = "Você já tem uma solicitação pendente para este condomínio." });

        var claim = new CondominiumClaim
        {
            CondominiumId = id,
            UserId = userId.Value,
            RequestedRole = req.RequestedRole ?? CondominiumRole.Sindico,
            Justification = req.Justification.Trim(),
            EvidenceUrl = req.EvidenceUrl,
            Status = CondominiumClaimStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _db.CondominiumClaims.Add(claim);

        if (condo.Status == CondominiumStatus.Unclaimed)
            condo.Status = CondominiumStatus.ClaimPending;

        await _db.SaveChangesAsync(ct);
        return Created($"/api/v1/condominiums/{id}/claims/{claim.Id}", new { claim.Id, Status = claim.Status.ToString() });
    }

    // GET /api/v1/condominiums/{id}/claims — síndico atual ou admin.
    [HttpGet("{id:int}/claims")]
    public async Task<IActionResult> GetClaims(int id, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var condo = await _db.Condominiums.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.DeletedAt == null, ct);
        if (condo == null) return NotFound();

        var isAdmin = await IsAdminAsync(userId, ct);
        if (condo.SindicoUserId != userId && !isAdmin) return Forbid();

        var claims = await _db.CondominiumClaims.AsNoTracking()
            .Where(cl => cl.CondominiumId == id)
            .OrderByDescending(cl => cl.CreatedAt)
            .Select(cl => new
            {
                cl.Id,
                // UserId omitido de propósito: síndico (não-admin) não precisa do GUID do reivindicante.
                ClaimantName = cl.User != null ? cl.User.DisplayName : null,
                ClaimantVerified = cl.User != null && cl.User.IsVerified,
                RequestedRole = cl.RequestedRole.ToString(),
                cl.Justification,
                cl.EvidenceUrl,
                Status = cl.Status.ToString(),
                cl.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(claims);
    }

    // GET /api/v1/condominiums/claims/pending — fila global de moderação (admin).
    [HttpGet("claims/pending")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> PendingClaims([FromQuery] int? bairroId, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (page < 1) page = 1;

        var query = _db.CondominiumClaims.AsNoTracking()
            .Where(cl => cl.Status == CondominiumClaimStatus.Pending);
        if (bairroId.HasValue) query = query.Where(cl => cl.Condominium!.BairroId == bairroId.Value);

        var items = await query
            .OrderBy(cl => cl.CreatedAt)
            .Skip((page - 1) * DefaultPageSize)
            .Take(DefaultPageSize)
            .Select(cl => new
            {
                cl.Id,
                cl.CondominiumId,
                CondominiumName = cl.Condominium!.Name,
                cl.UserId,
                ClaimantName = cl.User != null ? cl.User.DisplayName : null,
                ClaimantVerified = cl.User != null && cl.User.IsVerified,
                RequestedRole = cl.RequestedRole.ToString(),
                cl.Justification,
                cl.EvidenceUrl,
                cl.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // POST /api/v1/condominiums/claims/{claimId}/approve — admin transfere o controle.
    [HttpPost("claims/{claimId:int}/approve")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> ApproveClaim(int claimId, CancellationToken ct = default)
    {
        var adminId = GetUserId();

        var claim = await _db.CondominiumClaims
            .Include(cl => cl.Condominium)
            .FirstOrDefaultAsync(cl => cl.Id == claimId, ct);
        if (claim == null) return NotFound();
        if (claim.Status != CondominiumClaimStatus.Pending)
            return BadRequest(new { error = "Esta solicitação já foi processada." });
        if (claim.Condominium == null || claim.Condominium.DeletedAt != null)
            return NotFound(new { error = "Condomínio não encontrado." });

        claim.Status = CondominiumClaimStatus.Approved;
        claim.ReviewedByUserId = adminId;
        claim.ReviewedAt = DateTime.UtcNow;

        // Transfere o controle do PERFIL (WhatsApp segue com a plataforma).
        claim.Condominium.SindicoUserId = claim.UserId;
        claim.Condominium.SindicoRole = claim.RequestedRole;
        claim.Condominium.Status = CondominiumStatus.Claimed;

        // Rejeita automaticamente outras solicitações pendentes do mesmo condomínio.
        var others = await _db.CondominiumClaims
            .Where(c => c.CondominiumId == claim.CondominiumId && c.Id != claim.Id && c.Status == CondominiumClaimStatus.Pending)
            .ToListAsync(ct);
        foreach (var o in others)
        {
            o.Status = CondominiumClaimStatus.Rejected;
            o.ReviewedByUserId = adminId;
            o.ReviewedAt = DateTime.UtcNow;
            o.ReviewNote = "Outro síndico foi aprovado.";
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { approved = true, sindicoUserId = claim.UserId });
    }

    // POST /api/v1/condominiums/claims/{claimId}/reject — admin recusa.
    [HttpPost("claims/{claimId:int}/reject")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> RejectClaim(int claimId, [FromBody] RejectClaimRequest? req, CancellationToken ct = default)
    {
        var adminId = GetUserId();

        var claim = await _db.CondominiumClaims
            .Include(cl => cl.Condominium)
            .FirstOrDefaultAsync(cl => cl.Id == claimId, ct);
        if (claim == null) return NotFound();
        if (claim.Status != CondominiumClaimStatus.Pending)
            return BadRequest(new { error = "Esta solicitação já foi processada." });

        claim.Status = CondominiumClaimStatus.Rejected;
        claim.ReviewedByUserId = adminId;
        claim.ReviewedAt = DateTime.UtcNow;
        claim.ReviewNote = req?.Note?.Trim();

        // Se não restar nenhuma pendência e ninguém for síndico, volta a Unclaimed.
        if (claim.Condominium != null && claim.Condominium.SindicoUserId == null)
        {
            var stillPending = await _db.CondominiumClaims
                .AnyAsync(c => c.CondominiumId == claim.CondominiumId && c.Id != claim.Id && c.Status == CondominiumClaimStatus.Pending, ct);
            if (!stillPending) claim.Condominium.Status = CondominiumStatus.Unclaimed;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { rejected = true });
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

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

public record CreateCondominiumRequest(
    int BairroId, string Name, string? Description,
    string? AddressLine, string? Cep, string? CoverImageUrl, int? UnitsCount);

public record UpdateCondominiumRequest(
    string? Name, string? Description, string? AddressLine,
    string? Cep, string? CoverImageUrl, int? UnitsCount);

public record CreateClaimRequest(
    CondominiumRole? RequestedRole, string Justification, string? EvidenceUrl);

public record RejectClaimRequest(string? Note);
