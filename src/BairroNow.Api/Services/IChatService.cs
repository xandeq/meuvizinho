using Microsoft.AspNetCore.Http;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Services;

public class ChatNotFoundException : Exception { public ChatNotFoundException(string m = "Conversa não encontrada.") : base(m) {} }
public class ChatForbiddenException : Exception { public ChatForbiddenException(string m) : base(m) {} }
public class ChatValidationException : Exception { public ChatValidationException(string m) : base(m) {} }

public interface IChatService
{
    Task<ConversationDto> CreateOrGetAsync(Guid buyerId, CreateConversationRequest dto, CancellationToken ct = default);
    Task<ConversationDto> CreateDirectAsync(Guid initiatorId, Guid recipientId, CancellationToken ct = default);
    Task<List<ConversationDto>> ListAsync(Guid userId, CancellationToken ct = default);
    Task<List<MessageDto>> GetHistoryAsync(Guid userId, int conversationId, DateTime? before, int limit, CancellationToken ct = default);
    Task<MessageDto> SendAsync(Guid senderId, int conversationId, string? text, IFormFile? image, CancellationToken ct = default);
    Task MarkReadAsync(Guid userId, int conversationId, CancellationToken ct = default);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);
}
