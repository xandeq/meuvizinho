using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Authorize]
[EnableRateLimiting("authenticated")]
public class SubscriptionController : ControllerBase
{
    private static readonly TimeSpan _trialDuration = TimeSpan.FromDays(14);
    private readonly AppDbContext _db;

    public SubscriptionController(AppDbContext db) => _db = db;

    // GET /api/v1/subscription/status
    [HttpGet("/api/v1/subscription/status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound();

        var now = DateTime.UtcNow;
        bool isOnTrial = user.Plan == SubscriptionPlan.Premium
                      && user.TrialUsedAt != null
                      && user.PlanExpiresAt != null;

        int? daysRemaining = user.PlanExpiresAt.HasValue
            ? Math.Max(0, (int)Math.Ceiling((user.PlanExpiresAt.Value - now).TotalDays))
            : null;

        return Ok(new SubscriptionStatusDto(
            Plan: user.Plan,
            PlanExpiresAt: user.PlanExpiresAt,
            IsOnTrial: isOnTrial,
            IsEligibleForTrial: user.TrialUsedAt == null,
            DaysRemaining: daysRemaining
        ));
    }

    // POST /api/v1/subscription/trial
    // Starts a 14-day premium trial. One trial per account lifetime.
    [HttpPost("/api/v1/subscription/trial")]
    public async Task<IActionResult> StartTrial(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound();

        if (user.TrialUsedAt != null)
            return Conflict(new { error = "Trial já utilizado. Cada conta tem direito a um trial gratuito." });

        if (user.Plan == SubscriptionPlan.Premium)
            return Conflict(new { error = "Você já tem um plano Premium ativo." });

        var now = DateTime.UtcNow;
        user.Plan = SubscriptionPlan.Premium;
        user.PlanExpiresAt = now.Add(_trialDuration);
        user.TrialUsedAt = now;
        user.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            message = "Trial de 14 dias ativado com sucesso.",
            planExpiresAt = user.PlanExpiresAt,
            daysRemaining = 14
        });
    }

    // POST /api/v1/admin/subscription/grant
    // Admin grants premium to any user with a custom duration.
    [HttpPost("/api/v1/admin/subscription/grant")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> GrantPremium([FromBody] GrantPremiumRequest body, CancellationToken ct)
    {
        if (body.DurationDays <= 0 || body.DurationDays > 3650)
            return BadRequest(new { error = "DurationDays deve ser entre 1 e 3650." });

        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();

        var admin = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == adminId.Value, ct);
        if (admin == null || !admin.IsAdmin) return Forbid();

        var target = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == body.UserId, ct);
        if (target == null) return NotFound(new { error = "Usuário não encontrado." });

        var now = DateTime.UtcNow;
        // If already premium, extend from current expiry; otherwise start fresh
        var baseDate = (target.Plan == SubscriptionPlan.Premium && target.PlanExpiresAt > now)
            ? target.PlanExpiresAt.Value
            : now;

        target.Plan = SubscriptionPlan.Premium;
        target.PlanExpiresAt = baseDate.AddDays(body.DurationDays);
        target.UpdatedAt = now;

        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            userId = target.Id,
            plan = target.Plan,
            planExpiresAt = target.PlanExpiresAt
        });
    }

    // DELETE /api/v1/admin/subscription/{userId}
    // Admin revokes premium immediately, returning user to free.
    [HttpDelete("/api/v1/admin/subscription/{userId:guid}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> RevokePremium(Guid userId, CancellationToken ct)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();

        var admin = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == adminId.Value, ct);
        if (admin == null || !admin.IsAdmin) return Forbid();

        var now = DateTime.UtcNow;
        int updated = await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.Id == userId && u.Plan == SubscriptionPlan.Premium)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Plan, SubscriptionPlan.Free)
                .SetProperty(u => u.PlanExpiresAt, (DateTime?)null)
                .SetProperty(u => u.UpdatedAt, now), ct);

        if (updated == 0)
            return NotFound(new { error = "Usuário não encontrado ou já está no plano Free." });

        return NoContent();
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
