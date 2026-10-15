using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace BairroNow.Api.Services;

// Singleton, deterministic, in-memory pt-BR offensive word filter.
// Whole-word case-insensitive matching with diacritics-stripped comparison.
public class OffensiveWordFilter : IOffensiveWordFilter
{
    private static readonly string[] Wordlist = new[]
    {
        // Fora da lista (falsos positivos num app de bairro): "lixo" (coleta), "macaco" (do carro),
        // "racista" (quem denuncia racismo), "aborto" e "feia" (uso neutro comum).
        "idiota", "imbecil", "burro", "otario", "filho da puta", "fdp",
        "puta", "merda", "caralho", "porra", "cu", "viado", "retardado", "retardada",
        "preto safado", "nigger", "nazi", "nazista", "hitler",
        "bicha", "sapatao", "gorda nojenta", "mongoloide",
        "vagabunda", "corno"
    };

    private readonly Regex _regex;

    public OffensiveWordFilter()
    {
        // Build a single regex with whole-word boundaries. Multi-word phrases use \s+.
        var alternates = Wordlist
            .Select(w => string.Join(@"\s+", w.Split(' ').Select(Regex.Escape)))
            .ToArray();
        var pattern = @"(?<![\p{L}\p{N}])(" + string.Join("|", alternates) + @")(?![\p{L}\p{N}])";
        _regex = new Regex(pattern, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.Compiled);
    }

    public bool Contains(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var normalized = StripDiacritics(text);
        return _regex.IsMatch(normalized);
    }

    public string[] FindMatches(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return Array.Empty<string>();
        var normalized = StripDiacritics(text);
        return _regex.Matches(normalized)
            .Select(m => m.Value.ToLowerInvariant())
            .Distinct()
            .ToArray();
    }

    private static string StripDiacritics(string s)
    {
        var formD = s.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(formD.Length);
        foreach (var ch in formD)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC);
    }
}
