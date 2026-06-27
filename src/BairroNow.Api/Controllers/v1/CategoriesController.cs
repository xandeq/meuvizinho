using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using BairroNow.Api.Constants;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Controllers.v1;

[ApiController]
[Authorize]
[EnableRateLimiting("authenticated")]
public class CategoriesController : ControllerBase
{
    private const string DisabledCacheKey = "marketplace:disabled-categories";
    private readonly IMemoryCache _cache;

    public CategoriesController(IMemoryCache cache)
    {
        _cache = cache;
    }

    [HttpGet("api/v1/categories")]
    public IActionResult List()
    {
        var disabled = GetDisabledSet();
        var result = Categories.All.Select(c => new CategoryDto
        {
            Code = c.Code,
            DisplayName = c.DisplayName,
            Enabled = !disabled.Contains(c.Code),
            Subcategories = c.Subcategories.Select(s => new SubcategoryDto { Code = s.Code, DisplayName = s.DisplayName }).ToList()
        }).ToList();
        return Ok(result);
    }

    // D-26: admin can ON/OFF only, no create/delete
    [HttpPatch("api/v1/admin/categories/{code}")]
    [Authorize(Policy = "Admin")]
    public IActionResult Toggle(string code, [FromBody] ToggleCategoryRequest dto)
    {
        if (!Categories.IsValidCategoryCode(code)) return NotFound();
        var disabled = GetDisabledSet();
        if (dto.Enabled) disabled.Remove(code); else disabled.Add(code);
        _cache.Set(DisabledCacheKey, disabled, TimeSpan.FromHours(24));
        return Ok(new { code, enabled = dto.Enabled });
    }

    private HashSet<string> GetDisabledSet()
    {
        return _cache.GetOrCreate(DisabledCacheKey, _ => new HashSet<string>())!;
    }
}
