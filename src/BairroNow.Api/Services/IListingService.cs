using Microsoft.AspNetCore.Http;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Services;

public class ListingNotFoundException : Exception { public ListingNotFoundException(string m="Anúncio não encontrado.") : base(m) {} }
public class ListingForbiddenException : Exception { public ListingForbiddenException(string m) : base(m) {} }
public class ListingValidationException : Exception { public ListingValidationException(string m) : base(m) {} }

public interface IListingService
{
    Task<ListingDto> CreateAsync(Guid sellerId, CreateListingRequest dto, IFormFileCollection photos, CancellationToken ct = default);
    Task<ListingDto> UpdateAsync(Guid sellerId, int listingId, UpdateListingRequest dto, CancellationToken ct = default);
    Task<ListingDto> MarkSoldAsync(Guid sellerId, int listingId, CancellationToken ct = default);
    Task DeleteAsync(Guid sellerId, int listingId, CancellationToken ct = default);
    Task<ListingPageResult> GetBairroGridAsync(Guid currentUserId, int bairroId, string? category, decimal? minPrice, decimal? maxPrice, bool verifiedOnly, string? sort, string? cursor, int take, CancellationToken ct = default);
    Task<ListingPageResult> SearchAsync(Guid currentUserId, int bairroId, string q, string? category, decimal? minPrice, decimal? maxPrice, bool verifiedOnly, CancellationToken ct = default);
    Task<ListingDto?> GetByIdAsync(Guid currentUserId, int listingId, CancellationToken ct = default);
    Task<bool> ToggleFavoriteAsync(Guid userId, int listingId, CancellationToken ct = default);
    Task ReportAsync(Guid reporterId, int listingId, ReportListingRequest dto, CancellationToken ct = default);
    Task<ListingDto> RenewAsync(Guid sellerId, int listingId, CancellationToken ct = default);
}
