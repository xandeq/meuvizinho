namespace BairroNow.Api.Models.DTOs;

public class MessageDto
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string? Text { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime SentAt { get; set; }
}

public class ConversationDto
{
    public int Id { get; set; }
    public int? ListingId { get; set; }
    public string? ListingTitle { get; set; }
    public string? ListingThumbnailUrl { get; set; }
    public Guid OtherUserId { get; set; }
    public string? OtherUserDisplayName { get; set; }
    public string? OtherUserPhotoUrl { get; set; }
    public bool OtherUserIsVerified { get; set; }
    public DateTime LastMessageAt { get; set; }
    public int UnreadCount { get; set; }
}

public class CreateConversationRequest
{
    public int ListingId { get; set; }
}

public class SendMessageRequest
{
    public string? Text { get; set; }
}

public class UnreadCountResponse
{
    public int Total { get; set; }
}
