using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Services;

public class KiwifyWebhookProcessorTests
{
    private static string Sign(string body, string token)
    {
        using var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
    }

    // --- VerifySignature ---

    [Fact]
    public void VerifySignature_ValidSignature_ReturnsTrue()
    {
        var body = "{\"order_id\":\"abc\"}";
        Assert.True(KiwifyWebhookProcessor.VerifySignature(body, Sign(body, "tok"), "tok"));
    }

    [Fact]
    public void VerifySignature_UppercaseAndWhitespace_Tolerated()
    {
        var body = "{}";
        var sig = "  " + Sign(body, "tok").ToUpperInvariant() + " ";
        Assert.True(KiwifyWebhookProcessor.VerifySignature(body, sig, "tok"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("deadbeef")]
    public void VerifySignature_InvalidOrMissing_ReturnsFalse(string? sig)
        => Assert.False(KiwifyWebhookProcessor.VerifySignature("{}", sig, "tok"));

    [Fact]
    public void VerifySignature_EmptyToken_FailsClosed()
        => Assert.False(KiwifyWebhookProcessor.VerifySignature("{}", Sign("{}", "tok"), ""));

    [Fact]
    public void VerifySignature_WrongToken_ReturnsFalse()
        => Assert.False(KiwifyWebhookProcessor.VerifySignature("{}", Sign("{}", "other"), "tok"));

    // --- Classify ---

    [Theory]
    [InlineData("order_approved", null, KiwifyAction.GrantPremium)]
    [InlineData("subscription_renewed", null, KiwifyAction.GrantPremium)]
    [InlineData(null, "paid", KiwifyAction.GrantPremium)]
    [InlineData("order_refunded", null, KiwifyAction.RevokePremium)]
    [InlineData("chargeback", null, KiwifyAction.RevokePremium)]
    [InlineData(null, "refunded", KiwifyAction.RevokePremium)]
    [InlineData(null, "chargedback", KiwifyAction.RevokePremium)]
    [InlineData("billet_created", "waiting_payment", KiwifyAction.Ignore)]
    [InlineData("pix_created", null, KiwifyAction.Ignore)]
    [InlineData("subscription_canceled", null, KiwifyAction.Ignore)]
    [InlineData("subscription_late", null, KiwifyAction.Ignore)]
    [InlineData(null, null, KiwifyAction.Ignore)]
    public void Classify_MapsEventsCorrectly(string? evt, string? status, KiwifyAction expected)
        => Assert.Equal(expected, KiwifyWebhookProcessor.Classify(evt, status));

    // --- NextExpiry ---

    [Fact]
    public void NextExpiry_FreeUser_StartsFromNow()
    {
        var now = new DateTime(2026, 7, 4, 12, 0, 0, DateTimeKind.Utc);
        Assert.Equal(now.AddDays(33), KiwifyWebhookProcessor.NextExpiry(SubscriptionPlan.Free, null, now));
    }

    [Fact]
    public void NextExpiry_ActivePremium_ExtendsFromCurrentExpiry()
    {
        var now = new DateTime(2026, 7, 4, 12, 0, 0, DateTimeKind.Utc);
        var expiry = now.AddDays(10);
        Assert.Equal(expiry.AddDays(33), KiwifyWebhookProcessor.NextExpiry(SubscriptionPlan.Premium, expiry, now));
    }

    [Fact]
    public void NextExpiry_ExpiredPremium_StartsFromNow()
    {
        var now = new DateTime(2026, 7, 4, 12, 0, 0, DateTimeKind.Utc);
        var expired = now.AddDays(-5);
        Assert.Equal(now.AddDays(33), KiwifyWebhookProcessor.NextExpiry(SubscriptionPlan.Premium, expired, now));
    }

    // --- Parse ---

    [Fact]
    public void Parse_UnwrapsOrderEnvelope_AndExtractsFields()
    {
        var json = """
            {"order": {"webhook_event_type":"order_approved","order_status":"paid",
             "order_id":"ord-1","Customer":{"email":"a@b.com"}}}
            """;
        using var doc = JsonDocument.Parse(json);
        var (evt, status, orderId, email) = KiwifyWebhookProcessor.Parse(doc.RootElement);
        Assert.Equal("order_approved", evt);
        Assert.Equal("paid", status);
        Assert.Equal("ord-1", orderId);
        Assert.Equal("a@b.com", email);
    }

    [Fact]
    public void Parse_FlatPayload_Works()
    {
        var json = """{"webhook_event_type":"order_refunded","order_ref":"ref-9","Customer":{"email":"x@y.com"}}""";
        using var doc = JsonDocument.Parse(json);
        var (evt, _, orderId, email) = KiwifyWebhookProcessor.Parse(doc.RootElement);
        Assert.Equal("order_refunded", evt);
        Assert.Equal("ref-9", orderId);
        Assert.Equal("x@y.com", email);
    }

    [Fact]
    public void Parse_MissingFields_ReturnsNullsAndGeneratedOrderId()
    {
        using var doc = JsonDocument.Parse("{}");
        var (evt, status, orderId, email) = KiwifyWebhookProcessor.Parse(doc.RootElement);
        Assert.Null(evt);
        Assert.Null(status);
        Assert.False(string.IsNullOrEmpty(orderId));
        Assert.Null(email);
    }
}
