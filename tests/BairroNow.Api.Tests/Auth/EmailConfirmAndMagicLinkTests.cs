using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using Xunit;

namespace BairroNow.Api.Tests.Auth;

public class EmailConfirmAndMagicLinkTests : IDisposable
{
    private readonly AppDbContext _db = new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private readonly Mock<IEmailService> _email = new();
    private readonly AuthService _svc;

    public EmailConfirmAndMagicLinkTests()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-key-must-be-at-least-32-characters-long-for-hmac",
            ["FrontendUrl"] = "https://site.test",
        }).Build();
        _svc = new AuthService(_db, Mock.Of<ITokenService>(), _email.Object, config, Mock.Of<IHttpClientFactory>(), Mock.Of<ILogger<AuthService>>());
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task ConfirmEmail_ValidToken_ConfirmsAndClears()
    {
        var u = new User { Id = Guid.NewGuid(), Email = "a@t.com", PasswordHash = "h", EmailConfirmationToken = "tok", EmailConfirmationTokenExpiry = DateTime.UtcNow.AddHours(1) };
        _db.Users.Add(u); _db.SaveChanges();

        (await _svc.ConfirmEmailAsync("tok")).Should().BeTrue();
        var saved = await _db.Users.FirstAsync();
        saved.EmailConfirmed.Should().BeTrue();
        saved.EmailConfirmationToken.Should().BeNull();
    }

    [Fact]
    public async Task ConfirmEmail_ExpiredOrUnknown_False()
    {
        _db.Users.Add(new User { Id = Guid.NewGuid(), Email = "b@t.com", PasswordHash = "h", EmailConfirmationToken = "old", EmailConfirmationTokenExpiry = DateTime.UtcNow.AddHours(-1) });
        _db.SaveChanges();

        (await _svc.ConfirmEmailAsync("old")).Should().BeFalse();
        (await _svc.ConfirmEmailAsync("nope")).Should().BeFalse();
    }

    [Fact]
    public async Task MagicLink_TokenIsUrlEscaped()
    {
        _db.Users.Add(new User { Id = Guid.NewGuid(), Email = "c@t.com", PasswordHash = "h" });
        _db.SaveChanges();
        string? link = null;
        _email.Setup(e => e.SendMagicLinkAsync("c@t.com", It.IsAny<string>())).Callback<string, string>((_, l) => link = l).Returns(Task.CompletedTask);

        await _svc.RequestMagicLinkAsync("c@t.com");

        link.Should().StartWith("https://site.test/auth/magic-link/?token=");
        var token = link!.Split("token=")[1];
        token.Should().NotContain("+").And.NotContain("/").And.NotContain("=");
    }
}
