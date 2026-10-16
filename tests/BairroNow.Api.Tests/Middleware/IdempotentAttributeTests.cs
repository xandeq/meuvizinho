using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using BairroNow.Api.Middleware;
using Xunit;

namespace BairroNow.Api.Tests.Middleware;

// Antes um 400 ficava guardado 24h: corrigir o formulário e tentar de novo devolvia o erro antigo.
public class IdempotentAttributeTests
{
    private readonly IServiceProvider _services = new ServiceCollection().AddMemoryCache().BuildServiceProvider();

    private async Task<(ActionExecutingContext ctx, int calls)> Run(IActionResult result, int callsBefore = 0)
    {
        var http = new DefaultHttpContext { RequestServices = _services };
        http.Request.Headers["Idempotency-Key"] = "k1";
        var action = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var filters = new List<IFilterMetadata>();
        var ctx = new ActionExecutingContext(action, filters, new Dictionary<string, object?>(), controller: new object());
        var calls = callsBefore;
        await new IdempotentAttribute().OnActionExecutionAsync(ctx, () =>
        {
            calls++;
            return Task.FromResult(new ActionExecutedContext(action, filters, new object()) { Result = result });
        });
        return (ctx, calls);
    }

    [Fact]
    public async Task ErrorResponse_IsNotReplayed()
    {
        var (_, first) = await Run(new BadRequestObjectResult(new { error = "Título curto" }));
        var (second, calls) = await Run(new OkObjectResult(new { id = 1 }), first);

        calls.Should().Be(2); // a segunda tentativa executou de verdade
        second.Result.Should().BeNull();
    }

    [Fact]
    public async Task SuccessResponse_IsReplayed_InCamelCase()
    {
        await Run(new OkObjectResult(new { ListingId = 9 }));
        var (second, calls) = await Run(new OkObjectResult(new { ListingId = 10 }), 1);

        calls.Should().Be(1); // não executou de novo
        var replay = second.Result.Should().BeOfType<ContentResult>().Subject;
        replay.Content.Should().Contain("\"listingId\":9");
    }
}
