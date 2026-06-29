using System.Text;
using System.Text.Json;

namespace BairroNow.Api.Services;

public class ResendEmailService : IEmailService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ResendEmailService> _logger;
    private readonly string _from;

    public ResendEmailService(IConfiguration configuration, ILogger<ResendEmailService> logger, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _logger = logger;
        // Named client "resend" has the Polly resilience handler attached in
        // Program.cs (retry + timeout). Do NOT fall back to CreateClient() with
        // no name here — it would bypass the retry policy.
        _httpClient = httpClientFactory.CreateClient("resend");
        _from = configuration["Resend:From"] ?? "Meu Vizinho <noreply@meuvizinho.com.br>";
    }

    public async Task SendConfirmationEmailAsync(string email, string token)
    {
        var html = $@"
<h2>Confirme seu e-mail no Meu Vizinho</h2>
<p>Clique no link abaixo para confirmar seu cadastro:</p>
<p><a href=""{_configuration["FrontendUrl"] ?? "https://meuvizinho.com.br"}/confirm-email?token={token}"">Confirmar e-mail</a></p>
<p>Este link expira em 24 horas.</p>";

        await SendEmailAsync(email, "Confirme seu e-mail - Meu Vizinho", html);
    }

    public async Task SendPasswordResetEmailAsync(string email, string token)
    {
        var html = $@"
<h2>Redefinir senha - Meu Vizinho</h2>
<p>Clique no link abaixo para redefinir sua senha:</p>
<p><a href=""{_configuration["FrontendUrl"] ?? "https://meuvizinho.com.br"}/reset-password?token={token}&email={Uri.EscapeDataString(email)}"">Redefinir senha</a></p>
<p>Este link expira em 1 hora.</p>";

        await SendEmailAsync(email, "Redefinir senha - Meu Vizinho", html);
    }

    public async Task SendMagicLinkAsync(string email, string magicUrl)
    {
        var html = $@"
<h2>Seu link de acesso - Meu Vizinho</h2>
<p>Clique no link abaixo para entrar na sua conta:</p>
<p><a href=""{magicUrl}"">Entrar no Meu Vizinho</a></p>
<p>Este link expira em 10 minutos e pode ser usado apenas uma vez.</p>";

        await SendEmailAsync(email, "Seu link de acesso - Meu Vizinho", html);
    }

    public async Task SendVerificationStatusAsync(string email, string status, string? reason)
    {
        var statusText = status switch
        {
            "approved" => "aprovada",
            "rejected" => "rejeitada",
            _ => status
        };

        var reasonHtml = !string.IsNullOrEmpty(reason)
            ? $"<p><strong>Motivo:</strong> {reason}</p>"
            : "";

        var html = $@"
<h2>Verificacao de endereco - Meu Vizinho</h2>
<p>Sua verificacao de endereco foi <strong>{statusText}</strong>.</p>
{reasonHtml}
<p><a href=""{_configuration["FrontendUrl"] ?? "https://meuvizinho.com.br"}"">Acessar Meu Vizinho</a></p>";

        await SendEmailAsync(email, $"Verificacao {statusText} - Meu Vizinho", html);
    }

    public async Task SendWeeklyDigestAsync(string email, string bairroName, string htmlBody)
    {
        await SendEmailAsync(email, $"O que aconteceu no {bairroName} essa semana", htmlBody);
    }

    public async Task SendAccountDeletionConfirmationAsync(string email)
    {
        var html = $@"
<h2>Solicitacao de exclusao de conta - Meu Vizinho</h2>
<p>Recebemos sua solicitacao de exclusao de conta. Seus dados serao anonimizados apos 30 dias.</p>
<p>Se voce mudar de ideia, faca login na sua conta antes do prazo para cancelar a exclusao.</p>
<p><a href=""{_configuration["FrontendUrl"] ?? "https://meuvizinho.com.br"}"">Acessar Meu Vizinho</a></p>";

        await SendEmailAsync(email, "Solicitacao de exclusao - Meu Vizinho", html);
    }

    private async Task SendEmailAsync(string to, string subject, string html)
    {
        try
        {
            var payload = new
            {
                from = _from,
                to = new[] { to },
                subject,
                html
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync("emails", content);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                _logger.LogError("Resend API error {StatusCode}: {Body}", response.StatusCode, body);
            }
            else
            {
                _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", to, subject);
            // Do not throw — email delivery should not crash caller
        }
    }
}
