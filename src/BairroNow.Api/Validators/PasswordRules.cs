using FluentValidation;

namespace BairroNow.Api.Validators;

/// <summary>
/// Regra de senha única do cadastro e da redefinição. Espelhada em
/// packages/shared-validators (PASSWORD_RULES), que o site e o app mostram ao vivo.
/// </summary>
public static class PasswordRules
{
    public static IRuleBuilderOptions<T, string> StrongPassword<T>(this IRuleBuilder<T, string> rule) =>
        rule
            .NotEmpty().WithMessage("Senha obrigatória.")
            .MinimumLength(8).WithMessage("Senha deve ter no mínimo 8 caracteres.")
            .Matches("[A-Z]").WithMessage("Senha deve conter pelo menos uma letra maiúscula.")
            .Matches("[0-9]").WithMessage("Senha deve conter pelo menos um número.")
            .Matches("[^a-zA-Z0-9]").WithMessage("Senha deve conter pelo menos um caractere especial.");
}
