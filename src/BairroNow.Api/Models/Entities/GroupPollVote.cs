namespace BairroNow.Api.Models.Entities;

public class GroupPollVote
{
    public int Id { get; set; }
    public int GroupPollId { get; set; }
    public GroupPoll? Poll { get; set; }
    public int GroupPollOptionId { get; set; }
    public GroupPollOption? Option { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
