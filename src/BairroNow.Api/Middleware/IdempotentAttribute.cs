using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Memory;

namespace BairroNow.Api.Middleware;

[AttributeUsage(AttributeTargets.Method)]
public class IdempotentAttribute : ActionFilterAttribute
{
    private const string HeaderName = "Idempotency-Key";
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);

    public override async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var key = context.HttpContext.Request.Headers[HeaderName].FirstOrDefault();
        if (string.IsNullOrEmpty(key))
        {
            await next();
            return;
        }

        var userId = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? context.HttpContext.User.FindFirst("sub")?.Value
                  ?? "anon";
        var cacheKey = $"idem:{userId}:{key}";

        var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();

        if (cache.TryGetValue(cacheKey, out IdempotencyEntry? cached) && cached != null)
        {
            context.Result = new ContentResult
            {
                Content = cached.Body,
                ContentType = "application/json",
                StatusCode = cached.StatusCode
            };
            return;
        }

        var executed = await next();

        // Só sucesso vira replay. Antes um 400/403 também era guardado por 24h: o usuário corrigia o
        // formulário, tentava de novo (mesma chave por 5 min no site) e recebia o mesmo erro antigo.
        // Serializa com as opções da API (camelCase, enums como texto): o replay vinha em PascalCase.
        if (executed.Exception == null && executed.Result is ObjectResult obj && (obj.StatusCode ?? 200) is >= 200 and < 300)
        {
            var json = context.HttpContext.RequestServices
                .GetService<Microsoft.Extensions.Options.IOptions<Microsoft.AspNetCore.Mvc.JsonOptions>>()?.Value.JsonSerializerOptions
                ?? new JsonSerializerOptions(JsonSerializerDefaults.Web);
            var entry = new IdempotencyEntry
            {
                StatusCode = obj.StatusCode ?? 200,
                Body = JsonSerializer.Serialize(obj.Value, json)
            };
            cache.Set(cacheKey, entry, CacheTtl);
        }
    }

    private sealed class IdempotencyEntry
    {
        public int StatusCode { get; init; }
        public string Body { get; init; } = string.Empty;
    }
}
