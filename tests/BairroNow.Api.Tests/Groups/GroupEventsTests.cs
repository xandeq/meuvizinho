using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Hubs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using System.Security.Claims;
using Xunit;

namespace BairroNow.Api.Tests.Groups;

// Eventos de grupo: site e app liam "rsvpCount" ("undefined confirmados"), não-membro via e confirmava
// presença em evento de outro grupo, e evento passado continuava na lista.
public class GroupEventsTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static GroupsController BuildController(AppDbContext db, Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var ctrl = new GroupsController(db, Mock.Of<IHubContext<NotificationHub>>(), Mock.Of<INotificationService>(),
            Mock.Of<IOffensiveWordFilter>(), NullLogger<GroupsController>.Instance);
        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")) }
        };
        return ctrl;
    }

    private static (Group group, Guid member) Seed(AppDbContext db)
    {
        var user = new User { Id = Guid.NewGuid(), Email = "m@t.com", PasswordHash = "h", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Users.Add(user);
        var group = new Group { BairroId = 1, Name = "Corrida", Description = "Sábados 7h", Category = GroupCategory.Outros };
        db.Groups.Add(group);
        db.SaveChanges();
        db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupMemberRole.Member, Status = GroupMemberStatus.Active });
        db.SaveChanges();
        return (group, user.Id);
    }

    [Fact]
    public async Task GetEvents_NotMember_Forbid()
    {
        using var db = NewDb();
        var (group, _) = Seed(db);
        var result = await BuildController(db, Guid.NewGuid()).GetEvents(group.Id, CancellationToken.None);
        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetEvents_HidesPastEvents_AndReturnsAttendingCount()
    {
        using var db = NewDb();
        var (group, member) = Seed(db);
        var future = new GroupEvent { GroupId = group.Id, CreatedByUserId = member, Title = "Treino", StartsAt = DateTime.UtcNow.AddDays(1) };
        var past = new GroupEvent { GroupId = group.Id, CreatedByUserId = member, Title = "Antigo", StartsAt = DateTime.UtcNow.AddDays(-2) };
        db.GroupEvents.AddRange(future, past);
        db.SaveChanges();
        db.GroupEventRsvps.Add(new GroupEventRsvp { EventId = future.Id, UserId = member, IsAttending = true, RespondedAt = DateTime.UtcNow });
        db.SaveChanges();

        var ok = (await BuildController(db, member).GetEvents(group.Id, CancellationToken.None)).Should().BeOfType<OkObjectResult>().Subject;
        var list = ok.Value.Should().BeAssignableTo<IEnumerable<GroupEventDto>>().Subject.ToList();
        list.Should().ContainSingle();
        list[0].Title.Should().Be("Treino");
        list[0].AttendingCount.Should().Be(1);
        list[0].MyRsvp.Should().BeTrue();
    }

    [Fact]
    public async Task Rsvp_EventFromOtherGroup_NotFound()
    {
        using var db = NewDb();
        var (group, member) = Seed(db);
        var other = new Group { BairroId = 1, Name = "Outro", Description = "x", Category = GroupCategory.Outros };
        db.Groups.Add(other);
        db.SaveChanges();
        var ev = new GroupEvent { GroupId = other.Id, CreatedByUserId = member, Title = "X", StartsAt = DateTime.UtcNow.AddDays(1) };
        db.GroupEvents.Add(ev);
        db.SaveChanges();

        var result = await BuildController(db, member).Rsvp(group.Id, ev.Id, new RsvpRequest(true), CancellationToken.None);
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Rsvp_NotMember_Forbid()
    {
        using var db = NewDb();
        var (group, member) = Seed(db);
        var ev = new GroupEvent { GroupId = group.Id, CreatedByUserId = member, Title = "X", StartsAt = DateTime.UtcNow.AddDays(1) };
        db.GroupEvents.Add(ev);
        db.SaveChanges();

        var result = await BuildController(db, Guid.NewGuid()).Rsvp(group.Id, ev.Id, new RsvpRequest(true), CancellationToken.None);
        result.Should().BeOfType<ForbidResult>();
    }
}
