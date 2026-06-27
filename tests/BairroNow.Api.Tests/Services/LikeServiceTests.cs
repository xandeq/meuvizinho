using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Services;

public class LikeServiceTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(LikeService svc, Mock<INotificationService> notif, Guid authorId, Guid likerId, int postId)> BuildAsync()
    {
        var db = NewDb();
        var authorId = Guid.NewGuid();
        var likerId  = Guid.NewGuid();

        db.Users.AddRange(
            new User { Id = authorId, Email = "author@t.com", PasswordHash = "h", DisplayName = "Author", BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new User { Id = likerId,  Email = "liker@t.com",  PasswordHash = "h", DisplayName = "Liker",  BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        var post = new Post
        {
            AuthorId = authorId,
            BairroId = 1,
            Category = PostCategory.Geral,
            Body = "Test post",
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Posts.Add(post);
        await db.SaveChangesAsync();

        var notif = new Mock<INotificationService>();
        var svc = new LikeService(db, notif.Object);

        return (svc, notif, authorId, likerId, post.Id);
    }

    [Fact]
    public async Task Toggle_like_adds_record_and_returns_liked_true()
    {
        var (svc, _, _, likerId, postId) = await BuildAsync();

        var result = await svc.ToggleAsync(likerId, postId);

        result.Liked.Should().BeTrue();
        result.Count.Should().Be(1);
    }

    [Fact]
    public async Task Toggle_twice_unlikes_and_count_returns_to_zero()
    {
        var (svc, _, _, likerId, postId) = await BuildAsync();

        await svc.ToggleAsync(likerId, postId);
        var result = await svc.ToggleAsync(likerId, postId);

        result.Liked.Should().BeFalse();
        result.Count.Should().Be(0);
    }

    [Fact]
    public async Task Toggle_three_times_results_in_like()
    {
        var (svc, _, _, likerId, postId) = await BuildAsync();

        await svc.ToggleAsync(likerId, postId);
        await svc.ToggleAsync(likerId, postId);
        var result = await svc.ToggleAsync(likerId, postId);

        result.Liked.Should().BeTrue();
        result.Count.Should().Be(1);
    }

    [Fact]
    public async Task Toggle_throws_FeedNotFoundException_for_nonexistent_post()
    {
        var (svc, _, _, likerId, _) = await BuildAsync();

        await Assert.ThrowsAsync<FeedNotFoundException>(() => svc.ToggleAsync(likerId, 99999));
    }

    [Fact]
    public async Task Toggle_notifies_author_when_other_user_likes()
    {
        var (svc, notif, authorId, likerId, postId) = await BuildAsync();

        await svc.ToggleAsync(likerId, postId);

        notif.Verify(
            n => n.NotifyLikeAsync(authorId, likerId, postId, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Toggle_does_not_notify_when_author_likes_own_post()
    {
        var (svc, notif, authorId, _, postId) = await BuildAsync();

        await svc.ToggleAsync(authorId, postId);

        notif.Verify(
            n => n.NotifyLikeAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Toggle_does_not_notify_on_unlike()
    {
        var (svc, notif, _, likerId, postId) = await BuildAsync();

        await svc.ToggleAsync(likerId, postId);  // like → notifies once
        notif.Invocations.Clear();
        await svc.ToggleAsync(likerId, postId);  // unlike → no notification

        notif.Verify(
            n => n.NotifyLikeAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<int>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task WhoLikedAsync_returns_all_likers()
    {
        var (svc, _, _, likerId, postId) = await BuildAsync();
        await svc.ToggleAsync(likerId, postId);

        var who = await svc.WhoLikedAsync(postId);

        who.Should().ContainSingle(u => u.Id == likerId);
    }

    [Fact]
    public async Task WhoLikedAsync_returns_empty_after_unlike()
    {
        var (svc, _, _, likerId, postId) = await BuildAsync();
        await svc.ToggleAsync(likerId, postId);
        await svc.ToggleAsync(likerId, postId);

        var who = await svc.WhoLikedAsync(postId);

        who.Should().BeEmpty();
    }
}
