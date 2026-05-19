namespace BairroNow.Api.Models.Entities;

public static class ListingStatus
{
    public const string Active = "active";
    public const string Sold = "sold";
    public const string Removed = "removed";
    public const string Expired = "expired";
}

public class Listing
{
    public int Id { get; set; }
    public Guid SellerId { get; set; }
    public User? Seller { get; set; }
    public int BairroId { get; set; }
    public Bairro? Bairro { get; set; }

    public string Title { get; set; } = string.Empty;       // max 120
    public string Description { get; set; } = string.Empty; // max 500 (D-09)
    public decimal Price { get; set; }                       // required (D-02)
    public string CategoryCode { get; set; } = string.Empty;
    public string SubcategoryCode { get; set; } = string.Empty;
    public string Status { get; set; } = ListingStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SoldAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? DeletedAt { get; set; }

    public ICollection<ListingPhoto> Photos { get; set; } = new List<ListingPhoto>();
}
