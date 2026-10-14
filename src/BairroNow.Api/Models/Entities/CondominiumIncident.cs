using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Models.Entities;

// Wave U — Ocorrência do condomínio: o morador abre (lâmpada queimada, vazamento,
// barulho...) e o síndico acompanha até resolver. Tira o pedido do meio do grupo
// de WhatsApp e deixa histórico. Moradores veem só as próprias; a gestão vê todas.
public class CondominiumIncident
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    public Guid ReporterUserId { get; set; }
    public User? Reporter { get; set; }

    public CondominiumIncidentCategory Category { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Onde no prédio (ex.: "Garagem, vaga 12"). Opcional.
    public string? Location { get; set; }

    public CondominiumIncidentStatus Status { get; set; } = CondominiumIncidentStatus.Aberta;

    // Resposta do síndico/admin na última mudança de status.
    public string? ResponseNote { get; set; }
    public Guid? RespondedByUserId { get; set; }
    public User? RespondedBy { get; set; }
    public DateTime? RespondedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Preenchido ao entrar em Resolvida ou Recusada; limpo se reaberta.
    public DateTime? ClosedAt { get; set; }
}
