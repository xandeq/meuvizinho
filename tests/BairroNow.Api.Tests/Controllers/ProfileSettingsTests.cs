using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using System.Security.Claims;
using Xunit;

namespace BairroNow.Api.Tests.Controllers;

public class ProfileSettingsTests
{
    private static (AppDbContext db, ProfileController ctrl, Guid userId) Build()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var bairro = new Bairro { Nome = "Praia da Costa", Cidade = "Vila Velha", Uf = "ES" };
        db.Bairros.Add(bairro);
        db.SaveChanges();
        var user = new User { Id = Guid.NewGuid(), Email = "ana@t.com", PasswordHash = "h", IsAdmin = true, BairroId = bairro.Id, DisplayName = "Ana" };
        db.Users.Add(user);
        db.SaveChanges();
        var ctrl = new ProfileController(db)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()) }, "Test"))
                }
            }
        };
        return (db, ctrl, user.Id);
    }

    [Fact]
    public async Task Patch_DigestOptOut_Persists()
    {
        var (db, ctrl, userId) = Build();
        var ok = (await ctrl.UpdateSettings(new UpdateSettingsRequest { DigestOptOut = true }, CancellationToken.None))
            .Should().BeOfType<OkObjectResult>().Subject;
        ((ProfileDto)ok.Value!).DigestOptOut.Should().BeTrue();
        (await db.Users.FirstAsync(u => u.Id == userId)).DigestOptOut.Should().BeTrue();
    }

    [Fact]
    public async Task Get_ReturnsIdentityFields_ForSessionUser()
    {
        var (_, ctrl, userId) = Build();
        var dto = (ProfileDto)((OkObjectResult)await ctrl.Get(CancellationToken.None)).Value!;
        dto.Id.Should().Be(userId);
        dto.Email.Should().Be("ana@t.com");
        dto.IsAdmin.Should().BeTrue();
    }

    [Fact]
    public async Task Get_ReturnsShowOnMap()
    {
        var (db, ctrl, userId) = Build();
        (await db.Users.FirstAsync(u => u.Id == userId)).ShowOnMap = false;
        await db.SaveChangesAsync();
        var dto = (ProfileDto)((OkObjectResult)await ctrl.Get(CancellationToken.None)).Value!;
        dto.ShowOnMap.Should().BeFalse();
    }

    [Fact]
    public async Task Put_KeepsBairroNome()
    {
        var (_, ctrl, _) = Build();
        var dto = (ProfileDto)((OkObjectResult)await ctrl.Update(new UpdateProfileRequest { DisplayName = "Ana R" }, CancellationToken.None)).Value!;
        dto.BairroNome.Should().Be("Praia da Costa");
    }
}
