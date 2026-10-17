using System.Security.Claims;
using System.Text.Json;
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
using Xunit;

namespace BairroNow.Api.Tests.Alerts;

// Alertas são públicos (anônimo vê), mas o ponto do alerta muitas vezes é a casa de quem reportou:
// visitante sem login não recebe nome de quem avisou nem a coordenada exata (≈110 m, como o mapa).
public class SecurityAlertPrivacyTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static SecurityAlertsController Ctrl(AppDbContext db, Guid? userId)
    {
        var identity = userId == null
            ? new ClaimsIdentity()
            : new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()!) }, "Test");
        return new SecurityAlertsController(db, Mock.Of<INotificationService>())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) } }
        };
    }

    private static int Seed(AppDbContext db)
    {
        var reporter = new User { Id = Guid.NewGuid(), Email = "ana@t.com", PasswordHash = "h", DisplayName = "Ana Ribeiro" };
        db.Users.Add(reporter);
        var alert = new SecurityAlert
        {
            BairroId = 1, Kind = SecurityAlertKind.Furto, Description = "Bicicleta levada", Status = SecurityAlertStatus.Active,
            Latitude = -20.3297412, Longitude = -40.2921547, ReportedByUserId = reporter.Id,
        };
        db.SecurityAlerts.Add(alert);
        db.SaveChanges();
        return alert.Id;
    }

    private static JsonElement Json(IActionResult r) =>
        JsonSerializer.SerializeToElement(((OkObjectResult)r).Value);

    [Fact]
    public async Task Anonymous_GetsNoReporter_AndCoarseCoordinates()
    {
        using var db = NewDb();
        var id = Seed(db);

        var one = Json(await Ctrl(db, null).Get(id));
        var list = Json(await Ctrl(db, null).List(1, null, null))[0];

        foreach (var a in new[] { one, list })
        {
            a.GetProperty("ReportedBy").ValueKind.Should().Be(JsonValueKind.Null);
            a.GetProperty("Latitude").GetDouble().Should().Be(-20.33);
            a.GetProperty("Longitude").GetDouble().Should().Be(-40.292);
        }
        one.GetProperty("ReportedByUserId").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task LoggedInResident_StillSeesReporterAndExactPoint()
    {
        using var db = NewDb();
        var id = Seed(db);

        var a = Json(await Ctrl(db, Guid.NewGuid()).Get(id));

        a.GetProperty("ReportedBy").GetString().Should().Be("Ana Ribeiro");
        a.GetProperty("Latitude").GetDouble().Should().Be(-20.3297412);
    }
}
