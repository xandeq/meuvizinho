using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;
using BairroNow.Api.Validators;

namespace BairroNow.Api.Tests.Services;

public class CommentServiceTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private record Sut(CommentService Svc, AppDbContext Db, Guid PostAuthorId, Guid CommenterId, int PostId, Mock<INotificationService> Notifications);

    private static async Task<Sut> BuildAsync()
    {
        var db = NewDb();
        var postAuthorId = Guid.NewGuid();
        var commenterId = Guid.NewGuid();
        db.Users.AddRange(
            new User { Id = postAuthorId, Email = "a@x", PasswordHash = "h", BairroId = 1, IsVerified = true, DisplayName = "Autor", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new User { Id = commenterId, Email = "c@x", PasswordHash = "h", BairroId = 1, IsVerified = true, DisplayName = "Comentador", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        var post = new Post
        {
            AuthorId = postAuthorId,
            BairroId = 1,
            Category = PostCategory.Geral,
            Body = "post body",
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Posts.Add(post);
        await db.SaveChangesAsync();

        var notifications = new Mock<INotificationService>();
        var svc = new CommentService(db, new OffensiveWordFilter(), notifications.Object, new CreateCommentRequestValidator(), NullLogger<CommentService>.Instance);
        return new Sut(svc, db, postAuthorId, commenterId, post.Id, notifications);
    }

    [Fact]
    public async Task Create_comment_calls_NotifyComment_with_post_author()
    {
        var sut = await BuildAsync();
        var dto = new CreateCommentRequest { PostId = sut.PostId, ParentCommentId = null, Body = "otimo!" };

        await sut.Svc.CreateAsync(sut.CommenterId, dto);

        sut.Notifications.Verify(n => n.NotifyCommentAsync(
            sut.PostAuthorId, sut.CommenterId, sut.PostId, It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Reply_to_root_allowed()
    {
        var sut = await BuildAsync();
        var root = await sut.Svc.CreateAsync(sut.CommenterId,
            new CreateCommentRequest { PostId = sut.PostId, ParentCommentId = null, Body = "raiz" });

        var reply = await sut.Svc.CreateAsync(sut.PostAuthorId,
            new CreateCommentRequest { PostId = sut.PostId, ParentCommentId = root.Id, Body = "resposta" });

        reply.ParentCommentId.Should().Be(root.Id);
    }

    [Fact]
    public async Task Reply_to_reply_rejected()
    {
        var sut = await BuildAsync();
        var root = await sut.Svc.CreateAsync(sut.CommenterId,
            new CreateCommentRequest { PostId = sut.PostId, ParentCommentId = null, Body = "raiz" });
        var reply = await sut.Svc.CreateAsync(sut.PostAuthorId,
            new CreateCommentRequest { PostId = sut.PostId, ParentCommentId = root.Id, Body = "resposta" });

        await Assert.ThrowsAsync<FeedValidationException>(() =>
            sut.Svc.CreateAsync(sut.CommenterId,
                new CreateCommentRequest { PostId = sut.PostId, ParentCommentId = reply.Id, Body = "resposta de resposta" }));
    }

    // ── Autorização: comentário só é editado/apagado por quem escreveu (nem o dono do post) ──

    [Fact]
    public async Task PostAuthor_CannotEditOrDeleteSomeoneElsesComment()
    {
        var sut = await BuildAsync();
        var comment = await sut.Svc.CreateAsync(sut.CommenterId, new CreateCommentRequest { PostId = sut.PostId, Body = "concordo" });

        await Assert.ThrowsAsync<FeedForbiddenException>(() => sut.Svc.UpdateAsync(sut.PostAuthorId, comment.Id, "editado por outro"));
        await Assert.ThrowsAsync<FeedForbiddenException>(() => sut.Svc.DeleteAsync(sut.PostAuthorId, comment.Id));

        sut.Db.ChangeTracker.Clear();
        var stored = await sut.Db.Comments.IgnoreQueryFilters().SingleAsync(c => c.Id == comment.Id);
        stored.Body.Should().Be("concordo");
        stored.DeletedAt.Should().BeNull();
    }
}
