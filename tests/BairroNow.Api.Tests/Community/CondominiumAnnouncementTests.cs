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

// Wave T — Comunicados oficiais do síndico: publicação restrita a síndico/admin,
// listagem só para moradores aprovados, fixados no topo, expirados fora da
// listagem padrão (mas no histórico de gestão) e soft delete.
[Trait("Category", "Unit")]
public class CondominiumAnnouncementTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static CondominiumAnnouncementsController BuildController(
        AppDbContext db, Guid userId, INotificationService? notifications = null)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var ctrl = new CondominiumAnnouncementsController(
            db, new CondominiumAccessService(db),
            notifications ?? Mock.Of<INotificationService>(),
            NullLogger<CondominiumAnnouncementsController>.Instance);
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

    private static CondominiumAnnouncement SeedAnnouncement(
        AppDbContext db, int condominiumId, Guid authorId,
        string title = "Comunicado",
        bool isPinned = false,
        bool isImportant = false,
        DateTime? expiresAt = null,
        DateTime? deletedAt = null,
        DateTime? publishedAt = null)
    {
        var now = DateTime.UtcNow;
        var a = new CondominiumAnnouncement
        {
            CondominiumId = condominiumId,
            AuthorUserId = authorId,
            Title = title,
            Body = "Corpo do comunicado.",
            IsPinned = isPinned,
            IsImportant = isImportant,
            PublishedAt = publishedAt ?? now,
            ExpiresAt = expiresAt,
            CreatedAt = now,
            DeletedAt = deletedAt,
        };
        db.Announcements.Add(a);
        db.SaveChanges();
        return a;
    }

    private static List<object> ItemsOf(IActionResult result)
    {
        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        return ((System.Collections.IEnumerable)ok.Value!).Cast<object>().ToList();
    }

    private static T Prop<T>(object item, string name) =>
        (T)item.GetType().GetProperty(name)!.GetValue(item)!;

    // ─── Publicação ──────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAnnouncement_BySindico_CreatesAndNotifies()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var notifications = new Mock<INotificationService>();

        var ctrl = BuildController(db, sindico.Id, notifications.Object);
        var result = await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest("Obra na garagem", "A garagem ficará fechada.", true, false, null),
            CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
        var saved = await db.Announcements.SingleAsync();
        saved.Title.Should().Be("Obra na garagem");
        saved.AuthorUserId.Should().Be(sindico.Id);
        saved.IsImportant.Should().BeTrue();
        saved.PublishedAt.Should().Be(saved.CreatedAt);
        saved.UpdatedAt.Should().BeNull();
        saved.DeletedAt.Should().BeNull();

        notifications.Verify(n => n.NotifyAnnouncementPublishedAsync(
            condo.Id, sindico.Id, saved.Id, "Obra na garagem", condo.Name, true, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task CreateAnnouncement_ByAdmin_Works_WhenCondoHasNoSindico()
    {
        using var db = NewDb();
        var admin = SeedUser(db, isAdmin: true);
        var condo = SeedCondo(db); // sem síndico — fallback admin

        var ctrl = BuildController(db, admin.Id);
        var result = await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest("Aviso", "Texto do aviso.", null, null, null),
            CancellationToken.None);

        result.Should().BeOfType<CreatedResult>();
        (await db.Announcements.SingleAsync()).AuthorUserId.Should().Be(admin.Id);
    }

    [Fact]
    public async Task CreateAnnouncement_ByApprovedResident_Returns403()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest("Tentativa", "Morador não publica.", null, null, null),
            CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
        (await db.Announcements.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CreateAnnouncement_InvalidFields_Returns400()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var ctrl = BuildController(db, sindico.Id);

        // Título vazio.
        (await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest("  ", "Corpo.", null, null, null), CancellationToken.None))
            .Should().BeOfType<BadRequestObjectResult>();

        // Título > 160 chars.
        (await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest(new string('a', 161), "Corpo.", null, null, null), CancellationToken.None))
            .Should().BeOfType<BadRequestObjectResult>();

        // Corpo > 20000 chars.
        (await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest("Título", new string('b', 20001), null, null, null), CancellationToken.None))
            .Should().BeOfType<BadRequestObjectResult>();

        // Expiração no passado.
        (await ctrl.CreateAnnouncement(condo.Id,
            new CreateAnnouncementRequest("Título", "Corpo.", null, null, DateTime.UtcNow.AddHours(-1)), CancellationToken.None))
            .Should().BeOfType<BadRequestObjectResult>();

        (await db.Announcements.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CreateAnnouncement_UnknownCondo_Returns404()
    {
        using var db = NewDb();
        var user = SeedUser(db);

        var ctrl = BuildController(db, user.Id);
        var result = await ctrl.CreateAnnouncement(9999,
            new CreateAnnouncementRequest("Título", "Corpo.", null, null, null), CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }

    // ─── Listagem do morador ─────────────────────────────────────────────────

    [Fact]
    public async Task ListAnnouncements_ApprovedResident_SeesActiveOnes()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Ativo");

        var ctrl = BuildController(db, resident.Id);
        var items = ItemsOf(await ctrl.ListAnnouncements(condo.Id, 1, CancellationToken.None));

        items.Should().HaveCount(1);
        Prop<string>(items[0], "Title").Should().Be("Ativo");
    }

    [Fact]
    public async Task ListAnnouncements_UserWithoutResidency_Returns403WithHint()
    {
        using var db = NewDb();
        var stranger = SeedUser(db);
        var condo = SeedCondo(db);

        var ctrl = BuildController(db, stranger.Id);
        var result = await ctrl.ListAnnouncements(condo.Id, 1, CancellationToken.None);

        var forbidden = result.Should().BeOfType<ObjectResult>().Subject;
        forbidden.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task ListAnnouncements_PendingResidency_Returns403()
    {
        using var db = NewDb();
        var pendingUser = SeedUser(db);
        var condo = SeedCondo(db);
        SeedResident(db, condo.Id, pendingUser.Id, CondominiumResidentStatus.Pending);

        var ctrl = BuildController(db, pendingUser.Id);
        var result = await ctrl.ListAnnouncements(condo.Id, 1, CancellationToken.None);

        result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task ListAnnouncements_PinnedComesFirst_EvenIfOlder()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);

        // Fixado mais ANTIGO que o normal — mesmo assim vem primeiro.
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Fixado antigo",
            isPinned: true, publishedAt: DateTime.UtcNow.AddDays(-10));
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Recente",
            publishedAt: DateTime.UtcNow);

        var ctrl = BuildController(db, resident.Id);
        var items = ItemsOf(await ctrl.ListAnnouncements(condo.Id, 1, CancellationToken.None));

        items.Should().HaveCount(2);
        Prop<string>(items[0], "Title").Should().Be("Fixado antigo");
        Prop<bool>(items[0], "IsPinned").Should().BeTrue();
        Prop<string>(items[1], "Title").Should().Be("Recente");
    }

    [Fact]
    public async Task ListAnnouncements_ExcludesExpiredAndDeleted()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);

        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Ativo");
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Expirado",
            expiresAt: DateTime.UtcNow.AddHours(-1));
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Apagado",
            deletedAt: DateTime.UtcNow);
        // Expira no futuro — ainda visível.
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Expira amanhã",
            expiresAt: DateTime.UtcNow.AddDays(1));

        var ctrl = BuildController(db, resident.Id);
        var items = ItemsOf(await ctrl.ListAnnouncements(condo.Id, 1, CancellationToken.None));

        items.Select(i => Prop<string>(i, "Title"))
            .Should().BeEquivalentTo("Ativo", "Expira amanhã");
    }

    // ─── Listagem de gestão ──────────────────────────────────────────────────

    [Fact]
    public async Task ManageList_IncludesExpiredWithFlag_ExcludesDeletedByDefault()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);

        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Ativo");
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Expirado",
            expiresAt: DateTime.UtcNow.AddHours(-1));
        SeedAnnouncement(db, condo.Id, sindico.Id, title: "Apagado",
            deletedAt: DateTime.UtcNow);

        var ctrl = BuildController(db, sindico.Id);
        var items = ItemsOf(await ctrl.ListAnnouncementsForManagement(condo.Id, includeDeleted: false, 1, CancellationToken.None));

        items.Select(i => Prop<string>(i, "Title"))
            .Should().BeEquivalentTo("Ativo", "Expirado");
        var expirado = items.Single(i => Prop<string>(i, "Title") == "Expirado");
        Prop<bool>(expirado, "IsExpired").Should().BeTrue();

        var withDeleted = ItemsOf(await ctrl.ListAnnouncementsForManagement(condo.Id, includeDeleted: true, 1, CancellationToken.None));
        withDeleted.Should().HaveCount(3);
    }

    [Fact]
    public async Task ManageList_ByApprovedResident_Returns403()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);

        var ctrl = BuildController(db, resident.Id);
        var result = await ctrl.ListAnnouncementsForManagement(condo.Id, false, 1, CancellationToken.None);

        result.Should().BeOfType<ForbidResult>();
    }

    // ─── Detalhe ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAnnouncement_Expired_404ForResident_OkForSindico()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);
        var expired = SeedAnnouncement(db, condo.Id, sindico.Id, title: "Expirado",
            expiresAt: DateTime.UtcNow.AddHours(-1));

        var residentCtrl = BuildController(db, resident.Id);
        (await residentCtrl.GetAnnouncement(condo.Id, expired.Id, CancellationToken.None))
            .Should().BeOfType<NotFoundResult>();

        var sindicoCtrl = BuildController(db, sindico.Id);
        (await sindicoCtrl.GetAnnouncement(condo.Id, expired.Id, CancellationToken.None))
            .Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetAnnouncement_Deleted_404EvenForSindico()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var deleted = SeedAnnouncement(db, condo.Id, sindico.Id, deletedAt: DateTime.UtcNow);

        var ctrl = BuildController(db, sindico.Id);
        (await ctrl.GetAnnouncement(condo.Id, deleted.Id, CancellationToken.None))
            .Should().BeOfType<NotFoundResult>();
    }

    // ─── Edição / exclusão / fixar ───────────────────────────────────────────

    [Fact]
    public async Task UpdateAnnouncement_BySindico_PatchesAndSetsUpdatedAt()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var ann = SeedAnnouncement(db, condo.Id, sindico.Id, title: "Original");

        var ctrl = BuildController(db, sindico.Id);
        var result = await ctrl.UpdateAnnouncement(condo.Id, ann.Id,
            new UpdateAnnouncementRequest("Editado", null, true, null, null), CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        var saved = await db.Announcements.SingleAsync(a => a.Id == ann.Id);
        saved.Title.Should().Be("Editado");
        saved.Body.Should().Be("Corpo do comunicado."); // não informado — inalterado
        saved.IsImportant.Should().BeTrue();
        saved.UpdatedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task UpdateAnnouncement_Deleted_Returns404()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var deleted = SeedAnnouncement(db, condo.Id, sindico.Id, deletedAt: DateTime.UtcNow);

        var ctrl = BuildController(db, sindico.Id);
        (await ctrl.UpdateAnnouncement(condo.Id, deleted.Id,
            new UpdateAnnouncementRequest("Novo título", null, null, null, null), CancellationToken.None))
            .Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteAnnouncement_SoftDeletes_SecondDelete404()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var ann = SeedAnnouncement(db, condo.Id, sindico.Id);

        var ctrl = BuildController(db, sindico.Id);
        (await ctrl.DeleteAnnouncement(condo.Id, ann.Id, CancellationToken.None))
            .Should().BeOfType<OkObjectResult>();
        (await db.Announcements.SingleAsync(a => a.Id == ann.Id)).DeletedAt.Should().NotBeNull();

        // Idempotente-ish: já apagado → 404.
        (await ctrl.DeleteAnnouncement(condo.Id, ann.Id, CancellationToken.None))
            .Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DeleteAnnouncement_ByApprovedResident_Returns403()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var resident = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        SeedResident(db, condo.Id, resident.Id);
        var ann = SeedAnnouncement(db, condo.Id, sindico.Id);

        var ctrl = BuildController(db, resident.Id);
        (await ctrl.DeleteAnnouncement(condo.Id, ann.Id, CancellationToken.None))
            .Should().BeOfType<ForbidResult>();
        (await db.Announcements.SingleAsync(a => a.Id == ann.Id)).DeletedAt.Should().BeNull();
    }

    [Fact]
    public async Task PinAndUnpin_ToggleIsPinned()
    {
        using var db = NewDb();
        var sindico = SeedUser(db);
        var condo = SeedCondo(db, sindicoUserId: sindico.Id);
        var ann = SeedAnnouncement(db, condo.Id, sindico.Id);

        var ctrl = BuildController(db, sindico.Id);

        (await ctrl.PinAnnouncement(condo.Id, ann.Id, CancellationToken.None))
            .Should().BeOfType<OkObjectResult>();
        (await db.Announcements.SingleAsync(a => a.Id == ann.Id)).IsPinned.Should().BeTrue();

        (await ctrl.UnpinAnnouncement(condo.Id, ann.Id, CancellationToken.None))
            .Should().BeOfType<OkObjectResult>();
        var saved = await db.Announcements.SingleAsync(a => a.Id == ann.Id);
        saved.IsPinned.Should().BeFalse();
        saved.UpdatedAt.Should().NotBeNull();
    }
}
