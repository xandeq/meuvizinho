using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;

namespace BairroNow.Api.Tests.Auth;

/// <summary>
/// Regras de risco do acesso à conta: reset de senha (uso único, prazo, derrubar sessões),
/// segundo fator de administrador e o atalho do login com Google.
/// </summary>
public class AuthRiskTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _service;
    private readonly Mock<IEmailService> _email = new();
    private string? _lastMagicUrl;

    public AuthRiskTests()
    {
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var tokens = new Mock<ITokenService>();
        tokens.Setup(x => x.GenerateAccessToken(It.IsAny<User>())).Returns("jwt");
        tokens.Setup(x => x.GenerateRefreshToken()).Returns(() => Guid.NewGuid().ToString("N"));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-key-must-be-at-least-32-characters-long-for-hmac",
            ["Jwt:Issuer"] = "BairroNow",
            ["Jwt:Audience"] = "BairroNow",
        }).Build();
        _email.Setup(e => e.SendMagicLinkAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Callback<string, string>((_, url) => _lastMagicUrl = url)
            .Returns(Task.CompletedTask);
        _service = new AuthService(_db, tokens.Object, _email.Object, config,
            Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<AuthService>>());
    }

    public void Dispose() => _db.Dispose();

    private User AddUser(string email = "ana@t.com", string password = "SenhaAntiga1!", bool admin = false, bool totp = false)
    {
        var user = new User
        {
            Id = Guid.NewGuid(), Email = email, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            EmailConfirmed = true, IsAdmin = admin, TotpEnabled = totp,
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        return user;
    }

    private async Task<bool> CanLogin(string email, string password)
    {
        var (response, _, requiresTotp, _, _) = await _service.LoginAsync(new LoginRequest(email, password), "127.0.0.1");
        return response != null || requiresTotp;
    }

    // ── Reset de senha ──

    [Fact]
    public async Task ResetPassword_WithValidToken_ChangesPassword()
    {
        AddUser();
        var token = await _service.ForgotPasswordAsync("ana@t.com");

        (await _service.ResetPasswordAsync(token!, "ana@t.com", "SenhaNova1!")).Should().BeTrue();

        (await CanLogin("ana@t.com", "SenhaNova1!")).Should().BeTrue();
        (await CanLogin("ana@t.com", "SenhaAntiga1!")).Should().BeFalse();
    }

    [Fact]
    public async Task ResetPassword_TokenIsSingleUse()
    {
        AddUser();
        var token = await _service.ForgotPasswordAsync("ana@t.com");
        await _service.ResetPasswordAsync(token!, "ana@t.com", "SenhaNova1!");

        (await _service.ResetPasswordAsync(token!, "ana@t.com", "OutraSenha1!")).Should().BeFalse();
        (await CanLogin("ana@t.com", "SenhaNova1!")).Should().BeTrue();
    }

    [Fact]
    public async Task ResetPassword_ExpiredToken_IsRejected()
    {
        var user = AddUser();
        var token = await _service.ForgotPasswordAsync("ana@t.com");
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(-1);
        await _db.SaveChangesAsync();

        (await _service.ResetPasswordAsync(token!, "ana@t.com", "SenhaNova1!")).Should().BeFalse();
        (await CanLogin("ana@t.com", "SenhaAntiga1!")).Should().BeTrue();
    }

    [Fact]
    public async Task ResetPassword_TokenOfAnotherAccount_IsRejected()
    {
        AddUser("ana@t.com");
        AddUser("bia@t.com");
        var anasToken = await _service.ForgotPasswordAsync("ana@t.com");

        (await _service.ResetPasswordAsync(anasToken!, "bia@t.com", "Invasor1!")).Should().BeFalse();
    }

    [Fact]
    public async Task ResetPassword_RevokesExistingSessions()
    {
        // Quem trocou a senha porque a conta foi invadida precisa derrubar a sessão do invasor.
        AddUser();
        var (_, refreshDoInvasor, _, _, _) = await _service.LoginAsync(new LoginRequest("ana@t.com", "SenhaAntiga1!"), "10.0.0.66");
        var token = await _service.ForgotPasswordAsync("ana@t.com");

        await _service.ResetPasswordAsync(token!, "ana@t.com", "SenhaNova1!");

        var (refreshed, _, _) = await _service.RefreshAsync(refreshDoInvasor!, "10.0.0.66");
        refreshed.Should().BeNull();
    }

    [Fact]
    public async Task ResetPassword_UnlocksAccountLockedByFailedAttempts()
    {
        var user = AddUser();
        user.FailedLoginAttempts = 5;
        user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
        await _db.SaveChangesAsync();
        var token = await _service.ForgotPasswordAsync("ana@t.com");

        await _service.ResetPasswordAsync(token!, "ana@t.com", "SenhaNova1!");

        (await CanLogin("ana@t.com", "SenhaNova1!")).Should().BeTrue();
    }

    // ── Segundo fator (admin) ──

    [Fact]
    public async Task Login_AdminWithTotp_RequiresSecondFactor_AndIssuesNoSession()
    {
        var admin = AddUser("admin@t.com", admin: true, totp: true);

        var (response, refresh, requiresTotp, totpUserId, _) =
            await _service.LoginAsync(new LoginRequest("admin@t.com", "SenhaAntiga1!"), "127.0.0.1");

        requiresTotp.Should().BeTrue();
        totpUserId.Should().Be(admin.Id);
        response.Should().BeNull();
        refresh.Should().BeNull();
        (await _db.RefreshTokens.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task GoogleSignIn_AdminWithTotp_DoesNotBypassSecondFactor()
    {
        // O login com Google emitia sessão direto: admin com 2FA entrava só com a conta Google.
        AddUser("admin@t.com", admin: true, totp: true);

        var (response, refresh, error) = await _service.GoogleSignInAsync("admin@t.com", "google-sub-1");

        response.Should().BeNull();
        refresh.Should().BeNull();
        error.Should().NotBeNullOrEmpty();
        (await _db.RefreshTokens.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task GoogleSignIn_RegularUser_StillWorks()
    {
        AddUser("ana@t.com");

        var (response, _, error) = await _service.GoogleSignInAsync("Ana@T.com", "google-sub-2");

        error.Should().BeNull();
        response!.User.Email.Should().Be("ana@t.com");
    }

    [Fact]
    public async Task MagicLink_AdminWithTotp_DoesNotBypassSecondFactor()
    {
        // O link mágico emitia sessão direto: quem lesse o e-mail do admin entrava sem o código.
        AddUser("admin@t.com", admin: true, totp: true);
        await _service.RequestMagicLinkAsync("admin@t.com");
        var token = Uri.UnescapeDataString(_lastMagicUrl!.Split("token=")[1]);

        var (response, refresh, error) = await _service.VerifyMagicLinkAsync(token);

        response.Should().BeNull();
        refresh.Should().BeNull();
        error.Should().NotBeNullOrEmpty();
        (await _db.RefreshTokens.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task MagicLink_RegularUser_SignsInOnce()
    {
        AddUser("ana@t.com");
        await _service.RequestMagicLinkAsync("ana@t.com");
        var token = Uri.UnescapeDataString(_lastMagicUrl!.Split("token=")[1]);

        var (first, _, _) = await _service.VerifyMagicLinkAsync(token);
        var (second, _, secondError) = await _service.VerifyMagicLinkAsync(token);

        first.Should().NotBeNull();
        second.Should().BeNull();
        secondError.Should().NotBeNullOrEmpty();
    }
}
