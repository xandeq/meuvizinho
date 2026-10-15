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

// "Sair do grupo" (site e app) chama DELETE /groups/{id}/members/me, rota que não existia (404).
public class GroupLeaveTests
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

    [Fact]
    public async Task LeaveGroup_RemovesOwnMembership()
    {
        using var db = NewDb();
        var user = new User { Id = Guid.NewGuid(), Email = "m@t.com", PasswordHash = "h", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        db.Users.Add(user);
        var group = new Group { BairroId = 1, Name = "Corrida", Description = "Sábados 7h", Category = GroupCategory.Outros };
        db.Groups.Add(group);
        db.SaveChanges();
        db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = user.Id, Role = GroupMemberRole.Member, Status = GroupMemberStatus.Active });
        db.SaveChanges();

        var result = await BuildController(db, user.Id).LeaveGroup(group.Id, CancellationToken.None);

        result.Should().BeOfType<NoContentResult>();
        (await db.GroupMembers.AnyAsync(m => m.GroupId == group.Id && m.UserId == user.Id)).Should().BeFalse();
    }

    [Fact]
    public async Task LeaveGroup_NotMember_Returns404()
    {
        using var db = NewDb();
        var group = new Group { BairroId = 1, Name = "Corrida", Description = "Sábados 7h", Category = GroupCategory.Outros };
        db.Groups.Add(group);
        db.SaveChanges();

        var result = await BuildController(db, Guid.NewGuid()).LeaveGroup(group.Id, CancellationToken.None);

        result.Should().BeOfType<NotFoundResult>();
    }
}
