namespace BairroNow.Api.Services;

/// <summary>
/// LGPD compliance: once per day, anonymize users whose DeleteRequestedAt is
/// older than 30 days. Without this scheduler, RunAnonymizationAsync would
/// never be called and the 30-day grace period would silently stretch forever.
/// </summary>
public class AnonymizationSchedulerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<AnonymizationSchedulerService> _logger;
    private DateOnly? _lastRunDate;

    public AnonymizationSchedulerService(IServiceProvider services, ILogger<AnonymizationSchedulerService> logger)
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
                    using var scope = _services.CreateScope();
                    var accountService = scope.ServiceProvider.GetRequiredService<AccountService>();
                    await accountService.RunAnonymizationAsync(stoppingToken);
                    // Only mark the day complete AFTER a successful run, so a transient
                    // failure (DB down, etc.) gets retried on the next 1h tick instead
                    // of being skipped until tomorrow's midnight roll-over.
                    _lastRunDate = today;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AnonymizationSchedulerService error");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }
}
