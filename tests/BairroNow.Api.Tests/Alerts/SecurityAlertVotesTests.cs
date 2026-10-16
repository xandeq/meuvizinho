using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using System.Security.Claims;
using Xunit;

namespace BairroNow.Api.Tests.Alerts;

public class SecurityAlertVotesTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static SecurityAlertsController Ctrl(AppDbContext db, Guid userId) => new(db, Mock.Of<INotificationService>())
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }, "Test"))
            }
        }
    };

    [Fact]
    public async Task Upvote_Twice_CountsOnce()
    {
        using var db = NewDb();
        var alert = new SecurityAlert { BairroId = 1, Kind = SecurityAlertKind.Furto, Description = "x", Status = SecurityAlertStatus.Active };
        db.SecurityAlerts.Add(alert);
        db.SaveChanges();
        var user = Guid.NewGuid();

        await Ctrl(db, user).Upvote(alert.Id, CancellationToken.None);
        await Ctrl(db, user).Upvote(alert.Id, CancellationToken.None);
        await Ctrl(db, Guid.NewGuid()).Upvote(alert.Id, CancellationToken.None);

        (await db.SecurityAlerts.AsNoTracking().FirstAsync()).UpvoteCount.Should().Be(2);
        (await db.SecurityAlertUpvotes.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task Create_InOtherBairro_Forbidden()
    {
        using var db = NewDb();
        var user = new User { Id = Guid.NewGuid(), Email = "a@t.com", PasswordHash = "h", IsVerified = true, BairroId = 1 };
        db.Users.Add(user);
        db.SaveChanges();

        var result = await Ctrl(db, user.Id).Create(new CreateSecurityAlertRequest(2, SecurityAlertKind.Furto, "Bicicleta levada", null, null, null), CancellationToken.None);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
        (await db.SecurityAlerts.CountAsync()).Should().Be(0);
    }
}
