using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;

namespace BairroNow.Api.Controllers.v1;

/// <summary>
/// Prévia pública dos links "Compartilhar no WhatsApp" (/p/{id} e /m/{id}). Os endpoints normais
/// exigem login e quem recebia o link caía no login ou em "não encontrado". Devolve só o mínimo:
/// primeiro nome do autor, bairro, texto curto — nada de contato, endereço ou comentários.
/// </summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class SharePreviewController : ControllerBase
{
    private const int MaxText = 400;
    private readonly AppDbContext _db;

    public SharePreviewController(AppDbContext db) => _db = db;

    [HttpGet("/api/v1/share/posts/{id:int}")]
    public async Task<IActionResult> Post(int id, CancellationToken ct)
    {
        var p = await _db.Posts.AsNoTracking()
            .Where(x => x.Id == id && x.DeletedAt == null && x.IsPublished && !x.IsFlagged && !x.RestrictedToVerified)
            .Select(x => new
            {
                x.Id,
                x.Body,
                x.CreatedAt,
                LikeCount = x.Likes.Count,
                CommentCount = x.Comments.Count(c => c.DeletedAt == null),
                AuthorName = x.Author != null ? x.Author.DisplayName : null,
                AuthorVerified = x.Author != null && x.Author.IsVerified,
                Bairro = x.Bairro != null ? x.Bairro.Nome : null,
                Image = x.Images.OrderBy(i => i.Order).Select(i => i.Url).FirstOrDefault(),
            })
            .FirstOrDefaultAsync(ct);
        if (p == null) return NotFound();

        return Ok(new
        {
            p.Id,
            Content = Truncate(p.Body),
            p.CreatedAt,
            p.LikeCount,
            p.CommentCount,
            ImageUrl = p.Image,
            Author = new { Name = FirstName(p.AuthorName), Bairro = p.Bairro ?? "", Verified = p.AuthorVerified },
        });
    }

    [HttpGet("/api/v1/share/listings/{id:int}")]
    public async Task<IActionResult> Listing(int id, CancellationToken ct)
    {
        var l = await _db.Listings.AsNoTracking()
            .Where(x => x.Id == id && x.DeletedAt == null && x.Status != ListingStatus.Removed)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.Description,
                x.Price,
                x.Status,
                x.CreatedAt,
                x.ExpiresAt,
                SellerName = x.Seller != null ? x.Seller.DisplayName : null,
                SellerVerified = x.Seller != null && x.Seller.IsVerified,
                Bairro = x.Bairro != null ? x.Bairro.Nome : null,
                Photos = x.Photos.OrderBy(ph => ph.OrderIndex).Select(ph => new { Url = ph.StoragePath, ThumbnailUrl = ph.ThumbnailPath }).Take(4).ToList(),
            })
            .FirstOrDefaultAsync(ct);
        if (l == null) return NotFound();

        return Ok(new
        {
            l.Id,
            l.Title,
            Description = Truncate(l.Description),
            l.Price,
            l.Status,
            l.CreatedAt,
            l.ExpiresAt,
            DaysUntilExpiry = l.ExpiresAt.HasValue ? (int?)Math.Max(0, (int)Math.Ceiling((l.ExpiresAt.Value - DateTime.UtcNow).TotalDays)) : null,
            SellerDisplayName = FirstName(l.SellerName),
            SellerIsVerified = l.SellerVerified,
            l.Bairro,
            l.Photos,
        });
    }

    private static string Truncate(string s) => s.Length <= MaxText ? s : s[..MaxText].TrimEnd() + "…";

    // Página aberta a qualquer um: só o primeiro nome.
    private static string FirstName(string? name) =>
        string.IsNullOrWhiteSpace(name) ? "Vizinho" : name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries)[0];
}
