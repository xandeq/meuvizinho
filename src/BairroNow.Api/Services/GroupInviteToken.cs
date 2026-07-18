using System.Security.Cryptography;
using System.Text;

namespace BairroNow.Api.Services;

/// <summary>
/// Tokens de convite de grupo stateless (HMAC-SHA256 sobre "groupId|expiry"),
/// assinados com o Jwt:Key — sem tabela nova nem migration. Convite dá entrada
/// direta (Active) mesmo em grupo fechado; validade padrão 7 dias.
/// Sem revogação individual (aceitável: expiram sozinhos).
/// </summary>
public static class GroupInviteToken
{
    public static readonly TimeSpan DefaultLifetime = TimeSpan.FromDays(7);

    public static string Create(int groupId, DateTime expiresAtUtc, string secret)
    {
        var payload = $"{groupId}|{new DateTimeOffset(expiresAtUtc).ToUnixTimeSeconds()}";
        var sig = Sign(payload, secret);
        return Base64UrlEncode($"{payload}|{sig}");
    }

    public static bool TryValidate(string? token, string secret, DateTime nowUtc, out int groupId)
    {
        groupId = 0;
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrEmpty(secret))
            return false;

        string decoded;
        try { decoded = Base64UrlDecode(token.Trim()); }
        catch { return false; }

        var parts = decoded.Split('|');
        if (parts.Length != 3) return false;
        if (!int.TryParse(parts[0], out var gid) || gid <= 0) return false;
        if (!long.TryParse(parts[1], out var expUnix)) return false;

        var expected = Sign($"{parts[0]}|{parts[1]}", secret);
        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(expected),
                Encoding.ASCII.GetBytes(parts[2])))
            return false;

        if (DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime < nowUtc)
            return false;

        groupId = gid;
        return true;
    }

    private static string Sign(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
    }

    private static string Base64UrlEncode(string s) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(s)).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Base64UrlDecode(string s)
    {
        var b64 = s.Replace('-', '+').Replace('_', '/');
        b64 = b64.PadRight(b64.Length + (4 - b64.Length % 4) % 4, '=');
        return Encoding.UTF8.GetString(Convert.FromBase64String(b64));
    }
}
