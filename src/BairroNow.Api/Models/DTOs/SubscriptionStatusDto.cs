namespace BairroNow.Api.Models.DTOs;

public record SubscriptionStatusDto(
    string Plan,
    DateTime? PlanExpiresAt,
    bool IsOnTrial,
    bool IsEligibleForTrial,
    int? DaysRemaining
);

public record GrantPremiumRequest(
    Guid UserId,
    int DurationDays
);
