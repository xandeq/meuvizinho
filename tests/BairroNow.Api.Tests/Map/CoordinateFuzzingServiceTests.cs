using BairroNow.Api.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace BairroNow.Api.Tests.Map;

[Trait("Category", "Unit")]
public class CoordinateFuzzingServiceTests
{
    private const string Key = "chave-de-teste-com-tamanho-suficiente-para-hmac";

    private static CoordinateFuzzingService Build(string key = Key) =>
        new(new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Map:FuzzKey"] = key })
            .Build());

    private readonly CoordinateFuzzingService _svc = Build();

    [Fact]
    public void FuzzCoordinates_ReturnsOffsetWithinOneMeterRange()
    {
        var userId = Guid.NewGuid();
        var (lat, lng) = _svc.FuzzCoordinates(-20.3155, -40.3128, userId);
        lat.Should().BeInRange(-20.3165, -20.3145);
        lng.Should().BeInRange(-40.3138, -40.3118);
    }

    [Fact]
    public void FuzzCoordinates_IsDeterministicForSameUser()
    {
        var userId = Guid.NewGuid();
        var (lat1, lng1) = _svc.FuzzCoordinates(-20.3155, -40.3128, userId);
        var (lat2, lng2) = _svc.FuzzCoordinates(-20.3155, -40.3128, userId);
        lat1.Should().Be(lat2);
        lng1.Should().Be(lng2);
    }

    [Fact]
    public void FuzzCoordinates_DifferentUsersGetDifferentOffsets()
    {
        var (lat1, _) = _svc.FuzzCoordinates(-20.3155, -40.3128, Guid.NewGuid());
        var (lat2, _) = _svc.FuzzCoordinates(-20.3155, -40.3128, Guid.NewGuid());
        lat1.Should().NotBe(lat2);
    }

    [Fact]
    public void FuzzCoordinates_NullInputReturnsNull()
    {
        var (lat, lng) = _svc.FuzzCoordinatesNullable(null, null, Guid.NewGuid());
        lat.Should().BeNull();
        lng.Should().BeNull();
    }

    // ── Regressão de segurança ───────────────────────────────────────────────
    // A implementação anterior derivava o offset de `new Random(userId.GetHashCode())`.
    // Como a API devolve o UserId ao lado da coordenada deslocada, qualquer
    // cliente reproduzia o mesmo PRNG e recuperava o endereço EXATO.
    // Estes dois testes garantem que o offset depende de um segredo do servidor.

    [Fact]
    public void FuzzCoordinates_OffsetDependsOnServerSecret()
    {
        var userId = Guid.NewGuid();
        var (latA, lngA) = Build("primeira-chave-secreta-do-servidor").FuzzCoordinates(-20.3155, -40.3128, userId);
        var (latB, lngB) = Build("segunda-chave-secreta-diferente-aa").FuzzCoordinates(-20.3155, -40.3128, userId);

        // Mesmo usuário e mesma coordenada, chaves distintas ⇒ offsets distintos.
        // Sem a chave do servidor não há como prever o deslocamento.
        latA.Should().NotBe(latB);
        lngA.Should().NotBe(lngB);
    }

    [Fact]
    public void FuzzCoordinates_IsNotReproducibleFromUserIdAlone()
    {
        var userId = Guid.NewGuid();
        var (lat, _) = _svc.FuzzCoordinates(-20.3155, -40.3128, userId);

        // Reproduz exatamente o algoritmo antigo, que só dependia do userId.
        var rng = new Random(userId.GetHashCode());
        var legacyOffset = (rng.NextDouble() * 0.001 * 2) - 0.001;
        var legacyLat = -20.3155 + legacyOffset;

        lat.Should().NotBe(legacyLat);
    }

    [Fact]
    public void Constructor_ThrowsWhenNoSecretConfigured()
    {
        var empty = new ConfigurationBuilder().Build();
        var act = () => new CoordinateFuzzingService(empty);
        act.Should().Throw<InvalidOperationException>();
    }
}
