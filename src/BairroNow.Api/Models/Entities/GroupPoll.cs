namespace BairroNow.Api.Models.Entities;

public class GroupPoll
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public Group? Group { get; set; }
    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public string Question { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public bool IsClosed { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
    public ICollection<GroupPollOption> Options { get; set; } = new List<GroupPollOption>();
    public ICollection<GroupPollVote> Votes { get; set; } = new List<GroupPollVote>();
}
