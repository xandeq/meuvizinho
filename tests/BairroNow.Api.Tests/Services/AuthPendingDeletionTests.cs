using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using Xunit;

namespace BairroNow.Api.Tests.Services;

// O e-mail de exclusão diz "faça login antes do prazo para cancelar", mas a conta pendente fica
// IsActive=false e o login respondia "E-mail ou senha incorretos": o usuário ficava trancado fora.
public class AuthPendingDeletionTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AuthService _service;

    public AuthPendingDeletionTests()
    {
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var tokens = new Mock<ITokenService>();
        tokens.Setup(x => x.GenerateAccessToken(It.IsAny<User>())).Returns("jwt");
        tokens.Setup(x => x.GenerateRefreshToken()).Returns("refresh");
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-key-must-be-at-least-32-characters-long-for-hmac",
        }).Build();
        _service = new AuthService(_db, tokens.Object, Mock.Of<IEmailService>(), config,
            Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<AuthService>>());
    }

    public void Dispose() => _db.Dispose();

    private User AddPending(DateTime requestedAt)
    {
        var user = new User
        {
            Id = Guid.NewGuid(), Email = "ana@t.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Senha123!"),
            EmailConfirmed = true, IsActive = false, DeleteRequestedAt = requestedAt
        };
        _db.Users.Add(user);
        _db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task Login_WithinGrace_CancelsDeletion()
    {
        var user = AddPending(DateTime.UtcNow.AddDays(-3));

        var (response, _, _, _, error) = await _service.LoginAsync(new LoginRequest("ana@t.com", "Senha123!"), "127.0.0.1");

        error.Should().BeNull();
        response.Should().NotBeNull();
        var saved = await _db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        saved.IsActive.Should().BeTrue();
        saved.DeleteRequestedAt.Should().BeNull();
    }

    [Fact]
    public async Task Login_WrongPassword_KeepsDeletionPending()
    {
        var user = AddPending(DateTime.UtcNow.AddDays(-3));

        var (response, _, _, _, error) = await _service.LoginAsync(new LoginRequest("ana@t.com", "errada"), "127.0.0.1");

        response.Should().BeNull();
        error.Should().Be("E-mail ou senha incorretos.");
        var saved = await _db.Users.IgnoreQueryFilters().FirstAsync(u => u.Id == user.Id);
        saved.IsActive.Should().BeFalse();
        saved.DeleteRequestedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task Login_AfterGrace_StaysBlocked()
    {
        AddPending(DateTime.UtcNow.AddDays(-31));

        var (response, _, _, _, _) = await _service.LoginAsync(new LoginRequest("ana@t.com", "Senha123!"), "127.0.0.1");

        response.Should().BeNull();
    }

    [Fact]
    public async Task GoogleSignIn_WithinGrace_ReactivatesSameAccount()
    {
        var user = AddPending(DateTime.UtcNow.AddDays(-1));

        var (response, _, error) = await _service.GoogleSignInAsync("ana@t.com", "google-1");

        error.Should().BeNull();
        response.Should().NotBeNull();
        (await _db.Users.IgnoreQueryFilters().CountAsync()).Should().Be(1);
        (await _db.Users.FirstAsync(u => u.Id == user.Id)).IsActive.Should().BeTrue();
    }
}
