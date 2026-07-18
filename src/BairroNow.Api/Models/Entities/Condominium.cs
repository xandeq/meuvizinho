using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Models.Entities;

// Perfil de um condomínio/prédio, escopado a um bairro. Pode ser reivindicado
// por um síndico. O WhatsApp comercial (@meuvizinho) permanece admin dos grupos
// mesmo após a reivindicação — IsManagedByPlatform marca isso.
public class Condominium
{
    public int Id { get; set; }
    public int BairroId { get; set; }
    public Bairro? Bairro { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? AddressLine { get; set; }
    public string? Cep { get; set; }
    public string? CoverImageUrl { get; set; }
    public int? UnitsCount { get; set; }
    public CondominiumStatus Status { get; set; } = CondominiumStatus.Unclaimed;

    // Síndico que assumiu o perfil (transferência de controle).
    public Guid? SindicoUserId { get; set; }
    public User? SindicoUser { get; set; }
    public CondominiumRole? SindicoRole { get; set; }

    // Quem cadastrou (admin/plataforma normalmente).
    public Guid? CreatedByUserId { get; set; }

    // True quando o número comercial @meuvizinho é o admin do WhatsApp do condomínio.
    public bool IsManagedByPlatform { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<WhatsAppGroup> WhatsAppGroups { get; set; } = new List<WhatsAppGroup>();
    public ICollection<CondominiumClaim> Claims { get; set; } = new List<CondominiumClaim>();
    public ICollection<CondominiumResident> Residents { get; set; } = new List<CondominiumResident>();
    public ICollection<CommonArea> CommonAreas { get; set; } = new List<CommonArea>();
    public ICollection<CondominiumAnnouncement> Announcements { get; set; } = new List<CondominiumAnnouncement>();
}
