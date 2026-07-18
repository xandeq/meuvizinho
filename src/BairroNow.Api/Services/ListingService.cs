using System.Globalization;
using System.Text.RegularExpressions;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using BairroNow.Api.Constants;
using BairroNow.Api.Data;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Services;

// Phase 4 (04-01) Task 2 — combined Listings + Favorites + Reports service.
// Conventions follow existing PostService.cs (plain service class, no MediatR).
public class ListingService : IListingService
{
    private const int MaxPhotos = 6;
    private const int MinPhotos = 1;
    private static readonly TimeSpan SoldGracePeriod = TimeSpan.FromDays(7);
    private const string GridCacheKeyPrefix = "marketplace:grid:";

    private readonly AppDbContext _db;
    private readonly IFileStorageService _files;
    private readonly IValidator<CreateListingRequest> _createValidator;
    private readonly IValidator<UpdateListingRequest> _updateValidator;
    private readonly INotificationService _notifications;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ListingService> _logger;
    private readonly bool _fullTextEnabled;

    public ListingService(
        AppDbContext db,
        IFileStorageService files,
        IValidator<CreateListingRequest> createValidator,
        IValidator<UpdateListingRequest> updateValidator,
        INotificationService notifications,
        IMemoryCache cache,
        ILogger<ListingService> logger,
        IConfiguration configuration)
    {
        _db = db;
        _files = files;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _notifications = notifications;
        _cache = cache;
        _logger = logger;
        _fullTextEnabled = configuration.GetValue<bool>("Features:FullTextSearchEnabled");
    }

    public async Task<ListingDto> CreateAsync(Guid sellerId, CreateListingRequest dto, IFormFileCollection photos, CancellationToken ct = default)
    {
        var seller = await _db.Users.FirstOrDefaultAsync(u => u.Id == sellerId, ct)
            ?? throw new ListingForbiddenException("Usuário não encontrado.");
        if (!seller.IsVerified) throw new ListingForbiddenException("Apenas vizinhos verificados podem anunciar.");
        if (!seller.BairroId.HasValue) throw new ListingForbiddenException("Usuário sem bairro.");

        var validation = await _createValidator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            throw new ListingValidationException(string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        if (photos == null || photos.Count < MinPhotos)
            throw new ListingValidationException($"Mínimo {MinPhotos} foto.");
        if (photos.Count > MaxPhotos)
            throw new ListingValidationException($"Máximo {MaxPhotos} fotos.");

        var listing = new Listing
        {
            SellerId = sellerId,
            BairroId = seller.BairroId.Value,
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            Price = dto.Price,
            CategoryCode = dto.CategoryCode,
            SubcategoryCode = dto.SubcategoryCode,
            Status = ListingStatus.Active,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(30),
        };
        _db.Listings.Add(listing);
        await _db.SaveChangesAsync(ct);

        // Process photos SEQUENTIALLY (RESEARCH §Pitfall 8)
        int order = 0;
        foreach (var file in photos)
        {
            if (file.Length == 0) continue;
            using var stream = file.OpenReadStream();
            var url = await _files.SaveImageAsync(stream, file.FileName, file.ContentType, "listings", ct);
            // Use same path for thumbnail in MVP — FileStorageService already produces a single resized image.
            // Future enhancement: produce a real 400x400 crop. (Tracked in deferred-items.)
            _db.ListingPhotos.Add(new ListingPhoto
            {
                ListingId = listing.Id,
                OrderIndex = order++,
                StoragePath = url,
                ThumbnailPath = url,
                CreatedAt = DateTime.UtcNow,
            });
        }
        await _db.SaveChangesAsync(ct);

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "listing.create",
            EntityType = "Listing",
            EntityId = listing.Id.ToString(),
            UserId = sellerId,
            IpAddress = "system",
            Details = $"price={listing.Price}; photos={order}; cat={listing.CategoryCode}/{listing.SubcategoryCode}"
        });
        await _db.SaveChangesAsync(ct);
        InvalidateGridCache(seller.BairroId.Value);

