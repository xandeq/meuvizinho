using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Models.Entities;

// Wave Q — Alerta de segurança reportado por morador verificado do bairro.
// Moradores podem confirmar ("Eu também vi") via UpvoteCount.
// Admins podem resolver com nota de encerramento.
public class SecurityAlert
{
    public int Id { get; set; }
    public int BairroId { get; set; }
    public Bairro? Bairro { get; set; }

    public SecurityAlertKind Kind { get; set; }
    public string Description { get; set; } = string.Empty;

    // Geolocalização opcional (lat/lng do ponto do ocorrido).
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    // Descrição textual do local: "Rua das Flores, próximo ao mercado".
    public string? LocationDescription { get; set; }

    public SecurityAlertStatus Status { get; set; } = SecurityAlertStatus.Active;
    public string? ResolutionNote { get; set; }

    // "Eu também vi" — incremento atômico, sem entidade separada por simplicidade MVP.
    public int UpvoteCount { get; set; }

    public Guid? ReportedByUserId { get; set; }
    public User? ReportedByUser { get; set; }

    public Guid? ResolvedByUserId { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }
}
