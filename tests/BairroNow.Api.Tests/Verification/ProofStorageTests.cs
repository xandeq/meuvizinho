using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Moq;
using BairroNow.Api.Services;
using Xunit;

namespace BairroNow.Api.Tests.Verification;

// Comprovante de residência é documento pessoal: não pode morar no wwwroot (servido publicamente).
public class ProofStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "mv-proofs-" + Guid.NewGuid().ToString("N"));
    private readonly FileStorageService _svc;

    public ProofStorageTests()
    {
        Directory.CreateDirectory(Path.Combine(_root, "wwwroot"));
        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.ContentRootPath).Returns(_root);
        env.SetupGet(e => e.WebRootPath).Returns(Path.Combine(_root, "wwwroot"));
        _svc = new FileStorageService(env.Object, new ConfigurationBuilder().Build());
    }

    public void Dispose() { try { Directory.Delete(_root, true); } catch { } }

    [Fact]
    public async Task Save_WritesOutsideWwwroot_AndOpens()
    {
        var (rel, _) = await _svc.SaveProofAsync(new MemoryStream("%PDF-1.4 teste"u8.ToArray()), "conta.pdf", "application/pdf");

        rel.Should().StartWith("uploads/proofs/");
        File.Exists(Path.Combine(_root, "App_Data", rel)).Should().BeTrue();
        File.Exists(Path.Combine(_root, "wwwroot", rel)).Should().BeFalse();
        using var s = _svc.OpenProof(rel);
        s.Should().NotBeNull();
    }

    [Fact]
    public void LegacyFile_InWwwroot_IsMovedOnOpen()
    {
        const string rel = "uploads/proofs/2026/09/antigo.jpg";
        var legacy = Path.Combine(_root, "wwwroot", "uploads", "proofs", "2026", "09", "antigo.jpg");
        Directory.CreateDirectory(Path.GetDirectoryName(legacy)!);
        File.WriteAllText(legacy, "x");

        using (var s = _svc.OpenProof(rel)) s.Should().NotBeNull();

        File.Exists(legacy).Should().BeFalse();
        File.Exists(Path.Combine(_root, "App_Data", "uploads", "proofs", "2026", "09", "antigo.jpg")).Should().BeTrue();
    }

    [Fact]
    public void Migrate_MovesAllLegacyProofs()
    {
        foreach (var n in new[] { "a.jpg", "b.pdf" })
        {
            var p = Path.Combine(_root, "wwwroot", "uploads", "proofs", "2026", "08", n);
            Directory.CreateDirectory(Path.GetDirectoryName(p)!);
            File.WriteAllText(p, n);
        }

        _svc.MigrateLegacyProofs().Should().Be(2);
        Directory.EnumerateFiles(Path.Combine(_root, "wwwroot", "uploads", "proofs"), "*", SearchOption.AllDirectories).Should().BeEmpty();
        _svc.DeleteProof("uploads/proofs/2026/08/a.jpg").Should().BeTrue();
    }

    [Fact]
    public void PathTraversal_IsRejected()
    {
        var act = () => _svc.OpenProof("uploads/proofs/../../../segredo.txt");
        act.Should().Throw<InvalidOperationException>();
    }
}
