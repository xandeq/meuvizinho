namespace BairroNow.Api.Models.Entities;

// Área comum reservável de um condomínio (salão de festas, churrasqueira etc.).
// Janela diária (OpenTime/CloseTime) e antecedências limitam quando reservar;
// RequiresApproval decide se cada reserva passa pelo síndico ou é automática.
public class CommonArea
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Regras de uso exibidas antes de reservar.
    public string? Rules { get; set; }

    // Lotação máxima de pessoas (valida GuestsCount da reserva).
    public int? Capacity { get; set; }
    public string? CoverImageUrl { get; set; }

    // true = síndico aprova cada reserva; false = aprovação automática (sem conflito).
    public bool RequiresApproval { get; set; } = true;

    // Janela diária permitida (UTC). Null = sem restrição.
    public TimeOnly? OpenTime { get; set; }
    public TimeOnly? CloseTime { get; set; }

    public int MinAdvanceHours { get; set; }
    public int MaxAdvanceDays { get; set; } = 90;

    // Duração máxima por reserva; null = sem limite.
    public int? MaxDurationMinutes { get; set; }

    public bool IsActive { get; set; } = true;
    public Guid? CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<AreaReservation> Reservations { get; set; } = new List<AreaReservation>();
}
