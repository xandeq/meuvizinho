using FluentValidation;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-mail obrigatório.")
            .EmailAddress().WithMessage("E-mail inválido.");

        RuleFor(x => x.Password).StrongPassword();

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password).WithMessage("As senhas não coincidem.");

        RuleFor(x => x.AcceptedPrivacyPolicy)
            .Equal(true).WithMessage("Você deve aceitar a política de privacidade.");
    }
}
