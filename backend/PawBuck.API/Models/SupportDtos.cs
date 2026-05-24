namespace PawBuck.API.Models;

public class SupportMetricsResponse
{
    public int TotalUsers { get; set; }
    public int UsersWithPets { get; set; }
    /// <summary>Users who have at least one non-deleted pet with ≥1 vaccination, medicine, lab result, or clinical exam.</summary>
    public int UsersWithPetsAndHealthRecords { get; set; }

    /// <summary>Users created in the last 7 days (UTC).</summary>
    public int NewUsersLast7Days { get; set; }

    /// <summary>Non-deleted pets.</summary>
    public int TotalPets { get; set; }

    /// <summary>Daily user sign-ups for the last 14 days (UTC date + count).</summary>
    public List<SupportDailySignupPoint> DailySignups { get; set; } = [];
}

public class SupportDailySignupPoint
{
    public DateOnly Date { get; set; }
    public int Count { get; set; }
}

public class SupportUserDirectoryRow
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
    public int PetCount { get; set; }
}

public class SupportUserDirectoryResponse
{
    public List<SupportUserDirectoryRow> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class SupportPetExplorerRow
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? OwnerEmail { get; set; }
    public string Name { get; set; } = "";
    public string Breed { get; set; } = "";
    public string AnimalType { get; set; } = "";
    /// <summary>good = has health data; attention = overdue vaccine; minimal = no records.</summary>
    public string HealthStatus { get; set; } = "";
}

public class SupportHealthTimelineEvent
{
    public DateTimeOffset OccurredAt { get; set; }
    public string EventType { get; set; } = "";
    public string Title { get; set; } = "";
    public Guid PetId { get; set; }
    public string PetName { get; set; } = "";
    public Guid? RelatedId { get; set; }
}

public class SupportUserRow
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public DateTimeOffset? CreatedAt { get; set; }
}

public class SupportPetRow
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public string Breed { get; set; } = "";
    public string AnimalType { get; set; } = "";
    public DateTime? DateOfBirth { get; set; }
    public string Sex { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
}

public class SupportVaccinationRow
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    public DateOnly Date { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public string? ClinicName { get; set; }
    public string? Notes { get; set; }
    public string? DocumentUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class CreateSupportVaccinationRequest
{
    public string Name { get; set; } = "";
    public DateOnly Date { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public string? ClinicName { get; set; }
    public string? Notes { get; set; }
    public string? DocumentUrl { get; set; }
}

public class UpdateSupportVaccinationRequest
{
    public string? Name { get; set; }
    public DateOnly? Date { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public string? ClinicName { get; set; }
    public string? Notes { get; set; }
    public string? DocumentUrl { get; set; }
}
