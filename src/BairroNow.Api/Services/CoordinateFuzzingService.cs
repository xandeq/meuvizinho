using System.Security.Cryptography;
using System.Text;

namespace BairroNow.Api.Services;

/// <summary>
/// Desloca a coordenada aprovada do morador antes de expô-la no mapa.
///
/// O deslocamento precisa ser DETERMINÍSTICO (o pino não pode "tremer" a cada
/// request) e ao mesmo tempo IRREPRODUZÍVEL por quem consome a API.
///
/// A implementação anterior usava <c>new Random(userId.GetHashCode())</c>:
/// <see cref="Random"/> é um PRNG documentado e <see cref="Guid.GetHashCode"/> é
/// estável entre processos. Como o mesmo payload de <c>/api/v1/map/pins</c>
/// devolve o <c>UserId</c> ao lado da coordenada já deslocada, qualquer cliente
/// autenticado reproduzia os dois <c>NextDouble()</c> localmente, subtraía os
/// offsets e recuperava o endereço residencial EXATO do morador.
///
/// Agora o offset vem de um HMAC-SHA256 sobre o userId com uma chave que só
/// existe no servidor. Continua determinístico, mas sem a chave não há como
/// inverter.
/// </summary>
public class CoordinateFuzzingService : ICoordinateFuzzingService
{
    // ±0.001° ≈ ±110m nas latitudes brasileiras — esconde o endereço exato e
    // mantém o pino dentro do bairro.
    private const double Offset = 0.001;

    private readonly byte[] _key;

    public CoordinateFuzzingService(IConfiguration configuration)
    {
        // Reaproveita a chave JWT como material de chave: já é obrigatória,
        // já é tratada como segredo e nunca sai do servidor. Um valor dedicado
        // (Map:FuzzKey) tem prioridade quando configurado.
        var secret = configuration["Map:FuzzKey"]
                     ?? configuration["Jwt:Key"]
                     ?? throw new InvalidOperationException(
                         "Map:FuzzKey ou Jwt:Key precisa estar configurado: sem segredo " +
                         "o deslocamento das coordenadas é reversível e expõe o endereço real.");

        _key = Encoding.UTF8.GetBytes(secret);
    }

    public (double Lat, double Lng) FuzzCoordinates(double lat, double lng, Guid userId)
    {
        // 32 bytes determinísticos por usuário, imprevisíveis sem a chave.
        var mac = HMACSHA256.HashData(_key, userId.ToByteArray());

        var latOffset = ToOffset(mac, 0);
        var lngOffset = ToOffset(mac, 8);

        return (lat + latOffset, lng + lngOffset);
    }

    public (double? Lat, double? Lng) FuzzCoordinatesNullable(double? lat, double? lng, Guid userId)
    {
        if (lat is null || lng is null) return (null, null);
        var (fLat, fLng) = FuzzCoordinates(lat.Value, lng.Value, userId);
        return (fLat, fLng);
    }

    /// <summary>
    /// Converte 8 bytes do HMAC num deslocamento uniforme em [-Offset, +Offset].
    /// </summary>
    private static double ToOffset(byte[] mac, int start)
    {
        // Descarta o bit de sinal para obter um inteiro não-negativo estável.
        var value = BitConverter.ToUInt64(mac, start) & 0x7FFFFFFFFFFFFFFFUL;
        var unit = (double)value / long.MaxValue; // [0, 1]
        return (unit * Offset * 2) - Offset;      // [-Offset, +Offset]
    }
}
