namespace BairroNow.Api.Models.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Bio { get; set; }
    public int? BairroId { get; set; }
    public Bairro? Bairro { get; set; }
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public bool IsAdmin { get; set; }
    public string? AcceptedTermsVersion { get; set; }
    public DateTime? AcceptedTermsAt { get; set; }
    public bool EmailConfirmed { get; set; }
    public bool ShowOnMap { get; set; } = true;
    public string? EmailConfirmationToken { get; set; }
    public DateTime? EmailConfirmationTokenExpiry { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public bool AcceptedPrivacyPolicy { get; set; }
    public int AcceptedPrivacyPolicyVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Phase 6: TOTP (AUTH-009)
    public string? TotpSecret { get; set; }
    public bool TotpEnabled { get; set; }
    public string? TotpBackupCodes { get; set; } // JSON array of SHA256-hashed codes

    // Phase 6: Google OAuth (AUTH-013)
    public string? GoogleId { get; set; }

    // Phase 6: Digest (NOTF-01)
    public bool DigestOptOut { get; set; }

    // Phase 6: LGPD (LGPD-02/03)
    public DateTime? LastExportAt { get; set; }
    public DateTime? DeleteRequestedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public bool IsActive { get; set; } = true;

    // Mobile push (Wave A)
    public string? ExpoPushToken { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
