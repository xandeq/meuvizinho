using System.Security.Claims;

namespace BairroNow.Api.Controllers.v1;

// Helper compartilhado de identidade (claim NameIdentifier/sub → Guid).
// Extraído do padrão repetido nos controllers de condomínio (Waves S/T).
public static class UserClaimsExtensions
{
    public static Guid? GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? user.FindFirst("sub")?.Value;
        return Guid.TryParse(sub, out var id) ? id : null;
    }
}
