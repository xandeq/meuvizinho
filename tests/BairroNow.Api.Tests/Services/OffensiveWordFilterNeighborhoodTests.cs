using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Services;

/// <summary>Palavras do dia a dia do bairro não podem esconder o post (ele sumia sem aviso).</summary>
public class OffensiveWordFilterNeighborhoodTests
{
    [Theory]
    [InlineData("A coleta de lixo orgânico passa todos os dias.")]
    [InlineData("Alguém empresta o macaco do carro? Furou o pneu.")]
    [InlineData("O porteiro foi racista com a minha filha, precisamos conversar.")]
    public void EverydayNeighborhoodText_IsNotFlagged(string text)
    {
        Assert.False(new OffensiveWordFilter().Contains(text));
    }

    [Fact]
    public void RealInsult_IsStillFlagged()
    {
        Assert.True(new OffensiveWordFilter().Contains("Esse vizinho é um idiota."));
    }
}
