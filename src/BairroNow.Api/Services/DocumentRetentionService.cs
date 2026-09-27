using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

public class DocumentRetentionService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DocumentRetentionService> _logger;
    private DateOnly? _lastRunDate;

    public DocumentRetentionService(IServiceProvider services, ILogger<DocumentRetentionService> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                if (_lastRunDate != today)
                {
                    await CleanExpiredDocumentsAsync(stoppingToken);
                    // Mark day done AFTER success so transient failures retry on the
                    // next 1h tick rather than deferring LGPD 90d retention by a day.
                    _lastRunDate = today;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DocumentRetentionService error");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task CleanExpiredDocumentsAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var files = scope.ServiceProvider.GetRequiredService<IFileStorageService>();

        var cutoff = DateTime.UtcNow.AddDays(-90);

        var expiredDocs = await db.Verifications.IgnoreQueryFilters()
            .Where(v => (v.Status == VerificationStatus.Approved || v.Status == VerificationStatus.Rejected)
                && v.ReviewedAt != null
                && v.ReviewedAt < cutoff
                && v.DocumentDeletedAt == null
                && v.ProofFilePath != "")
            .ToListAsync(ct);

        var deleted = 0;
        foreach (var v in expiredDocs)
        {
            bool deletedOk;
            try
            {
                deletedOk = files.DeleteProof(v.ProofFilePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete expired document {Path}", v.ProofFilePath);
                continue; // keep ProofFilePath so the next run retries the delete
            }

            if (!deletedOk)
            {
                // File already gone, or the stored path doesn't resolve — either way, DON'T
                // mark it deleted: that would make the record unrecoverable (empty path, no
                // way to retry) while the file may still exist somewhere. Log loudly so this
                // is investigated instead of silently accumulating.
                _logger.LogError("DeleteProof returned false for {Path} (Verification {Id}) — file not found at resolved path, not marking as deleted", v.ProofFilePath, v.Id);
                continue;
            }

            v.ProofFilePath = "";
            v.DocumentDeletedAt = DateTime.UtcNow;
            deleted++;
        }

        if (deleted > 0)
        {
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("Document retention: deleted {Count} expired proof documents", deleted);
        }
    }
}
