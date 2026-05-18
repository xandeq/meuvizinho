namespace BairroNow.Api.Models.Entities;

public class Conversation
{
    public int Id { get; set; }
    public int? ListingId { get; set; }
    public Listing? Listing { get; set; }
    public Guid BuyerId { get; set; }
    public User? Buyer { get; set; }
    public Guid SellerId { get; set; }
    public User? Seller { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;

    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
