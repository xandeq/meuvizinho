using Xunit;

namespace BairroNow.Api.Tests.SqlServer;

/// <summary>
/// Teste que só faz sentido contra SQL Server de verdade (SQL cru, CAS de concorrência, índices únicos —
/// coisas que o EF InMemory ignora). Sem MV_SQL_TEST_SERVER configurado o teste aparece como PULADO
/// (nunca como um "passou" falso). No CI roda num passo próprio, depois que o SQL Server sobe.
/// Ex. local: MV_SQL_TEST_SERVER="Server=(localdb)\MSSQLLocalDB;Trusted_Connection=True;TrustServerCertificate=True"
/// </summary>
public sealed class SqlServerFactAttribute : FactAttribute
{
    public const string EnvVar = "MV_SQL_TEST_SERVER";

    public SqlServerFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(EnvVar)))
            Skip = $"Requer SQL Server real ({EnvVar}).";
    }
}
