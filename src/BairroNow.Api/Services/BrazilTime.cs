namespace BairroNow.Api.Services;

// Horário de Brasília para regras que o usuário digita em hora local
// (ex.: janela de funcionamento de área comum "08:00–22:00").
// O Brasil não tem horário de verão desde 2019, então o fallback fixo em UTC-3 é exato.
public static class BrazilTime
{
    private static readonly TimeZoneInfo Zone = Resolve();

    private static TimeZoneInfo Resolve()
    {
        // IANA (Linux/CI e Windows com ICU) e id Windows (IIS da SmarterASP).
        foreach (var id in new[] { "America/Sao_Paulo", "E. South America Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        return TimeZoneInfo.CreateCustomTimeZone("BRT", TimeSpan.FromHours(-3), "Brasília", "Brasília");
    }

    public static DateTime FromUtc(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);
}
