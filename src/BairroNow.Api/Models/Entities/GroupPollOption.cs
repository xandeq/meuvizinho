namespace BairroNow.Api.Models.Entities;

public class GroupPollOption
{
    public int Id { get; set; }
    public int GroupPollId { get; set; }
    public GroupPoll? Poll { get; set; }
    public string Text { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public ICollection<GroupPollVote> Votes { get; set; } = new List<GroupPollVote>();
}
