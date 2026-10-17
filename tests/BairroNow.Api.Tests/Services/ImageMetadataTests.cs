using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Moq;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;
using BairroNow.Api.Services;
using Xunit;

namespace BairroNow.Api.Tests.Services;

// Foto de celular traz o GPS de onde foi tirada no EXIF — num app de bairro, em geral a casa da pessoa.
// As imagens ficam públicas (/uploads), então o metadado não pode sobreviver ao upload; e a rotação
// que vinha do EXIF precisa ser aplicada nos pixels antes, senão a foto fica deitada.
public class ImageMetadataTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "mv-img-" + Guid.NewGuid().ToString("N"));
    private readonly FileStorageService _svc;

    public ImageMetadataTests()
    {
        Directory.CreateDirectory(Path.Combine(_root, "wwwroot"));
        var env = new Mock<IWebHostEnvironment>();
        env.SetupGet(e => e.ContentRootPath).Returns(_root);
        env.SetupGet(e => e.WebRootPath).Returns(Path.Combine(_root, "wwwroot"));
        _svc = new FileStorageService(env.Object, new ConfigurationBuilder().Build());
    }

    public void Dispose() { try { Directory.Delete(_root, true); } catch { } }

    private static MemoryStream PhotoWithGpsRotated90()
    {
        // 40x20 (paisagem nos pixels) com orientação EXIF 6 = girar 90° para exibir (retrato).
        using var img = new Image<Rgb24>(40, 20);
        var exif = new ExifProfile();
        exif.SetValue(ExifTag.GPSLatitude, new[] { new Rational(20, 1), new Rational(19, 1), new Rational(0, 1) });
        exif.SetValue(ExifTag.GPSLatitudeRef, "S");
        exif.SetValue(ExifTag.Orientation, (ushort)6);
        img.Metadata.ExifProfile = exif;
        var ms = new MemoryStream();
        img.SaveAsJpeg(ms);
        ms.Position = 0;
        return ms;
    }

    private string Saved(string url) =>
        Path.Combine(_root, "wwwroot", url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

    [Fact]
    public async Task UploadedPhoto_HasNoExifOrGps()
    {
        var url = await _svc.SaveImageAsync(PhotoWithGpsRotated90(), "foto.jpg", "image/jpeg", "posts");

        using var saved = await Image.LoadAsync(Saved(url));
        saved.Metadata.ExifProfile.Should().BeNull();
        saved.Metadata.XmpProfile.Should().BeNull();
    }

    [Fact]
    public async Task UploadedPhoto_KeepsVisualOrientation()
    {
        var url = await _svc.SaveImageAsync(PhotoWithGpsRotated90(), "foto.jpg", "image/jpeg", "posts");

        using var saved = await Image.LoadAsync(Saved(url));
        saved.Height.Should().BeGreaterThan(saved.Width, "a rotação do EXIF foi aplicada aos pixels antes de remover o metadado");
    }
}
