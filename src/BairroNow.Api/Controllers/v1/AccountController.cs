using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/account")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly AccountService _accountService;

    public AccountController(AccountService accountService)
    {
        _accountService = accountService;
    }

    /// <summary>
    /// LGPD data export (D-20 through D-22). Rate limited to once per 24h.
    /// </summary>
    [HttpGet("export")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> Export(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Check rate limit: 24h between exports
        var db = HttpContext.RequestServices.GetRequiredService<Data.AppDbContext>();
        var user = await db.Users.FindAsync(new object[] { userId.Value }, ct);
        if (user?.LastExportAt != null && user.LastExportAt > DateTime.UtcNow.AddHours(-24))
        {
            return StatusCode(429, new { error = "Exportacao permitida apenas uma vez a cada 24 horas." });
        }

        var data = await _accountService.BuildExportAsync(userId.Value, ct);
        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        var bytes = Encoding.UTF8.GetBytes(json);

        return File(bytes, "application/json", "bairronow-dados-pessoais.json");
    }

    /// <summary>
    /// LGPD account deletion request (D-23 through D-26). 30-day grace period.
    /// </summary>
    [HttpPost("delete")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> RequestDeletion(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        await _accountService.RequestDeletionAsync(userId.Value, ct);
        var deletionDate = DateTime.UtcNow.AddDays(30);

        return Ok(new
        {
            message = "Conta marcada para exclusao. Voce tem 30 dias para cancelar.",
            deletionDate = deletionDate.ToString("yyyy-MM-dd")
        });
    }

    /// <summary>
    /// Cancel pending deletion within grace period.
    /// </summary>
    [HttpPost("delete/cancel")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> CancelDeletion(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var cancelled = await _accountService.CancelDeletionAsync(userId.Value, ct);
        if (!cancelled)
            return BadRequest(new { error = "Nao foi possivel cancelar. O periodo de carencia pode ter expirado." });

        return Ok(new { message = "Exclusao cancelada. Sua conta esta ativa novamente." });
    }

    /// <summary>
    /// Immediately and permanently deletes the authenticated user's account (LGPD/GDPR right to erasure).
    /// Requires password confirmation for non-OAuth accounts. Returns 204 on success.
    /// </summary>
    [HttpDelete("me")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest? req, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            await _accountService.DeleteAccountAsync(userId.Value, req?.Password, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) when (ex.Message == "ALREADY_DELETED")
        {
            return Conflict(new { error = "Conta ja foi excluida." });
        }
        catch (InvalidOperationException)
        {
            return NotFound(new { error = "Conta nao encontrada." });
        }
        catch (UnauthorizedAccessException ex) when (ex.Message == "PASSWORD_REQUIRED")
        {
            return BadRequest(new { error = "Confirmacao de senha obrigatoria." });
        }
        catch (UnauthorizedAccessException)
        {
            return BadRequest(new { error = "Senha incorreta." });
        }
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : (Guid?)null;
    }
}

/// <summary>Request body for DELETE /api/v1/account/me.</summary>
/// <param name="Password">Current password — required for accounts with a password hash; may be omitted for OAuth-only accounts.</param>
public record DeleteAccountRequest(string? Password);
