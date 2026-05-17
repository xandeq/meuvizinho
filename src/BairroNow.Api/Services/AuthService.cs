using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using OtpNet;

namespace BairroNow.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AuthService> _logger;

    private const int MaxFailedAttempts = 5;
    private const int LockoutMinutes = 15;
    private const int RefreshTokenDays = 7;
    private const int PasswordResetHours = 1;

    public AuthService(
        AppDbContext db,
        ITokenService tokenService,
        IEmailService emailService,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<AuthService> logger)
    {
        _db = db;
        _tokenService = tokenService;
        _emailService = emailService;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<(AuthResponse? Response, string? Error)> RegisterAsync(RegisterRequest request, string ipAddress)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email.ToLowerInvariant()))
            return (null, "E-mail ja cadastrado.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            EmailConfirmed = false,
            EmailConfirmationToken = Guid.NewGuid().ToString(),
            EmailConfirmationTokenExpiry = DateTime.UtcNow.AddHours(24),
            AcceptedPrivacyPolicy = true,
            AcceptedPrivacyPolicyVersion = 1
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        await _emailService.SendConfirmationEmailAsync(user.Email, user.EmailConfirmationToken);

        var accessToken = _tokenService.GenerateAccessToken(user);
        var response = new AuthResponse(accessToken, new UserInfo(user.Id, user.Email, user.DisplayName, user.EmailConfirmed, user.BairroId, user.IsVerified, user.IsAdmin));
        return (response, null);
    }

    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> LoginAsync(LoginRequest request, string ipAddress)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLowerInvariant());
        if (user == null)
            return (null, null, "E-mail ou senha incorretos.");

        if (user.LockoutEnd.HasValue && user.LockoutEnd > DateTime.UtcNow)
            return (null, null, "Conta bloqueada temporariamente. Tente novamente em 15 minutos.");

        if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= MaxFailedAttempts)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(LockoutMinutes);
                _logger.LogWarning("Account locked for {Email} after {Attempts} failed attempts", user.Email, user.FailedLoginAttempts);
            }
            await _db.SaveChangesAsync();
            return (null, null, "E-mail ou senha incorretos.");
        }

        // Success: reset failed attempts
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = HashToken(rawRefreshToken),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays),
            CreatedByIp = ipAddress
        };

        _db.RefreshTokens.Add(refreshToken);
        await _db.SaveChangesAsync();

        var response = new AuthResponse(accessToken, new UserInfo(user.Id, user.Email, user.DisplayName, user.EmailConfirmed, user.BairroId, user.IsVerified, user.IsAdmin));
        return (response, rawRefreshToken, null);
    }

    public async Task<(AuthResponse? Response, string? NewRefreshToken, string? Error)> RefreshAsync(string refreshToken, string ipAddress)
    {
        var tokenHash = HashToken(refreshToken);
        var storedToken = await _db.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == tokenHash);

        if (storedToken == null)
            return (null, null, "Token invalido.");

        if (storedToken.IsRevoked)
        {
            // Token reuse detected: revoke all tokens for this user
            var allTokens = await _db.RefreshTokens
                .Where(t => t.UserId == storedToken.UserId && !t.IsRevoked)
                .ToListAsync();
            foreach (var t in allTokens)
            {
                t.IsRevoked = true;
                t.RevokedByIp = ipAddress;
            }
            await _db.SaveChangesAsync();
            _logger.LogWarning("Refresh token reuse detected for user {UserId}", storedToken.UserId);
            return (null, null, "Token invalido.");
        }

        if (storedToken.ExpiresAt < DateTime.UtcNow)
            return (null, null, "Token expirado.");

        // Revoke old token
        storedToken.IsRevoked = true;
        storedToken.RevokedByIp = ipAddress;

        // Create new token
        var rawNewToken = _tokenService.GenerateRefreshToken();
        var newToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = HashToken(rawNewToken),
            UserId = storedToken.UserId,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays),
            CreatedByIp = ipAddress
        };
        storedToken.ReplacedByTokenId = newToken.Id;

        _db.RefreshTokens.Add(newToken);
        await _db.SaveChangesAsync();

        var user = storedToken.User;
        var accessToken = _tokenService.GenerateAccessToken(user);
        var response = new AuthResponse(accessToken, new UserInfo(user.Id, user.Email, user.DisplayName, user.EmailConfirmed, user.BairroId, user.IsVerified, user.IsAdmin));
        return (response, rawNewToken, null);
    }

    public async Task LogoutAsync(string refreshToken, string ipAddress)
    {
        var tokenHash = HashToken(refreshToken);
        var storedToken = await _db.RefreshTokens.FirstOrDefaultAsync(t => t.Token == tokenHash);
        if (storedToken != null)
        {
            storedToken.IsRevoked = true;
            storedToken.RevokedByIp = ipAddress;
            await _db.SaveChangesAsync();
        }
    }

    public async Task LogoutAllAsync(Guid userId)
    {
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ToListAsync();

        foreach (var token in tokens)
            token.IsRevoked = true;

        await _db.SaveChangesAsync();
    }

    public async Task<string?> ForgotPasswordAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant());
        if (user == null)
            return null; // Don't reveal if email exists

        user.PasswordResetToken = Guid.NewGuid().ToString();
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddHours(PasswordResetHours);
        await _db.SaveChangesAsync();

        await _emailService.SendPasswordResetEmailAsync(user.Email, user.PasswordResetToken);
        return user.PasswordResetToken;
    }

    public async Task<bool> ResetPasswordAsync(string token, string email, string newPassword)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant());
        if (user == null)
            return false;

        if (user.PasswordResetToken != token || user.PasswordResetTokenExpiry < DateTime.UtcNow)
            return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        await _db.SaveChangesAsync();

        return true;
    }

    // ── Phase 6: Google OAuth ──

    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> GoogleSignInAsync(string email, string googleId)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user != null)
        {
            if (user.GoogleId == null)
            {
                user.GoogleId = googleId;
                await _db.SaveChangesAsync();
            }
        }
        else
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                GoogleId = googleId,
                PasswordHash = "", // No password for Google-only users
                EmailConfirmed = true,
                IsActive = true,
                AcceptedPrivacyPolicy = true,
                AcceptedPrivacyPolicyVersion = 1
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        return IssueTokens(user, "google-oauth");
    }

    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> GoogleSignInMobileAsync(string idToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.GetAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={idToken}");
            if (!response.IsSuccessStatusCode)
                return (null, null, "Token Google invalido.");

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var emailVerified = root.TryGetProperty("email_verified", out var ev) ? ev.GetString() : null;
            if (emailVerified != "true")
                return (null, null, "E-mail Google nao verificado.");

            var googleEmail = root.TryGetProperty("email", out var em) ? em.GetString() : null;
            var sub = root.TryGetProperty("sub", out var s) ? s.GetString() : null;

            if (string.IsNullOrEmpty(googleEmail) || string.IsNullOrEmpty(sub))
                return (null, null, "Token Google invalido.");

            return await GoogleSignInAsync(googleEmail, sub);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google mobile sign-in failed");
            return (null, null, "Erro ao verificar token Google.");
        }
    }

    // ── Phase 6: Magic Link ──

    public async Task RequestMagicLinkAsync(string email)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return; // Silent — prevent email enumeration

        var rawToken = RandomNumberGenerator.GetBytes(32);
        var tokenHash = Convert.ToBase64String(SHA256.HashData(rawToken));

        var magicLinkToken = new MagicLinkToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        _db.MagicLinkTokens.Add(magicLinkToken);
        await _db.SaveChangesAsync();

        var frontendUrl = _configuration["FrontendUrl"] ?? "https://bairronow.com.br";
        var magicUrl = $"{frontendUrl}/auth/magic-link?token={Convert.ToBase64String(rawToken)}";
        await _emailService.SendMagicLinkAsync(user.Email, magicUrl);
    }

    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> VerifyMagicLinkAsync(string rawTokenBase64)
    {
        try
        {
            var rawToken = Convert.FromBase64String(rawTokenBase64);
            var tokenHash = Convert.ToBase64String(SHA256.HashData(rawToken));

            var now = DateTime.UtcNow;
            var claimed = await _db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE MagicLinkTokens SET Used = 1 WHERE TokenHash = {tokenHash} AND Used = 0 AND ExpiresAt > {now}");

            if (claimed == 0)
                return (null, null, "Link invalido ou expirado.");

            var stored = await _db.MagicLinkTokens
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

            if (stored?.User == null)
                return (null, null, "Link invalido ou expirado.");

            return IssueTokens(stored.User, "magic-link");
        }
        catch (FormatException)
        {
            return (null, null, "Token invalido.");
        }
    }

    // ── Phase 6: TOTP ──

    public async Task<(string Secret, string[] BackupCodes)?> SetupTotpAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null)
            return null;

        var key = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(key);

        user.TotpSecret = base32Secret;
        user.TotpEnabled = true;

        // Generate 8 backup codes
        var backupCodes = new string[8];
        var hashedCodes = new string[8];
        for (int i = 0; i < 8; i++)
        {
            var code = GenerateAlphanumericCode(8);
            backupCodes[i] = code;
            hashedCodes[i] = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
        }
        user.TotpBackupCodes = JsonSerializer.Serialize(hashedCodes);

        await _db.SaveChangesAsync();
        return (base32Secret, backupCodes);
    }

    public async Task<(AuthResponse? Response, string? RefreshToken, string? Error)> VerifyTotpAsync(string tempToken, string code)
    {
        // Validate tempToken is a JWT with totp_pending claim
        try
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]
                    ?? throw new InvalidOperationException("JWT key not configured")));

            var validationParams = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = _configuration["Jwt:Issuer"],
                ValidAudience = _configuration["Jwt:Audience"],
                IssuerSigningKey = key
            };

            var handler = new JwtSecurityTokenHandler();
            var principal = handler.ValidateToken(tempToken, validationParams, out _);

            var totpPending = principal.FindFirst("totp_pending")?.Value;
            if (totpPending != "true")
                return (null, null, "Token invalido para verificacao TOTP.");

            var userIdStr = principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdStr == null || !Guid.TryParse(userIdStr, out var userId))
                return (null, null, "Token invalido.");

            var user = await _db.Users.FindAsync(userId);
            if (user == null || user.TotpSecret == null)
                return (null, null, "TOTP nao configurado.");

            // Try TOTP code first
            var totp = new Totp(Base32Encoding.ToBytes(user.TotpSecret));
            if (totp.VerifyTotp(code, out _, new VerificationWindow(previous: 1, future: 1)))
            {
                return IssueTokens(user, "totp-verified");
            }

            // Try backup codes
            if (user.TotpBackupCodes != null)
            {
                var codeHash = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
                var storedHashes = JsonSerializer.Deserialize<string[]>(user.TotpBackupCodes);
                if (storedHashes != null)
                {
                    var idx = Array.IndexOf(storedHashes, codeHash);
                    if (idx >= 0)
                    {
                        // Remove used backup code
                        var newHashes = storedHashes.Where((_, i) => i != idx).ToArray();
                        user.TotpBackupCodes = JsonSerializer.Serialize(newHashes);
                        await _db.SaveChangesAsync();
                        return IssueTokens(user, "totp-backup");
                    }
                }
            }

            return (null, null, "Codigo TOTP invalido.");
        }
        catch (SecurityTokenException)
        {
            return (null, null, "Token invalido ou expirado.");
        }
    }

    // ── Private helpers ──

    private (AuthResponse Response, string RefreshToken, string? Error) IssueTokens(User user, string method)
    {
        var accessToken = _tokenService.GenerateAccessToken(user);
        var rawRefreshToken = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = HashToken(rawRefreshToken),
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(RefreshTokenDays),
            CreatedByIp = method
        };

        _db.RefreshTokens.Add(refreshToken);
        _db.SaveChanges(); // Sync — called from non-async context too

        var response = new AuthResponse(accessToken, new UserInfo(user.Id, user.Email, user.DisplayName, user.EmailConfirmed, user.BairroId, user.IsVerified, user.IsAdmin));
        return (response, rawRefreshToken, null);
    }

    private static string HashToken(string token) =>
        Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string GenerateAlphanumericCode(int length)
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var bytes = RandomNumberGenerator.GetBytes(length);
        var result = new char[length];
        for (int i = 0; i < length; i++)
            result[i] = chars[bytes[i] % chars.Length];
        return new string(result);
    }
}
