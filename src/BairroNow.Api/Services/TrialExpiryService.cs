using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Services;

// Runs every hour. Downgrades premium users whose PlanExpiresAt has passed back to free.
// Covers both 14-day trials and future paid subscriptions with expiry dates.
// SmarterASP single-instance: no distributed lock needed.
public class TrialExpiryService : BackgroundService
{
    private static readonly TimeSpan _period = TimeSpan.FromHours(1);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TrialExpiryService> _logger;

    public TrialExpiryService(IServiceScopeFactory scopeFactory, ILogger<TrialExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Stagger start so multiple hosted services don't all hit the DB at startup
        await Task.Delay(TimeSpan.FromMinutes(3), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExpireTrialsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "TrialExpiryService scan failed");
            }

            await Task.Delay(_period, stoppingToken);
        }
    }

    private async Task ExpireTrialsAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        // Single atomic UPDATE — no load-then-save race condition.
        // IgnoreQueryFilters so banned/soft-deleted users are also downgraded.
        int count = await db.Users
            .IgnoreQueryFilters()
            .Where(u => u.Plan == SubscriptionPlan.Premium
                     && u.PlanExpiresAt != null
                     && u.PlanExpiresAt < now)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Plan, SubscriptionPlan.Free)
                .SetProperty(u => u.PlanExpiresAt, (DateTime?)null)
                .SetProperty(u => u.UpdatedAt, now), ct);

        if (count > 0)
            _logger.LogInformation("TrialExpiryService: expired {Count} plans at {Time}", count, now);
        else
            _logger.LogDebug("TrialExpiryService: no plans to expire at {Time}", now);
    }
}
