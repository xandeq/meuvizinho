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

// Comentários e curtidas de post de grupo: o post só se lê sendo membro (GetPosts), mas os
// comentários abriam para qualquer logado (IDs sequenciais), e o postId não era amarrado ao grupo
// da URL — membro de um grupo comentava/curtia post de grupo privado alheio.
public class GroupCommentAccessTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static GroupsController Controller(AppDbContext db, Guid userId)
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

    private record World(Group Privado, Group Outro, GroupPost PostPrivado, Guid MembroPrivado, Guid MembroOutro, Guid Estranho, int ComentarioId);

    private static World Seed(AppDbContext db)
    {
        User U(string e) => new() { Id = Guid.NewGuid(), Email = e, PasswordHash = "h", DisplayName = e, IsVerified = true, BairroId = 1, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        var membroPrivado = U("a@t.com"); var membroOutro = U("b@t.com"); var estranho = U("c@t.com");
        db.Users.AddRange(membroPrivado, membroOutro, estranho);
        var privado = new Group { BairroId = 1, Name = "Moradores bloco A", Description = "privado", Category = GroupCategory.Outros };
        var outro = new Group { BairroId = 1, Name = "Corrida", Description = "aberto", Category = GroupCategory.Outros };
        db.Groups.AddRange(privado, outro);
        db.SaveChanges();
        db.GroupMembers.AddRange(
            new GroupMember { GroupId = privado.Id, UserId = membroPrivado.Id, Role = GroupMemberRole.Member, Status = GroupMemberStatus.Active },
            new GroupMember { GroupId = outro.Id, UserId = membroOutro.Id, Role = GroupMemberRole.Member, Status = GroupMemberStatus.Active });
        var post = new GroupPost { GroupId = privado.Id, AuthorId = membroPrivado.Id, Body = "portão quebrado de novo" };
        db.GroupPosts.Add(post);
        db.SaveChanges();
        var comentario = new GroupComment { GroupPostId = post.Id, AuthorId = membroPrivado.Id, Body = "meu ap é o 302", CreatedAt = DateTime.UtcNow };
        db.GroupComments.Add(comentario);
        db.SaveChanges();
        return new World(privado, outro, post, membroPrivado.Id, membroOutro.Id, estranho.Id, comentario.Id);
    }

    [Fact]
    public async Task NonMember_CannotReadComments()
    {
        using var db = NewDb();
        var w = Seed(db);

        var result = await Controller(db, w.Estranho).GetComments(w.Privado.Id, w.PostPrivado.Id);

        result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task MemberOfAnotherGroup_CannotReadThroughOwnGroupId()
    {
        using var db = NewDb();
        var w = Seed(db);

        // Membro do grupo "Corrida" usa o id do próprio grupo com o post do grupo privado.
        var result = await Controller(db, w.MembroOutro).GetComments(w.Outro.Id, w.PostPrivado.Id);

        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task MemberOfAnotherGroup_CannotCommentOnPrivatePost()
    {
        using var db = NewDb();
        var w = Seed(db);

        var result = await Controller(db, w.MembroOutro).AddComment(w.Outro.Id, w.PostPrivado.Id, new AddGroupCommentRequest("intrometido", null));

        result.Should().BeOfType<NotFoundResult>();
        (await db.GroupComments.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Reply_MustTargetCommentOfSamePost()
    {
        using var db = NewDb();
        var w = Seed(db);
        var outroPost = new GroupPost { GroupId = w.Outro.Id, AuthorId = w.MembroOutro, Body = "treino sábado" };
        db.GroupPosts.Add(outroPost);
        db.SaveChanges();

        var result = await Controller(db, w.MembroOutro).AddComment(w.Outro.Id, outroPost.Id, new AddGroupCommentRequest("resposta", w.ComentarioId));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task NonMember_CannotLike_AndOtherGroupsPost_IsNotFound()
    {
        using var db = NewDb();
        var w = Seed(db);

        (await Controller(db, w.Estranho).ToggleLike(w.Privado.Id, w.PostPrivado.Id)).Should().BeOfType<ForbidResult>();
        (await Controller(db, w.MembroOutro).ToggleLike(w.Outro.Id, w.PostPrivado.Id)).Should().BeOfType<NotFoundResult>();
        (await db.GroupPostLikes.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Member_CanReadCommentAndLike()
    {
        using var db = NewDb();
        var w = Seed(db);
        var ctrl = Controller(db, w.MembroPrivado);

        (await ctrl.GetComments(w.Privado.Id, w.PostPrivado.Id)).Should().BeOfType<OkObjectResult>();
        (await ctrl.ToggleLike(w.Privado.Id, w.PostPrivado.Id)).Should().BeOfType<OkObjectResult>();
        (await ctrl.AddComment(w.Privado.Id, w.PostPrivado.Id, new AddGroupCommentRequest("já avisei o síndico", w.ComentarioId)))
            .Should().NotBeOfType<ForbidResult>().And.NotBeOfType<NotFoundResult>();
    }
}
