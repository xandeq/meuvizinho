using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Services;
using BairroNow.Api.Validators;
using FluentAssertions;
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
        new(_auth.Object, new ConfigurationBuilder().Build(), new RegisterRequestValidator(), new ResetPasswordRequestValidator());

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
    public async Task ResetPassword_WeakPassword_Returns400_AndDoesNotReset()
    {
        var result = await Controller().ResetPassword(new ResetPasswordRequest("tok", "a@b.com", "123"), default);

        result.Should().BeOfType<BadRequestObjectResult>();
        _auth.Verify(a => a.ResetPasswordAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
