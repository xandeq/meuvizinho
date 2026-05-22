using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Services;

public class AccountService
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<AccountService> _logger;

    public AccountService(AppDbContext db, IEmailService emailService, ILogger<AccountService> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<object> BuildExportAsync(Guid userId, CancellationToken ct = default)
    {
        // Single tracked fetch — reused for both the export projection and the
        // LastExportAt update below, eliminating the previous double round-trip.
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            throw new InvalidOperationException("User not found");

        var posts = await _db.Posts.AsNoTracking()
            .Where(p => p.AuthorId == userId)
            .Select(p => new { p.Id, p.Body, p.Category, p.CreatedAt })
            .ToListAsync(ct);

        var comments = await _db.Comments.AsNoTracking()
            .Where(c => c.AuthorId == userId)
            .Select(c => new { c.Id, c.Body, c.PostId, c.CreatedAt })
            .ToListAsync(ct);

        var listings = await _db.Listings.AsNoTracking()
            .Where(l => l.SellerId == userId)
            .Select(l => new { l.Id, l.Title, l.Description, l.Price, l.Status, l.CreatedAt })
            .ToListAsync(ct);

        var messages = await _db.Messages.AsNoTracking()
            .Where(m => m.SenderId == userId)
            .Select(m => new { m.Id, m.Text, m.SentAt, m.ConversationId })
            .ToListAsync(ct);

        var verifications = await _db.Verifications.IgnoreQueryFilters().AsNoTracking()
            .Where(v => v.UserId == userId)
            .Select(v => new { v.Id, v.Cep, v.Status, v.SubmittedAt, v.ReviewedAt })
            .ToListAsync(ct);

        var notifications = await _db.Notifications.AsNoTracking()
            .Where(n => n.UserId == userId)
            .Select(n => new { n.Id, n.Type, n.IsRead, n.CreatedAt })
            .ToListAsync(ct);

        // Update last export timestamp using the already-tracked entity — no extra fetch.
        user.LastExportAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new
        {
            profile = new
            {
                user.Id,
                user.Email,
                user.DisplayName,
                user.Bio,
                user.PhotoUrl,
                user.BairroId,
                user.IsVerified,
                user.EmailConfirmed,
                user.CreatedAt,
                user.UpdatedAt
            },
            posts,
            comments,
            listings,
            messages,
            verifications,
            notifications,
            exportedAt = DateTime.UtcNow
        };
    }

    public async Task RequestDeletionAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.FindAsync(new object[] { userId }, ct);
        if (user == null)
            throw new InvalidOperationException("User not found");

        user.DeleteRequestedAt = DateTime.UtcNow;
        user.IsActive = false;

        // Revoke all refresh tokens
        var tokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId && !t.IsRevoked)
            .ToListAsync(ct);
        foreach (var token in tokens)
            token.IsRevoked = true;

        // Delete verification documents immediately
        var verifications = await _db.Verifications.IgnoreQueryFilters()
            .Where(v => v.UserId == userId && v.ProofFilePath != "" && v.DocumentDeletedAt == null)
            .ToListAsync(ct);

        foreach (var v in verifications)
        {
            try
            {
                if (File.Exists(v.ProofFilePath))
                    File.Delete(v.ProofFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete proof file {Path}", v.ProofFilePath);
            }
            v.ProofFilePath = "";
            v.DocumentDeletedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        await _emailService.SendAccountDeletionConfirmationAsync(user.Email);
        _logger.LogInformation("Deletion requested for user {UserId}", userId);
    }

    public async Task<bool> CancelDeletionAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
            return false;

        if (user.DeleteRequestedAt == null)
            return false;

        if (user.DeleteRequestedAt < DateTime.UtcNow.AddDays(-30))
            return false; // Grace period expired

        user.DeleteRequestedAt = null;
        user.IsActive = true;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Deletion cancelled for user {UserId}", userId);
        return true;
    }

    public async Task RunAnonymizationAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var usersToAnonymize = await _db.Users.IgnoreQueryFilters()
            .Where(u => u.DeleteRequestedAt != null && u.DeleteRequestedAt <= cutoff && u.DeletedAt == null)
            .ToListAsync(ct);

        foreach (var user in usersToAnonymize)
        {
            user.Email = $"deleted+{Guid.NewGuid()}@bairronow.com.br";
            user.DisplayName = "Usuario removido";
            user.PhotoUrl = null;
            user.Bio = null;
            user.PasswordHash = "";
            user.DeletedAt = DateTime.UtcNow;
            user.TotpSecret = null;
            user.TotpBackupCodes = null;
            user.GoogleId = null;
        }

        if (usersToAnonymize.Any())
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Anonymized {Count} users past 30-day grace period", usersToAnonymize.Count);
        }
    }

    /// <summary>
    /// Immediately and irreversibly deletes the account (GDPR right-to-erasure, immediate path).
    /// Password must be confirmed when the user has a PasswordHash set (non-OAuth accounts).
    /// </summary>
    /// <exception cref="InvalidOperationException">User not found.</exception>
    /// <exception cref="UnauthorizedAccessException">Wrong password.</exception>
    /// <exception cref="InvalidOperationException">Account already deleted.</exception>
    public async Task DeleteAccountAsync(Guid userId, string? password, CancellationToken ct = default)
    {
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null)
            throw new InvalidOperationException("User not found");

        // 409 — already deleted
        if (user.DeletedAt != null)
            throw new InvalidOperationException("ALREADY_DELETED");

        // Password confirmation — required when user has a password hash set (non-OAuth-only accounts)
        bool hasPassword = !string.IsNullOrWhiteSpace(user.PasswordHash);
        if (hasPassword)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new UnauthorizedAccessException("PASSWORD_REQUIRED");

            if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                throw new UnauthorizedAccessException("WRONG_PASSWORD");
        }

        // ── Step 1: Hard-delete all RefreshTokens (cascade is already set, but explicit for clarity)
        var refreshTokens = await _db.RefreshTokens
            .Where(t => t.UserId == userId)
            .ToListAsync(ct);
        _db.RefreshTokens.RemoveRange(refreshTokens);

        // ── Step 2: Null out push notification token (mobile push — Wave A)
        user.ExpoPushToken = null;

        // ── Step 3: Mark GroupMember records as left (set Status to Banned acts as "removed";
        //    we hard-delete Active/PendingApproval memberships so the user disappears from groups)
        var groupMemberships = await _db.GroupMembers
            .Where(gm => gm.UserId == userId && gm.Status == GroupMemberStatus.Active)
            .ToListAsync(ct);
        _db.GroupMembers.RemoveRange(groupMemberships);

        // Also remove pending-approval memberships
        var pendingMemberships = await _db.GroupMembers
            .Where(gm => gm.UserId == userId && gm.Status == GroupMemberStatus.PendingApproval)
            .ToListAsync(ct);
        _db.GroupMembers.RemoveRange(pendingMemberships);

        // ── Step 4: Anonymize PII and soft-delete
        var now = DateTime.UtcNow;
        user.DeletedAt = now;
        user.IsActive = false;
        user.DisplayName = "Usuário removido";
        user.PhotoUrl = null;
        user.Bio = null;
        user.Email = $"{userId}@deleted.bairronow.com";
        user.PasswordHash = "";
        user.TotpSecret = null;
        user.TotpBackupCodes = null;
        user.TotpEnabled = false;
        user.GoogleId = null;
        user.ExpoPushToken = null;
        user.EmailConfirmationToken = null;
        user.EmailConfirmationTokenExpiry = null;
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        user.DeleteRequestedAt = null; // clear any pending grace-period request — this is final

        // ── Step 5: Persist all changes atomically
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Account immediately deleted and anonymized for user {UserId}", userId);
    }
}
