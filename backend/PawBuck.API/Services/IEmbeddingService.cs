namespace PawBuck.API.Services;

/// <summary>
/// Produces vector embeddings for text (Gemini <c>gemini-embedding-2</c> at 768 dimensions for documentation RAG queries).
/// </summary>
public interface IEmbeddingService
{
    /// <summary>
    /// Embeds the given text and returns a 768-dimensional vector for use with match_documentation.
    /// </summary>
    Task<float[]> GetEmbeddingAsync(string text, CancellationToken cancellationToken = default);
}
