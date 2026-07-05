using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Enums;
using BairroNow.Api.Services;

namespace BairroNow.Api.Controllers.v1;

/// <summary>
/// Webhook da Kiwify para a assinatura Premium do Meu Vizinho.
/// Pagamento aprovado/renovado → concede/estende Premium (33 dias) ao usuário
/// com o email do comprador. Reembolso/chargeback → revoga imediatamente.
/// Assinatura: ?signature= HMAC-SHA1 hex do body cru com Kiwify:WebhookToken.
/// Sem token configurado → 503 (fail-closed).
/// </summary>
[ApiController]
[AllowAnonymous]
[EnableRateLimiting("public")]
public class KiwifyWebhookController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<KiwifyWebhookController> _logger;

    public KiwifyWebhookController(AppDbContext db, IConfiguration config, ILogger<KiwifyWebhookController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    [HttpPost("/api/v1/webhooks/kiwify")]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        var token = _config["Kiwify:WebhookToken"];
        if (string.IsNullOrEmpty(token))
        {
            _logger.LogError("Kiwify webhook: Kiwify:WebhookToken não configurado — evento rejeitado (fail-closed)");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        string rawBody;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
            rawBody = await reader.ReadToEndAsync(ct);

        var signature = Request.Query["signature"].FirstOrDefault();
        if (!KiwifyWebhookProcessor.VerifySignature(rawBody, signature, token))
        {
            _logger.LogWarning("Kiwify webhook: assinatura inválida (evento descartado)");
            return Unauthorized();
        }

        using var doc = JsonDocument.Parse(rawBody);
        var (eventType, orderStatus, orderId, email) = KiwifyWebhookProcessor.Parse(doc.RootElement);
        var action = KiwifyWebhookProcessor.Classify(eventType, orderStatus);

        _logger.LogInformation("Kiwify webhook: evento={Event} status={Status} order={OrderId} action={Action}",
            eventType, orderStatus, orderId, action);

        if (action == KiwifyAction.Ignore)
            return Ok(new { received = true, ignored = eventType ?? orderStatus });

        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning("Kiwify webhook: order {OrderId} sem email do cliente", orderId);
            return Ok(new { received = true });
        }

        var normalized = email.Trim().ToLowerInvariant();
        var user = await _db.Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Email == normalized, ct);
        if (user == null)
        {
            // Comprador sem conta ainda — logado para reconciliação manual/admin grant.
            _logger.LogWarning("Kiwify webhook: nenhum usuário com email {Email} (order {OrderId}) — conceder manualmente via admin grant", normalized, orderId);
            return Ok(new { received = true, userFound = false });
        }

        var now = DateTime.UtcNow;
        if (action == KiwifyAction.GrantPremium)
        {
            user.PlanExpiresAt = KiwifyWebhookProcessor.NextExpiry(user.Plan, user.PlanExpiresAt, now);
            user.Plan = SubscriptionPlan.Premium;
            _logger.LogInformation("Kiwify webhook: Premium concedido a {UserId} até {Expiry} (order {OrderId})",
                user.Id, user.PlanExpiresAt, orderId);
        }
        else // RevokePremium
        {
            user.Plan = SubscriptionPlan.Free;
            user.PlanExpiresAt = null;
            _logger.LogInformation("Kiwify webhook: Premium revogado de {UserId} — {Event} (order {OrderId})",
                user.Id, eventType ?? orderStatus, orderId);
        }
        user.UpdatedAt = now;
        await _db.SaveChangesAsync(ct);

        return Ok(new { received = true, userFound = true });
    }
}