        return await BuildDtoAsync(listing.Id, sellerId, ct) ?? throw new ListingNotFoundException();
    }

    public async Task<ListingDto> UpdateAsync(Guid sellerId, int listingId, UpdateListingRequest dto, CancellationToken ct = default)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new ListingNotFoundException();
        if (listing.SellerId != sellerId) throw new ListingForbiddenException("Apenas o vendedor pode editar.");
        if (listing.Status == ListingStatus.Removed)
            throw new ListingValidationException("Anúncios removidos não podem ser editados.");
        if (listing.Status == ListingStatus.Sold)
            throw new ListingValidationException("Anúncios vendidos não podem ser editados.");

        var validation = await _updateValidator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            throw new ListingValidationException(string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)));

        var oldPrice = listing.Price;
        if (dto.Title != null) listing.Title = dto.Title.Trim();
        if (dto.Description != null) listing.Description = dto.Description.Trim();
        if (dto.Price.HasValue) listing.Price = dto.Price.Value;
        if (dto.CategoryCode != null) listing.CategoryCode = dto.CategoryCode;
        if (dto.SubcategoryCode != null) listing.SubcategoryCode = dto.SubcategoryCode;
        listing.UpdatedAt = DateTime.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "listing.update",
            EntityType = "Listing",
            EntityId = listing.Id.ToString(),
            UserId = sellerId,
            IpAddress = "system",
            Details = $"oldPrice={oldPrice}; newPrice={listing.Price}"
        });

        await _db.SaveChangesAsync(ct);
        InvalidateGridCache(listing.BairroId);

        // MKT-009: notify favoriters only on price DECREASE while listing is active
        if (dto.Price.HasValue && dto.Price.Value < oldPrice && listing.Status == ListingStatus.Active)
        {
            var favoriterIds = await _db.ListingFavorites
                .Where(f => f.ListingId == listingId && f.UserId != sellerId)
                .Select(f => f.UserId)
                .ToListAsync(ct);
            foreach (var userId in favoriterIds)
            {
                try
                {
                    await _notifications.NotifyPriceDropAsync(userId, sellerId, listing.Title, listingId, oldPrice, listing.Price, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to notify favoriter {UserId} of price drop on listing {ListingId}", userId, listingId);
                }
            }
        }

        return await BuildDtoAsync(listing.Id, sellerId, ct) ?? throw new ListingNotFoundException();
    }

    public async Task<ListingDto> MarkSoldAsync(Guid sellerId, int listingId, CancellationToken ct = default)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new ListingNotFoundException();
        if (listing.SellerId != sellerId) throw new ListingForbiddenException("Apenas o vendedor pode marcar como vendido.");

        listing.Status = ListingStatus.Sold;
        listing.SoldAt = DateTime.UtcNow;
        listing.UpdatedAt = DateTime.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "listing.mark-sold",
            EntityType = "Listing",
            EntityId = listing.Id.ToString(),
            UserId = sellerId,
            IpAddress = "system"
        });

        await _db.SaveChangesAsync(ct);
        InvalidateGridCache(listing.BairroId);
        return await BuildDtoAsync(listing.Id, sellerId, ct) ?? throw new ListingNotFoundException();
    }

    public async Task<ListingDto> RenewAsync(Guid sellerId, int listingId, CancellationToken ct = default)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new ListingNotFoundException();
        if (listing.SellerId != sellerId) throw new ListingForbiddenException("Apenas o vendedor pode renovar.");
        if (listing.Status == ListingStatus.Sold || listing.Status == ListingStatus.Removed)
            throw new ListingValidationException("Anúncios vendidos ou removidos não podem ser renovados.");

        // Only allow renewal when ≤7 days remain (or already expired) — prevents padding a fresh listing to 60 days.
        if (listing.Status == ListingStatus.Active
            && listing.ExpiresAt.HasValue
            && listing.ExpiresAt.Value > DateTime.UtcNow.AddDays(7))
            throw new ListingValidationException("A renovação só é permitida com 7 dias ou menos de validade.");

        listing.ExpiresAt = DateTime.UtcNow.AddDays(30);
        if (listing.Status == ListingStatus.Expired)
            listing.Status = ListingStatus.Active;
        listing.UpdatedAt = DateTime.UtcNow;

        _db.AuditLogs.Add(new AuditLog
        {
            Action = "listing.renew",
            EntityType = "Listing",
            EntityId = listing.Id.ToString(),
            UserId = sellerId,
            IpAddress = "system",
            Details = $"newExpiresAt={listing.ExpiresAt:O}"
        });
        await _db.SaveChangesAsync(ct);
        InvalidateGridCache(listing.BairroId);
        return await BuildDtoAsync(listing.Id, sellerId, ct) ?? throw new ListingNotFoundException();
    }

    public async Task DeleteAsync(Guid sellerId, int listingId, CancellationToken ct = default)
    {
        var listing = await _db.Listings.FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new ListingNotFoundException();
        if (listing.SellerId != sellerId) throw new ListingForbiddenException("Apenas o vendedor pode remover.");
        listing.DeletedAt = DateTime.UtcNow;
        listing.Status = ListingStatus.Removed;
        _db.AuditLogs.Add(new AuditLog
        {
            Action = "listing.delete",
            EntityType = "Listing",
            EntityId = listing.Id.ToString(),
            UserId = sellerId,
            IpAddress = "system"
        });
        await _db.SaveChangesAsync(ct);
        InvalidateGridCache(listing.BairroId);
    }

    public async Task<ListingPageResult> GetBairroGridAsync(
        Guid currentUserId, int bairroId, string? category, decimal? minPrice, decimal? maxPrice,
        bool verifiedOnly, string? sort, string? cursor, int take, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 50);
        // Capture now as a local variable so EF Core translates it to a SQL parameter
        // instead of inlining the value — prevents query plan cache pollution.
        var now = DateTime.UtcNow;
        var graceCutoff = now.Subtract(SoldGracePeriod);

        var q = _db.Listings.AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Photos)
            .Where(l => l.BairroId == bairroId)
            .Where(l => (l.Status == ListingStatus.Active && (l.ExpiresAt == null || l.ExpiresAt > now))
                     || (l.Status == ListingStatus.Sold && l.SoldAt != null && l.SoldAt > graceCutoff));

        if (!string.IsNullOrWhiteSpace(category)) q = q.Where(l => l.CategoryCode == category);
        if (minPrice.HasValue) q = q.Where(l => l.Price >= minPrice.Value);
        if (maxPrice.HasValue) q = q.Where(l => l.Price <= maxPrice.Value);
        if (verifiedOnly) q = q.Where(l => l.Seller!.IsVerified);

        q = sort switch
        {
            "price_asc"  => q.OrderBy(l => l.Price).ThenByDescending(l => l.Id),
            "price_desc" => q.OrderByDescending(l => l.Price).ThenByDescending(l => l.Id),
            _            => q.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id),
        };

        if (!string.IsNullOrWhiteSpace(cursor) && int.TryParse(cursor, out var afterId))
            q = q.Where(l => l.Id < afterId);

        var rows = await q.Take(take + 1).ToListAsync(ct);
        var hasMore = rows.Count > take;
        var items = rows.Take(take).ToList();

        var ids = items.Select(l => l.Id).ToList();
        var favIds = await _db.ListingFavorites.AsNoTracking()
            .Where(f => f.UserId == currentUserId && ids.Contains(f.ListingId))
            .Select(f => f.ListingId)
            .ToListAsync(ct);
        var favCounts = await _db.ListingFavorites.AsNoTracking()
            .Where(f => ids.Contains(f.ListingId))
            .GroupBy(f => f.ListingId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Id, x => x.Count, ct);

        return new ListingPageResult
        {
            Items = items.Select(l => MapDto(l, favIds.Contains(l.Id), favCounts.GetValueOrDefault(l.Id, 0))).ToList(),
            NextCursor = hasMore ? items.Last().Id.ToString(CultureInfo.InvariantCulture) : null
        };
    }

    public async Task<ListingPageResult> SearchAsync(
        Guid currentUserId, int bairroId, string q,
        string? category, decimal? minPrice, decimal? maxPrice, bool verifiedOnly,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            throw new ListingValidationException("Termo de busca muito curto.");
        // Pitfall 6: sanitize. Reject if no word char; strip non-alphanumeric/space.
        var sanitized = Regex.Replace(q.Trim(), @"[^\p{L}\p{N}\s]", " ").Trim();
        if (sanitized.Length < 2 || !Regex.IsMatch(sanitized, @"\w"))
            throw new ListingValidationException("Termo de busca inválido.");

        // RESEARCH §Pattern 3: prefer SQL Server CONTAINS() when available, fall back to LIKE.
        // For LocalDB / non-FTS environments, fall back to LIKE so tests still pass.
        var now = DateTime.UtcNow;
        var graceCutoff = now.Subtract(SoldGracePeriod);
        IQueryable<Listing> baseQ = _db.Listings.AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Photos)
            .Where(l => l.BairroId == bairroId)
            .Where(l => (l.Status == ListingStatus.Active && (l.ExpiresAt == null || l.ExpiresAt > now))
                     || (l.Status == ListingStatus.Sold && l.SoldAt != null && l.SoldAt > graceCutoff));

        // FULLTEXT CATALOG ftListings + INDEX on (Title, Description) were created by
        // migration Phase4MarketplaceChat with suppressTransaction:true.
        // Features:FullTextSearchEnabled=false in Development (LIKE fallback for LocalDB/InMemory tests).
        // Features:FullTextSearchEnabled=true in Production (CONTAINS with prefix matching + stemming).
        // If the SQL Server instance doesn't have FTS installed (SERVERPROPERTY IsFullTextInstalled=0),
        // the migration created nothing; the catch block falls back to LIKE with a warning.
        if (_fullTextEnabled)
        {
            var ftsTerm = $"\"{sanitized}*\"";
            var ftsQ = baseQ.Where(l =>
                EF.Functions.Contains(EF.Property<string>(l, "Title"), ftsTerm) ||
                EF.Functions.Contains(EF.Property<string>(l, "Description"), ftsTerm));

            try
            {
                if (!string.IsNullOrWhiteSpace(category)) ftsQ = ftsQ.Where(l => l.CategoryCode == category);
                if (minPrice.HasValue) ftsQ = ftsQ.Where(l => l.Price >= minPrice.Value);
                if (maxPrice.HasValue) ftsQ = ftsQ.Where(l => l.Price <= maxPrice.Value);
                if (verifiedOnly) ftsQ = ftsQ.Where(l => l.Seller!.IsVerified);

                var ftsRows = await ftsQ.OrderByDescending(l => l.CreatedAt).Take(50).ToListAsync(ct);
                var ftsIds = ftsRows.Select(l => l.Id).ToList();
                var ftsFavs = await _db.ListingFavorites.AsNoTracking()
                    .Where(f => f.UserId == currentUserId && ftsIds.Contains(f.ListingId))
                    .Select(f => f.ListingId).ToListAsync(ct);
                return new ListingPageResult
                {
                    Items = ftsRows.Select(l => MapDto(l, ftsFavs.Contains(l.Id), 0)).ToList(),
                    NextCursor = null
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "FULLTEXT search failed (FTS may not be installed on this SQL Server instance). " +
                    "Falling back to LIKE. Set Features:FullTextSearchEnabled=false to suppress this warning.");
            }
        }

        // LIKE fallback: used in Development, tests, and as runtime fallback when FTS is unavailable.
        var like = $"%{sanitized}%";
        baseQ = baseQ.Where(l => EF.Functions.Like(l.Title, like) || EF.Functions.Like(l.Description, like));

        if (!string.IsNullOrWhiteSpace(category)) baseQ = baseQ.Where(l => l.CategoryCode == category);
        if (minPrice.HasValue) baseQ = baseQ.Where(l => l.Price >= minPrice.Value);
        if (maxPrice.HasValue) baseQ = baseQ.Where(l => l.Price <= maxPrice.Value);
        if (verifiedOnly) baseQ = baseQ.Where(l => l.Seller!.IsVerified);

        var rows = await baseQ.OrderByDescending(l => l.CreatedAt).Take(50).ToListAsync(ct);
        var ids = rows.Select(l => l.Id).ToList();
        var favIds = await _db.ListingFavorites.AsNoTracking()
            .Where(f => f.UserId == currentUserId && ids.Contains(f.ListingId))
            .Select(f => f.ListingId)
            .ToListAsync(ct);
        return new ListingPageResult
        {
            Items = rows.Select(l => MapDto(l, favIds.Contains(l.Id), 0)).ToList(),
            NextCursor = null
        };
    }

    public async Task<ListingDto?> GetByIdAsync(Guid currentUserId, int listingId, CancellationToken ct = default)
    {
        return await BuildDtoAsync(listingId, currentUserId, ct);
    }

    public async Task<bool> ToggleFavoriteAsync(Guid userId, int listingId, CancellationToken ct = default)
    {
        // Listing is read-only here — we only consume its Price below for the
        // snapshot. Tracking this entity just to read one column is pure cost.
        var listing = await _db.Listings.AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new ListingNotFoundException();

        // `existing` MUST stay tracked — it may be Remove()d.
        var existing = await _db.ListingFavorites
            .FirstOrDefaultAsync(f => f.ListingId == listingId && f.UserId == userId, ct);

        // Unfavoriting is always allowed (cleanup). Block only adding to expired/removed.
        if (existing != null)
        {
            _db.ListingFavorites.Remove(existing);
            await _db.SaveChangesAsync(ct);
            return false;
        }
        if (listing.Status == ListingStatus.Expired || listing.Status == ListingStatus.Removed)
            throw new ListingValidationException("Não é possível favoritar anúncios expirados ou removidos.");
        _db.ListingFavorites.Add(new ListingFavorite
        {
            ListingId = listingId,
            UserId = userId,
            SnapshotPrice = listing.Price,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task ReportAsync(Guid reporterId, int listingId, ReportListingRequest dto, CancellationToken ct = default)
    {
        var listing = await _db.Listings.AsNoTracking()
            .Select(l => new { l.Id, l.Status })
            .FirstOrDefaultAsync(l => l.Id == listingId, ct)
            ?? throw new ListingNotFoundException();
        if (listing.Status == ListingStatus.Expired || listing.Status == ListingStatus.Removed)
            throw new ListingForbiddenException("Não é possível denunciar anúncios expirados ou removidos.");
        // D-21: same Reports table, TargetType = "listing"
        _db.Reports.Add(new Report
        {
            ReporterId = reporterId,
            TargetType = ReportTargetTypes.Listing,
            TargetId = listingId,
            Reason = dto.Reason,
            Note = dto.Note,
            Status = ReportStatus.Pending,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
    }

    // ─── Helpers ───
    private async Task<ListingDto?> BuildDtoAsync(int listingId, Guid currentUserId, CancellationToken ct)
    {
        var listing = await _db.Listings.AsNoTracking()
            .Include(l => l.Seller)
            .Include(l => l.Photos)
            .FirstOrDefaultAsync(l => l.Id == listingId, ct);
        if (listing == null) return null;

        var favCount = await _db.ListingFavorites.CountAsync(f => f.ListingId == listingId, ct);
        var isFav = await _db.ListingFavorites.AnyAsync(f => f.ListingId == listingId && f.UserId == currentUserId, ct);
        return MapDto(listing, isFav, favCount);
    }

    private static ListingDto MapDto(Listing l, bool isFav, int favCount) => new()
    {
        Id = l.Id,
        SellerId = l.SellerId,
        SellerDisplayName = l.Seller?.DisplayName ?? string.Empty,
        SellerIsVerified = l.Seller?.IsVerified ?? false,
        SellerIsPremium = l.Seller?.Plan == Models.Enums.SubscriptionPlan.Premium,
        BairroId = l.BairroId,
        Title = l.Title,
        Description = l.Description,
        Price = l.Price,
        CategoryCode = l.CategoryCode,
        SubcategoryCode = l.SubcategoryCode,
        Status = l.Status,
        CreatedAt = l.CreatedAt,
        SoldAt = l.SoldAt,
        ExpiresAt = l.ExpiresAt,
        DaysUntilExpiry = l.ExpiresAt.HasValue
            ? (int?)Math.Max(0, (int)Math.Ceiling((l.ExpiresAt.Value - DateTime.UtcNow).TotalDays))
            : null,
        Photos = l.Photos.OrderBy(p => p.OrderIndex).Select(p => new ListingPhotoDto
        {
            Id = p.Id,
            OrderIndex = p.OrderIndex,
            Url = p.StoragePath,
            ThumbnailUrl = p.ThumbnailPath
        }).ToList(),
        FavoriteCount = favCount,
        IsFavoritedByCurrentUser = isFav,
    };

    private void InvalidateGridCache(int bairroId) => _cache.Remove(GridCacheKeyPrefix + bairroId);
}
