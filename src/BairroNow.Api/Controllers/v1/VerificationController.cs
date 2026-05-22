using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Authorize]
public class VerificationController : ControllerBase
{
    private readonly IVerificationService _svc;
    private readonly AppDbContext _db;

    public VerificationController(IVerificationService svc, AppDbContext db)
    {
        _svc = svc;
        _db = db;
    }

    [HttpPost("/api/v1/verification")]
    [EnableRateLimiting("authenticated")]
    [RequestSizeLimit(6_291_456)]
    public async Task<IActionResult> Submit(
        [FromForm] string cep,
        [FromForm] string? numero,
        IFormFile proof,
        CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        try
        {
            var status = await _svc.SubmitAsync(userId.Value, cep, numero, proof, ct);
            return Ok(status);
        }
        catch (CepNotFoundException)
        {
            return BadRequest(new { error = "CEP não encontrado." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("/api/v1/verification/me")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await _svc.GetMyStatusAsync(userId.Value, ct));
    }

    /// <summary>
    /// Vouch for another user's verification (VER-012).
    /// Caller must be verified. Cannot vouch for self. Cannot vouch twice.
    /// Auto-approves verification at 2 vouches.
    /// </summary>
    [HttpPost("/api/v1/verification/{userId}/vouch")]
    [EnableRateLimiting("authenticated")]
    public async Task<IActionResult> Vouch(Guid userId, CancellationToken ct)
    {
        var callerId = GetUserId();
        if (callerId == null) return Unauthorized();

        // Caller must be verified
        var caller = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId.Value, ct);
        if (caller == null || !caller.IsVerified)
            return StatusCode(403, new { error = "Apenas moradores verificados podem dar vouch." });

        // Cannot vouch for self
        if (callerId.Value == userId)
            return BadRequest(new { error = "Voce nao pode dar vouch para si mesmo." });

        // Target user must exist
        var targetUser = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (targetUser == null)
            return NotFound(new { error = "Usuario nao encontrado." });

        // Wrap vouch insert + optional auto-approve in a serializable transaction
        // to prevent concurrent vouches from both passing the duplicate check and
        // causing double auto-approval.
        await using var tx = await _db.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable, ct);

        // Re-check duplicate inside the transaction
        var alreadyVouched = await _db.VerificationVouches
            .AnyAsync(v => v.VoucheeId == userId && v.VoucherId == callerId.Value, ct);
        if (alreadyVouched)
        {
            await tx.RollbackAsync(ct);
            return Conflict(new { error = "Voce ja deu vouch para este usuario." });
        }

        // Create vouch
        var vouch = new VerificationVouch
        {
            VoucheeId = userId,
            VoucherId = callerId.Value,
            CreatedAt = DateTime.UtcNow
        };
        _db.VerificationVouches.Add(vouch);
        await _db.SaveChangesAsync(ct);

        // Check if auto-approval threshold reached (2 vouches)
        var vouchCount = await _db.VerificationVouches
            .CountAsync(v => v.VoucheeId == userId, ct);

        bool autoApproved = false;
        if (vouchCount >= 2 && !targetUser.IsVerified)
        {
            // Auto-approve: update verification status
            var verification = await _db.Verifications
                .Where(v => v.UserId == userId && v.Status == VerificationStatus.Pending)
                .OrderByDescending(v => v.SubmittedAt)
                .FirstOrDefaultAsync(ct);

            if (verification != null)
            {
                verification.Status = VerificationStatus.Approved;
                verification.ReviewedAt = DateTime.UtcNow;
            }

            targetUser.IsVerified = true;
            targetUser.VerifiedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            autoApproved = true;
        }

        await tx.CommitAsync(ct);

        return Ok(autoApproved
            ? new { message = "Vouch registrado. Usuario aprovado automaticamente!", autoApproved = true }
            : new { message = "Vouch registrado com sucesso.", autoApproved = false });
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
