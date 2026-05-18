namespace PawBuck.API.Models;

public sealed class CountryEmailDocumentVerificationDto
{
    public required string Country { get; init; }
    public required IReadOnlyList<string> AllowNameOnlyDocumentTypes { get; init; }
    public required IReadOnlyList<string> BreedRequiredDocumentTypes { get; init; }
    public required decimal FuzzyMatchThreshold { get; init; }
    public required bool Enabled { get; init; }
    public string? Notes { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public sealed class CountryEmailDocumentVerificationListResponse
{
    public required IReadOnlyList<CountryEmailDocumentVerificationDto> Items { get; init; }
}

public sealed class PatchCountryEmailDocumentVerificationRequest
{
    public IReadOnlyList<string>? AllowNameOnlyDocumentTypes { get; init; }
    public IReadOnlyList<string>? BreedRequiredDocumentTypes { get; init; }
    public decimal? FuzzyMatchThreshold { get; init; }
    public bool? Enabled { get; init; }
    public string? Notes { get; init; }
}
