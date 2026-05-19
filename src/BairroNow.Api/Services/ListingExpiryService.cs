using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

// Runs every hour. Marks active listings past their ExpiresAt as "expired".
// Sellers are notified via SignalR UnreadChanged-style notification in future waves.
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

        var now = DateTime.UtcNow;

        // ExecuteUpdateAsync generates a single atomic UPDATE — no load-then-save race condition.
        // A concurrent RenewAsync that commits between our read and write can't be overwritten
        // because the WHERE clause re-checks Status=Active AND ExpiresAt < now at the DB level.
        int count = await db.Listings
            .Where(l => l.Status == ListingStatus.Active
                     && l.ExpiresAt != null
                     && l.ExpiresAt < now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(l => l.Status, ListingStatus.Expired)
                .SetProperty(l => l.UpdatedAt, now), ct);

        _logger.LogInformation("ExpiryService scan complete: {Count} listings expired at {Time}", count, now);
    }
}
