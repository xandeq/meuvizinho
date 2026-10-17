using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using Xunit;
using VerificationEntity = BairroNow.Api.Models.Entities.Verification;

namespace BairroNow.Api.Tests.SqlServer;

/// <summary>
/// Aprovação de comprovante de endereço — a camada de confiança do produto ("vizinho verificado").
/// ApproveAsync usa UPDATE ... WHERE Status='pending' em SQL cru como trava contra aprovação dupla;
/// isso não roda no InMemory, então estes testes usam um banco SQL Server descartável, com as migrations.
/// </summary>
[Trait("Category", "SqlServer")]
public sealed class VerificationApprovalSqlTests : IDisposable
{
    private readonly string _dbName = "MvTest_" + Guid.NewGuid().ToString("N")[..12];
    private readonly AppDbContext? _db;

    public VerificationApprovalSqlTests()
    {
        var server = Environment.GetEnvironmentVariable(SqlServerFactAttribute.EnvVar);
        if (string.IsNullOrWhiteSpace(server)) return;
        _db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer($"{server.TrimEnd(';')};Database={_dbName}").Options);
        _db.Database.Migrate();
    }

    public void Dispose()
    {
        if (_db == null) return;
        try { _db.Database.EnsureDeleted(); } catch { /* banco descartável */ }
        _db.Dispose();
    }

    private VerificationService Service() =>
        new(_db!, Mock.Of<ICepLookupService>(), Mock.Of<IFileStorageService>(), NullLogger<VerificationService>.Instance);

    private (User resident, User admin, VerificationEntity v) Seed()
    {
        var bairro = new Bairro { Nome = "Praia da Costa", Cidade = "Vila Velha", Uf = "ES", Slug = "praia-da-costa-" + Guid.NewGuid().ToString("N")[..6] };
        _db!.Bairros.Add(bairro);
        var resident = new User { Id = Guid.NewGuid(), Email = $"m{Guid.NewGuid():N}@t.com", PasswordHash = "h" };
        var admin = new User { Id = Guid.NewGuid(), Email = $"a{Guid.NewGuid():N}@t.com", PasswordHash = "h", IsAdmin = true };
        _db.Users.AddRange(resident, admin);
        _db.SaveChanges();
        var v = new VerificationEntity { UserId = resident.Id, Cep = "29101000", Logradouro = "Rua 3", BairroId = bairro.Id, ProofFilePath = "uploads/proofs/x.jpg", ProofSha256 = "abc" };
        _db.Verifications.Add(v);
        _db.SaveChanges();
        _db.ChangeTracker.Clear();
        return (resident, admin, v);
    }

    private async Task<(User user, VerificationEntity v)> Reload(Guid userId, int vId)
    {
        _db!.ChangeTracker.Clear();
        return (await _db.Users.IgnoreQueryFilters().SingleAsync(u => u.Id == userId),
                await _db.Verifications.IgnoreQueryFilters().SingleAsync(x => x.Id == vId));
    }

    [SqlServerFact]
    public async Task Approve_VerifiesResident_InTheProofsBairro()
    {
        var (resident, admin, v) = Seed();

        (await Service().ApproveAsync(v.Id, admin.Id)).Should().BeTrue();

        var (user, stored) = await Reload(resident.Id, v.Id);
        user.IsVerified.Should().BeTrue();
        user.BairroId.Should().Be(v.BairroId);
        stored.Status.Should().Be(VerificationStatus.Approved);
        stored.ReviewedByUserId.Should().Be(admin.Id);
        (await _db!.AuditLogs.CountAsync(a => a.Action == "verification.approve" && a.EntityId == v.Id.ToString())).Should().Be(1);
    }

    [SqlServerFact]
    public async Task ApproveTwice_SecondIsRejectedByTheDatabaseLock()
    {
        var (_, admin, v) = Seed();

        (await Service().ApproveAsync(v.Id, admin.Id)).Should().BeTrue();
        (await Service().ApproveAsync(v.Id, admin.Id)).Should().BeFalse();

        (await _db!.AuditLogs.CountAsync(a => a.Action == "verification.approve" && a.EntityId == v.Id.ToString())).Should().Be(1);
    }

    [SqlServerFact]
    public async Task ConcurrentApprovals_OnlyOneWins()
    {
        var (_, admin, v) = Seed();
        var server = Environment.GetEnvironmentVariable(SqlServerFactAttribute.EnvVar)!;
        AppDbContext Ctx() => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer($"{server.TrimEnd(';')};Database={_dbName}").Options);

        var results = await Task.WhenAll(Enumerable.Range(0, 4).Select(async _ =>
        {
            await using var ctx = Ctx();
            return await new VerificationService(ctx, Mock.Of<ICepLookupService>(), Mock.Of<IFileStorageService>(),
                NullLogger<VerificationService>.Instance).ApproveAsync(v.Id, admin.Id);
        }));

        results.Count(ok => ok).Should().Be(1);
    }

    [SqlServerFact]
    public async Task ApproveAfterReject_DoesNothing()
    {
        var (resident, admin, v) = Seed();
        await Service().RejectAsync(v.Id, admin.Id, "comprovante ilegível");

        (await Service().ApproveAsync(v.Id, admin.Id)).Should().BeFalse();

        (await Reload(resident.Id, v.Id)).user.IsVerified.Should().BeFalse();
    }

    [SqlServerFact]
    public async Task RejectAfterApprove_DoesNotLeaveRecordAndUserInconsistent()
    {
        // Rejeitar um comprovante já aprovado deixava Status=rejected com o morador ainda verificado.
        var (resident, admin, v) = Seed();
        await Service().ApproveAsync(v.Id, admin.Id);

        (await Service().RejectAsync(v.Id, admin.Id, "clique errado")).Should().BeFalse();

        var (user, stored) = await Reload(resident.Id, v.Id);
        stored.Status.Should().Be(VerificationStatus.Approved);
        user.IsVerified.Should().BeTrue();
    }
}
