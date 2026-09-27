namespace BairroNow.Api.Services;

public interface IFileStorageService
{
    Task<(string relativePath, string sha256)> SaveProofAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);
    Task<string> SaveImageAsync(Stream content, string originalFileName, string contentType, string folder, CancellationToken ct = default);
    Stream? OpenProof(string relativePath);
    bool DeleteProof(string relativePath);
}
