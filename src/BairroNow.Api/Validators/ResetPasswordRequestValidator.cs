using FluentValidation;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Validators;

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token).NotEmpty().WithMessage("Token inválido ou expirado.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("E-mail obrigatório.")
            .EmailAddress().WithMessage("E-mail inválido.");

        RuleFor(x => x.NewPassword).StrongPassword();
    }
}
