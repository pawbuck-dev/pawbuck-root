using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>
/// Retrieves curated milo_curated_snippets rows (SQL filter; no vectors).
/// </summary>
public interface IMiloCuratedSnippetsService
{
    /// <summary>
    /// Returns matching snippets: breed-specific rows first when breedKey matches, then species-wide, then fully general.
    /// </summary>
    Task<IReadOnlyList<MiloCuratedSnippetDto>> GetGuidanceAsync(
        string? breedKey,
        string? animalType,
        string? topic,
        CancellationToken cancellationToken = default);
}
