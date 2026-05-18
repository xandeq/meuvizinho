using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BairroNow.Api.Middleware;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chat;

    public ChatController(IChatService chat)
    {
        _chat = chat;
    }

    [HttpGet("conversations")]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        return Ok(await _chat.ListAsync(userId.Value, ct));
    }

    [HttpPost("conversations")]
    public async Task<IActionResult> Create([FromBody] CreateConversationRequest dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var conv = await _chat.CreateOrGetAsync(userId.Value, dto, ct);
            return Ok(conv);
        }
        catch (ChatNotFoundException) { return NotFound(); }
        catch (ChatForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
    }

    [HttpGet("conversations/{id:int}/messages")]
    public async Task<IActionResult> History(int id, [FromQuery] DateTime? before, [FromQuery] int limit = 50, CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            return Ok(await _chat.GetHistoryAsync(userId.Value, id, before, limit, ct));
        }
        catch (ChatForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
    }

    [HttpPost("conversations/{id:int}/messages")]
    [Idempotent]
    [EnableRateLimiting("feed-write")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Send(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var form = await Request.ReadFormAsync(ct);
        var text = form["text"].ToString();
        var image = form.Files.Count > 0 ? form.Files[0] : null;
        try
        {
            var msg = await _chat.SendAsync(userId.Value, id, text, image, ct);
            return Ok(msg);
        }
        catch (ChatNotFoundException) { return NotFound(); }
        catch (ChatForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (ChatValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("conversations/{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try { await _chat.MarkReadAsync(userId.Value, id, ct); return NoContent(); }
        catch (ChatForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> UnreadCount(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var total = await _chat.GetUnreadCountAsync(userId.Value, ct);
        return Ok(new UnreadCountResponse { Total = total });
    }

    // Direct DM — creates or returns existing conversation without a listing.
    // Route lives here (not UserController) because it returns a ConversationDto.
    [HttpPost("/api/v1/users/{recipientId:guid}/conversation")]
    [EnableRateLimiting("dm-create")]
    public async Task<IActionResult> CreateDirect(Guid recipientId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var conv = await _chat.CreateDirectAsync(userId.Value, recipientId, ct);
            return Ok(conv);
        }
        catch (ChatNotFoundException ex) { return NotFound(new { error = ex.Message }); }
        catch (ChatForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
