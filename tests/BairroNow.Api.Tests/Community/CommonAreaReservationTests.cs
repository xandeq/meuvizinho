using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using System.Security.Claims;
using Xunit;

namespace BairroNow.Api.Tests.Community;

// Wave S — Reserva de áreas comuns: vínculo de morador (Pending→Approved pelo
// síndico), criação de reserva com validações de janela/conflito e fluxo de
// aprovação/recusa/cancelamento.
[Trait("Category", "Unit")]
public class CommonAreaReservationTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static CondominiumReservationsController BuildController(AppDbContext db, Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var ctrl = new CondominiumReservationsController(
            db, Mock.Of<INotificationService>(), NullLogger<CondominiumReservationsController>.Instance);
        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")) }
        };
        return ctrl;
    }

    private static User SeedUser(AppDbContext db, bool isAdmin = false)
    {
        var u = new User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid()}@test.com",
            PasswordHash = "hash",
            BairroId = 1,
            IsAdmin = isAdmin,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(u);
        db.SaveChanges();
        return u;
    }

    private static Condominium SeedCondo(AppDbContext db, Guid? sindicoUserId = null)
    {
        var c = new Condominium
        {
            BairroId = 1,
            Name = $"Edifício {Guid.NewGuid():N}",
            Status = sindicoUserId == null ? CondominiumStatus.Unclaimed : CondominiumStatus.Claimed,
            SindicoUserId = sindicoUserId,
            IsManagedByPlatform = true,
            CreatedAt = DateTime.UtcNow,
        };
        db.Condominiums.Add(c);
        db.SaveChanges();
        return c;
    }

    private static CommonArea SeedArea(
        AppDbContext db, int condominiumId,
        bool requiresApproval = true,
        int? capacity = null,
        TimeOnly? openTime = null,
        TimeOnly? closeTime = null,
        int minAdvanceHours = 0,
        int maxAdvanceDays = 90,
        int? maxDurationMinutes = null)
    {
        var a = new CommonArea
        {
            CondominiumId = condominiumId,
            Name = $"Salão {Guid.NewGuid():N}",
            RequiresApproval = requiresApproval,
            Capacity = capacity,
            OpenTime = openTime,
            CloseTime = closeTime,
            MinAdvanceHours = minAdvanceHours,
            MaxAdvanceDays = maxAdvanceDays,
            MaxDurationMinutes = maxDurationMinutes,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        db.CommonAreas.Add(a);
        db.SaveChanges();
        return a;
    }

    private static CondominiumResident SeedResident(
        AppDbContext db, int condominiumId, Guid userId,
        CondominiumResidentStatus status = CondominiumResidentStatus.Approved)
    {
        var r = new CondominiumResident
        {
            CondominiumId = condominiumId,
            UserId = userId,
            Unit = "Bloco B, Apto 302",
            Status = status,
            CreatedAt = DateTime.UtcNow,
        };
        db.CondominiumResidents.Add(r);
        db.SaveChanges();
        return r;
    }

    // Amanhã ao meio-dia UTC — sempre dentro da janela padrão dos testes.
    private static DateTime TomorrowAt(int hourUtc) =>
        DateTime.UtcNow.Date.AddDays(1).AddHours(hourUtc);

    // ─── Criação de reserva ──────────────────────────────────────────────────

    [Fact]
    public async Task CreateReservation_ValidResident_AutoApproved_WhenAreaDoesNotRequireApproval()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, requiresApproval: false);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), "Aniversário", 10), CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
        var saved = await db.AreaReservations.SingleAsync();
        saved.Status.Should().Be(AreaReservationStatus.Approved);
        saved.UserId.Should().Be(resident.Id);
        saved.CondominiumId.Should().Be(condo.Id);
    }

    [Fact]
    public async Task CreateReservation_ValidResident_Pending_WhenAreaRequiresApproval()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, requiresApproval: true);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
        (await db.AreaReservations.SingleAsync()).Status.Should().Be(AreaReservationStatus.Pending);
    }

    [Fact]
    public async Task CreateReservation_OverlappingSlot_Returns409()
    {
        using var db = NewDb();
        var resident1 = SeedUser(db);
        var resident2 = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, requiresApproval: false);
        SeedResident(db, condo.Id, resident1.Id);
        SeedResident(db, condo.Id, resident2.Id);

        var ctrl1 = BuildController(db, resident1.Id);
        (await ctrl1.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None))
            .Should().BeOfType<CreatedResult>();

        // Sobreposição parcial: 15h–17h colide com 14h–16h.
        var ctrl2 = BuildController(db, resident2.Id);
        var conflict = await ctrl2.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(15), TomorrowAt(17), null, null), CancellationToken.None);

        conflict.Should().BeOfType<ConflictObjectResult>();
        (await db.AreaReservations.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task CreateReservation_AdjacentSlot_IsAllowed()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, requiresApproval: false);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        (await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None))
            .Should().BeOfType<CreatedResult>();

        // Intervalo semiaberto [Start,End): 16h–18h NÃO colide com 14h–16h.
        (await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(16), TomorrowAt(18), null, null), CancellationToken.None))
            .Should().BeOfType<CreatedResult>();

        (await db.AreaReservations.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task CreateReservation_UserWithoutResidency_Returns403()
    {
        using var db = NewDb();
        var stranger = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id);

        var ctrl = BuildController(db, stranger.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await db.AreaReservations.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CreateReservation_PendingResidency_Returns403()
    {
        using var db = NewDb();
        var pendingUser = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id);
        SeedResident(db, condo.Id, pendingUser.Id, CondominiumResidentStatus.Pending);

        var ctrl = BuildController(db, pendingUser.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);

        result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task CreateReservation_Sindico_CanReserveWithoutResidencyRecord()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id, requiresApproval: false);

        var ctrl = BuildController(db, sindico.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(10), TomorrowAt(12), null, null), CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
    }

    // ─── Validações de janela/regras ─────────────────────────────────────────

    [Fact]
    public async Task CreateReservation_StartAfterEnd_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(16), TomorrowAt(14), null, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReservation_InThePast_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(DateTime.UtcNow.AddHours(-2), DateTime.UtcNow.AddHours(-1), null, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReservation_BeyondMaxAdvanceDays_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, maxAdvanceDays: 30);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var start = DateTime.UtcNow.Date.AddDays(45).AddHours(14);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(start, start.AddHours(2), null, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReservation_ExceedsMaxDuration_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, maxDurationMinutes: 120);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(17), null, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReservation_GuestsExceedCapacity_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, capacity: 20);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), "Festa", 50), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReservation_OutsideDailyWindow_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id,
            openTime: new TimeOnly(8, 0), closeTime: new TimeOnly(22, 0));
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        // 6h–9h começa antes da abertura (8h).
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(6), TomorrowAt(9), null, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task CreateReservation_CrossingMidnight_WithWindow_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id,
            openTime: new TimeOnly(8, 0), closeTime: new TimeOnly(22, 0));
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(21), TomorrowAt(26), null, null), CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    // ─── Aprovação / recusa pelo síndico ─────────────────────────────────────

    [Fact]
    public async Task ApproveReservation_BySindico_SetsApprovedAndReviewer()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id, requiresApproval: true);
        SeedResident(db, condo.Id, resident.Id);

        var residentCtrl = BuildController(db, resident.Id);
        await residentCtrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);
        var reservation = await db.AreaReservations.SingleAsync();

        var sindicoCtrl = BuildController(db, sindico.Id);
        var result = await sindicoCtrl.ApproveReservation(condo.Id, reservation.Id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var saved = await db.AreaReservations.SingleAsync(r => r.Id == reservation.Id);
        saved.Status.Should().Be(AreaReservationStatus.Approved);
        saved.ReviewedByUserId.Should().Be(sindico.Id);
        saved.ReviewedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task ApproveReservation_ConflictWithAlreadyApproved_Returns409_KeepsPending()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var r1 = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id, requiresApproval: true);
        SeedResident(db, condo.Id, r1.Id);

        // Uma Approved e uma Pending no MESMO horário (semeadas direto: o guard de
        // criação impediria, mas a revalidação na aprovação é o backstop testado aqui).
        var approved = new AreaReservation
        {
            CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = r1.Id,
            StartUtc = TomorrowAt(14), EndUtc = TomorrowAt(16),
            Status = AreaReservationStatus.Approved, CreatedAt = DateTime.UtcNow,
        };
        var pending = new AreaReservation
        {
            CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = r1.Id,
            StartUtc = TomorrowAt(15), EndUtc = TomorrowAt(17),
            Status = AreaReservationStatus.Pending, CreatedAt = DateTime.UtcNow,
        };
        db.AreaReservations.AddRange(approved, pending);
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, sindico.Id);
        var result = await ctrl.ApproveReservation(condo.Id, pending.Id, CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>();
        (await db.AreaReservations.SingleAsync(r => r.Id == pending.Id)).Status
            .Should().Be(AreaReservationStatus.Pending);
    }

    [Fact]
    public async Task RejectReservation_BySindico_SetsRejectedWithNote()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id, requiresApproval: true);
        SeedResident(db, condo.Id, resident.Id);

        var residentCtrl = BuildController(db, resident.Id);
        await residentCtrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);
        var reservation = await db.AreaReservations.SingleAsync();

        var sindicoCtrl = BuildController(db, sindico.Id);
        var result = await sindicoCtrl.RejectReservation(condo.Id, reservation.Id,
            new ReviewReservationRequest("Área em manutenção"), CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var saved = await db.AreaReservations.SingleAsync(r => r.Id == reservation.Id);
        saved.Status.Should().Be(AreaReservationStatus.Rejected);
        saved.ReviewNote.Should().Be("Área em manutenção");
    }

    [Fact]
    public async Task ApproveReservation_ByRegularResident_Returns403()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id, requiresApproval: true);
        SeedResident(db, condo.Id, resident.Id);

        var residentCtrl = BuildController(db, resident.Id);
        await residentCtrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);
        var reservation = await db.AreaReservations.SingleAsync();

        // Morador comum (mesmo aprovado) não pode aprovar reservas.
        var result = await residentCtrl.ApproveReservation(condo.Id, reservation.Id, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
        (await db.AreaReservations.SingleAsync(r => r.Id == reservation.Id)).Status
            .Should().Be(AreaReservationStatus.Pending);
    }

    [Fact]
    public async Task ApproveReservation_ByAdmin_Works_WhenCondoHasNoSindico()
    {
        using var db = NewDb();
        var admin = SeedUser(db, isAdmin: true);
        var resident = SeedUser(db);
        var condo = SeedCondo(db); // sem síndico — fallback admin
        var area = SeedArea(db, condo.Id, requiresApproval: true);
        SeedResident(db, condo.Id, resident.Id);

        var residentCtrl = BuildController(db, resident.Id);
        await residentCtrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);
        var reservation = await db.AreaReservations.SingleAsync();

        var adminCtrl = BuildController(db, admin.Id);
        var result = await adminCtrl.ApproveReservation(condo.Id, reservation.Id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        (await db.AreaReservations.SingleAsync(r => r.Id == reservation.Id)).Status
            .Should().Be(AreaReservationStatus.Approved);
    }

    // ─── Cancelamento ────────────────────────────────────────────────────────

    [Fact]
    public async Task CancelReservation_ByOwner_BeforeStart_SetsCancelled()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, requiresApproval: false);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        await ctrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);
        var reservation = await db.AreaReservations.SingleAsync();

        var result = await ctrl.CancelReservation(condo.Id, reservation.Id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var saved = await db.AreaReservations.SingleAsync(r => r.Id == reservation.Id);
        saved.Status.Should().Be(AreaReservationStatus.Cancelled);
        saved.CancelledAt.Should().NotBeNull();
    }

    [Fact]
    public async Task CancelReservation_ByOwner_AfterStart_Returns400()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id);
        SeedResident(db, condo.Id, resident.Id);

        // Reserva já em andamento (semeada direto para simular o passado).
        var reservation = new AreaReservation
        {
            CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = resident.Id,
            StartUtc = DateTime.UtcNow.AddHours(-1), EndUtc = DateTime.UtcNow.AddHours(1),
            Status = AreaReservationStatus.Approved, CreatedAt = DateTime.UtcNow.AddDays(-1),
        };
        db.AreaReservations.Add(reservation);
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CancelReservation(condo.Id, reservation.Id, CancellationToken.None);

        result.Should().BeOfType<BadRequestObjectResult>();
        (await db.AreaReservations.SingleAsync(r => r.Id == reservation.Id)).Status
            .Should().Be(AreaReservationStatus.Approved);
    }

    [Fact]
    public async Task CancelReservation_ByOtherResident_Returns403()
    {
        using var db = NewDb();
        var owner = SeedUser(db);
        var other = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id, requiresApproval: false);
        SeedResident(db, condo.Id, owner.Id);
        SeedResident(db, condo.Id, other.Id);

        var ownerCtrl = BuildController(db, owner.Id);
        await ownerCtrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);
        var reservation = await db.AreaReservations.SingleAsync();

        var otherCtrl = BuildController(db, other.Id);
        var result = await otherCtrl.CancelReservation(condo.Id, reservation.Id, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    // ─── Vínculo de morador ──────────────────────────────────────────────────

    [Fact]
    public async Task RequestResidency_CreatesPending()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var condo = SeedCondo(db);

        var ctrl = BuildController(db, user.Id);
        var result = await ctrl.RequestResidency(condo.Id, new CreateResidentRequest("Bloco A, Apto 101"), CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
        var saved = await db.CondominiumResidents.SingleAsync();
        saved.Status.Should().Be(CondominiumResidentStatus.Pending);
        saved.Unit.Should().Be("Bloco A, Apto 101");
    }

    [Fact]
    public async Task RequestResidency_DuplicateActive_Returns409()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, user.Id, CondominiumResidentStatus.Pending);

        var ctrl = BuildController(db, user.Id);
        var result = await ctrl.RequestResidency(condo.Id, new CreateResidentRequest(null), CancellationToken.None);

        result.Should().BeOfType<ConflictObjectResult>();
        (await db.CondominiumResidents.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task RequestResidency_AfterRejection_IsAllowedAgain()
    {
        using var db = NewDb();
        var user = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, user.Id, CondominiumResidentStatus.Rejected);

        var ctrl = BuildController(db, user.Id);
        var result = await ctrl.RequestResidency(condo.Id, new CreateResidentRequest(null), CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
        (await db.CondominiumResidents.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task ApproveResident_BySindico_UnlocksReservation()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var user = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id, requiresApproval: false);
        var resident = SeedResident(db, condo.Id, user.Id, CondominiumResidentStatus.Pending);

        var sindicoCtrl = BuildController(db, sindico.Id);
        var approveResult = await sindicoCtrl.ApproveResident(condo.Id, resident.Id, CancellationToken.None);
        approveResult.Should().BeOfType<OkObjectResult>();

        var userCtrl = BuildController(db, user.Id);
        var reserveResult = await userCtrl.CreateReservation(condo.Id, area.Id,
            new CreateReservationRequest(TomorrowAt(14), TomorrowAt(16), null, null), CancellationToken.None);

        reserveResult.Should().BeOfType<CreatedResult>();
    }

    [Fact]
    public async Task ApproveResident_ByStranger_Returns403()
    {
        using var db = NewDb();
        var stranger = SeedUser(db);
        var user = SeedUser(db);
        var condo = SeedCondo(db);
        var resident = SeedResident(db, condo.Id, user.Id, CondominiumResidentStatus.Pending);

        var ctrl = BuildController(db, stranger.Id);
        var result = await ctrl.ApproveResident(condo.Id, resident.Id, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
        (await db.CondominiumResidents.SingleAsync(r => r.Id == resident.Id)).Status
            .Should().Be(CondominiumResidentStatus.Pending);
    }

    [Fact]
    public async Task RevokeResident_CancelsFutureReservations_KeepsPast()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var user = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id);
        var resident = SeedResident(db, condo.Id, user.Id);

        var past = new AreaReservation
        {
            CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = user.Id,
            StartUtc = DateTime.UtcNow.AddDays(-7), EndUtc = DateTime.UtcNow.AddDays(-7).AddHours(2),
            Status = AreaReservationStatus.Approved, CreatedAt = DateTime.UtcNow.AddDays(-8),
        };
        var future = new AreaReservation
        {
            CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = user.Id,
            StartUtc = TomorrowAt(14), EndUtc = TomorrowAt(16),
            Status = AreaReservationStatus.Approved, CreatedAt = DateTime.UtcNow,
        };
        db.AreaReservations.AddRange(past, future);
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, sindico.Id);
        var result = await ctrl.RevokeResident(condo.Id, resident.Id, null, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        (await db.CondominiumResidents.SingleAsync(r => r.Id == resident.Id)).Status
            .Should().Be(CondominiumResidentStatus.Revoked);
        (await db.AreaReservations.SingleAsync(r => r.Id == future.Id)).Status
            .Should().Be(AreaReservationStatus.Cancelled);
        // Histórico preservado.
        (await db.AreaReservations.SingleAsync(r => r.Id == past.Id)).Status
            .Should().Be(AreaReservationStatus.Approved);
    }

    [Fact]
    public async Task ListCommonAreas_UserWithoutResidency_Returns403WithHint()
    {
        using var db = NewDb();
        var stranger = SeedUser(db);
        var condo = SeedCondo(db);
        SeedArea(db, condo.Id);

        var ctrl = BuildController(db, stranger.Id);
        var result = await ctrl.ListCommonAreas(condo.Id, CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task DeleteCommonArea_SoftDeletes_AndCancelsFutureReservations()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var user = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var area = SeedArea(db, condo.Id);
        SeedResident(db, condo.Id, user.Id);

        var future = new AreaReservation
        {
            CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = user.Id,
            StartUtc = TomorrowAt(14), EndUtc = TomorrowAt(16),
            Status = AreaReservationStatus.Pending, CreatedAt = DateTime.UtcNow,
        };
        db.AreaReservations.Add(future);
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, sindico.Id);
        var result = await ctrl.DeleteCommonArea(condo.Id, area.Id, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
        var savedArea = await db.CommonAreas.SingleAsync(a => a.Id == area.Id);
        savedArea.DeletedAt.Should().NotBeNull();
        savedArea.IsActive.Should().BeFalse();
        (await db.AreaReservations.SingleAsync(r => r.Id == future.Id)).Status
            .Should().Be(AreaReservationStatus.Cancelled);
    }

    [Fact]
    public async Task Availability_ReturnsBusySlots_ForPendingAndApproved()
    {
        using var db = NewDb();
        var resident = SeedUser(db);
        var condo = SeedCondo(db);
        var area = SeedArea(db, condo.Id);
        SeedResident(db, condo.Id, resident.Id);

        db.AreaReservations.AddRange(
            new AreaReservation
            {
                CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = resident.Id,
                StartUtc = TomorrowAt(10), EndUtc = TomorrowAt(12),
                Status = AreaReservationStatus.Approved, CreatedAt = DateTime.UtcNow,
            },
            new AreaReservation
            {
                CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = resident.Id,
                StartUtc = TomorrowAt(14), EndUtc = TomorrowAt(16),
                Status = AreaReservationStatus.Pending, CreatedAt = DateTime.UtcNow,
            },
            new AreaReservation
            {
                CommonAreaId = area.Id, CondominiumId = condo.Id, UserId = resident.Id,
                StartUtc = TomorrowAt(18), EndUtc = TomorrowAt(20),
                Status = AreaReservationStatus.Cancelled, CreatedAt = DateTime.UtcNow,
            });
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.GetAvailability(condo.Id, area.Id,
            DateTime.UtcNow, DateTime.UtcNow.AddDays(7), CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var busyProp = ok.Value!.GetType().GetProperty("busy")!.GetValue(ok.Value);
        // Cancelada não ocupa horário — só Pending + Approved aparecem.
        ((System.Collections.IEnumerable)busyProp!).Cast<object>().Count().Should().Be(2);
    }
}
