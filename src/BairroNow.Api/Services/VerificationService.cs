using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

public class VerificationService : IVerificationService
{
    private readonly AppDbContext _db;
    private readonly ICepLookupService _cep;
    private readonly IFileStorageService _files;
    private readonly ILogger<VerificationService> _logger;

    public VerificationService(AppDbContext db, ICepLookupService cep, IFileStorageService files, ILogger<VerificationService> logger)
    {
        _db = db;
        _cep = cep;
        _files = files;
        _logger = logger;
    }

    public async Task<VerificationStatusDto> SubmitAsync(Guid userId, string cep, string? numero, IFormFile proof, CancellationToken ct = default)
    {
        if (proof == null || proof.Length == 0)
            throw new InvalidOperationException("Arquivo de comprovante obrigatório.");

        var address = await _cep.LookupAsync(cep, ct);

        string relPath;
        string sha;
        using (var s = proof.OpenReadStream())
        {
            (relPath, sha) = await _files.SaveProofAsync(s, proof.FileName, proof.ContentType, ct);
        }

        // Duplicate detection: any OTHER user with same sha256
        var isDup = await _db.Verifications
            .AsNoTracking()
            .AnyAsync(v => v.ProofSha256 == sha && v.UserId != userId, ct);

        var verification = new Verification
        {
            UserId = userId,
            Cep = address.Cep,
            Logradouro = address.Logradouro,
            Numero = numero,
            BairroId = address.BairroId,
            ApprovedLat = address.Lat,
            ApprovedLng = address.Lng,
            ProofFilePath = relPath,
            ProofSha256 = sha,
            Status = VerificationStatus.Pending,
            IsSuspectedDuplicate = isDup,
            SubmittedAt = DateTime.UtcNow,
            ReVerifyAfter = DateTime.UtcNow.AddMonths(12)
        };

        _db.Verifications.Add(verification);
        await _db.SaveChangesAsync(ct);

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "verification.submit",
            EntityType = "Verification",
            EntityId = verification.Id.ToString(),
            UserId = userId,
            IpAddress = "system",
            Details = $"cep={address.Cep}; bairroId={address.BairroId}; dup={isDup}"
        });
        await _db.SaveChangesAsync(ct);

        return new VerificationStatusDto
        {
            Status = verification.Status,
            SubmittedAt = verification.SubmittedAt,
            BairroNome = address.BairroNome
        };
    }

    public async Task<VerificationStatusDto> GetMyStatusAsync(Guid userId, CancellationToken ct = default)
    {
        var v = await _db.Verifications
            .AsNoTracking()
            .Include(x => x.Bairro)
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.SubmittedAt)
            .FirstOrDefaultAsync(ct);

        if (v == null)
            return new VerificationStatusDto { Status = "none" };

        return new VerificationStatusDto
        {
            Status = v.Status,
            SubmittedAt = v.SubmittedAt,
            ReviewedAt = v.ReviewedAt,
            RejectionReason = v.RejectionReason,
            BairroNome = v.Bairro?.Nome
        };
    }

    public async Task<IReadOnlyList<AdminVerificationListItem>> ListPendingAsync(int skip, int take, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 100);
        return await _db.Verifications
            .AsNoTracking()
            .Include(v => v.User)
            .Include(v => v.Bairro)
            .Where(v => v.Status == VerificationStatus.Pending)
            .OrderBy(v => v.SubmittedAt)
            .Skip(skip)
            .Take(take)
            .Select(v => new AdminVerificationListItem
            {
                Id = v.Id,
                UserId = v.UserId,
                UserEmail = v.User!.Email,
                Cep = v.Cep,
                Logradouro = v.Logradouro,
                BairroNome = v.Bairro != null ? v.Bairro.Nome : null,
                ProofUrl = $"/api/v1/admin/verifications/{v.Id}/proof",
                SubmittedAt = v.SubmittedAt,
                IsSuspectedDuplicate = v.IsSuspectedDuplicate
            })
            .ToListAsync(ct);
    }

    public async Task<bool> ApproveAsync(int verificationId, Guid adminUserId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var claimed = await _db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE Verifications SET Status = 'approved', ReviewedByUserId = {adminUserId}, ReviewedAt = {now} WHERE Id = {verificationId} AND Status = 'pending'", ct);

        if (claimed == 0) return false;

        var v = await _db.Verifications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == verificationId, ct);
        if (v == null) return false;

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == v.UserId, ct);
        if (user != null)
        {
            user.IsVerified = true;
            user.BairroId = v.BairroId;
            user.VerifiedAt = now;
        }

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "verification.approve",
            EntityType = "Verification",
            EntityId = v.Id.ToString(),
            UserId = adminUserId,
            IpAddress = "system"
        });

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RejectAsync(int verificationId, Guid adminUserId, string reason, CancellationToken ct = default)
    {
        var v = await _db.Verifications.FirstOrDefaultAsync(x => x.Id == verificationId, ct);
        if (v == null) return false;

        v.Status = VerificationStatus.Rejected;
        v.ReviewedByUserId = adminUserId;
        v.ReviewedAt = DateTime.UtcNow;
        v.RejectionReason = reason;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "verification.reject",
            EntityType = "Verification",
            EntityId = v.Id.ToString(),
            UserId = adminUserId,
            IpAddress = "system",
            Details = reason
        });

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<(Stream stream, string contentType)?> GetProofStreamAsync(int verificationId, CancellationToken ct = default)
    {
        var v = await _db.Verifications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == verificationId, ct);
        if (v == null) return null;
        var stream = _files.OpenProof(v.ProofFilePath);
        if (stream == null) return null;
        var ct2 = v.ProofFilePath.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? "application/pdf" : "image/jpeg";
        return (stream, ct2);
    }
}
