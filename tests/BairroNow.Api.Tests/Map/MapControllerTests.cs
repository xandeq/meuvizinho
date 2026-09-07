using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using Xunit;

namespace BairroNow.Api.Tests.Map;

[Trait("Category", "Unit")]
public class MapControllerTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static MapController BuildController(AppDbContext db, ICoordinateFuzzingService? fuzz = null)
    {
        fuzz ??= new CoordinateFuzzingService(
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { ["Map:FuzzKey"] = "chave-de-teste-para-hmac-do-fuzzing" })
                .Build());
        var controller = new MapController(db, fuzz);
        var userId = Guid.NewGuid();
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var identity = new ClaimsIdentity(claims, "Test");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };
        return controller;
    }

    private static (User user, BairroNow.Api.Models.Entities.Verification verification) SeedVerifiedUser(
        AppDbContext db, int bairroId = 1, bool showOnMap = true,
        double? lat = -20.3155, double? lng = -40.3128)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@test.com",
            PasswordHash = "hash",
            BairroId = bairroId,
            IsVerified = true,
            EmailConfirmed = true,
            ShowOnMap = showOnMap,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);

        var verification = new BairroNow.Api.Models.Entities.Verification
        {
            UserId = user.Id,
            Cep = "29100-000",
            Logradouro = "Rua Teste",
            BairroId = bairroId,
            Status = "approved",
            ProofFilePath = "/uploads/proof.jpg",
            ProofSha256 = Guid.NewGuid().ToString("N"),
            ApprovedLat = lat,
            ApprovedLng = lng
        };
        db.Verifications.Add(verification);
        db.SaveChanges();
        return (user, verification);
    }

    [Fact]
    public async Task GetPins_ExcludesUser_WhenShowOnMapIsFalse()
    {
        using var db = NewDb();
        SeedVerifiedUser(db, showOnMap: false);

        var controller = BuildController(db);
        var result = await controller.GetPins(bairroId: 1, filter: null, ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var pins = ok.Value as IEnumerable<object>;
        pins.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task GetPins_IncludesUser_WhenShowOnMapIsTrue()
    {
        using var db = NewDb();
        SeedVerifiedUser(db, showOnMap: true);

        var controller = BuildController(db);
        var result = await controller.GetPins(bairroId: 1, filter: null, ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        // Should have 1 pin
        var pins = ok.Value as System.Collections.IEnumerable;
        pins.Should().NotBeNull();
        var list = pins!.Cast<object>().ToList();
        list.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetPins_ReturnsFuzzedCoordinates_NotExact()
    {
        using var db = NewDb();
        var (user, verification) = SeedVerifiedUser(db, lat: -20.3155, lng: -40.3128);

        // Use a mock fuzz service with deterministic results different from stored
        var fuzzMock = new Mock<ICoordinateFuzzingService>();
        fuzzMock.Setup(f => f.FuzzCoordinates(-20.3155, -40.3128, user.Id))
                .Returns((-20.316, -40.313));

        var controller = BuildController(db, fuzzMock.Object);
        var result = await controller.GetPins(bairroId: 1, filter: null, ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var pins = (ok.Value as System.Collections.IEnumerable)!.Cast<object>().ToList();
        pins.Should().HaveCount(1);

        // Fuzz was called
        fuzzMock.Verify(f => f.FuzzCoordinates(-20.3155, -40.3128, user.Id), Times.Once);
    }

    [Fact]
    public async Task GetPins_FilterVerified_ExcludesUnverifiedUsers()
    {
        using var db = NewDb();
        // Seed unverified user (IsVerified=false)
        var unverifiedUser = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@test.com",
            PasswordHash = "hash",
            BairroId = 1,
            IsVerified = false,
            EmailConfirmed = true,
            ShowOnMap = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        db.Users.Add(unverifiedUser);
        db.Verifications.Add(new BairroNow.Api.Models.Entities.Verification
        {
            UserId = unverifiedUser.Id,
            Cep = "29100-000",
            Logradouro = "Rua X",
            BairroId = 1,
            Status = "approved",
            ProofFilePath = "/uploads/proof2.jpg",
            ProofSha256 = Guid.NewGuid().ToString("N"),
            ApprovedLat = -20.315,
            ApprovedLng = -40.312
        });
        db.SaveChanges();

        var controller = BuildController(db);
        var result = await controller.GetPins(bairroId: 1, filter: "verified", ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var pins = (ok.Value as System.Collections.IEnumerable)!.Cast<object>().ToList();
        pins.Should().BeEmpty("unverified user should be excluded by filter=verified");
    }
}
