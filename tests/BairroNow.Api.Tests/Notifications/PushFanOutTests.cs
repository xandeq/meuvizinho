using System.Net;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Hubs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using Xunit;

namespace BairroNow.Api.Tests.Notifications;

// Alerta de segurança vai para até 200 vizinhos: antes era 1 consulta + 1 POST à Expo POR destinatário
// (200 de cada, no SQL compartilhado), e o push saía com a marca antiga "BairroNow".
public class PushFanOutTests
{
    private sealed class ExpoRecorder : HttpMessageHandler
    {
        public readonly List<JsonElement[]> Batches = new();
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var json = await request.Content!.ReadAsStringAsync(ct);
            lock (Batches) Batches.Add(JsonSerializer.Deserialize<JsonElement[]>(json)!);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    private static (NotificationService svc, AppDbContext db, ExpoRecorder expo) Build()
    {
        var dbName = Guid.NewGuid().ToString();
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(dbName));
        var provider = services.BuildServiceProvider();
        var db = provider.CreateScope().ServiceProvider.GetRequiredService<AppDbContext>();

        var expo = new ExpoRecorder();
        var http = new Mock<IHttpClientFactory>();
        http.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(() => new HttpClient(expo, disposeHandler: false));

        var clients = new Mock<IHubClients>();
        clients.Setup(c => c.User(It.IsAny<string>())).Returns(Mock.Of<IClientProxy>());
        var hub = new Mock<IHubContext<NotificationHub>>();
        hub.SetupGet(h => h.Clients).Returns(clients.Object);

        var svc = new NotificationService(db, hub.Object, NullLogger<NotificationService>.Instance, http.Object,
            provider.GetRequiredService<IServiceScopeFactory>());
        return (svc, db, expo);
    }

    private static async Task<List<JsonElement[]>> WaitForBatches(ExpoRecorder expo, int expected)
    {
        // O envio é fire-and-forget (não segura a resposta HTTP do alerta): espera ele assentar.
        for (var i = 0; i < 50 && expo.Batches.Count < expected; i++) await Task.Delay(40);
        await Task.Delay(150); // e confere que não chegou nada além do esperado
        lock (expo.Batches) return expo.Batches.ToList();
    }

    [Fact]
    public async Task SecurityAlert_SendsOneBatchedPush_WithBrandTitle_OnlyToUsersWithToken()
    {
        var (svc, db, expo) = Build();
        var reporter = Guid.NewGuid();
        db.Users.Add(new User { Id = reporter, Email = "r@t.com", PasswordHash = "h", BairroId = 1, IsVerified = true, DisplayName = "Ana" });
        for (var i = 0; i < 3; i++)
            db.Users.Add(new User { Id = Guid.NewGuid(), Email = $"v{i}@t.com", PasswordHash = "h", BairroId = 1, IsVerified = true, ExpoPushToken = $"ExponentPushToken[{i}]" });
        db.Users.Add(new User { Id = Guid.NewGuid(), Email = "semtoken@t.com", PasswordHash = "h", BairroId = 1, IsVerified = true });
        await db.SaveChangesAsync();

        await svc.NotifySecurityAlertAsync(1, reporter, alertId: 7, "Furto", "Bicicleta levada na rua 3");

        var batches = await WaitForBatches(expo, 1);
        batches.Should().HaveCount(1, "um POST em lote, não um por vizinho");
        var messages = batches[0];
        messages.Should().HaveCount(3);
        messages.Select(m => m.GetProperty("to").GetString()).Should().OnlyHaveUniqueItems();
        messages.Should().OnlyContain(m => m.GetProperty("title").GetString() == "Meu Vizinho");
    }

    [Fact]
    public async Task SecurityAlert_SplitsIntoChunksOf100()
    {
        var (svc, db, expo) = Build();
        var reporter = Guid.NewGuid();
        db.Users.Add(new User { Id = reporter, Email = "r@t.com", PasswordHash = "h", BairroId = 1, IsVerified = true });
        for (var i = 0; i < 150; i++)
            db.Users.Add(new User { Id = Guid.NewGuid(), Email = $"v{i}@t.com", PasswordHash = "h", BairroId = 1, IsVerified = true, ExpoPushToken = $"ExponentPushToken[{i}]" });
        await db.SaveChangesAsync();

        await svc.NotifySecurityAlertAsync(1, reporter, alertId: 8, "Suspeito", "Carro rondando");

        var batches = await WaitForBatches(expo, 2);
        batches.Select(b => b.Length).OrderBy(n => n).Should().Equal(50, 100);
    }
}
