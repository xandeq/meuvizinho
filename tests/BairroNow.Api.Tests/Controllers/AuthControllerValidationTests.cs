using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;
using BairroNow.Api.Validators;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;

namespace BairroNow.Api.Tests.Controllers;

/// <summary>
/// O RegisterRequestValidator existia mas não rodava: o servidor criava conta com
/// qualquer senha e gravava o aceite da política mesmo sem o usuário aceitar.
/// </summary>
public class AuthControllerValidationTests
{
    private readonly Mock<IAuthService> _auth = new();

    private AuthController Controller() =>
        new(_auth.Object, new ConfigurationBuilder().Build(), new RegisterRequestValidator(), new ResetPasswordRequestValidator(),
            new LoginHandoff(new Microsoft.Extensions.Caching.Memory.MemoryCache(new Microsoft.Extensions.Caching.Memory.MemoryCacheOptions())));

    [Fact]
    public async Task Register_WeakPassword_Returns400_AndDoesNotCreateAccount()
    {
        var result = await Controller().Register(new RegisterRequest("a@b.com", "a", "a", true), default);

        result.Should().BeOfType<BadRequestObjectResult>();
        _auth.Verify(a => a.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Register_WithoutPrivacyConsent_Returns400()
    {
        var result = await Controller().Register(new RegisterRequest("a@b.com", "Forte123!", "Forte123!", false), default);

        result.Should().BeOfType<BadRequestObjectResult>();
        _auth.Verify(a => a.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Register_Success_ReturnsSession_AndSetsRefreshCookie()
    {
        var user = new UserInfo(Guid.NewGuid(), "novo@b.com", null, false, null, false, false);
        _auth.Setup(a => a.RegisterAsync(It.IsAny<RegisterRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new AuthResponse("tok-reg", user), (string?)null));
        _auth.Setup(a => a.LoginAsync(It.IsAny<LoginRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((new AuthResponse("tok-login", user), "refresh-1", false, (Guid?)null, (string?)null));
        var controller = Controller();
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

        var result = await controller.Register(new RegisterRequest("novo@b.com", "Forte123!", "Forte123!", true), default);

        var created = result.Should().BeOfType<ObjectResult>().Subject;
        created.StatusCode.Should().Be(201);
        created.Value!.GetType().GetProperty("accessToken")!.GetValue(created.Value).Should().Be("tok-login");
        controller.Response.Headers.SetCookie.ToString().Should().Contain("refreshToken=");
    }

    [Fact]
    public async Task ResetPassword_WeakPassword_Returns400_AndDoesNotReset()
    {
        var result = await Controller().ResetPassword(new ResetPasswordRequest("tok", "a@b.com", "123"), default);

        result.Should().BeOfType<BadRequestObjectResult>();
        _auth.Verify(a => a.ResetPasswordAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GoogleChallenge_WithoutGoogleScheme_RedirectsToLoginInsteadOf500()
    {
        var schemes = new Mock<Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider>();
        schemes.Setup(s => s.GetSchemeAsync("Google")).ReturnsAsync((Microsoft.AspNetCore.Authentication.AuthenticationScheme?)null);
        var services = new Mock<IServiceProvider>();
        services.Setup(s => s.GetService(typeof(Microsoft.AspNetCore.Authentication.IAuthenticationSchemeProvider))).Returns(schemes.Object);
        var controller = Controller();
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { RequestServices = services.Object } };

        var result = await controller.GoogleChallenge();

        result.Should().BeOfType<RedirectResult>().Which.Url.Should().EndWith("/login/?error=google");
    }
}
