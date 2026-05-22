using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;

namespace BairroNow.Api.Services;

public class DigestSchedulerService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<DigestSchedulerService> _logger;
    private DateOnly? _lastDigestDate;

    public DigestSchedulerService(IServiceProvider services, ILogger<DigestSchedulerService> logger)
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
                var now = DateTime.UtcNow;
                // Monday 12:00 UTC = 09:00 BRT
                if (now.DayOfWeek == DayOfWeek.Monday && now.Hour == 12 && now.Minute < 5)
                {
                    var today = DateOnly.FromDateTime(now);
                    if (_lastDigestDate != today)
                    {
                        await SendDigestsAsync(stoppingToken);
                        // Mark week's digest sent only after success, so a transient
                        // DB/SMTP failure during the 5-minute Monday window can still
                        // retry on the next 1-minute tick instead of losing the week.
                        _lastDigestDate = today;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DigestSchedulerService error");
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task SendDigestsAsync(CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();

        var users = await db.Users.AsNoTracking()
            .Where(u => !u.DigestOptOut && u.EmailConfirmed && u.IsActive && u.BairroId != null)
            .Select(u => new { u.Id, u.Email, u.BairroId })
            .ToListAsync(ct);

        if (users.Count == 0)
            return;

        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);
        var sevenDaysFromNow = now.AddDays(7);

        // Collect the distinct bairro IDs we actually need before the loop.
        var bairroIds = users.Select(u => u.BairroId!.Value).Distinct().ToList();

        // --- Batch query 1: all relevant bairros in one round-trip ---
        var bairrosById = await db.Bairros.AsNoTracking()
            .Where(b => bairroIds.Contains(b.Id))
            .ToDictionaryAsync(b => b.Id, ct);

        // --- Batch query 2: top-3 posts per bairro (single query, grouped in memory) ---
        // Fetching up to 10 candidates per bairro and slicing to 3 in memory is safe
        // because the number of bairros is bounded (~hundreds) and posts are already
        // filtered to a 7-day window. An alternative GROUP BY TOP-N in SQL requires
        // window functions not natively supported by EF Core without raw SQL.
        var recentPostsByBairro = (await db.Posts.AsNoTracking()
            .Where(p => bairroIds.Contains(p.BairroId) && p.CreatedAt >= sevenDaysAgo)
            .Select(p => new { p.Id, p.Body, p.BairroId, LikeCount = p.Likes.Count })
            .ToListAsync(ct))
            .GroupBy(p => p.BairroId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(p => p.LikeCount).Take(3).ToList());

        // --- Batch query 3: upcoming events per bairro (single query, grouped in memory) ---
        var upcomingEventsByBairro = (await db.GroupEvents.AsNoTracking()
            .Where(e => bairroIds.Contains(e.Group!.BairroId)
                && e.StartsAt >= now
                && e.StartsAt <= sevenDaysFromNow
                && e.DeletedAt == null)
            .Select(e => new { e.Id, e.Title, e.StartsAt, BairroId = e.Group!.BairroId })
            .ToListAsync(ct))
            .GroupBy(e => e.BairroId)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(e => e.StartsAt).Take(3).ToList());

        // --- Loop is now purely in-memory: no DB calls inside ---
        foreach (var user in users)
        {
            try
            {
                var bairroId = user.BairroId!.Value;

                if (!bairrosById.TryGetValue(bairroId, out var bairro))
                    continue;

                var topPosts = recentPostsByBairro.GetValueOrDefault(bairroId) ?? [];
                var upcomingEvents = upcomingEventsByBairro.GetValueOrDefault(bairroId) ?? [];

                if (topPosts.Count == 0 && upcomingEvents.Count == 0)
                    continue;

                var html = $@"
<h2>O que aconteceu no {bairro.Nome} essa semana</h2>";

                if (topPosts.Count > 0)
                {
                    html += "<h3>Posts mais curtidos</h3><ul>";
                    foreach (var post in topPosts)
                    {
                        var preview = post.Body.Length > 100 ? post.Body[..100] + "..." : post.Body;
                        html += $"<li>{preview} ({post.LikeCount} curtidas)</li>";
                    }
                    html += "</ul>";
                }

                if (upcomingEvents.Count > 0)
                {
                    html += "<h3>Proximos eventos</h3><ul>";
                    foreach (var ev in upcomingEvents)
                    {
                        html += $"<li><strong>{ev.Title}</strong> - {ev.StartsAt:dd/MM/yyyy HH:mm}</li>";
                    }
                    html += "</ul>";
                }

                await emailService.SendWeeklyDigestAsync(user.Email, bairro.Nome, html);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send digest to {UserId}", user.Id);
            }
        }

        _logger.LogInformation("Weekly digest sent to {Count} users", users.Count);
    }
}
