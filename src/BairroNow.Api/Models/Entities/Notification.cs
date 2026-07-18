namespace BairroNow.Api.Models.Entities;

public static class NotificationTypes
{
    public const string Comment = "comment";
    public const string Reply = "reply";
    public const string Like = "like";
    public const string Mention = "mention";
    public const string GroupJoinApproved = "GroupJoinApproved"; // 16 chars — matches DB max
    public const string NewRating = "NewRating";
    public const string GroupEvent = "GroupEvent";               // group event created
    public const string ListingExpired = "listing_expired";      // 15 chars ✓ — seller alert
    public const string PriceDrop = "price_drop";                // 10 chars ✓ — favoriter alert
    public const string SecurityAlert = "security_alert";        // 14 chars ✓ — Wave R bairro alert
    public const string ResidentRequest = "res_request";         // 11 chars ✓ — Wave S: síndico, novo vínculo
    public const string ResidentReviewed = "res_reviewed";       // 12 chars ✓ — Wave S: morador, vínculo revisado
    public const string ReservationPending = "resv_pending";     // 12 chars ✓ — Wave S: síndico, reserva na fila
    public const string ReservationReviewed = "resv_reviewed";   // 13 chars ✓ — Wave S: morador, reserva revisada
}

public class Notification
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public string Type { get; set; } = NotificationTypes.Comment;
    public int? PostId { get; set; }
    public int? CommentId { get; set; }
    public int? GroupId { get; set; }
    public Guid ActorUserId { get; set; }
    public User? Actor { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
