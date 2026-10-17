using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;
using BairroNow.Api.Validators;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BairroNow.Api.Tests.Controllers;

/// <summary>
/// Link mágico: o redirect levava ?token=&lt;access token&gt; (histórico, logs do Cloudflare, Referer) e o
/// cookie de refresh era gravado numa navegação direta à API — Partitioned, ficava fora do alcance do site.
/// Agora a URL leva só um código de uso único, trocado pelo site por XHR.
/// </summary>
public class LoginHandoffTests
{
    private readonly Mock<IAuthService> _auth = new();
    private readonly LoginHandoff _handoff = new(new MemoryCache(new MemoryCacheOptions()));
    private static readonly UserInfo User = new(Guid.NewGuid(), "ana@t.com", "Ana", true, 1, true, false);

    private AuthController Controller()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["FrontendUrl"] = "https://site.test" }).Build();
        return new AuthController(_auth.Object, config, new RegisterRequestValidator(), new ResetPasswordRequestValidator(), _handoff)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
    }

    private void MagicLinkSucceeds() =>
        _auth.Setup(a => a.VerifyMagicLinkAsync("link", It.IsAny<CancellationToken>()))
            .ReturnsAsync((new AuthResponse("access-secreto", User), "refresh-secreto", (string?)null));

    [Fact]
    public async Task MagicLink_RedirectCarriesNoToken_OnlyOneTimeCode()
    {
        MagicLinkSucceeds();
        var ctrl = Controller();

        var url = (await ctrl.MagicLinkVerify("link", default)).Should().BeOfType<RedirectResult>().Subject.Url;

        url.Should().StartWith("https://site.test/auth/callback/?code=");
        url.Should().NotContain("access-secreto").And.NotContain("refresh-secreto").And.NotContain("token=");
        ctrl.Response.Headers.SetCookie.ToString().Should().BeEmpty("o cookie é gravado na troca, pelo site");
    }

    [Fact]
    public async Task Exchange_ReturnsSession_SetsCookie_AndCodeIsSingleUse()
    {
        MagicLinkSucceeds();
        var url = ((RedirectResult)await Controller().MagicLinkVerify("link", default)).Url;
        var code = url.Split("code=")[1];

        var ctrl = Controller();
        var ok = ctrl.Exchange(new LoginExchangeRequest(code)).Should().BeOfType<OkObjectResult>().Subject;
        ((AuthResponse)ok.Value!).AccessToken.Should().Be("access-secreto");
        ctrl.Response.Headers.SetCookie.ToString().Should().Contain("refreshToken=refresh-secreto");

        Controller().Exchange(new LoginExchangeRequest(code)).Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("chute")]
    public void Exchange_UnknownCode_IsRejected(string? code)
    {
        Controller().Exchange(new LoginExchangeRequest(code)).Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task MagicLink_AdminWithTotp_IsToldTheRightWayIn()
    {
        _auth.Setup(a => a.VerifyMagicLinkAsync("link", It.IsAny<CancellationToken>()))
            .ReturnsAsync(((AuthResponse?)null, (string?)null, "Contas de administrador com verificação em duas etapas entram com e-mail, senha e código."));

        var url = ((RedirectResult)await Controller().MagicLinkVerify("link", default)).Url;

        url.Should().EndWith("/auth/magic-link/?error=totp");
    }
}
