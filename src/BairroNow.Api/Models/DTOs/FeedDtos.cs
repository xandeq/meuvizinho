using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Models.DTOs;

public class PostImageDto
{
    public string Url { get; set; } = string.Empty;
    public int Order { get; set; }
}

public class PostAuthorDto
{
    public Guid Id { get; set; }
    public string? DisplayName { get; set; }
    public string? PhotoUrl { get; set; }
    public bool IsVerified { get; set; }
    // Wave E: business author
    public bool IsBusinessAccount { get; set; }
    public string? BusinessName { get; set; }
    public string? BusinessCategory { get; set; }
}

public class PostDto
{
    public int Id { get; set; }
    public PostAuthorDto Author { get; set; } = new();
    public int BairroId { get; set; }
    public PostCategory Category { get; set; }
    public string Body { get; set; } = string.Empty;
    public List<PostImageDto> Images { get; set; } = new();
    public int LikeCount { get; set; }
    public int CommentCount { get; set; }
    public bool LikedByMe { get; set; }
    public bool IsEdited { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
}

public class CreatePostRequest
{
    public PostCategory Category { get; set; }
    public string Body { get; set; } = string.Empty;
}

public class UpdatePostRequest
{
    public string Body { get; set; } = string.Empty;
}

public class FeedPageDto
{
    public List<PostDto> Items { get; set; } = new();
    public string? NextCursor { get; set; }
}

public class CommentDto
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public int? ParentCommentId { get; set; }
    public PostAuthorDto Author { get; set; } = new();
    public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public List<CommentDto> Replies { get; set; } = new();
}

public class CreateCommentRequest
{
    public int PostId { get; set; }
    public int? ParentCommentId { get; set; }
    public string Body { get; set; } = string.Empty;
}

public class UpdateCommentRequest
{
    public string Body { get; set; } = string.Empty;
}

public class CreateReportRequest
{
    public string TargetType { get; set; } = "post";
    public int TargetId { get; set; }
    public ReportReason Reason { get; set; }
    public string? Note { get; set; }
}

public class ReportDto
{
    public int Id { get; set; }
    public string TargetType { get; set; } = string.Empty;
    public int TargetId { get; set; }
    public ReportReason Reason { get; set; }
    public string? Note { get; set; }
    public string ReporterEmail { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = "pending";
    public string? AuthorUserId { get; set; }
}

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public int? GroupId { get; set; }
    public PostAuthorDto Actor { get; set; } = new();
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SearchRequest
{
    public string Q { get; set; } = string.Empty;
    public PostCategory? Category { get; set; }
    public DateTime? From { get; set; }
    public DateTime? To { get; set; }
    public Guid? AuthorId { get; set; }
    public int Skip { get; set; } = 0;
    public int Take { get; set; } = 20;
}

public class LikeToggleResult
{
    public bool Liked { get; set; }
    public int Count { get; set; }
}

public class ResolveReportRequest
{
    public string Action { get; set; } = "dismiss"; // dismiss | remove
    public string? Reason { get; set; }
}
