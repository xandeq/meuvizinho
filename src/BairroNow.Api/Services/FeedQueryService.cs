using System.Text;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

public class FeedQueryService : IFeedQueryService
{
    private readonly AppDbContext _db;

    public FeedQueryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<FeedPageDto> GetBairroFeedAsync(Guid callerId, int bairroId, string? cursor, int take, CancellationToken ct = default)
    {
        var caller = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId, ct)
            ?? throw new UnauthorizedAccessException("User not found");
        if (caller.BairroId != bairroId)
            throw new UnauthorizedAccessException("Caller bairro mismatch");

        take = Math.Clamp(take, 1, 50);

        DateTime? cursorCreated = null;
        int? cursorId = null;
        if (!string.IsNullOrWhiteSpace(cursor))
        {
            try
            {
                var raw = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
                var parts = raw.Split(':');
                cursorCreated = new DateTime(long.Parse(parts[0]), DateTimeKind.Utc);
                cursorId = int.Parse(parts[1]);
            }
            catch { /* ignore invalid cursor */ }
        }

        var query = _db.Posts.AsNoTracking()
            .Include(p => p.Author)
            .Include(p => p.Images)
            .Where(p => p.BairroId == bairroId && p.IsPublished);

        if (cursorCreated.HasValue && cursorId.HasValue)
        {
            query = query.Where(p => p.CreatedAt < cursorCreated.Value
                || (p.CreatedAt == cursorCreated.Value && p.Id < cursorId.Value));
        }

        var rows = await query
            .OrderByDescending(p => p.CreatedAt)
            .ThenByDescending(p => p.Id)
            .Take(take + 1)
            .ToListAsync(ct);

        var hasMore = rows.Count > take;
        var items = rows.Take(take).ToList();

        var postIds = items.Select(p => p.Id).ToList();
        var likeCounts = await _db.PostLikes.AsNoTracking()
            .Where(l => postIds.Contains(l.PostId))
            .GroupBy(l => l.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);

        var likedByMe = await _db.PostLikes.AsNoTracking()
            .Where(l => postIds.Contains(l.PostId) && l.UserId == callerId)
            .Select(l => l.PostId)
            .ToListAsync(ct);
        var likedSet = new HashSet<int>(likedByMe);

