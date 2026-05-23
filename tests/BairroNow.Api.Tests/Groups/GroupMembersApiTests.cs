using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using System.Security.Claims;
using System.Text.Json;

namespace BairroNow.Api.Tests.Groups;

public class GroupMembersApiTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static GroupsController BuildController(AppDbContext db, Guid userId)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) };
        var ctrl = new GroupsController(db, null!, null!, null!);
        ctrl.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test")) }
        };
        return ctrl;
    }

    private static JsonElement AsJson(object? value)
    {
        var json = JsonSerializer.Serialize(value);
        return JsonDocument.Parse(json).RootElement;
    }

    [Fact]
    public async Task GetMembers_ReturnsItemsAndTotal_NotBareArray()
    {
        using var db = NewDb();
        var ownerId = Guid.NewGuid();
        var member1Id = Guid.NewGuid();
        var member2Id = Guid.NewGuid();

        db.Users.AddRange(
            new User { Id = ownerId,  Email = "o@t.com", PasswordHash = "h", BairroId = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new User { Id = member1Id, Email = "m1@t.com", PasswordHash = "h", BairroId = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new User { Id = member2Id, Email = "m2@t.com", PasswordHash = "h", BairroId = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        var group = new Group { BairroId = 1, Name = "G", Description = "D", Category = GroupCategory.Outros, JoinPolicy = GroupJoinPolicy.Open, Scope = GroupScope.Bairro, CreatedAt = DateTime.UtcNow };
        db.Groups.Add(group);
        await db.SaveChangesAsync();

        db.GroupMembers.AddRange(
            new GroupMember { GroupId = group.Id, UserId = ownerId,  Role = GroupMemberRole.Owner,  Status = GroupMemberStatus.Active, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = member1Id, Role = GroupMemberRole.Member, Status = GroupMemberStatus.Active, JoinedAt = DateTime.UtcNow },
            new GroupMember { GroupId = group.Id, UserId = member2Id, Role = GroupMemberRole.Member, Status = GroupMemberStatus.PendingApproval, JoinedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, ownerId);
        var result = await ctrl.GetMembers(group.Id, null, 1, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var json = AsJson(ok.Value);

        // Response MUST be { items: [...], total: N } — not a bare array
        json.ValueKind.Should().Be(JsonValueKind.Object, "response must be an object with items/total");
        json.TryGetProperty("items", out var items).Should().BeTrue("items property must exist");
        json.TryGetProperty("total", out var total).Should().BeTrue("total property must exist");

        // Only Active members are returned (pending excluded)
        items.GetArrayLength().Should().Be(2, "only Active members are included");
        total.GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task GetMembers_RoleIsLowercase()
    {
        using var db = NewDb();
        var ownerId = Guid.NewGuid();
        db.Users.Add(new User { Id = ownerId, Email = "o@t.com", PasswordHash = "h", BairroId = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        var group = new Group { BairroId = 1, Name = "G", Description = "D", Category = GroupCategory.Outros, JoinPolicy = GroupJoinPolicy.Open, Scope = GroupScope.Bairro, CreatedAt = DateTime.UtcNow };
        db.Groups.Add(group);
        await db.SaveChangesAsync();
        db.GroupMembers.Add(new GroupMember { GroupId = group.Id, UserId = ownerId, Role = GroupMemberRole.Owner, Status = GroupMemberStatus.Active, JoinedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var ctrl = BuildController(db, ownerId);
        var result = await ctrl.GetMembers(group.Id, null, 1, CancellationToken.None);

        var ok = result.Should().BeOfType<OkObjectResult>().Subject;
        var json = AsJson(ok.Value);
        var firstItem = json.GetProperty("items").EnumerateArray().First();

        // Role must be lowercase to match TypeScript type 'owner' | 'admin' | 'member'
        firstItem.GetProperty("role").GetString().Should().Be("owner");
    }
}
