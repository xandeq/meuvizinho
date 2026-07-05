using BairroNow.Api.Services;

namespace BairroNow.Api.Tests.Services;

public class GroupInviteTokenTests
{
    private const string Secret = "test-secret-key-for-invites";
    private static readonly DateTime Now = new(2026, 7, 4, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void RoundTrip_ValidToken_ReturnsGroupId()
    {
        var token = GroupInviteToken.Create(42, Now.AddDays(7), Secret);
        Assert.True(GroupInviteToken.TryValidate(token, Secret, Now, out var groupId));
        Assert.Equal(42, groupId);
    }

    [Fact]
    public void Expired_ReturnsFalse()
    {
        var token = GroupInviteToken.Create(42, Now.AddMinutes(-1), Secret);
        Assert.False(GroupInviteToken.TryValidate(token, Secret, Now, out _));
    }

    [Fact]
    public void WrongSecret_ReturnsFalse()
    {
        var token = GroupInviteToken.Create(42, Now.AddDays(7), Secret);
        Assert.False(GroupInviteToken.TryValidate(token, "other-secret", Now, out _));
    }

    [Fact]
    public void TamperedGroupId_ReturnsFalse()
    {
        // Assina para o grupo 42 e tenta trocar o payload para o grupo 43
        var token = GroupInviteToken.Create(42, Now.AddDays(7), Secret);
        var forged = GroupInviteToken.Create(43, Now.AddDays(7), "attacker-guess");
        Assert.False(GroupInviteToken.TryValidate(forged, Secret, Now, out _));
        Assert.True(GroupInviteToken.TryValidate(token, Secret, Now, out var gid) && gid == 42);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-base64!!!")]
    [InlineData("YWJj")] // "abc" — sem estrutura payload|expiry|sig
    public void Malformed_ReturnsFalse(string? token)
        => Assert.False(GroupInviteToken.TryValidate(token, Secret, Now, out _));

    [Fact]
    public void EmptySecret_FailsClosed()
    {
        var token = GroupInviteToken.Create(42, Now.AddDays(7), Secret);
        Assert.False(GroupInviteToken.TryValidate(token, "", Now, out _));
    }

    [Fact]
    public void Token_IsUrlSafe()
    {
        var token = GroupInviteToken.Create(999999, Now.AddDays(7), Secret);
        Assert.DoesNotContain('+', token);
        Assert.DoesNotContain('/', token);
        Assert.DoesNotContain('=', token);
    }
}
