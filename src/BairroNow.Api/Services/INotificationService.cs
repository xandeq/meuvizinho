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

    // Wave S: reserva de áreas comuns — vínculo de morador + fluxo de aprovação
    Task NotifyResidentRequestAsync(Guid sindicoId, Guid requesterId, int condominiumId, string condominiumName, CancellationToken ct = default);
    Task NotifyResidentReviewedAsync(Guid residentUserId, Guid reviewerId, int condominiumId, string condominiumName, string statusLabel, CancellationToken ct = default);
    Task NotifyReservationPendingAsync(Guid sindicoId, Guid requesterId, int condominiumId, string areaName, CancellationToken ct = default);
    Task NotifyReservationReviewedAsync(Guid ownerUserId, Guid reviewerId, int condominiumId, string areaName, bool approved, CancellationToken ct = default);

    // Wave T: comunicado oficial publicado — batch para todos os moradores aprovados
    Task NotifyAnnouncementPublishedAsync(int condominiumId, Guid authorId, int announcementId, string title, string condominiumName, bool isImportant, CancellationToken ct = default);
}
