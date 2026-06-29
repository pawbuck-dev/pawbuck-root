namespace PawBuck.API.Models;

public sealed class CareNudgeDto
{
    public required string Kind { get; init; }
    public required string DedupeKey { get; init; }
    public required Guid PetId { get; init; }
    public string? PetName { get; init; }
    public int Priority { get; init; }
    public required string Title { get; init; }
    public required string Body { get; init; }
    public required string DeepLink { get; init; }
    public string? EvidenceTable { get; init; }
    public Guid? EvidenceId { get; init; }
    public IReadOnlyList<string> Channels { get; init; } = ["in_app"];
}

public sealed class CareNudgeDigestDto
{
    public required string Title { get; init; }
    public required string Body { get; init; }
    public required string DedupeKey { get; init; }
    public int NudgeCount { get; init; }
}

public sealed class CareNudgePetInput
{
    public required Guid PetId { get; init; }
    public required Guid UserId { get; init; }
    public string? PetName { get; init; }
    public string? PetCountry { get; init; }
    public IReadOnlyList<CareNudgeVaccinationInput> Vaccinations { get; init; } = [];
    public IReadOnlyList<CareNudgeMedicationInput> Medications { get; init; } = [];
    public IReadOnlyList<CareNudgeMissingRequiredInput> MissingRequired { get; init; } = [];
}

public sealed class CareNudgeVaccinationInput
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Date { get; init; }
    public string? NextDueDate { get; init; }
}

public sealed class CareNudgeMedicationInput
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public string? NextDoseDateYmd { get; init; }
}

public sealed class CareNudgeMissingRequiredInput
{
    public required string CanonicalKey { get; init; }
    public required string VaccineName { get; init; }
}

public sealed class CareNudgeRunResultDto
{
    public int UsersProcessed { get; init; }
    public int DigestsSent { get; init; }
    public int VetRemindersSent { get; init; }
    public int DocumentRemindersSent { get; init; }
}

public sealed class CareNudgeDismissalRow
{
    public required Guid PetId { get; init; }
    public required string NudgeKind { get; init; }
    public DateOnly? DismissedUntil { get; init; }
}

public sealed class CareNudgeDismissRequest
{
    public required Guid PetId { get; init; }
    public required string NudgeKind { get; init; }
    /// <summary>Snooze days; null = permanent dismiss for this pet+kind.</summary>
    public int? SnoozeDays { get; init; }
}
