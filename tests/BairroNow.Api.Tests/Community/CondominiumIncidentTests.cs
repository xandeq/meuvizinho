using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using System.Security.Claims;
using Xunit;

namespace BairroNow.Api.Tests.Community;

// Wave U — Ocorrências: morador aprovado abre e vê só as suas; síndico/admin
// lista todas e muda o status; estranho e morador pendente são barrados.
[Trait("Category", "Unit")]
public class CondominiumIncidentTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static CondominiumIncidentsController Ctrl(AppDbContext db, Guid userId)
    {
        var ctrl = new CondominiumIncidentsController(db, new CondominiumAccessService(db),
            NullLogger<CondominiumIncidentsController>.Instance);
        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(
                    new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }, "Test"))
            }
        };
        return ctrl;
    }

    private static User SeedUser(AppDbContext db, bool isAdmin = false)
    {
        var u = new User
        {
            Id = Guid.NewGuid(), Email = $"{Guid.NewGuid()}@test.com", PasswordHash = "hash",
            BairroId = 1, IsAdmin = isAdmin, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(u);
        db.SaveChanges();
        return u;
    }

    private static Condominium SeedCondo(AppDbContext db, Guid? sindico = null)
    {
        var c = new Condominium
        {
            BairroId = 1, Name = $"Edifício {Guid.NewGuid():N}",
            Status = sindico == null ? CondominiumStatus.Unclaimed : CondominiumStatus.Claimed,
            SindicoUserId = sindico, IsManagedByPlatform = true, CreatedAt = DateTime.UtcNow,
        };
        db.Condominiums.Add(c);
        db.SaveChanges();
        return c;
    }

    private static void SeedResident(AppDbContext db, int condoId, Guid userId,
        CondominiumResidentStatus status = CondominiumResidentStatus.Approved)
    {
        db.CondominiumResidents.Add(new CondominiumResident
        {
            CondominiumId = condoId, UserId = userId, Unit = "Apto 302", Status = status, CreatedAt = DateTime.UtcNow,
        });
        db.SaveChanges();
    }

    private static CreateIncidentRequest Valid(string category = "Manutencao") =>
        new(category, "Lâmpada queimada", "A lâmpada do corredor do 3º andar está queimada há dois dias.", "Corredor 3º andar");

    [Fact]
    public async Task Create_ApprovedResident_ReturnsCreatedOpenIncident()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, resident.Id);

        var result = await Ctrl(db, resident.Id).Create(condo.Id, Valid(), CancellationToken.None);

        var created = result.Should().BeOfType<CreatedResult>().Subject;
        var dto = created.Value.Should().BeOfType<IncidentDto>().Subject;
        dto.Status.Should().Be("Aberta");
        dto.Category.Should().Be("Manutencao");
        (await db.CondominiumIncidents.SingleAsync()).ReporterUserId.Should().Be(resident.Id);
    }

    [Fact]
    public async Task Create_PendingResident_Returns403()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, user.Id, CondominiumResidentStatus.Pending);

        var result = await Ctrl(db, user.Id).Create(condo.Id, Valid(), CancellationToken.None);

        result.Should().BeOfType<ObjectResult>().Which.StatusCode.Should().Be(403);
        (await db.CondominiumIncidents.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData("Inexistente", "Lâmpada queimada", "Descrição suficientemente longa.")]
    [InlineData("Limpeza", "Oi", "Descrição suficientemente longa.")]
    [InlineData("Limpeza", "Lixo no hall", "curta")]
    public async Task Create_InvalidFields_Returns400(string category, string title, string description)
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, resident.Id);

        var result = await Ctrl(db, resident.Id).Create(condo.Id,
            new CreateIncidentRequest(category, title, description, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_TooManyOpen_Returns409()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, resident.Id);
        var ctrl = Ctrl(db, resident.Id);
        for (var i = 0; i < CondominiumIncidentsController.MaxOpenPerReporter; i++)
            (await ctrl.Create(condo.Id, Valid(), CancellationToken.None)).Should().BeOfType<CreatedResult>();

        var result = await ctrl.Create(condo.Id, Valid(), CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>();
    }

    [Fact]
    public async Task ListMine_ReturnsOnlyOwnIncidents()
    {
        using var db = NewDb();
        var a = SeedUser(db);
        var b = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, a.Id);
        SeedResident(db, condo.Id, b.Id);
        await Ctrl(db, a.Id).Create(condo.Id, Valid(), CancellationToken.None);
        await Ctrl(db, b.Id).Create(condo.Id, Valid("Barulho"), CancellationToken.None);

        var result = await Ctrl(db, a.Id).ListMine(condo.Id, CancellationToken.None);

        var list = result.Should().BeOfType<OkObjectResult>().Subject.Value.Should().BeAssignableTo<IEnumerable<IncidentDto>>().Subject;
        list.Should().ContainSingle().Which.Category.Should().Be("Manutencao");
    }

    [Fact]
    public async Task ListForManagement_Resident_Returns403_Sindico_SeesAll()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindico.Id);
        SeedResident(db, condo.Id, resident.Id);
        await Ctrl(db, resident.Id).Create(condo.Id, Valid(), CancellationToken.None);

        (await Ctrl(db, resident.Id).ListForManagement(condo.Id, null, CancellationToken.None)).Should().BeOfType<ForbidResult>();
        var ok = (await Ctrl(db, sindico.Id).ListForManagement(condo.Id, null, CancellationToken.None))
            .Should().BeOfType<OkObjectResult>().Subject;
        ok.Value.Should().BeAssignableTo<IEnumerable<IncidentDto>>().Which.Should().HaveCount(1);
    }

    [Fact]
    public async Task UpdateStatus_SindicoResolves_SetsClosedAndResponse()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindico.Id);
        SeedResident(db, condo.Id, resident.Id);
        await Ctrl(db, resident.Id).Create(condo.Id, Valid(), CancellationToken.None);
        var incident = await db.CondominiumIncidents.SingleAsync();

        var result = await Ctrl(db, sindico.Id).UpdateStatus(condo.Id, incident.Id,
            new UpdateIncidentStatusRequest("Resolvida", "Lâmpada trocada hoje."), CancellationToken.None);

        var dto = result.Should().BeOfType<OkObjectResult>().Subject.Value.Should().BeOfType<IncidentDto>().Subject;
        dto.Status.Should().Be("Resolvida");
        dto.ResponseNote.Should().Be("Lâmpada trocada hoje.");
        dto.ClosedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateStatus_RejectWithoutReason_Returns400()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindico.Id);
        SeedResident(db, condo.Id, resident.Id);
        await Ctrl(db, resident.Id).Create(condo.Id, Valid(), CancellationToken.None);
        var incident = await db.CondominiumIncidents.SingleAsync();

        var result = await Ctrl(db, sindico.Id).UpdateStatus(condo.Id, incident.Id,
            new UpdateIncidentStatusRequest("Recusada", null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task UpdateStatus_ByResident_Returns403()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, resident.Id);
        await Ctrl(db, resident.Id).Create(condo.Id, Valid(), CancellationToken.None);
        var incident = await db.CondominiumIncidents.SingleAsync();

        var result = await Ctrl(db, resident.Id).UpdateStatus(condo.Id, incident.Id,
            new UpdateIncidentStatusRequest("Resolvida", "ok"), CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task Get_OtherResident_Returns403_Admin_Works()
    {
        using var db = NewDb();
        var a = SeedUser(db);
        var b = SeedUser(db);
        var admin = SeedUser(db, isAdmin: true);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, a.Id);
        SeedResident(db, condo.Id, b.Id);
        await Ctrl(db, a.Id).Create(condo.Id, Valid(), CancellationToken.None);
        var incident = await db.CondominiumIncidents.SingleAsync();

        (await Ctrl(db, b.Id).Get(condo.Id, incident.Id, CancellationToken.None)).Should().BeOfType<ForbidResult>();
        (await Ctrl(db, admin.Id).Get(condo.Id, incident.Id, CancellationToken.None)).Should().BeOfType<OkObjectResult>();
    }
}
