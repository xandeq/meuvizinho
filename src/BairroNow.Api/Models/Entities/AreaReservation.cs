using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Models.Entities;

// Reserva de uma área comum. Intervalo [StartUtc, EndUtc) sempre em UTC —
// o frontend converte para o fuso local na exibição.
public class AreaReservation
{
    public int Id { get; set; }
    public int CommonAreaId { get; set; }
    public CommonArea? CommonArea { get; set; }

    // Denormalizado: agenda/fila do síndico consulta por condomínio sem join extra.
    public int CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    // Motivo (ex: "Aniversário").
    public string? Title { get; set; }
    public int? GuestsCount { get; set; }

    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }

    public AreaReservationStatus Status { get; set; } = AreaReservationStatus.Pending;
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    public DateTime? CancelledAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
