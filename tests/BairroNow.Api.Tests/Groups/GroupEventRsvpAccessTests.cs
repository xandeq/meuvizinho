using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using System.Security.Claims;

namespace BairroNow.Api.Tests.Groups;

public class GroupEventRsvpAccessTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static EventsController BuildController(AppDbContext db, Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var controller = new EventsController(db);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")) }
        };
        return controller;
    }

    private static async Task<(User user, Group group, GroupEvent ev)> SeedAsync(
        AppDbContext db,
        GroupJoinPolicy policy,
        bool addMember = false,
        GroupMemberStatus memberStatus = GroupMemberStatus.Active)
    {
        var user = new User
        {
            Id = Guid.NewGuid(), Email = $"{Guid.NewGuid()}@t.com", PasswordHash = "h",
            BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);

        var group = new Group
        {
            BairroId = 1, Name = "G", Description = "D",
            Category = GroupCategory.Cultura, JoinPolicy = policy,
            Scope = GroupScope.Bairro, CreatedAt = DateTime.UtcNow
        };
        db.Groups.Add(group);
        await db.SaveChangesAsync();

        if (addMember)
        {
            db.GroupMembers.Add(new GroupMember
            {
                GroupId = group.Id, UserId = user.Id, Status = memberStatus, JoinedAt = DateTime.UtcNow
            });
        }

        var ev = new GroupEvent
        {
            GroupId = group.Id,
            CreatedByUserId = user.Id,
            Title = "Event",
            StartsAt = DateTime.UtcNow.AddDays(1),
            ReminderAt = DateTime.UtcNow.AddHours(22),
            ReminderSent = false,
            CreatedAt = DateTime.UtcNow
        };
        db.GroupEvents.Add(ev);
        await db.SaveChangesAsync();

        return (user, group, ev);
    }

    // ─── RSVP access ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Rsvp_open_group_allows_any_authenticated_user()
    {
        using var db = NewDb();
        var (user, _, ev) = await SeedAsync(db, GroupJoinPolicy.Open, addMember: false);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.Rsvp(ev.Id, new EventRsvpRequest { Attending = true }, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Rsvp_closed_group_returns_403_for_non_member()
    {
        using var db = NewDb();
        var (user, _, ev) = await SeedAsync(db, GroupJoinPolicy.Closed, addMember: false);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.Rsvp(ev.Id, new EventRsvpRequest { Attending = true }, CancellationToken.None);

        result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Rsvp_closed_group_allows_active_member()
    {
        using var db = NewDb();
        var (user, _, ev) = await SeedAsync(db, GroupJoinPolicy.Closed, addMember: true, memberStatus: GroupMemberStatus.Active);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.Rsvp(ev.Id, new EventRsvpRequest { Attending = true }, CancellationToken.None);

        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task Rsvp_closed_group_returns_403_for_pending_member()
    {
        using var db = NewDb();
        var (user, _, ev) = await SeedAsync(db, GroupJoinPolicy.Closed, addMember: true, memberStatus: GroupMemberStatus.PendingApproval);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.Rsvp(ev.Id, new EventRsvpRequest { Attending = true }, CancellationToken.None);

        result.Should().BeOfType<ObjectResult>()
            .Which.StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task Rsvp_returns_404_for_deleted_event()
    {
        using var db = NewDb();
        var (user, _, ev) = await SeedAsync(db, GroupJoinPolicy.Open);
        ev.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.Rsvp(ev.Id, new EventRsvpRequest { Attending = true }, CancellationToken.None);

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    // ─── List access ─────────────────────────────────────────────────────────

    [Fact]
    public async Task List_excludes_closed_group_events_for_non_member()
    {
        using var db = NewDb();
        var (user, _, _) = await SeedAsync(db, GroupJoinPolicy.Closed, addMember: false);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.List(upcoming: true, ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var items = ok.Value as System.Collections.IEnumerable;
        items?.Cast<object>().Should().BeEmpty();
    }

    [Fact]
    public async Task List_includes_open_group_events_for_non_member()
    {
        using var db = NewDb();
        var (user, _, _) = await SeedAsync(db, GroupJoinPolicy.Open, addMember: false);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.List(upcoming: true, ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var items = ok.Value as System.Collections.IEnumerable;
        items?.Cast<object>().Should().HaveCount(1);
    }

    [Fact]
    public async Task List_includes_closed_group_events_for_active_member()
    {
        using var db = NewDb();
        var (user, _, _) = await SeedAsync(db, GroupJoinPolicy.Closed, addMember: true, memberStatus: GroupMemberStatus.Active);
        var ctrl = BuildController(db, user.Id);

        var result = await ctrl.List(upcoming: true, ct: CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var items = ok.Value as System.Collections.IEnumerable;
        items?.Cast<object>().Should().HaveCount(1);
    }
}
