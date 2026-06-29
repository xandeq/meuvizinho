namespace BairroNow.Api.Services;

public interface INotificationService
{
    Task NotifyCommentAsync(Guid recipientId, Guid actorId, int postId, int commentId, CancellationToken ct = default);
    Task NotifyReplyAsync(Guid recipientId, Guid actorId, int postId, int commentId, CancellationToken ct = default);
    Task NotifyLikeAsync(Guid recipientId, Guid actorId, int postId, CancellationToken ct = default);
    Task NotifyMentionAsync(Guid recipientId, Guid actorId, int postId, int? commentId, CancellationToken ct = default);

    // Wave I notifications
    Task NotifyGroupJoinApprovedAsync(Guid recipientId, string groupName, int groupId, CancellationToken ct = default);
    Task NotifyNewRatingAsync(Guid businessOwnerId, string raterName, int stars, CancellationToken ct = default);
    Task NotifyGroupEventCreatedAsync(int groupId, Guid creatorId, string eventTitle, int eventId, CancellationToken ct = default);

    // Wave N: marketplace seller + favoriter alerts
    Task NotifyListingExpiredAsync(Guid sellerId, string listingTitle, int listingId, CancellationToken ct = default);
    Task NotifyPriceDropAsync(Guid favoriterId, Guid sellerId, string listingTitle, int listingId, decimal oldPrice, decimal newPrice, CancellationToken ct = default);

    // Wave P: DM push — fired when recipient is offline (not in SignalR conv room)
    Task NotifyNewMessageAsync(Guid recipientId, Guid senderId, int conversationId, CancellationToken ct = default);

    // Wave R: security alert broadcast to all verified bairro residents
    Task NotifySecurityAlertAsync(int bairroId, Guid reporterUserId, int alertId, string kindLabel, string description, CancellationToken ct = default);
}
