using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/sellers/{userId:guid}/ratings")]
[Authorize]
[EnableRateLimiting("authenticated")]
public class SellerRatingsController : ControllerBase
{
    private readonly IRatingService _ratings;

    public SellerRatingsController(IRatingService ratings)
    {
        _ratings = ratings;
    }

    [HttpGet("")]
    public async Task<IActionResult> List(Guid userId, CancellationToken ct)
    {
        var result = await _ratings.ListForSellerAsync(userId, ct);
        return Ok(result);
    }

    [HttpPost("")]
    public async Task<IActionResult> Create(Guid userId, [FromBody] CreateRatingRequest dto, CancellationToken ct)
    {
        var buyerId = GetUserId();
        if (buyerId == null) return Unauthorized();
        try
        {
            var rating = await _ratings.CreateAsync(buyerId.Value, userId, dto, ct);
            return Ok(rating);
        }
        catch (RatingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (RatingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Edit(Guid userId, int id, [FromBody] CreateRatingRequest dto, CancellationToken ct)
    {
        var buyerId = GetUserId();
        if (buyerId == null) return Unauthorized();
        try
        {
            var rating = await _ratings.EditAsync(buyerId.Value, userId, id, dto, ct);
            return Ok(rating);
        }
        catch (RatingNotFoundException) { return NotFound(); }
        catch (RatingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (RatingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> AdminDelete(Guid userId, int id, CancellationToken ct)
    {
        var adminId = GetUserId();
        if (adminId == null) return Unauthorized();
        try { await _ratings.AdminDeleteAsync(adminId.Value, id, ct); return NoContent(); }
        catch (RatingNotFoundException) { return NotFound(); }
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
