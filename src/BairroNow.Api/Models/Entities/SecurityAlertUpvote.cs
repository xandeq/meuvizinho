namespace BairroNow.Api.Models.Entities;

/// <summary>"Eu também vi" de um morador num alerta. Único por (alerta, usuário):
/// antes o contador só somava e uma pessoa inflava "N confirmaram" sem limite.</summary>
public class SecurityAlertUpvote
{
    public int Id { get; set; }
    public int SecurityAlertId { get; set; }
    public SecurityAlert? SecurityAlert { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
