namespace PawBuck.API.Models;

public class SupportMetricsResponse
{
    public int TotalUsers { get; set; }
    public int UsersWithPets { get; set; }
    /// <summary>Users who have at least one non-deleted pet with ≥1 vaccination, medicine, lab result, or clinical exam.</summary>
    public int UsersWithPetsAndHealthRecords { get; set; }
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
    public DateTime DateOfBirth { get; set; }
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
