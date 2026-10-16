using System.Net;
using System.Text.Json;

namespace BairroNow.Api.Middleware;

public class ExceptionHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlerMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlerMiddleware(RequestDelegate next, ILogger<ExceptionHandlerMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Quem cancelou foi o cliente (trocou de página, fechou o app). Antes virava 500 e
            // ERRO no log a cada navegação rápida, sujando o monitoramento com falso alarme.
            _logger.LogDebug("Request aborted by client on {Method} {Path}", context.Request.Method, context.Request.Path);
            if (!context.Response.HasStarted) context.Response.StatusCode = 499;
        }
        catch (Exception ex)
        {
            var correlationId = context.Items["CorrelationId"] as string;
            _logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            // The client sees the correlation ID so an end user can quote it back
            // to support and we can pull the exact log line in seconds. Detail is
            // only leaked in Development.
            object response = _env.IsDevelopment()
                ? new { error = "Erro interno do servidor.", detail = (string?)ex.Message, correlationId }
                : new { error = "Erro interno do servidor.", detail = (string?)null, correlationId };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
        }
    }
}
