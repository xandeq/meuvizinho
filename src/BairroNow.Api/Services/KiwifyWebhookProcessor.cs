using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace BairroNow.Api.Services;

public enum KiwifyAction { Ignore, GrantPremium, RevokePremium }

/// <summary>
/// Lógica pura (sem I/O) do webhook da Kiwify — assinatura e classificação de
/// eventos extraídas para teste unitário. Mesmo contrato do webhook usado no
/// VagaNaGringa: assinatura HMAC-SHA1 hex do body cru via query ?signature=.
/// </summary>
public static class KiwifyWebhookProcessor
{
    /// <summary>Dias de Premium concedidos por pagamento aprovado (mensalidade + margem de retry da Kiwify).</summary>
    public const int GrantDays = 33;

    public static bool VerifySignature(string? rawBody, string? signature, string? token)
    {
        if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(token))
            return false;

        using var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(token));
        var computed = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody ?? string.Empty)));
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(computed.ToLowerInvariant()),
            Encoding.ASCII.GetBytes(signature.Trim().ToLowerInvariant()));
    }

    /// <summary>
    /// Pagamento aprovado/renovado → concede; reembolso/chargeback → revoga;
    /// resto (boleto/pix gerado, atraso, cancelamento — deixa expirar) → ignora.
    /// </summary>
    public static KiwifyAction Classify(string? eventType, string? orderStatus) => eventType switch
    {
        "order_approved" or "subscription_renewed" => KiwifyAction.GrantPremium,
        "order_refunded" or "chargeback" => KiwifyAction.RevokePremium,
        _ => orderStatus == "paid" ? KiwifyAction.GrantPremium
           : orderStatus is "refunded" or "chargedback" ? KiwifyAction.RevokePremium
           : KiwifyAction.Ignore,
    };

    /// <summary>Se já é Premium vigente, estende a partir do vencimento; senão parte de agora.</summary>
    public static DateTime NextExpiry(string plan, DateTime? currentExpiry, DateTime now) =>
        (plan == Models.Enums.SubscriptionPlan.Premium && currentExpiry > now ? currentExpiry.Value : now)
            .AddDays(GrantDays);

    /// <summary>Extrai (eventType, orderStatus, orderId, email) do payload, desembrulhando "order" se presente.</summary>
    public static (string? EventType, string? OrderStatus, string OrderId, string? Email) Parse(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Object &&
            root.TryGetProperty("order", out var wrapped) && wrapped.ValueKind == JsonValueKind.Object)
            root = wrapped;

        string? email = null;
        if (root.TryGetProperty("Customer", out var customer) && customer.ValueKind == JsonValueKind.Object)
            email = GetString(customer, "email");

        return (
            GetString(root, "webhook_event_type"),
            GetString(root, "order_status"),
            GetString(root, "order_id") ?? GetString(root, "order_ref") ?? Guid.NewGuid().ToString("N"),
            email);
    }

    private static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
}
