using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Middleware;
using Xunit;

namespace BairroNow.Api.Tests.Middleware;

public class ExceptionHandlerMiddlewareTests
{
    private static ExceptionHandlerMiddleware Build(RequestDelegate next) =>
        new(next, NullLogger<ExceptionHandlerMiddleware>.Instance, Mock.Of<IHostEnvironment>());

    [Fact]
    public async Task ClientAbort_IsNot500()
    {
        using var cts = new CancellationTokenSource();
        var ctx = new DefaultHttpContext { RequestAborted = cts.Token };
        cts.Cancel();

        await Build(_ => throw new TaskCanceledException()).InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(499);
    }

    [Fact]
    public async Task ServerTimeout_StillReturns500()
    {
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();

        await Build(_ => throw new TaskCanceledException()).InvokeAsync(ctx);

        ctx.Response.StatusCode.Should().Be(500);
    }
}
