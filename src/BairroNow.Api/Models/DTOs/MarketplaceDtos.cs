namespace BairroNow.Api.Models.DTOs;

public class CreateListingRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string CategoryCode { get; set; } = string.Empty;
    public string SubcategoryCode { get; set; } = string.Empty;
}

public class UpdateListingRequest
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public string? CategoryCode { get; set; }
    public string? SubcategoryCode { get; set; }
}

public class ListingPhotoDto
{
    public int Id { get; set; }
    public int OrderIndex { get; set; }
    public string Url { get; set; } = string.Empty;
    public string ThumbnailUrl { get; set; } = string.Empty;
}

public class ListingDto
{
    public int Id { get; set; }
    public Guid SellerId { get; set; }
    public string SellerDisplayName { get; set; } = string.Empty;
    public bool SellerIsVerified { get; set; }
    public int BairroId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string CategoryCode { get; set; } = string.Empty;
    public string SubcategoryCode { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTime CreatedAt { get; set; }
    public DateTime? SoldAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? DaysUntilExpiry { get; set; }
    public List<ListingPhotoDto> Photos { get; set; } = new();
    public int FavoriteCount { get; set; }
    public bool IsFavoritedByCurrentUser { get; set; }
}

public class ListingPageResult
{
    public List<ListingDto> Items { get; set; } = new();
    public string? NextCursor { get; set; }
}

public class CreateRatingRequest
{
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public int ListingId { get; set; }
}

public class RatingDto
{
    public int Id { get; set; }
    public Guid SellerId { get; set; }
    public Guid BuyerId { get; set; }
    public string? BuyerDisplayName { get; set; }
    public int ListingId { get; set; }
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SellerRatingsResponse
{
    public Guid SellerId { get; set; }
    public double Average { get; set; }
    public int Count { get; set; }
    public List<RatingDto> Ratings { get; set; } = new();
}

public class ReportListingRequest
{
    public BairroNow.Api.Models.Enums.ReportReason Reason { get; set; }
    public string? Note { get; set; }
}

public class CategoryDto
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public List<SubcategoryDto> Subcategories { get; set; } = new();
}

public class SubcategoryDto
{
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}

public class ToggleCategoryRequest
{
    public bool Enabled { get; set; }
}
