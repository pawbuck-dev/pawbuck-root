namespace PawBuck.API.Services;

/// <summary>
/// Produces vector embeddings for text (e.g. Gemini text-embedding-004, 768 dimensions).
/// </summary>
public interface IEmbeddingService
{
    /// <summary>
    /// Embeds the given text and returns a 768-dimensional vector for use with match_documentation.
    /// </summary>
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken cancellationToken = default);
}
