using FluentAssertions;
using FluentValidation;
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

public class PostServiceTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static (PostService svc, AppDbContext db, Guid userId) BuildSut(IOffensiveWordFilter? filter = null)
    {
        var db = NewDb();
        var userId = Guid.NewGuid();
        db.Users.Add(new User
        {
            Id = userId,
            Email = "u@example.com",
            PasswordHash = "h",
            DisplayName = "Tester",
            BairroId = 1,
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        db.SaveChanges();

        var fileMock = new Mock<IFileStorageService>();
        fileMock.Setup(f => f.SaveImageAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("/uploads/posts/2026/04/abc.jpg");

        var validator = new CreatePostRequestValidator();
        var svc = new PostService(db, fileMock.Object, filter ?? new OffensiveWordFilter(), validator, NullLogger<PostService>.Instance);
        return (svc, db, userId);
    }

    [Fact]
    public async Task Create_sets_IsPublished_true_when_body_clean()
    {
        var (svc, db, userId) = BuildSut();
        var dto = new CreatePostRequest { Category = PostCategory.Dica, Body = "Bom dia vizinhos, hoje tem feira" };
        var result = await svc.CreateAsync(userId, dto, null);
        result.Should().NotBeNull();
        var post = await db.Posts.AsNoTracking().FirstAsync(p => p.Id == result.Id);
        post.IsPublished.Should().BeTrue();
        post.IsFlagged.Should().BeFalse();
    }

    [Fact]
    public async Task Create_sets_IsFlagged_and_IsPublished_false_when_offensive()
    {
        var (svc, db, userId) = BuildSut();
        var dto = new CreatePostRequest { Category = PostCategory.Geral, Body = "voce e um idiota" };
        var result = await svc.CreateAsync(userId, dto, null);
        var post = await db.Posts.IgnoreQueryFilters().AsNoTracking().FirstAsync(p => p.Id == result.Id);
        post.IsFlagged.Should().BeTrue();
        post.IsPublished.Should().BeFalse();
    }

    [Fact]
    public async Task Update_throws_when_not_author()
    {
        var (svc, db, userId) = BuildSut();
        var dto = new CreatePostRequest { Category = PostCategory.Dica, Body = "ola" };
        var created = await svc.CreateAsync(userId, dto, null);

        var otherId = Guid.NewGuid();
        db.Users.Add(new User { Id = otherId, Email = "x@x", PasswordHash = "h", BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<FeedForbiddenException>(() => svc.UpdateAsync(otherId, created.Id, "novo body"));
    }

    [Fact]
    public async Task Update_throws_when_outside_30min_window()
    {
        var (svc, db, userId) = BuildSut();
        var dto = new CreatePostRequest { Category = PostCategory.Dica, Body = "ola" };
        var created = await svc.CreateAsync(userId, dto, null);

        // Manually shift CreatedAt back 1 hour
        var post = await db.Posts.FirstAsync(p => p.Id == created.Id);
        post.CreatedAt = DateTime.UtcNow.AddHours(-1);
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<FeedValidationException>(() => svc.UpdateAsync(userId, created.Id, "novo body"));
    }

    [Fact]
    public async Task Delete_soft_deletes()
    {
        var (svc, db, userId) = BuildSut();
        var dto = new CreatePostRequest { Category = PostCategory.Dica, Body = "ola" };
        var created = await svc.CreateAsync(userId, dto, null);
        await svc.DeleteAsync(userId, created.Id);

        var visible = await db.Posts.AsNoTracking().FirstOrDefaultAsync(p => p.Id == created.Id);
        visible.Should().BeNull(); // filtered out

        var hidden = await db.Posts.IgnoreQueryFilters().AsNoTracking().FirstAsync(p => p.Id == created.Id);
        hidden.DeletedAt.Should().NotBeNull();
    }

    // ── Autorização: só o autor edita ou apaga o post ──

    [Fact]
    public async Task OtherUser_CannotEditOrDeletePost_AndPostStaysIntact()
    {
        var (svc, db, userId) = BuildSut();
        var created = await svc.CreateAsync(userId, new CreatePostRequest { Category = PostCategory.Dica, Body = "Feira amanha na praca" }, null);
        var stranger = Guid.NewGuid();

        await Assert.ThrowsAsync<FeedForbiddenException>(() => svc.UpdateAsync(stranger, created.Id, "texto trocado"));
        await Assert.ThrowsAsync<FeedForbiddenException>(() => svc.DeleteAsync(stranger, created.Id));

        db.ChangeTracker.Clear();
        var post = await db.Posts.IgnoreQueryFilters().SingleAsync(p => p.Id == created.Id);
        post.Body.Should().Be("Feira amanha na praca");
        post.DeletedAt.Should().BeNull();
    }
}
