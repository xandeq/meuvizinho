using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Services;

public class FeedQueryServiceTests
{
    private static AppDbContext NewDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static async Task<(FeedQueryService svc, Guid callerId, int postId)> BuildAsync()
    {
        var db = NewDb();
        var bairroId = 1;
        var userId = Guid.NewGuid();

        db.Users.Add(new User
        {
            Id = userId,
            Email = "u@test.com",
            PasswordHash = "h",
            DisplayName = "Tester",
            BairroId = bairroId,
            IsVerified = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        var post = new Post
        {
            AuthorId = userId,
            BairroId = bairroId,
            Category = PostCategory.Geral,
            Body = "Feira no bairro todo sábado",
            IsPublished = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Posts.Add(post);
        await db.SaveChangesAsync();

        var svc = new FeedQueryService(db);
        return (svc, userId, post.Id);
    }

    [Fact]
    public async Task SearchAsync_finds_post_by_keyword()
    {
        var (svc, callerId, _) = await BuildAsync();
        var req = new SearchRequest { Q = "sábado", Take = 10 };

        var results = await svc.SearchAsync(callerId, req);

        results.Should().ContainSingle(p => p.Body.Contains("sábado"));
    }

    [Fact]
    public async Task SearchAsync_wildcardPercent_does_not_return_unrelated_posts()
    {
        var (svc, callerId, _) = await BuildAsync();
        // '%' should be escaped and treated as literal — not a SQL wildcard
        var req = new SearchRequest { Q = "%", Take = 10 };

        // Should not throw and should return empty (no post contains literal '%')
        var results = await svc.SearchAsync(callerId, req);
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task SearchAsync_wildcard_underscore_does_not_match_arbitrary_single_char()
    {
        var (svc, callerId, _) = await BuildAsync();
        // '_' should be escaped — no post contains literal '_'
        var req = new SearchRequest { Q = "_", Take = 10 };

        var results = await svc.SearchAsync(callerId, req);
        results.Should().BeEmpty();
    }
}
