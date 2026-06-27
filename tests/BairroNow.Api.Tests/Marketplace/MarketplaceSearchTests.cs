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
using BairroNow.Api.Services;
using BairroNow.Api.Validators;

namespace BairroNow.Api.Tests.Marketplace;

public class MarketplaceSearchTests
{
    private static (ListingService svc, AppDbContext db, Guid sellerId) BuildSut()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        var sellerId = Guid.NewGuid();
        db.Users.Add(new User { Id = sellerId, Email = "s@x", PasswordHash = "h", DisplayName = "S", BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        db.SaveChanges();

        var fileMock = new Mock<IFileStorageService>();
        fileMock.Setup(f => f.SaveImageAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/uploads/listings/x.jpg");

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Features:FullTextSearchEnabled"] = "false" })
            .Build();
        var svc = new ListingService(db, fileMock.Object,
            new CreateListingRequestValidator(),
            new UpdateListingRequestValidator(),
            Mock.Of<INotificationService>(),
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<ListingService>.Instance,
            config);
        return (svc, db, sellerId);
    }

    private static IFormFileCollection One()
    {
        var files = new FormFileCollection();
        var bytes = new byte[] { 0xFF, 0xD8 };
        files.Add(new FormFile(new MemoryStream(bytes), 0, bytes.Length, "p", "p.jpg") { Headers = new HeaderDictionary(), ContentType = "image/jpeg" });
        return files;
    }

    [Fact]
    public async Task GetBairroGrid_FiltersByBairroAndStatus()
    {
        var (svc, db, sellerId) = BuildSut();
        await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "Item Um", Description = "Descricao 12345", Price = 10, CategoryCode = "outros", SubcategoryCode = "diversos" }, One());
        // Add a listing in a different bairro
        db.Listings.Add(new Listing { SellerId = sellerId, BairroId = 99, Title = "Other", Description = "outro bairro 123", Price = 5, CategoryCode = "outros", SubcategoryCode = "diversos", Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var page = await svc.GetBairroGridAsync(sellerId, 1, null, null, null, false, null, null, 20);
        page.Items.Should().OnlyContain(l => l.BairroId == 1);
    }

    [Fact]
    public async Task GetBairroGrid_SortsByRecency()
    {
        var (svc, db, sellerId) = BuildSut();
        var older = await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "Old", Description = "old listing 12345", Price = 10, CategoryCode = "outros", SubcategoryCode = "diversos" }, One());
        var newer = await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "New", Description = "new listing 12345", Price = 20, CategoryCode = "outros", SubcategoryCode = "diversos" }, One());
        // Force deterministic recency ordering without relying on sleep timing
        var olderEntity = await db.Listings.FindAsync(older.Id);
        olderEntity!.CreatedAt = DateTime.UtcNow.AddMinutes(-1);
        var newerEntity = await db.Listings.FindAsync(newer.Id);
        newerEntity!.CreatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var page = await svc.GetBairroGridAsync(sellerId, 1, null, null, null, false, null, null, 20);
        page.Items.First().Id.Should().Be(newer.Id);
    }

    [Fact]
    public async Task SearchListings_CONTAINSReturnsMatches()
    {
        var (svc, _, sellerId) = BuildSut();
        await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "Bicicleta aro 26", Description = "Bicicleta seminova", Price = 500, CategoryCode = "esportes", SubcategoryCode = "bicicleta" }, One());
        await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "Mesa", Description = "Mesa de jantar 6 lugares", Price = 300, CategoryCode = "moveis", SubcategoryCode = "sala" }, One());
        var page = await svc.SearchAsync(sellerId, 1, "bicicleta", null, null, null, false);
        page.Items.Should().HaveCount(1);
        page.Items[0].Title.Should().Contain("Bicicleta");
    }

    [Fact]
    public async Task SearchListings_SanitizesSpecialChars()
    {
        var (svc, _, sellerId) = BuildSut();
        await Assert.ThrowsAsync<ListingValidationException>(() => svc.SearchAsync(sellerId, 1, "''';--", null, null, null, false));
    }

    [Fact]
    public async Task SearchListings_WithFilters()
    {
        var (svc, _, sellerId) = BuildSut();
        await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "Notebook Dell", Description = "Notebook Dell i5 8gb", Price = 2000, CategoryCode = "eletronicos", SubcategoryCode = "notebook" }, One());
        await svc.CreateAsync(sellerId, new CreateListingRequest { Title = "Notebook Lenovo", Description = "Notebook Lenovo barato", Price = 800, CategoryCode = "eletronicos", SubcategoryCode = "notebook" }, One());
        var page = await svc.SearchAsync(sellerId, 1, "notebook", "eletronicos", 1000, null, false);
        page.Items.Should().HaveCount(1);
        page.Items[0].Price.Should().BeGreaterThanOrEqualTo(1000);
    }
}
