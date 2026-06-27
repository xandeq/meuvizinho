using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace BairroNow.Api.Tests.Community;

// Wave Q — Alertas de segurança geolocalizados.
// Testes a nível de dados/lógica (InMemory DbContext + FluentAssertions),
// mesmo padrão de WhatsAppDirectoryTests / CondominiumClaimTests.
[Trait("Category", "Unit")]
public class SecurityAlertTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User SeedUser(AppDbContext db, bool isVerified = true, bool isAdmin = false)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@test.com",
            PasswordHash = "hash",
            BairroId = 1,
            IsVerified = isVerified,
            IsAdmin = isAdmin,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    private static SecurityAlert SeedAlert(AppDbContext db, User reporter,
        SecurityAlertStatus status = SecurityAlertStatus.Active, int bairroId = 1)
    {
        var alert = new SecurityAlert
        {
            BairroId = bairroId,
            Kind = SecurityAlertKind.Suspeito,
            Description = "Indivíduo suspeito na esquina",
            LocationDescription = "Rua das Flores, 100",
            Status = status,
            ReportedByUserId = reporter.Id,
            CreatedAt = DateTime.UtcNow,
        };
        db.SecurityAlerts.Add(alert);
        db.SaveChanges();
        return alert;
    }

    // ─── Criação ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_DefaultsToActiveStatus()
    {
        using var db = NewDb();
        var user = SeedUser(db);

        var alert = new SecurityAlert
        {
            BairroId = 1,
            Kind = SecurityAlertKind.Furto,
            Description = "Celular roubado",
            ReportedByUserId = user.Id,
            CreatedAt = DateTime.UtcNow,
        };
        db.SecurityAlerts.Add(alert);
        await db.SaveChangesAsync();

        var saved = await db.SecurityAlerts.FindAsync(alert.Id);
        saved!.Status.Should().Be(SecurityAlertStatus.Active);
        saved.UpvoteCount.Should().Be(0);
        saved.ResolvedAt.Should().BeNull();
    }

    [Fact]
    public async Task Create_WithGeolocation_PersistsLatLng()
    {
        using var db = NewDb();
        var user = SeedUser(db);

        var alert = new SecurityAlert
        {
            BairroId = 1,
            Kind = SecurityAlertKind.Acidente,
            Description = "Acidente na esquina",
            Latitude = -20.3155,
            Longitude = -40.3128,
            ReportedByUserId = user.Id,
            CreatedAt = DateTime.UtcNow,
        };
        db.SecurityAlerts.Add(alert);
        await db.SaveChangesAsync();

        var saved = await db.SecurityAlerts.FindAsync(alert.Id);
        saved!.Latitude.Should().BeApproximately(-20.3155, 0.0001);
        saved.Longitude.Should().BeApproximately(-40.3128, 0.0001);
    }

    // ─── Listagem por bairro ─────────────────────────────────────────────────

    [Fact]
    public async Task List_FiltersByBairroId()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        SeedAlert(db, user, bairroId: 1);
        SeedAlert(db, user, bairroId: 2);

        var alerts = await db.SecurityAlerts
            .Where(a => a.BairroId == 1 && a.Status == SecurityAlertStatus.Active)
            .ToListAsync();

        alerts.Should().HaveCount(1);
        alerts[0].BairroId.Should().Be(1);
    }

    [Fact]
    public async Task List_ExcludesSoftDeleted()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var alert = SeedAlert(db, user);
        alert.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var count = await db.SecurityAlerts
            .CountAsync(a => a.BairroId == 1 && a.DeletedAt == null);

        count.Should().Be(0);
    }

    [Fact]
    public async Task List_ExcludesResolved_WhenFilteringActive()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        SeedAlert(db, user, SecurityAlertStatus.Active);
        SeedAlert(db, user, SecurityAlertStatus.Resolved);

        var active = await db.SecurityAlerts
            .CountAsync(a => a.BairroId == 1 && a.Status == SecurityAlertStatus.Active && a.DeletedAt == null);

        active.Should().Be(1);
    }

    // ─── Upvote ("Eu também vi") ─────────────────────────────────────────────

    [Fact]
    public async Task Upvote_IncrementsCount()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var alert = SeedAlert(db, user);

        // Simula o incremento atômico que o controller faz via ExecuteUpdateAsync.
        alert.UpvoteCount++;
        await db.SaveChangesAsync();

        var saved = await db.SecurityAlerts.FindAsync(alert.Id);
        saved!.UpvoteCount.Should().Be(1);
    }

    // ─── Resolução (admin) ───────────────────────────────────────────────────

    [Fact]
    public async Task Resolve_SetsStatusAndTimestamp()
    {
        using var db = NewDb();
        var admin = SeedUser(db, isAdmin: true);
        var user = SeedUser(db);
        var alert = SeedAlert(db, user);

        alert.Status = SecurityAlertStatus.Resolved;
        alert.ResolutionNote = "Situação normalizada pela PM";
        alert.ResolvedByUserId = admin.Id;
        alert.ResolvedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var saved = await db.SecurityAlerts.FindAsync(alert.Id);
        saved!.Status.Should().Be(SecurityAlertStatus.Resolved);
        saved.ResolutionNote.Should().Be("Situação normalizada pela PM");
        saved.ResolvedAt.Should().NotBeNull();
        saved.ResolvedByUserId.Should().Be(admin.Id);
    }

    // ─── Soft delete ────────────────────────────────────────────────────────

    [Fact]
    public async Task SoftDelete_SetsDeletedAt()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var alert = SeedAlert(db, user);

        alert.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var saved = await db.SecurityAlerts.FindAsync(alert.Id);
        saved!.DeletedAt.Should().NotBeNull();
    }

    // ─── Enum values ────────────────────────────────────────────────────────

    [Theory]
    [InlineData(SecurityAlertKind.Furto)]
    [InlineData(SecurityAlertKind.Suspeito)]
    [InlineData(SecurityAlertKind.Incendio)]
    [InlineData(SecurityAlertKind.Acidente)]
    [InlineData(SecurityAlertKind.Outros)]
    public async Task AllKinds_CanBePersisted(SecurityAlertKind kind)
    {
        using var db = NewDb();
        var user = SeedUser(db);

        var alert = new SecurityAlert
        {
            BairroId = 1, Kind = kind,
            Description = "Teste",
            ReportedByUserId = user.Id,
            CreatedAt = DateTime.UtcNow,
        };
        db.SecurityAlerts.Add(alert);
        await db.SaveChangesAsync();

        var saved = await db.SecurityAlerts.FindAsync(alert.Id);
        saved!.Kind.Should().Be(kind);
    }
}
