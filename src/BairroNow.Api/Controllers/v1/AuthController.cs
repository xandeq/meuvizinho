using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;

    public AuthController(IAuthService authService, IConfiguration configuration)
    {
        _authService = authService;
        _configuration = configuration;
    }

    [HttpPost("register")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var (response, error) = await _authService.RegisterAsync(request, GetIpAddress(), ct);
        if (error != null)
            return Conflict(new { error });

        return StatusCode(201, new { message = "Conta criada. Verifique seu e-mail para confirmar." });
    }

    [HttpPost("login")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var (response, refreshToken, requiresTotp, totpUserId, error) = await _authService.LoginAsync(request, GetIpAddress(), ct);
        if (error != null)
        {
            if (error.Contains("banida"))
                return StatusCode(403, new { error });
            if (error.Contains("bloqueada"))
                return StatusCode(429, new { error });
            return Unauthorized(new { error = "E-mail ou senha incorretos." });
        }

        // TOTP gate: service already determined this in the same DB fetch — no extra round-trip.
        if (requiresTotp && totpUserId.HasValue)
        {
            var tempToken = GenerateTotpTempToken(totpUserId.Value);
            return Ok(new { requiresTotp = true, tempToken });
        }

        SetRefreshTokenCookie(refreshToken!);
        return Ok(response);
    }

    [HttpPost("login/totp-verify")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> TotpVerify([FromBody] TotpVerifyRequest request, CancellationToken ct)
    {
        var (response, refreshToken, error) = await _authService.VerifyTotpAsync(request.TempToken, request.Code, ct);
        if (error != null)
            return Unauthorized(new { error });

        SetRefreshTokenCookie(refreshToken!);
        return Ok(response);
    }

    [HttpPost("totp/setup")]
    [Authorize]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> TotpSetup(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Admin only
        var isAdmin = User.FindFirst("is_admin")?.Value;
        if (isAdmin != "true")
            return Forbid();

        var result = await _authService.SetupTotpAsync(userId.Value, ct);
        if (result == null)
            return NotFound(new { error = "Usuario nao encontrado." });

        var email = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value
            ?? User.FindFirst(ClaimTypes.Email)?.Value ?? "user";

        return Ok(new
        {
            secret = result.Value.Secret,
            provisioningUri = $"otpauth://totp/BairroNow:{email}?secret={result.Value.Secret}&issuer=BairroNow",
            backupCodes = result.Value.BackupCodes
        });
    }

    [HttpGet("google")]
    public IActionResult GoogleChallenge()
    {
        var properties = new AuthenticationProperties
        {
            RedirectUri = "/api/v1/auth/google/callback"
        };
        return Challenge(properties, "Google");
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback(CancellationToken ct)
    {
        var authenticateResult = await HttpContext.AuthenticateAsync("Google");
        if (!authenticateResult.Succeeded)
            return Unauthorized(new { error = "Autenticacao Google falhou." });

        var email = authenticateResult.Principal?.FindFirst(ClaimTypes.Email)?.Value;
        var googleId = authenticateResult.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
            return Unauthorized(new { error = "Dados Google incompletos." });

        var (response, refreshToken, error) = await _authService.GoogleSignInAsync(email, googleId, ct);
        if (error != null)
            return Unauthorized(new { error });

        SetRefreshTokenCookie(refreshToken!);

        var frontendUrl = _configuration["FrontendUrl"] ?? "https://bairronow.com.br";
        return Redirect($"{frontendUrl}/auth/callback?token={response!.AccessToken}");
    }

    [HttpPost("google/mobile")]
    public async Task<IActionResult> GoogleMobile([FromBody] GoogleMobileRequest request, CancellationToken ct)
    {
        var (response, refreshToken, error) = await _authService.GoogleSignInMobileAsync(request.IdToken, ct);
        if (error != null)
            return Unauthorized(new { error });

        return Ok(new { accessToken = response!.AccessToken, refreshToken });
    }

    [HttpPost("magic-link/request")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> MagicLinkRequest([FromBody] MagicLinkRequestDto request, CancellationToken ct)
    {
        await _authService.RequestMagicLinkAsync(request.Email, ct);
        // Always return 200 to prevent email enumeration
        return Ok(new { message = "Se o e-mail existir, enviaremos um link de acesso." });
    }

    [HttpGet("magic-link/verify")]
    public async Task<IActionResult> MagicLinkVerify([FromQuery] string token, CancellationToken ct)
    {
        var frontendUrl = _configuration["FrontendUrl"] ?? "https://bairronow.com.br";

        var (response, refreshToken, error) = await _authService.VerifyMagicLinkAsync(token, ct);
        if (error != null)
            return Redirect($"{frontendUrl}/auth/magic-link?error=invalid");

        SetRefreshTokenCookie(refreshToken!);
        return Redirect($"{frontendUrl}/auth/callback?token={response!.AccessToken}");
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> Refresh(CancellationToken ct)
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(new { error = "Token nao encontrado." });

        var (response, newRefreshToken, error) = await _authService.RefreshAsync(refreshToken, GetIpAddress(), ct);
        if (error != null)
        {
            ClearRefreshTokenCookie();
            return Unauthorized(new { error });
        }

        SetRefreshTokenCookie(newRefreshToken!);
        return Ok(response);
    }

    [HttpPost("logout")]
    [Authorize]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
            await _authService.LogoutAsync(refreshToken, GetIpAddress(), ct);

        ClearRefreshTokenCookie();
        return Ok(new { message = "Sessao encerrada." });
    }

    [HttpPost("logout-all")]
    [Authorize]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;

        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { error = "Usuario nao identificado." });

        await _authService.LogoutAllAsync(userId, ct);
        ClearRefreshTokenCookie();
        return Ok(new { message = "Todas as sessoes encerradas." });
    }

    [HttpPost("forgot-password")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await _authService.ForgotPasswordAsync(request.Email, ct);
        return Ok(new { message = "Se o e-mail existir, enviaremos um link de recuperacao." });
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var result = await _authService.ResetPasswordAsync(request.Token, request.Email, request.NewPassword, ct);
        if (!result)
            return BadRequest(new { error = "Token invalido ou expirado." });

        return Ok(new { message = "Senha alterada com sucesso." });
    }

    // ── Private helpers ──

    private string GenerateTotpTempToken(Guid userId)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("JWT key not configured")));

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("totp_pending", "true"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(5),
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"],
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
        };

        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateToken(tokenDescriptor);
        return handler.WriteToken(token);
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : (Guid?)null;
    }

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append("refreshToken", token, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Expires = DateTime.UtcNow.AddDays(7),
            Path = "/api/v1/auth"
        });
        // .NET 8 Partitioned attribute workaround
        var setCookie = Response.Headers["Set-Cookie"].ToString();
        if (setCookie.Contains("SameSite=None") && !setCookie.Contains("Partitioned"))
        {
            Response.Headers["Set-Cookie"] = setCookie.Replace("SameSite=None", "SameSite=None; Partitioned");
        }
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.None,
            Path = "/api/v1/auth"
        });
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "unknown";
}

// ── Request DTOs ──

public record TotpVerifyRequest(string TempToken, string Code);
public record GoogleMobileRequest(string IdToken);
public record MagicLinkRequestDto(string Email);
