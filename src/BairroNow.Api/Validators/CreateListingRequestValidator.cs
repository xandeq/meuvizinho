using FluentValidation;
using BairroNow.Api.Constants;
using BairroNow.Api.Models.DTOs;

namespace BairroNow.Api.Validators;

public class CreateListingRequestValidator : AbstractValidator<CreateListingRequest>
{
    public CreateListingRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().Length(3, 120);
        RuleFor(x => x.Description).NotEmpty().Length(10, 500);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0).LessThanOrEqualTo(999999); // 0 = doação
        RuleFor(x => x.CategoryCode)
            .NotEmpty()
            .Must(Categories.IsValidCategoryCode).WithMessage("Categoria inválida.");
        RuleFor(x => x).Must(x => Categories.IsValidSubcategoryCode(x.CategoryCode, x.SubcategoryCode))
            .WithMessage("Subcategoria inválida.");
    }
}

public class UpdateListingRequestValidator : AbstractValidator<UpdateListingRequest>
{
    public UpdateListingRequestValidator()
    {
        When(x => x.Title != null, () => RuleFor(x => x.Title!).Length(3, 120));
        When(x => x.Description != null, () => RuleFor(x => x.Description!).Length(10, 500));
        When(x => x.Price.HasValue, () => RuleFor(x => x.Price!.Value).GreaterThanOrEqualTo(0).LessThanOrEqualTo(999999));
        When(x => x.CategoryCode != null,
            () => RuleFor(x => x.CategoryCode!).Must(Categories.IsValidCategoryCode).WithMessage("Categoria inválida."));
    }
}

public class CreateRatingRequestValidator : AbstractValidator<CreateRatingRequest>
{
    public CreateRatingRequestValidator()
    {
        RuleFor(x => x.Stars).InclusiveBetween(1, 5);
        RuleFor(x => x.Comment).MaximumLength(500);
        RuleFor(x => x.ListingId).GreaterThan(0);
    }
}
