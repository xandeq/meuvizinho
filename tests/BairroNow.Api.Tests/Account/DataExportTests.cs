using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Account;

[Trait("Category", "Unit")]
public class DataExportTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly AccountService _service;

    public DataExportTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);
        _service = new AccountService(_db, Mock.Of<IEmailService>(), Mock.Of<IFileStorageService>(), Mock.Of<ILogger<AccountService>>());
    }

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task BuildExportAsync_ReturnsAllUserDataSections()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User
        {
            Id = userId,
            Email = "export@test.com",
            PasswordHash = "hash",
            DisplayName = "Test User",
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var result = await _service.BuildExportAsync(userId);

        result.Should().NotBeNull();

        // Use dynamic to inspect anonymous type
        var json = System.Text.Json.JsonSerializer.Serialize(result);
        json.Should().Contain("profile");
        json.Should().Contain("posts");
        json.Should().Contain("comments");
        json.Should().Contain("listings");
        json.Should().Contain("messages");
        json.Should().Contain("verifications");
        json.Should().Contain("notifications");
        json.Should().Contain("exportedAt");
    }

    [Fact]
    public async Task BuildExportAsync_UpdatesLastExportAt()
    {
        var userId = Guid.NewGuid();
        _db.Users.Add(new User
        {
            Id = userId,
            Email = "export@test.com",
            PasswordHash = "hash",
            IsActive = true
        });
        await _db.SaveChangesAsync();

        await _service.BuildExportAsync(userId);

        var user = await _db.Users.FindAsync(userId);
        user!.LastExportAt.Should().NotBeNull();
        user.LastExportAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }
}
