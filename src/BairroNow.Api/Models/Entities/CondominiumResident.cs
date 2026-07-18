using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Models.Entities;

// Vínculo verificado morador↔condomínio (espelha o padrão de CondominiumClaim):
// o usuário solicita informando sua unidade e o síndico (ou admin, quando o
// condomínio não foi reivindicado) aprova. Só Approved pode reservar áreas comuns.
// Sem DeletedAt de propósito — revogação usa Status=Revoked para manter histórico.
public class CondominiumResident
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    // Unidade informada pelo morador (ex: "Bloco B, Apto 302").
    public string? Unit { get; set; }

    public CondominiumResidentStatus Status { get; set; } = CondominiumResidentStatus.Pending;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
