namespace PawBuck.API.Services;

/// <summary>
/// Retrieves relevant documentation chunks for RAG (vector similarity search).
/// </summary>
public interface IKnowledgeBaseService
{
    /// <summary>
    /// Returns context chunks from the documentation table that match the query (cosine similarity).
    /// Empty when no context is found or when similarity is below threshold.
    /// </summary>
    /// <param name="boostSourceFiles">
    /// Optional <c>metadata.source_file</c> values (e.g. <c>06-family-sharing.md</c>) to prepend when the
    /// question clearly targets those articles—reduces misses when vector similarity ranks unrelated chunks first.
    /// </param>
    Task<IReadOnlyList<DocumentationChunk>> GetContextAsync(
        string query,
        int matchCount = 5,
        CancellationToken cancellationToken = default,
        IReadOnlyList<string>? boostSourceFiles = null);
}

/// <summary>
/// A single documentation chunk returned by match_documentation.
/// </summary>
public class DocumentationChunk
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    /// <summary>Raw JSON metadata from the documentation row.</summary>
    public string? MetadataJson { get; set; }
    public double Similarity { get; set; }
}
