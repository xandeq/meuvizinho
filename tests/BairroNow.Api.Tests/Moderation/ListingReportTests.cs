using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using BairroNow.Api.Validators;

namespace BairroNow.Api.Tests.Moderation;

public class ListingReportTests
{
    [Fact]
    public async Task Report_CreatesRowWithTargetTypeListing_InSharedQueue()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var db = new AppDbContext(options);
        var sellerId = Guid.NewGuid();
        var reporterId = Guid.NewGuid();
        db.Users.Add(new User { Id = sellerId, Email = "s@x", PasswordHash = "h", BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.Users.Add(new User { Id = reporterId, Email = "r@x", PasswordHash = "h", BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var fileMock = new Mock<IFileStorageService>();
        fileMock.Setup(f => f.SaveImageAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/x.jpg");

        var config = new Mock<IConfiguration>();
        config.Setup(c => c.GetSection("Features")["FullTextSearchEnabled"]).Returns("false");
        var svc = new ListingService(db, fileMock.Object,
            new CreateListingRequestValidator(), new UpdateListingRequestValidator(),
            Mock.Of<INotificationService>(),
            new MemoryCache(new MemoryCacheOptions()), NullLogger<ListingService>.Instance,
            config.Object);

        var files = new FormFileCollection();
        var bytes = new byte[] { 0xFF };
        files.Add(new FormFile(new MemoryStream(bytes), 0, 1, "p", "p.jpg") { Headers = new HeaderDictionary(), ContentType = "image/jpeg" });
        var listing = await svc.CreateAsync(sellerId, new CreateListingRequest
        {
            Title = "Item", Description = "descricao do item 12345", Price = 10, CategoryCode = "outros", SubcategoryCode = "diversos"
        }, files);

        await svc.ReportAsync(reporterId, listing.Id, new ReportListingRequest { Reason = ReportReason.Spam, Note = "fake item" });

        var report = await db.Reports.SingleAsync();
        report.TargetType.Should().Be(ReportTargetTypes.Listing);
        report.TargetId.Should().Be(listing.Id);
    }
}
