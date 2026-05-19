using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using BairroNow.Api.Middleware;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Route("api/v1/listings")]
[Authorize]
public class ListingsController : ControllerBase
{
    private readonly IListingService _listings;

    public ListingsController(IListingService listings)
    {
        _listings = listings;
    }

    [HttpPost("")]
    [Idempotent]
    [Authorize(Policy = "VerifiedOnly")]
    [EnableRateLimiting("feed-write")]
    [RequestSizeLimit(35_000_000)]
    public async Task<IActionResult> Create(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();

        // Multipart: "data" form field with JSON body + photos[] files.
        var form = await Request.ReadFormAsync(ct);
        var json = form["data"].ToString();
        if (string.IsNullOrWhiteSpace(json)) return BadRequest(new { error = "Campo 'data' obrigatório." });
        CreateListingRequest? dto;
        try
        {
            dto = JsonSerializer.Deserialize<CreateListingRequest>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        catch (Exception ex) { return BadRequest(new { error = $"JSON inválido: {ex.Message}" }); }
        if (dto == null) return BadRequest(new { error = "Body inválido." });

        try
        {
            var result = await _listings.CreateAsync(userId.Value, dto, form.Files, ct);
            return Ok(result);
        }
        catch (ListingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (ListingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("")]
    public async Task<IActionResult> List(
        [FromQuery] int bairroId,
        [FromQuery] string? category,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] bool verifiedOnly = true,
        [FromQuery] string? sort = null,
        [FromQuery] string? cursor = null,
        [FromQuery] int take = 20,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var page = await _listings.GetBairroGridAsync(userId.Value, bairroId, category, minPrice, maxPrice, verifiedOnly, sort, cursor, take, ct);
        return Ok(page);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] int bairroId,
        [FromQuery] string q,
        [FromQuery] string? category,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] bool verifiedOnly = true,
        CancellationToken ct = default)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var page = await _listings.SearchAsync(userId.Value, bairroId, q, category, minPrice, maxPrice, verifiedOnly, ct);
            return Ok(page);
        }
        catch (ListingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var dto = await _listings.GetByIdAsync(userId.Value, id, ct);
        return dto == null ? NotFound() : Ok(dto);
    }

    [HttpPatch("{id:int}")]
    [Authorize(Policy = "VerifiedOnly")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateListingRequest dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var result = await _listings.UpdateAsync(userId.Value, id, dto, ct);
            return Ok(result);
        }
        catch (ListingNotFoundException) { return NotFound(); }
        catch (ListingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (ListingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:int}/mark-sold")]
    public async Task<IActionResult> MarkSold(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var result = await _listings.MarkSoldAsync(userId.Value, id, ct);
            return Ok(result);
        }
        catch (ListingNotFoundException) { return NotFound(); }
        catch (ListingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
    }

    [HttpPost("{id:int}/renew")]
    [EnableRateLimiting("feed-write")]
    public async Task<IActionResult> Renew(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var result = await _listings.RenewAsync(userId.Value, id, ct);
            return Ok(result);
        }
        catch (ListingNotFoundException) { return NotFound(); }
        catch (ListingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
        catch (ListingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try { await _listings.DeleteAsync(userId.Value, id, ct); return NoContent(); }
        catch (ListingNotFoundException) { return NotFound(); }
        catch (ListingForbiddenException ex) { return StatusCode(403, new { error = ex.Message }); }
    }

    [HttpPost("{id:int}/favorite")]
    public async Task<IActionResult> Favorite(int id, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var favorited = await _listings.ToggleFavoriteAsync(userId.Value, id, ct);
            return Ok(new { favorited });
        }
        catch (ListingNotFoundException) { return NotFound(); }
        catch (ListingValidationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    [HttpPost("{id:int}/report")]
    public async Task<IActionResult> Report(int id, [FromBody] ReportListingRequest dto, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            await _listings.ReportAsync(userId.Value, id, dto, ct);
            return Accepted();
        }
        catch (ListingNotFoundException) { return NotFound(); }
    }

    private Guid? GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
