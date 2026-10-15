using FluentValidation.TestHelper;
using BairroNow.Api.Models.DTOs;
using BairroNow.Api.Validators;

namespace BairroNow.Api.Tests.Validators;

public class RegisterRequestValidatorTests
{
    private readonly RegisterRequestValidator _validator = new();

    private static RegisterRequest ValidRequest() =>
        new("user@test.com", "ValidPass1!", "ValidPass1!", true);

    [Fact]
    public void ValidRequest_ShouldHaveNoErrors()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void EmptyEmail_ShouldHaveError()
    {
        var result = _validator.TestValidate(ValidRequest() with { Email = "" });
        result.ShouldHaveValidationErrorFor(x => x.Email)
            .WithErrorMessage("E-mail obrigatório.");
    }

    [Fact]
    public void InvalidEmail_ShouldHaveError()
    {
        var result = _validator.TestValidate(ValidRequest() with { Email = "notanemail" });
        result.ShouldHaveValidationErrorFor(x => x.Email)
            .WithErrorMessage("E-mail inválido.");
    }

    [Fact]
    public void ShortPassword_ShouldHaveError()
    {
        var request = ValidRequest() with { Password = "Short1!", ConfirmPassword = "Short1!" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Password)
            .WithErrorMessage("Senha deve ter no mínimo 8 caracteres.");
    }

    [Fact]
    public void PasswordWithoutUppercase_ShouldHaveError()
    {
        var request = ValidRequest() with { Password = "lowercase1!", ConfirmPassword = "lowercase1!" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Password)
            .WithErrorMessage("Senha deve conter pelo menos uma letra maiúscula.");
    }

    [Fact]
    public void PasswordWithoutNumber_ShouldHaveError()
    {
        var request = ValidRequest() with { Password = "Lowercase!", ConfirmPassword = "Lowercase!" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Password)
            .WithErrorMessage("Senha deve conter pelo menos um número.");
    }

    [Fact]
    public void PasswordWithoutSpecialChar_ShouldHaveError()
    {
        var request = ValidRequest() with { Password = "Lowercase1", ConfirmPassword = "Lowercase1" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Password)
            .WithErrorMessage("Senha deve conter pelo menos um caractere especial.");
    }

    [Fact]
    public void MismatchedPasswords_ShouldHaveError()
    {
        var request = ValidRequest() with { ConfirmPassword = "Different1!" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.ConfirmPassword)
            .WithErrorMessage("As senhas não coincidem.");
    }

    [Fact]
    public void PrivacyPolicyNotAccepted_ShouldHaveError()
    {
        var result = _validator.TestValidate(ValidRequest() with { AcceptedPrivacyPolicy = false });
        result.ShouldHaveValidationErrorFor(x => x.AcceptedPrivacyPolicy)
            .WithErrorMessage("Você deve aceitar a política de privacidade.");
    }
}