        var commentCounts = await _db.Comments.AsNoTracking()
            .Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);

        var dtos = items.Select(p => MapPost(p, likeCounts, likedSet, commentCounts)).ToList();

        string? nextCursor = null;
        if (hasMore && items.Count > 0)
        {
            var last = items[^1];
            nextCursor = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{last.CreatedAt.Ticks}:{last.Id}"));
        }

        return new FeedPageDto { Items = dtos, NextCursor = nextCursor };
    }

    public async Task<(PostDto post, List<CommentDto> comments)?> GetPostAsync(Guid callerId, int postId, CancellationToken ct = default)
    {
        var post = await _db.Posts.AsNoTracking()
            .Include(p => p.Author)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == postId, ct);
        if (post == null) return null;

        var likeCount = await _db.PostLikes.AsNoTracking().CountAsync(l => l.PostId == postId, ct);
        var likedByMe = await _db.PostLikes.AsNoTracking().AnyAsync(l => l.PostId == postId && l.UserId == callerId, ct);
        var commentCount = await _db.Comments.AsNoTracking().CountAsync(c => c.PostId == postId, ct);

        var dto = MapPost(post,
            new Dictionary<int, int> { [postId] = likeCount },
            likedByMe ? new HashSet<int> { postId } : new HashSet<int>(),
            new Dictionary<int, int> { [postId] = commentCount });

        var comments = await _db.Comments.AsNoTracking()
            .Include(c => c.Author)
            .Where(c => c.PostId == postId)
            .OrderBy(c => c.CreatedAt)
            .ToListAsync(ct);

        var roots = comments.Where(c => c.ParentCommentId == null)
            .Select(c => MapComment(c, comments))
            .ToList();

        return (dto, roots);
    }

    public async Task<List<PostDto>> SearchAsync(Guid callerId, SearchRequest request, CancellationToken ct = default)
    {
        var caller = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == callerId, ct);
        if (caller == null || !caller.BairroId.HasValue)
            return new List<PostDto>();

        var take = Math.Clamp(request.Take, 1, 50);
        var skip = Math.Max(request.Skip, 0);
        var q = (request.Q ?? string.Empty).Trim();

        var query = _db.Posts.AsNoTracking()
            .Include(p => p.Author)
            .Include(p => p.Images)
            .Where(p => p.BairroId == caller.BairroId.Value && p.IsPublished);

        if (!string.IsNullOrEmpty(q))
        {
            var safeQ = q.Replace("[", "[[]").Replace("%", "[%]").Replace("_", "[_]");
            query = query.Where(p => EF.Functions.Like(p.Body, "%" + safeQ + "%"));
        }
        if (request.Category.HasValue)
            query = query.Where(p => p.Category == request.Category.Value);
        if (request.From.HasValue)
            query = query.Where(p => p.CreatedAt >= request.From.Value);
        if (request.To.HasValue)
            query = query.Where(p => p.CreatedAt <= request.To.Value);
        if (request.AuthorId.HasValue)
            query = query.Where(p => p.AuthorId == request.AuthorId.Value);

        var rows = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

        var postIds = rows.Select(p => p.Id).ToList();
        var likeCounts = await _db.PostLikes.AsNoTracking()
            .Where(l => postIds.Contains(l.PostId))
            .GroupBy(l => l.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);
        var liked = await _db.PostLikes.AsNoTracking()
            .Where(l => postIds.Contains(l.PostId) && l.UserId == callerId)
            .Select(l => l.PostId).ToListAsync(ct);
        var likedSet = new HashSet<int>(liked);
        var commentCounts = await _db.Comments.AsNoTracking()
            .Where(c => postIds.Contains(c.PostId))
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PostId, x => x.Count, ct);

        return rows.Select(p => MapPost(p, likeCounts, likedSet, commentCounts)).ToList();
    }

    public async Task<List<PostDto>> GetTrendingAsync(Guid callerId, CancellationToken ct = default)
    {
        var caller = await _db.Users.AsNoTracking()
            .Where(u => u.Id == callerId)
            .Select(u => new { u.BairroId })
            .FirstOrDefaultAsync(ct);

        if (caller?.BairroId == null)
            return new List<PostDto>();

        var since = DateTime.UtcNow.AddDays(-7);

        // Project counts inline so EF can translate the score into SQL
        var rows = await _db.Posts.AsNoTracking()
            .Include(p => p.Author)
            .Include(p => p.Images)
            .Where(p => p.BairroId == caller.BairroId.Value
                     && p.IsPublished
                     && p.CreatedAt >= since)
            .Select(p => new
            {
                Post = p,
                LikeCount  = p.Likes.Count,
                CommentCount = p.Comments.Count(c => c.DeletedAt == null),
                Score = p.Likes.Count * 2 + p.Comments.Count(c => c.DeletedAt == null) * 3
            })
            .OrderByDescending(x => x.Score)
            .Take(10)
            .ToListAsync(ct);

        if (rows.Count == 0)
            return new List<PostDto>();

        var postIds = rows.Select(r => r.Post.Id).ToList();

        var likedByMe = await _db.PostLikes.AsNoTracking()
            .Where(l => postIds.Contains(l.PostId) && l.UserId == callerId)
            .Select(l => l.PostId)
            .ToListAsync(ct);
        var likedSet = new HashSet<int>(likedByMe);

        var likeCounts  = rows.ToDictionary(r => r.Post.Id, r => r.LikeCount);
        var commentCounts = rows.ToDictionary(r => r.Post.Id, r => r.CommentCount);

        return rows.Select(r => MapPost(r.Post, likeCounts, likedSet, commentCounts)).ToList();
    }

    public static PostDto MapPost(Post p, IReadOnlyDictionary<int, int> likeCounts, HashSet<int> likedSet, IReadOnlyDictionary<int, int> commentCounts)
    {
        return new PostDto
        {
            Id = p.Id,
            Author = new PostAuthorDto
            {
                Id = p.AuthorId,
                DisplayName = p.Author?.DisplayName,
                PhotoUrl = p.Author?.PhotoUrl,
                IsVerified = p.Author?.IsVerified ?? false,
                IsBusinessAccount = p.Author?.IsBusinessAccount ?? false,
                BusinessName = p.Author?.BusinessName,
                BusinessCategory = p.Author?.BusinessCategory,
            },
            BairroId = p.BairroId,
            Category = p.Category,
            Body = p.Body,
            Images = p.Images.OrderBy(i => i.Order).Select(i => new PostImageDto { Url = i.Url, Order = i.Order }).ToList(),
            LikeCount = likeCounts.TryGetValue(p.Id, out var lc) ? lc : 0,
            CommentCount = commentCounts.TryGetValue(p.Id, out var cc) ? cc : 0,
            LikedByMe = likedSet.Contains(p.Id),
            IsEdited = p.EditedAt.HasValue,
            CreatedAt = p.CreatedAt,
            EditedAt = p.EditedAt
        };
    }

    public static CommentDto MapComment(Comment c, List<Comment> all)
    {
        return new CommentDto
        {
            Id = c.Id,
            PostId = c.PostId,
            ParentCommentId = c.ParentCommentId,
            Author = new PostAuthorDto
            {
                Id = c.AuthorId,
                DisplayName = c.Author?.DisplayName,
                PhotoUrl = c.Author?.PhotoUrl,
                IsVerified = c.Author?.IsVerified ?? false,
                IsBusinessAccount = c.Author?.IsBusinessAccount ?? false,
                BusinessName = c.Author?.BusinessName,
                BusinessCategory = c.Author?.BusinessCategory,
            },
            Body = c.Body,
            CreatedAt = c.CreatedAt,
            EditedAt = c.EditedAt,
            Replies = all.Where(r => r.ParentCommentId == c.Id)
                .OrderBy(r => r.CreatedAt)
                .Select(r => MapComment(r, all))
                .ToList()
        };
    }
}
