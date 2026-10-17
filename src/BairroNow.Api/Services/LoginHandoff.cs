using System.Security.Cryptography;
using Microsoft.Extensions.Caching.Memory;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Services;

/// <summary>
/// Entrega da sessão depois de um redirect (link mágico, login com Google no site) sem pôr token na URL.
/// Antes o redirect levava ?token= (e o callback do Google, ?refresh= de 7 dias) — iam parar no histórico
/// do navegador, nos logs do Cloudflare e no Referer. Agora a URL leva um código de uso único que vale
/// 2 minutos e o site troca por XHR (POST /auth/exchange), que grava o cookie de refresh já na partição
/// do site (cookie Partitioned gravado na navegação direta à API ficava invisível para o site).
/// </summary>
public class LoginHandoff
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(2);
    private readonly IMemoryCache _cache;

    public LoginHandoff(IMemoryCache cache) => _cache = cache;

    public string Create(AuthResponse response, string refreshToken)
    {
        var code = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        _cache.Set(Key(code), (response, refreshToken), Lifetime);
        return code;
    }

    /// <summary>Uso único: o código some na primeira troca (válida ou não).</summary>
    public bool TryRedeem(string? code, out AuthResponse? response, out string? refreshToken)
    {
        response = null;
        refreshToken = null;
        if (string.IsNullOrWhiteSpace(code) || code.Length != 64) return false;
        var key = Key(code);
        if (!_cache.TryGetValue(key, out (AuthResponse Response, string Refresh) entry)) return false;
        _cache.Remove(key);
        response = entry.Response;
        refreshToken = entry.Refresh;
        return true;
    }

    private static string Key(string code) => "login-handoff:" + code;
}
