using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly Mock<ITokenService> _tokenServiceMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly AuthService _service;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _tokenServiceMock = new Mock<ITokenService>();
        _emailServiceMock = new Mock<IEmailService>();
        _tokenServiceMock.Setup(x => x.GenerateAccessToken(It.IsAny<User>())).Returns("test-jwt");
        _tokenServiceMock.Setup(x => x.GenerateRefreshToken()).Returns("test-refresh-token");

        var configData = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-key-must-be-at-least-32-characters-long-for-hmac",
            ["Jwt:Issuer"] = "BairroNow",
            ["Jwt:Audience"] = "BairroNow"
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(configData).Build();

        _service = new AuthService(
            _db,
            _tokenServiceMock.Object,
            _emailServiceMock.Object,
            config,
            Mock.Of<IHttpClientFactory>(),
            Mock.Of<ILogger<AuthService>>());
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task RegisterAsync_CreatesUser_WithHashedPassword()
    {
        var request = new RegisterRequest("user@test.com", "ValidPass1!", "ValidPass1!", true);
        var (response, error) = await _service.RegisterAsync(request, "127.0.0.1");

        Assert.NotNull(response);
        Assert.Null(error);
        var user = await _db.Users.FirstAsync();
        Assert.NotEqual("ValidPass1!", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("ValidPass1!", user.PasswordHash));
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ReturnsError()
    {
        _db.Users.Add(new User { Id = Guid.NewGuid(), Email = "user@test.com", PasswordHash = "hash" });
        await _db.SaveChangesAsync();

        var request = new RegisterRequest("user@test.com", "ValidPass1!", "ValidPass1!", true);
        var (response, error) = await _service.RegisterAsync(request, "127.0.0.1");

        Assert.Null(response);
        Assert.Contains("ja cadastrado", error);
    }

    [Fact]
    public async Task LoginAsync_CorrectPassword_ReturnsTokens()
    {
        _db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("ValidPass1!")
        });
        await _db.SaveChangesAsync();

        var (response, refreshToken, _, _, error) = await _service.LoginAsync(new LoginRequest("user@test.com", "ValidPass1!"), "127.0.0.1");

        Assert.NotNull(response);
        Assert.NotNull(refreshToken);
        Assert.Null(error);
    }

    [Fact]
    public async Task LoginAsync_WrongPassword_IncrementsFailedAttempts()
    {
        _db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("ValidPass1!")
        });
        await _db.SaveChangesAsync();

        await _service.LoginAsync(new LoginRequest("user@test.com", "wrong"), "127.0.0.1");

        var user = await _db.Users.FirstAsync();
        Assert.Equal(1, user.FailedLoginAttempts);
    }

    [Fact]
    public async Task LoginAsync_FifthFailedAttempt_SetsLockout()
    {
        _db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("ValidPass1!"),
            FailedLoginAttempts = 4
        });
        await _db.SaveChangesAsync();

        await _service.LoginAsync(new LoginRequest("user@test.com", "wrong"), "127.0.0.1");

        var user = await _db.Users.FirstAsync();
        Assert.NotNull(user.LockoutEnd);
        Assert.True(user.LockoutEnd > DateTime.UtcNow);
    }

    [Fact]
    public async Task LoginAsync_LockedAccount_ReturnsError()
    {
        _db.Users.Add(new User
        {
            Id = Guid.NewGuid(),
            Email = "user@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("ValidPass1!"),
            LockoutEnd = DateTime.UtcNow.AddMinutes(15)
        });
        await _db.SaveChangesAsync();

        var (response, _, _, _, error) = await _service.LoginAsync(new LoginRequest("user@test.com", "ValidPass1!"), "127.0.0.1");

        Assert.Null(response);
        Assert.Contains("bloqueada", error);
    }

    [Fact]
    public async Task RefreshAsync_ValidToken_ReturnsNewTokens()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User { Id = userId, Email = "user@test.com", PasswordHash = "hash" });

        // Store hashed token
        var rawToken = "test-token-value";
        var hash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(rawToken)));
        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = hash,
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedByIp = "127.0.0.1"
        });
        await _db.SaveChangesAsync();

        var (response, newToken, error) = await _service.RefreshAsync(rawToken, "127.0.0.1");

        Assert.NotNull(response);
        Assert.NotNull(newToken);
        Assert.Null(error);
    }

    private async Task<string> SeedRefreshTokenAsync(Guid userId, string rawToken)
    {
        var hash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(rawToken)));
        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = hash,
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = "127.0.0.1"
        });
        await _db.SaveChangesAsync();
        return rawToken;
    }

    [Fact]
    public async Task RefreshAsync_ConcurrentReuseWithinGrace_KeepsSessionAlive()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User { Id = userId, Email = "race@test.com", PasswordHash = "hash" });
        var raw = await SeedRefreshTokenAsync(userId, "race-token");

        var (first, successorRaw, _) = await _service.RefreshAsync(raw, "127.0.0.1");
        // Segunda requisição concorrente com o mesmo cookie, logo depois da rotação.
        var (second, _, error) = await _service.RefreshAsync(raw, "127.0.0.1");

        Assert.NotNull(first);
        Assert.Null(second);
        Assert.NotNull(error);
        // A sessão nova continua válida: dá pra renovar com ela.
        var (third, _, thirdError) = await _service.RefreshAsync(successorRaw!, "127.0.0.1");
        Assert.NotNull(third);
        Assert.Null(thirdError);
    }

    [Fact]
    public async Task RefreshAsync_ReuseAfterGrace_RevokesAllSessions()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User { Id = userId, Email = "theft@test.com", PasswordHash = "hash" });
        var raw = await SeedRefreshTokenAsync(userId, "stolen-token");

        var (_, successorRaw, _) = await _service.RefreshAsync(raw, "127.0.0.1");
        // Simula o token antigo reaparecendo bem depois da rotação (roubo).
        foreach (var t in _db.RefreshTokens.Where(t => t.UserId == userId && !t.IsRevoked))
            t.CreatedAt = DateTime.UtcNow - AuthService.RefreshReuseGrace - TimeSpan.FromMinutes(1);
        await _db.SaveChangesAsync();

        var (reused, _, _) = await _service.RefreshAsync(raw, "10.0.0.9");
        var (afterTheft, _, afterError) = await _service.RefreshAsync(successorRaw!, "127.0.0.1");

        Assert.Null(reused);
        Assert.Null(afterTheft);
        Assert.NotNull(afterError);
    }

    [Fact]
    public async Task LogoutAsync_RevokesToken()
    {
        var rawToken = "test-token";
        var hash = Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(
            System.Text.Encoding.UTF8.GetBytes(rawToken)));
        var tokenId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        _db.Users.Add(new User { Id = userId, Email = "user@test.com", PasswordHash = "hash" });
        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = tokenId,
            Token = hash,
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedByIp = "127.0.0.1"
        });
        await _db.SaveChangesAsync();

        await _service.LogoutAsync(rawToken, "127.0.0.1");

        var stored = await _db.RefreshTokens.FindAsync(tokenId);
        Assert.True(stored!.IsRevoked);
    }
}
