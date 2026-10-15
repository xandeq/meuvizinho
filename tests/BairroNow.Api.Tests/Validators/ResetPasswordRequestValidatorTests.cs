using FluentValidation.TestHelper;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Validators;

namespace BairroNow.Api.Tests.Validators;

public class ResetPasswordRequestValidatorTests
{
    private readonly ResetPasswordRequestValidator _validator = new();

    private static ResetPasswordRequest ValidRequest() => new("token-123", "user@test.com", "NovaSenha1!");

    [Fact]
    public void ValidRequest_ShouldHaveNoErrors() =>
        _validator.TestValidate(ValidRequest()).ShouldNotHaveAnyValidationErrors();

    [Theory]
    [InlineData("curta1!", "Senha deve ter no mínimo 8 caracteres.")]
    [InlineData("semmaiuscula1!", "Senha deve conter pelo menos uma letra maiúscula.")]
    [InlineData("SemNumero!!", "Senha deve conter pelo menos um número.")]
    [InlineData("SemSimbolo123", "Senha deve conter pelo menos um caractere especial.")]
    public void WeakPassword_ShouldFail_LikeRegister(string password, string message) =>
        _validator.TestValidate(ValidRequest() with { NewPassword = password })
            .ShouldHaveValidationErrorFor(x => x.NewPassword)
            .WithErrorMessage(message);

    [Fact]
    public void EmptyToken_ShouldFail() =>
        _validator.TestValidate(ValidRequest() with { Token = "" })
            .ShouldHaveValidationErrorFor(x => x.Token);
}
