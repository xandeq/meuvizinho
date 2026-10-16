using System.Security.Cryptography;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace BairroNow.Api.Services;

// Uses SixLabors.ImageSharp to resize/compress images. Public images under wwwroot/uploads/{folder};
// proofs (personal documents) under App_Data/uploads/proofs, never served as static files.
// Supported folders: "proofs" (images + PDF for verification), "posts" (images only for feed posts).
public class FileStorageService : IFileStorageService
{
    private const long MaxBytes = 5 * 1024 * 1024; // 5 MB
    private static readonly HashSet<string> AllowedProofTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "application/pdf"
    };
    private static readonly HashSet<string> AllowedImageTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp"
    };

    private readonly IWebHostEnvironment _env;
    private readonly string _apiBaseUrl;

    public FileStorageService(IWebHostEnvironment env, IConfiguration config)
    {
        _env = env;
        _apiBaseUrl = (config["ApiBaseUrl"] ?? "").TrimEnd('/');
    }

    public async Task<(string relativePath, string sha256)> SaveProofAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        if (!AllowedProofTypes.Contains(contentType))
            throw new InvalidOperationException($"Tipo de arquivo não permitido: {contentType}");

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        if (ms.Length == 0)
            throw new InvalidOperationException("Arquivo vazio.");
        if (ms.Length > MaxBytes)
            throw new InvalidOperationException("Arquivo excede 5MB.");

        ms.Position = 0;

        // Comprovante é documento pessoal: grava FORA do wwwroot (pasta servida publicamente).
        // O caminho guardado no banco segue igual ("uploads/proofs/aaaa/mm/x.jpg").
        var privateRoot = ResolvePrivateRoot();
        var now = DateTime.UtcNow;
        var relDir = $"uploads/proofs/{now:yyyy}/{now:MM}";
        var absDir = Path.Combine(privateRoot, relDir.Replace("/", Path.DirectorySeparatorChar.ToString()));
        Directory.CreateDirectory(absDir);

        string ext;
        byte[] outBytes;

        if (contentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
        {
            ext = ".pdf";
            outBytes = ms.ToArray();
        }
        else
        {
            ext = ".jpg";
            outBytes = await ResizeToJpegAsync(ms, ct);
        }

        var guid = Guid.NewGuid().ToString("N");
        var fileRel = $"{relDir}/{guid}{ext}";
        var fileAbs = Path.Combine(absDir, guid + ext);
        await File.WriteAllBytesAsync(fileAbs, outBytes, ct);

        var sha = Convert.ToHexString(SHA256.HashData(outBytes)).ToLowerInvariant();
        return (fileRel, sha);
    }

    public async Task<string> SaveImageAsync(Stream content, string originalFileName, string contentType, string folder, CancellationToken ct = default)
    {
        if (!AllowedImageTypes.Contains(contentType))
            throw new InvalidOperationException($"Tipo de imagem não permitido: {contentType}");
        if (string.IsNullOrWhiteSpace(folder))
            throw new ArgumentException("folder is required", nameof(folder));

        using var ms = new MemoryStream();
        await content.CopyToAsync(ms, ct);
        if (ms.Length == 0)
            throw new InvalidOperationException("Arquivo vazio.");
        if (ms.Length > MaxBytes)
            throw new InvalidOperationException("Arquivo excede 5MB.");

        ms.Position = 0;

        var webRoot = ResolveWebRoot();
        var now = DateTime.UtcNow;
        // wwwroot/uploads/posts/{yyyy}/{MM}
        var relDir = $"uploads/{folder}/{now:yyyy}/{now:MM}";
        var absDir = Path.Combine(webRoot, relDir.Replace("/", Path.DirectorySeparatorChar.ToString()));
        Directory.CreateDirectory(absDir);

        var outBytes = await ResizeToJpegAsync(ms, ct);
        var guid = Guid.NewGuid().ToString("N");
        var fileRel = $"/{relDir}/{guid}.jpg";
        var fileAbs = Path.Combine(absDir, guid + ".jpg");
        await File.WriteAllBytesAsync(fileAbs, outBytes, ct);

        // These URLs are served directly as <img src> on the frontend, which
        // runs on a different origin than this API — a bare relative path
        // would resolve against the FRONTEND's domain and 404. Proofs don't
        // need this: they're streamed through an authenticated proxy
        // endpoint (VerificationService.OpenProof), never rendered directly.
        return string.IsNullOrEmpty(_apiBaseUrl) ? fileRel : $"{_apiBaseUrl}{fileRel}";
    }

    private static async Task<byte[]> ResizeToJpegAsync(MemoryStream ms, CancellationToken ct)
    {
        ms.Position = 0;
        using var image = await Image.LoadAsync(ms, ct);
        const int maxSide = 1600;
        if (image.Width > maxSide || image.Height > maxSide)
        {
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Mode = ResizeMode.Max,
                Size = new Size(maxSide, maxSide)
            }));
        }
        using var outMs = new MemoryStream();
        await image.SaveAsJpegAsync(outMs, new JpegEncoder { Quality = 85 }, ct);
        return outMs.ToArray();
    }

    private string ResolveWebRoot()
    {
        var webRoot = _env.WebRootPath;
        if (string.IsNullOrEmpty(webRoot))
            webRoot = Path.Combine(_env.ContentRootPath, "wwwroot");
        return webRoot;
    }

    public Stream? OpenProof(string relativePath)
    {
        var abs = ResolveProofPath(relativePath);
        if (!File.Exists(abs)) return null;
        return File.OpenRead(abs);
    }

    // Same resolution as OpenProof: the DB stores a path relative to wwwroot,
    // which must be resolved against WebRootPath, not the process CWD.
    public bool DeleteProof(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return false;
        var abs = ResolveProofPath(relativePath);
        if (!File.Exists(abs)) return false;
        File.Delete(abs);
        return true;
    }

    private string ResolvePrivateRoot() => Path.Combine(_env.ContentRootPath, "App_Data");

    // Novo local (App_Data). Arquivos enviados antes desta mudança ainda podem estar no wwwroot:
    // se só existir lá, move para o local privado na hora e devolve o novo caminho.
    private string ResolveProofPath(string relativePath)
    {
        var rel = relativePath.TrimStart('/').Replace("/", Path.DirectorySeparatorChar.ToString());
        var privateRoot = Path.GetFullPath(ResolvePrivateRoot());
        var privatePath = Path.GetFullPath(Path.Combine(privateRoot, rel));
        if (!privatePath.StartsWith(privateRoot, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Caminho de comprovante inválido.");
        if (File.Exists(privatePath)) return privatePath;

        var legacy = Path.GetFullPath(Path.Combine(ResolveWebRoot(), rel));
        if (File.Exists(legacy))
        {
            Directory.CreateDirectory(Path.GetDirectoryName(privatePath)!);
            File.Move(legacy, privatePath);
        }
        return privatePath;
    }

    /// <summary>Move de uma vez os comprovantes antigos de wwwroot/uploads/proofs para App_Data.
    /// Chamado no start; seguro rodar sempre (não sobrescreve, só move o que falta).</summary>
    public int MigrateLegacyProofs()
    {
        var legacyRoot = Path.Combine(ResolveWebRoot(), "uploads", "proofs");
        if (!Directory.Exists(legacyRoot)) return 0;
        var moved = 0;
        foreach (var file in Directory.EnumerateFiles(legacyRoot, "*", SearchOption.AllDirectories))
        {
            var rel = Path.GetRelativePath(ResolveWebRoot(), file);
            var target = Path.Combine(ResolvePrivateRoot(), rel);
            if (File.Exists(target)) continue;
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            File.Move(file, target);
            moved++;
        }
        return moved;
    }
}
