using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;

namespace BairroNow.Api.Services;

// ViaCEP primary + brasilapi.com.br fallback.
public class CepLookupService : ICepLookupService
{
    private readonly HttpClient _http;
    private readonly IMemoryCache _cache;
    private readonly IBairroService _bairroService;
    private readonly ILogger<CepLookupService> _logger;

    public CepLookupService(HttpClient http, IMemoryCache cache, IBairroService bairroService, ILogger<CepLookupService> logger)
    {
        _http = http;
        _cache = cache;
        _bairroService = bairroService;
        _logger = logger;
    }

    public async Task<CepLookupResult> LookupAsync(string cep, CancellationToken ct = default)
    {
        var digits = Regex.Replace(cep ?? string.Empty, @"\D", "");
        if (digits.Length != 8)
            throw new CepNotFoundException(cep ?? "");

        var cacheKey = $"cep:{digits}";
        if (_cache.TryGetValue<CepLookupResult>(cacheKey, out var cached) && cached != null)
            return cached;

        CepLookupResult? result = null;

        // ViaCEP - primary
        try
        {
            var viaResp = await _http.GetAsync($"https://viacep.com.br/ws/{digits}/json/", ct);
            if (viaResp.IsSuccessStatusCode)
            {
                using var stream = await viaResp.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                if (!doc.RootElement.TryGetProperty("erro", out _))
                {
                    result = new CepLookupResult
                    {
                        Cep = doc.RootElement.TryGetProperty("cep", out var c) ? c.GetString() ?? digits : digits,
                        Logradouro = doc.RootElement.TryGetProperty("logradouro", out var l) ? l.GetString() ?? "" : "",
                        Bairro = doc.RootElement.TryGetProperty("bairro", out var b) ? b.GetString() ?? "" : "",
                        Localidade = doc.RootElement.TryGetProperty("localidade", out var loc) ? loc.GetString() ?? "" : "",
                        Uf = doc.RootElement.TryGetProperty("uf", out var uf) ? uf.GetString() ?? "" : "",
                    };
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ViaCEP lookup failed for {Cep}, falling back to BrasilAPI", digits);
        }

        // brasilapi.com.br - fallback
        if (result == null)
        {
            try
            {
                var brResp = await _http.GetAsync($"https://brasilapi.com.br/api/cep/v2/{digits}", ct);
                if (brResp.IsSuccessStatusCode)
                {
                    using var stream = await brResp.Content.ReadAsStreamAsync(ct);
                    using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
                    result = new CepLookupResult
                    {
                        Cep = digits,
                        Logradouro = doc.RootElement.TryGetProperty("street", out var s) ? s.GetString() ?? "" : "",
                        Bairro = doc.RootElement.TryGetProperty("neighborhood", out var n) ? n.GetString() ?? "" : "",
                        Localidade = doc.RootElement.TryGetProperty("city", out var ci) ? ci.GetString() ?? "" : "",
                        Uf = doc.RootElement.TryGetProperty("state", out var st) ? st.GetString() ?? "" : "",
                    };
                    if (doc.RootElement.TryGetProperty("location", out var locEl) &&
                        locEl.TryGetProperty("coordinates", out var coord))
                    {
                        if (coord.TryGetProperty("latitude", out var latEl) && double.TryParse(latEl.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lat))
                            result.Lat = lat;
                        if (coord.TryGetProperty("longitude", out var lngEl) && double.TryParse(lngEl.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lng))
                            result.Lng = lng;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "BrasilAPI lookup failed for {Cep}", digits);
            }
        }

        if (result == null)
            throw new CepNotFoundException(digits);

        // ViaCEP (primary) never returns coordinates. Enrich with BrasilAPI just for lat/lng
        // when we resolved via ViaCEP — best-effort, never overrides address fields already set.
        if (result.Lat == null || result.Lng == null)
        {
            try
            {
                var geoResp = await _http.GetAsync($"https://brasilapi.com.br/api/cep/v2/{digits}", ct);
                if (geoResp.IsSuccessStatusCode)
                {
                    using var geoStream = await geoResp.Content.ReadAsStreamAsync(ct);
                    using var geoDoc = await JsonDocument.ParseAsync(geoStream, cancellationToken: ct);
                    if (geoDoc.RootElement.TryGetProperty("location", out var locEl) &&
                        locEl.TryGetProperty("coordinates", out var coord))
                    {
                        if (coord.TryGetProperty("latitude", out var latEl) && double.TryParse(latEl.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lat))
                            result.Lat = lat;
                        if (coord.TryGetProperty("longitude", out var lngEl) && double.TryParse(lngEl.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var lng))
                            result.Lng = lng;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "BrasilAPI coordinate enrichment failed for {Cep}", digits);
            }
        }

        // Match bairro in our DB
        var matched = await _bairroService.MatchBairroAsync(result.Bairro, result.Localidade, result.Uf, ct);
        if (matched != null)
        {
            result.BairroId = matched.Id;
            result.BairroNome = matched.Nome;
        }

        _cache.Set(cacheKey, result, TimeSpan.FromHours(24));
        return result;
    }
}
