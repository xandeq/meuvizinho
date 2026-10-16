using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;

namespace BairroNow.Api.Controllers.v1;

public class ProfileDto
{
    // Id/Email/IsAdmin/EmailConfirmed: o site grava esta resposta como o usuário da sessão depois do login
    // por Google ou link mágico. Sem eles, admin perdia os menus e "meus posts" não eram reconhecidos.
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool EmailConfirmed { get; set; }
    public bool IsAdmin { get; set; }
    public bool DigestOptOut { get; set; }
    // "Aparecer no mapa": site e app mostravam sempre ligado porque o valor nunca era enviado.
    public bool ShowOnMap { get; set; }
    public string? DisplayName { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Bio { get; set; }
    public string? BairroNome { get; set; }
    // O app usa para atualizar a sessão quando a verificação é aprovada (antes ficava "sem bairro").
    public int? BairroId { get; set; }
    public bool IsVerified { get; set; }
    public bool IsBusinessAccount { get; set; }
    public string? BusinessName { get; set; }
    public string? BusinessCategory { get; set; }
    public string? BusinessDescription { get; set; }
    public string? BusinessPhone { get; set; }
    public string? BusinessWebsite { get; set; }
}

public class UpdateSettingsRequest
{
    public bool? DigestOptOut { get; set; }
}

public class UpdateProfileRequest
{
    [Required]
    [StringLength(80, MinimumLength = 1)]
    public string DisplayName { get; set; } = string.Empty;

    [StringLength(160)]
    public string Bio { get; set; } = string.Empty;

    public bool IsBusinessAccount { get; set; }

    [StringLength(120)]
    public string? BusinessName { get; set; }

    [StringLength(80)]
    public string? BusinessCategory { get; set; }

    [StringLength(500)]
    public string? BusinessDescription { get; set; }

    [StringLength(30)]
    public string? BusinessPhone { get; set; }

    [StringLength(200)]
    public string? BusinessWebsite { get; set; }
}

[ApiController]
[Authorize]
[EnableRateLimiting("authenticated")]
public class ProfileController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProfileController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("/api/v1/profile/me")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.Bairro)
            .FirstOrDefaultAsync(u => u.Id == userId.Value, ct);

        if (user == null) return NotFound();

        return Ok(ToDto(user));
    }

    // Resumo semanal: o site chamava PATCH /profile/me, que não existia (405), e o switch voltava sozinho.
    [HttpPatch("/api/v1/profile/me")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateSettingsRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.Include(u => u.Bairro).FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound();

        if (req.DigestOptOut.HasValue) user.DigestOptOut = req.DigestOptOut.Value;
        await _db.SaveChangesAsync(ct);
        return Ok(ToDto(user));
    }

    private static ProfileDto ToDto(Models.Entities.User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        EmailConfirmed = user.EmailConfirmed,
        IsAdmin = user.IsAdmin,
        DigestOptOut = user.DigestOptOut,
        ShowOnMap = user.ShowOnMap,
        DisplayName = user.DisplayName,
        PhotoUrl = user.PhotoUrl,
        Bio = user.Bio,
        BairroNome = user.Bairro?.Nome,
        BairroId = user.BairroId,
        IsVerified = user.IsVerified,
        IsBusinessAccount = user.IsBusinessAccount,
        BusinessName = user.BusinessName,
        BusinessCategory = user.BusinessCategory,
        BusinessDescription = user.BusinessDescription,
        BusinessPhone = user.BusinessPhone,
        BusinessWebsite = user.BusinessWebsite
    };

    [HttpPut("/api/v1/profile/me")]
    public async Task<IActionResult> Update([FromBody] UpdateProfileRequest req, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Include do bairro: a resposta voltava sem o nome e a tela mostrava "Bairro não definido".
        var user = await _db.Users.Include(u => u.Bairro).FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound();

        user.DisplayName = req.DisplayName;
        user.Bio = string.IsNullOrWhiteSpace(req.Bio) ? null : req.Bio;
        user.IsBusinessAccount = req.IsBusinessAccount;

        if (req.IsBusinessAccount)
        {
            user.BusinessName = req.BusinessName;
            user.BusinessCategory = req.BusinessCategory;
            user.BusinessDescription = req.BusinessDescription;
            user.BusinessPhone = req.BusinessPhone;
            user.BusinessWebsite = req.BusinessWebsite;
        }
        else
        {
            user.BusinessName = null;
            user.BusinessCategory = null;
            user.BusinessDescription = null;
            user.BusinessPhone = null;
            user.BusinessWebsite = null;
        }

        await _db.SaveChangesAsync(ct);

        return Ok(ToDto(user));
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
