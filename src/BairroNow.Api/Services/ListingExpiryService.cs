using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

// Runs every hour. Marks active listings past their ExpiresAt as "expired" and notifies sellers.
// SmarterASP single-instance: IHostedService is sufficient (no distributed lock needed).
public class ListingExpiryService : BackgroundService
{
    private static readonly TimeSpan _period = TimeSpan.FromHours(1);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ListingExpiryService> _logger;

    public ListingExpiryService(IServiceScopeFactory scopeFactory, ILogger<ListingExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Initial delay so the app finishes starting before the first scan
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpireListingsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "ListingExpiryService scan failed");
            }

            await Task.Delay(_period, stoppingToken);
        }
    }

    private async Task ExpireListingsAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();

        var now = DateTime.UtcNow;

        // Load sellers before the bulk update so we can notify them after.
        // Narrow race: if a seller renews between this query and the UPDATE, the UPDATE's
        // WHERE clause will skip that listing (Status=Active AND ExpiresAt<now re-evaluated at DB level),
        // but we may fire a spurious "listing expired" notification — acceptable edge case.
        var toExpire = await db.Listings
            .Where(l => l.Status == ListingStatus.Active
                     && l.ExpiresAt != null
                     && l.ExpiresAt < now)
            .Select(l => new { l.Id, l.SellerId, l.Title })
            .ToListAsync(ct);

        if (toExpire.Count == 0)
        {
            _logger.LogInformation("ExpiryService scan: no listings to expire at {Time}", now);
            return;
        }

        // ExecuteUpdateAsync generates a single atomic UPDATE — no load-then-save race condition.
        int count = await db.Listings
            .Where(l => l.Status == ListingStatus.Active
                     && l.ExpiresAt != null
                     && l.ExpiresAt < now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(l => l.Status, ListingStatus.Expired)
                .SetProperty(l => l.UpdatedAt, now), ct);

        _logger.LogInformation("ExpiryService scan complete: {Count} listings expired at {Time}", count, now);

        // Notify sellers — best-effort, failures never abort the scan
        foreach (var listing in toExpire)
        {
            try
            {
                await notificationService.NotifyListingExpiredAsync(listing.SellerId, listing.Title, listing.Id, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify seller {SellerId} for expired listing {ListingId}", listing.SellerId, listing.Id);
            }
        }
    }
}
