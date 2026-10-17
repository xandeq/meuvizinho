using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Models.Entities;
using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Chat;

/// <summary>
/// Conversa privada entre comprador e vendedor: um vizinho de fora não lê o histórico,
/// não manda mensagem nem mexe no "lido" — pela API REST (o hub já tem teste próprio).
/// </summary>
public class ChatAccessTests
{
    [Fact]
    public async Task Outsider_CannotReadSendOrMarkRead_InSomeoneElsesConversation()
    {
        var (svc, db, buyer, _, listingId) = ChatTestBuilder.Build();
        var conv = await svc.CreateOrGetAsync(buyer, new CreateConversationRequest { ListingId = listingId });
        await svc.SendAsync(buyer, conv.Id, "meu endereço é rua 3, 45", null);

        var outsider = Guid.NewGuid();
        db.Users.Add(new User { Id = outsider, Email = "o@x", PasswordHash = "h", DisplayName = "Curioso", BairroId = 1, IsVerified = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<ChatForbiddenException>(() => svc.GetHistoryAsync(outsider, conv.Id, null, 50));
        await Assert.ThrowsAsync<ChatForbiddenException>(() => svc.SendAsync(outsider, conv.Id, "oi", null));
        await Assert.ThrowsAsync<ChatForbiddenException>(() => svc.MarkReadAsync(outsider, conv.Id));

        (await db.Messages.CountAsync(m => m.ConversationId == conv.Id)).Should().Be(1);
    }

    [Fact]
    public async Task Participants_CanReadTheirConversation()
    {
        var (svc, _, buyer, seller, listingId) = ChatTestBuilder.Build();
        var conv = await svc.CreateOrGetAsync(buyer, new CreateConversationRequest { ListingId = listingId });
        await svc.SendAsync(buyer, conv.Id, "ainda disponível?", null);

        (await svc.GetHistoryAsync(seller, conv.Id, null, 50)).Should().ContainSingle(m => m.Text == "ainda disponível?");
    }
}
