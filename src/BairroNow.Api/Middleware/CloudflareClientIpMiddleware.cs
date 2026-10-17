using System.Net;

namespace BairroNow.Api.Middleware;

/// <summary>
/// A API fica atrás do proxy do Cloudflare: o IP da conexão é o da borda do Cloudflare, não o do usuário.
/// Sem isto o rate limiter "public" (login, cadastro, esqueci a senha) contava todos os usuários de uma
/// mesma borda juntos — um atacante esgotava a cota e travava o login de todo mundo — e os logs gravavam
/// o IP errado. O cabeçalho CF-Connecting-IP só é aceito quando a conexão vem de fato de um IP do
/// Cloudflare; quem bate direto na origem não consegue forjá-lo para fugir do limite.
/// </summary>
public class CloudflareClientIpMiddleware
{
    // https://www.cloudflare.com/ips/ (mudam raramente; conferido em 17/10/2026)
    private static readonly System.Net.IPNetwork[] CloudflareRanges =
    [
        .. new[]
        {
            "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
            "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
            "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
            "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32", "2405:8100::/32",
            "2a06:98c0::/29", "2c0f:f248::/32",
        }.Select(System.Net.IPNetwork.Parse)
    ];

    private readonly RequestDelegate _next;

    public CloudflareClientIpMiddleware(RequestDelegate next) => _next = next;

    public Task InvokeAsync(HttpContext context)
    {
        var remote = context.Connection.RemoteIpAddress;
        if (remote != null && IsCloudflare(remote) &&
            IPAddress.TryParse(context.Request.Headers["CF-Connecting-IP"].ToString(), out var client))
        {
            context.Connection.RemoteIpAddress = client;
        }
        return _next(context);
    }

    internal static bool IsCloudflare(IPAddress ip)
    {
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        foreach (var range in CloudflareRanges)
            if (range.Contains(ip)) return true;
        return false;
    }
}
