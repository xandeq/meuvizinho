using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BairroNow.Api.Data;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;
using Xunit;

namespace BairroNow.Api.Tests.Verification;

// Um comprovante em análise por vez: reenvios enchiam a fila do moderador.
public class DuplicatePendingTests
{
    [Fact]
    public async Task Submit_WhilePending_Throws_AndDoesNotStoreFile()
    {
        using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var userId = Guid.NewGuid();
        db.Verifications.Add(new Models.Entities.Verification { UserId = userId, Cep = "29101010", Status = VerificationStatus.Pending, SubmittedAt = DateTime.UtcNow });
        db.SaveChanges();
        var files = new Mock<IFileStorageService>();
        var svc = new VerificationService(db, Mock.Of<ICepLookupService>(), files.Object, NullLogger<VerificationService>.Instance);
        var proof = new FormFile(new MemoryStream(new byte[] { 1, 2, 3 }), 0, 3, "proof", "conta.jpg");

        var act = () => svc.SubmitAsync(userId, "29101010", "10", proof);

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*em análise*");
        files.VerifyNoOtherCalls();
    }
}
