using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using BairroNow.Api.Middleware;
using Xunit;

namespace BairroNow.Api.Tests.Middleware;

public class CloudflareClientIpMiddlewareTests
{
    private static async Task<IPAddress?> Run(string remote, string? cfHeader)
    {
        var ctx = new DefaultHttpContext();
        ctx.Connection.RemoteIpAddress = IPAddress.Parse(remote);
        if (cfHeader != null) ctx.Request.Headers["CF-Connecting-IP"] = cfHeader;
        IPAddress? seen = null;
        await new CloudflareClientIpMiddleware(c => { seen = c.Connection.RemoteIpAddress; return Task.CompletedTask; }).InvokeAsync(ctx);
        return seen;
    }

    [Theory]
    [InlineData("104.21.48.248")]          // borda IPv4 que serve api.bairronow.com.br
    [InlineData("2606:4700:3033::6815:30f8")] // borda IPv6
    [InlineData("::ffff:172.68.1.10")]     // IPv4 mapeado em IPv6, como o IIS às vezes entrega
    public async Task FromCloudflare_UsesRealClientIp(string edge)
    {
        (await Run(edge, "189.6.20.30")).Should().Be(IPAddress.Parse("189.6.20.30"));
    }

    [Fact]
    public async Task DirectToOrigin_CannotSpoofHeader()
    {
        // Quem bate direto na origem não pode trocar de IP a cada requisição para fugir do rate limit.
        (await Run("201.17.5.9", "1.2.3.4")).Should().Be(IPAddress.Parse("201.17.5.9"));
    }

    [Fact]
    public async Task FromCloudflare_WithoutOrInvalidHeader_KeepsConnectionIp()
    {
        (await Run("104.21.48.248", null)).Should().Be(IPAddress.Parse("104.21.48.248"));
        (await Run("104.21.48.248", "lixo")).Should().Be(IPAddress.Parse("104.21.48.248"));
    }
}
