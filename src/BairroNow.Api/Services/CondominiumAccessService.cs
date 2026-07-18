using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;

namespace BairroNow.Api.Services;

// Contexto de acesso do usuário ao condomínio: síndico, admin ou morador aprovado.
// Extraído de CondominiumReservationsController (Wave S) para ser compartilhado
// com CondominiumAnnouncementsController (Wave T) — uma única fonte da lógica.
public sealed record CondoAccess(Condominium Condo, bool IsSindico, bool IsAdmin, bool IsApprovedResident)
{
    public bool CanManage => IsSindico || IsAdmin;
    public bool CanUse => IsApprovedResident || IsSindico || IsAdmin;
}

public interface ICondominiumAccessService
{
    // Null quando o condomínio não existe (ou foi soft-deleted) — mapear para 404.
    Task<CondoAccess?> LoadAccessAsync(int condominiumId, Guid userId, CancellationToken ct = default);
}

public class CondominiumAccessService : ICondominiumAccessService
{
    private readonly AppDbContext _db;

    public CondominiumAccessService(AppDbContext db) => _db = db;

    public async Task<CondoAccess?> LoadAccessAsync(int condominiumId, Guid userId, CancellationToken ct = default)
    {
        var condo = await _db.Condominiums.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == condominiumId && c.DeletedAt == null, ct);
        if (condo == null) return null;

        var isAdmin = await _db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.IsAdmin)
            .FirstOrDefaultAsync(ct);
        var isSindico = condo.SindicoUserId == userId;
        var isApprovedResident = await _db.CondominiumResidents.AsNoTracking()
            .AnyAsync(r => r.CondominiumId == condominiumId && r.UserId == userId
                        && r.Status == CondominiumResidentStatus.Approved, ct);

        return new CondoAccess(condo, isSindico, isAdmin, isApprovedResident);
    }

    // 403 com dica de próximo passo para quem ainda não é morador aprovado.
    // (Idêntico ao StatusCode(403, ...) que o controller de reservas produzia.)
    public static ObjectResult ForbidWithHint() =>
        new(new { error = "Apenas moradores aprovados podem acessar. Solicite seu vínculo de morador ao condomínio." })
        { StatusCode = StatusCodes.Status403Forbidden };
}
