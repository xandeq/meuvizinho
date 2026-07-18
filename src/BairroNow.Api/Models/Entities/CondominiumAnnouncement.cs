namespace BairroNow.Api.Models.Entities;

// Wave T — Comunicado oficial do síndico (mural do condomínio). Publicado por
// quem gerencia (síndico/admin) e lido pelos moradores aprovados. Sem enum de
// status: fixado/importante/expirado/apagado são bool + datas (mais simples que
// o fluxo de AreaReservation).
public class CondominiumAnnouncement
{
    public int Id { get; set; }
    public int CondominiumId { get; set; }
    public Condominium? Condominium { get; set; }

    public string Title { get; set; } = string.Empty;

    // nvarchar(max) — comunicado pode ser bem longo; o controller valida <= 20000 chars.
    public string Body { get; set; } = string.Empty;

    // Síndico ou admin que publicou.
    public Guid AuthorUserId { get; set; }
    public User? Author { get; set; }

    // Destaque visual/urgente + push prioritário.
    public bool IsImportant { get; set; }

    // Fixado no topo da listagem.
    public bool IsPinned { get; set; }

    // = CreatedAt na criação; coluna de ordenação da listagem.
    public DateTime PublishedAt { get; set; }

    // Expiração opcional (ex: aviso de obra). Null = nunca expira.
    public DateTime? ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Setado a cada edição; null se nunca editado.
    public DateTime? UpdatedAt { get; set; }

    // Soft delete (síndico apagou por engano fica recuperável). Null = ativo.
    public DateTime? DeletedAt { get; set; }
}
