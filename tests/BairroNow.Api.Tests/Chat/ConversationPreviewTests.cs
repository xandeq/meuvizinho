using FluentAssertions;
using BairroNow.Api.Models.DTOs;
using Xunit;

namespace BairroNow.Api.Tests.Chat;

// A lista de conversas só trazia nome e anúncio; agora mostra a última mensagem e quem mandou.
public class ConversationPreviewTests
{
    [Fact]
    public async Task List_ShowsLastMessage_FromEachSide()
    {
        var (svc, _, buyer, seller, listingId) = ChatTestBuilder.Build();
        var conv = await svc.CreateOrGetAsync(buyer, new CreateConversationRequest { ListingId = listingId });
        await svc.SendAsync(buyer, conv.Id, "Ainda está disponível?", null);
        await Task.Delay(5);
        await svc.SendAsync(seller, conv.Id, "Sim! Pode buscar amanhã.", null);

        var forBuyer = (await svc.ListAsync(buyer)).Single();
        forBuyer.LastMessagePreview.Should().Be("Sim! Pode buscar amanhã.");
        forBuyer.LastMessageIsMine.Should().BeFalse();

        var forSeller = (await svc.ListAsync(seller)).Single();
        forSeller.LastMessageIsMine.Should().BeTrue();
    }

    [Fact]
    public async Task List_TruncatesLongPreview()
    {
        var (svc, _, buyer, _, listingId) = ChatTestBuilder.Build();
        var conv = await svc.CreateOrGetAsync(buyer, new CreateConversationRequest { ListingId = listingId });
        await svc.SendAsync(buyer, conv.Id, new string('a', 200), null);

        var dto = (await svc.ListAsync(buyer)).Single();
        dto.LastMessagePreview!.Length.Should().Be(81); // 80 + "…"
    }
}
