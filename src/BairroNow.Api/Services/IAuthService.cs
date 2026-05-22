using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Services;

public interface IAuthService
{
    Task<(AuthResponse? Response, string? Error)> RegisterAsync(RegisterRequest request, string ipAddress, CancellationToken ct = default);
    Task<(AuthResponse? Response, string? RefreshToken, string? Error)> LoginAsync(LoginRequest request, string ipAddress, CancellationToken ct = default);
    Task<(AuthResponse? Response, string? NewRefreshToken, string? Error)> RefreshAsync(string refreshToken, string ipAddress, CancellationToken ct = default);
    Task LogoutAsync(string refreshToken, string ipAddress, CancellationToken ct = default);
    Task LogoutAllAsync(Guid userId, CancellationToken ct = default);
    Task<string?> ForgotPasswordAsync(string email, CancellationToken ct = default);
    Task<bool> ResetPasswordAsync(string token, string email, string newPassword, CancellationToken ct = default);

    // Phase 6: Google OAuth
    Task<(AuthResponse? Response, string? RefreshToken, string? Error)> GoogleSignInAsync(string email, string googleId, CancellationToken ct = default);
    Task<(AuthResponse? Response, string? RefreshToken, string? Error)> GoogleSignInMobileAsync(string idToken, CancellationToken ct = default);

    // Phase 6: Magic Link
    Task RequestMagicLinkAsync(string email, CancellationToken ct = default);
    Task<(AuthResponse? Response, string? RefreshToken, string? Error)> VerifyMagicLinkAsync(string rawTokenBase64, CancellationToken ct = default);

    // Phase 6: TOTP
    Task<(string Secret, string[] BackupCodes)?> SetupTotpAsync(Guid userId, CancellationToken ct = default);
    Task<(AuthResponse? Response, string? RefreshToken, string? Error)> VerifyTotpAsync(string tempToken, string code, CancellationToken ct = default);
}
