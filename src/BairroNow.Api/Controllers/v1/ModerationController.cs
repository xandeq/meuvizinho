using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/admin/moderation")]
[Authorize(Policy = "Admin")]
[EnableRateLimiting("authenticated")]
public class ModerationController : ControllerBase
{
    private readonly IModerationService _moderation;
    private readonly AppDbContext _db;

    public ModerationController(IModerationService moderation, AppDbContext db)
    {
        _moderation = moderation;
        _db = db;
    }

    [HttpGet("reports")]
    public async Task<IActionResult> ListReports(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 20,
        [FromQuery] string? targetType = null,
        CancellationToken ct = default)
    {
        return Ok(await _moderation.ListPendingReportsAsync(skip, take, targetType, ct));
    }

    [HttpPost("reports/{id:int}/resolve")]
    public async Task<IActionResult> Resolve(int id, [FromBody] ResolveReportRequest body, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var ok = await _moderation.ResolveAsync(userId.Value, id, body, ct);
        return ok ? Ok(new { status = body.Action }) : NotFound();
    }

    [HttpPost("users/{userId:guid}/ban")]
    public async Task<IActionResult> BanUser(Guid userId, CancellationToken ct)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();
        if (adminId.Value == userId)
            return BadRequest(new { error = "Não é possível banir a si mesmo." });

        var user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null) return NotFound();

        user.IsBanned = true;
        user.IsActive = false;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "moderation.ban_user",
            EntityType = "User",
            EntityId = userId.ToString(),
            UserId = adminId.Value,
            IpAddress = GetIpAddress(),
            Details = $"User {user.Email} banned by admin."
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Usuário banido com sucesso." });
    }

    [HttpPost("users/{userId:guid}/unban")]
    public async Task<IActionResult> UnbanUser(Guid userId, CancellationToken ct)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();

        var user = await _db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null) return NotFound();

        user.IsBanned = false;
        user.IsActive = true;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "moderation.unban_user",
            EntityType = "User",
            EntityId = userId.ToString(),
            UserId = adminId.Value,
            IpAddress = GetIpAddress(),
            Details = $"User {user.Email} unbanned by admin."
        });

        await _db.SaveChangesAsync(ct);
        return Ok(new { message = "Usuário desbanido com sucesso." });
    }

    // Looks up the content author from a report and bans them
    [HttpPost("reports/{reportId:int}/ban-author")]
    public async Task<IActionResult> BanReportAuthor(int reportId, CancellationToken ct)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();

        var report = await _db.Reports.AsNoTracking().FirstOrDefaultAsync(r => r.Id == reportId, ct);
        if (report == null) return NotFound(new { error = "Report não encontrado." });

        Guid? authorId = null;
        if (report.TargetType == "post")
        {
            var post = await _db.Posts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == report.TargetId, ct);
            authorId = post?.AuthorId;
        }
        else if (report.TargetType == "listing")
        {
            var listing = await _db.Listings.AsNoTracking().FirstOrDefaultAsync(l => l.Id == report.TargetId, ct);
            authorId = listing?.SellerId;
        }
        else if (report.TargetType == "comment")
        {
            var comment = await _db.Comments.AsNoTracking().FirstOrDefaultAsync(c => c.Id == report.TargetId, ct);
            authorId = comment?.AuthorId;
        }

        if (authorId == null)
            return NotFound(new { error = "Autor do conteúdo não encontrado." });

        if (authorId.Value == adminId.Value)
            return BadRequest(new { error = "Não é possível banir a si mesmo." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == authorId.Value, ct);
        if (user == null) return NotFound(new { error = "Usuário não encontrado." });

        user.IsBanned = true;
        user.IsActive = false;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "moderation.ban_user",
            EntityType = "User",
            EntityId = authorId.Value.ToString(),
            UserId = adminId.Value,
            IpAddress = GetIpAddress(),
            Details = $"User {user.Email} banned via report #{reportId} by admin."
        });

        await _db.Reports.Where(r => r.Id == reportId)
            .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, "resolved"), ct);
        await _db.SaveChangesAsync(ct);

        return Ok(new { message = "Usuário banido com sucesso.", bannedUserId = authorId.Value });
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }

    private string GetIpAddress() =>
        HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString() ?? "unknown";
}
