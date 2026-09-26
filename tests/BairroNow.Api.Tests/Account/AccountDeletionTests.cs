using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Account;

[Trait("Category", "Unit")]
public class AccountDeletionTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AccountService _service;
    private readonly Mock<IEmailService> _emailServiceMock;

    public AccountDeletionTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _emailServiceMock = new Mock<IEmailService>();
        _service = new AccountService(_db, _emailServiceMock.Object, Mock.Of<IFileStorageService>(), Mock.Of<ILogger<AccountService>>());
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task RequestDeletionAsync_SetsDeleteRequestedAt_AndRevokesTokens()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User { Id = userId, Email = "del@test.com", PasswordHash = "hash", IsActive = true });
        _db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            Token = "token-hash",
            UserId = userId,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedByIp = "127.0.0.1"
        });
        await _db.SaveChangesAsync();

        await _service.RequestDeletionAsync(userId);

        var user = await _db.Users.FindAsync(userId);
        user!.DeleteRequestedAt.Should().NotBeNull();
        user.IsActive.Should().BeFalse();

        var token = await _db.RefreshTokens.FirstAsync();
        token.IsRevoked.Should().BeTrue();

        _emailServiceMock.Verify(x => x.SendAccountDeletionConfirmationAsync("del@test.com"), Times.Once);
    }

    [Fact]
    public async Task CancelDeletionAsync_WithinGracePeriod_Succeeds()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User
        {
            Id = userId,
            Email = "cancel@test.com",
            PasswordHash = "hash",
            IsActive = false,
            DeleteRequestedAt = DateTime.UtcNow.AddDays(-5) // 5 days ago, within 30-day grace
        });
        await _db.SaveChangesAsync();

        var result = await _service.CancelDeletionAsync(userId);

        result.Should().BeTrue();
        var user = await _db.Users.FindAsync(userId);
        user!.DeleteRequestedAt.Should().BeNull();
        user.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task CancelDeletionAsync_AfterGracePeriod_Fails()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User
        {
            Id = userId,
            Email = "expired@test.com",
            PasswordHash = "hash",
            IsActive = false,
            DeleteRequestedAt = DateTime.UtcNow.AddDays(-31) // Past 30-day grace
        });
        await _db.SaveChangesAsync();

        var result = await _service.CancelDeletionAsync(userId);

        result.Should().BeFalse();
    }

    [Fact]
    public async Task RunAnonymizationAsync_AnonymizesUsersPast30Days()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User
        {
            Id = userId,
            Email = "anon@test.com",
            PasswordHash = "hash",
            DisplayName = "Real Name",
            DeleteRequestedAt = DateTime.UtcNow.AddDays(-31),
            IsActive = false
        });
        await _db.SaveChangesAsync();

        await _service.RunAnonymizationAsync();

        var user = await _db.Users.FindAsync(userId);
        user!.Email.Should().StartWith("deleted+");
        user.DisplayName.Should().Be("Usuario removido");
        user.PasswordHash.Should().BeEmpty();
        user.DeletedAt.Should().NotBeNull();
    }
}
