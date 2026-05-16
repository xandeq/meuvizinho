using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/push-token")]
[Authorize]
public class PushTokenController : ControllerBase
{
    private readonly AppDbContext _db;

    public PushTokenController(AppDbContext db) => _db = db;

    /// <summary>Upsert Expo push token for the authenticated user's device.</summary>
    [HttpPut("")]
    public async Task<IActionResult> Upsert([FromBody] UpsertPushTokenRequest body, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(body.Token) || !body.Token.StartsWith("ExponentPushToken["))
            return BadRequest(new { error = "Invalid Expo push token format." });

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound();

        user.ExpoPushToken = body.Token.Trim();
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("")]
    public async Task<IActionResult> Remove(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId.Value, ct);
        if (user == null) return NotFound();

        user.ExpoPushToken = null;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}

public class UpsertPushTokenRequest
{
    public string Token { get; set; } = string.Empty;
}
