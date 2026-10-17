using System.Security.Cryptography;
using System.Text;
using BairroNow.Api.Controllers.v1;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Models.Enums;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace BairroNow.Api.Tests.Controllers;

/// <summary>
/// Webhook de pagamento da Kiwify (assinatura Premium) de ponta a ponta: assinatura, efeito no
/// usuário e reentrega. A Kiwify reenvia o evento quando não recebe 2xx a tempo — o mesmo
/// order_approved não pode estender o Premium duas vezes.
/// </summary>
public class KiwifyWebhookControllerTests : IDisposable
{
    private const string Token = "token-de-teste";
    private readonly AppDbContext _db;

    public KiwifyWebhookControllerTests()
    {
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    }

    public void Dispose() => _db.Dispose();

    private User AddUser(string email = "comprador@b.com", string plan = SubscriptionPlan.Free, DateTime? expires = null)
    {
        var user = new User { Id = Guid.NewGuid(), Email = email, PasswordHash = "x", Plan = plan, PlanExpiresAt = expires };
        _db.Users.Add(user);
        _db.SaveChanges();
        return user;
    }

    private static string Sign(string body)
    {
        using var hmac = new HMACSHA1(Encoding.UTF8.GetBytes(Token));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(body))).ToLowerInvariant();
    }

    private static string Payload(string eventType, string orderId, string email) =>
        "{\"order\":{\"webhook_event_type\":\"" + eventType + "\",\"order_id\":\"" + orderId +
        "\",\"Customer\":{\"email\":\"" + email + "\"}}}";

    private async Task<IActionResult> Send(string body, string? signature = null, string? token = Token)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Kiwify:WebhookToken"] = token })
            .Build();
        var controller = new KiwifyWebhookController(_db, config, NullLogger<KiwifyWebhookController>.Instance);
        var http = new DefaultHttpContext();
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.Request.QueryString = new QueryString($"?signature={signature ?? Sign(body)}");
        controller.ControllerContext = new ControllerContext { HttpContext = http };
        return await controller.Receive(default);
    }

    private async Task<User> Reload(User u)
    {
        _db.ChangeTracker.Clear();
        return await _db.Users.SingleAsync(x => x.Id == u.Id);
    }

    [Fact]
    public async Task InvalidSignature_Returns401_AndDoesNotGrantPremium()
    {
        var user = AddUser();

        var result = await Send(Payload("order_approved", "o-1", user.Email), signature: "assinatura-falsa");

        result.Should().BeOfType<UnauthorizedResult>();
        (await Reload(user)).Plan.Should().Be(SubscriptionPlan.Free);
    }

    [Fact]
    public async Task MissingToken_FailsClosed_With503()
    {
        var user = AddUser();

        var result = await Send(Payload("order_approved", "o-1", user.Email), token: null);

        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(503);
        (await Reload(user)).Plan.Should().Be(SubscriptionPlan.Free);
    }

    [Fact]
    public async Task ApprovedOrder_GrantsPremium_ForGrantDays()
    {
        var user = AddUser();

        await Send(Payload("order_approved", "o-1", user.Email));

        var after = await Reload(user);
        after.Plan.Should().Be(SubscriptionPlan.Premium);
        after.PlanExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddDays(33), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task ApprovedOrder_MatchesBuyerEmail_CaseInsensitively()
    {
        var user = AddUser("comprador@b.com");

        await Send(Payload("order_approved", "o-1", "  Comprador@B.com "));

        (await Reload(user)).Plan.Should().Be(SubscriptionPlan.Premium);
    }

    [Fact]
    public async Task RedeliveredApproval_DoesNotExtendPremiumTwice()
    {
        var user = AddUser();
        var body = Payload("order_approved", "o-1", user.Email);

        await Send(body);
        var firstExpiry = (await Reload(user)).PlanExpiresAt;
        var second = await Send(body);

        second.Should().BeOfType<OkObjectResult>();
        (await Reload(user)).PlanExpiresAt.Should().Be(firstExpiry);
    }

    [Fact]
    public async Task Renewal_WithNewOrder_ExtendsFromCurrentExpiry()
    {
        var expires = DateTime.UtcNow.AddDays(5);
        var user = AddUser(plan: SubscriptionPlan.Premium, expires: expires);

        await Send(Payload("subscription_renewed", "o-2", user.Email));

        (await Reload(user)).PlanExpiresAt.Should().BeCloseTo(expires.AddDays(33), TimeSpan.FromSeconds(1));
    }

    [Fact]
    public async Task RefundAfterApproval_RevokesPremium()
    {
        var user = AddUser();
        await Send(Payload("order_approved", "o-1", user.Email));

        await Send(Payload("order_refunded", "o-1", user.Email));

        var after = await Reload(user);
        after.Plan.Should().Be(SubscriptionPlan.Free);
        after.PlanExpiresAt.Should().BeNull();
    }

    [Fact]
    public async Task UnknownBuyer_Returns200_WithoutCreatingOrChangingUsers()
    {
        var other = AddUser("outro@b.com");

        var result = await Send(Payload("order_approved", "o-1", "ninguem@b.com"));

        result.Should().BeOfType<OkObjectResult>();
        (await Reload(other)).Plan.Should().Be(SubscriptionPlan.Free);
        (await _db.Users.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task IgnoredEvent_DoesNotChangePlan()
    {
        var user = AddUser();

        await Send(Payload("pix_created", "o-1", user.Email));

        (await Reload(user)).Plan.Should().Be(SubscriptionPlan.Free);
    }

    [Fact]
    public async Task MalformedJson_WithValidSignature_Returns400_InsteadOfCrashing()
    {
        var result = await Send("{isto nao e json");

        result.Should().BeOfType<BadRequestResult>();
    }
}
