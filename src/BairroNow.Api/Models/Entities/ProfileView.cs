namespace BairroNow.Api.Models.Entities;

public class ProfileView
{
    public int Id { get; set; }
    public Guid BusinessUserId { get; set; }
    public User? BusinessUser { get; set; }
    public string? ViewerIp { get; set; }
    public Guid? ViewerUserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}
