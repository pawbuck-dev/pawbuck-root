using Microsoft.Extensions.Options;
using Npgsql;

namespace PawBuck.API.Services;

/// <summary>
/// Retrieves context from the documentation table via match_documentation (cosine similarity).
/// </summary>
public class KnowledgeBaseService : IKnowledgeBaseService
{
    private readonly IEmbeddingService _embeddingService;
    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<KnowledgeBaseService> _logger;

    public KnowledgeBaseService(
        IEmbeddingService embeddingService,
        IOptions<SupabaseOptions> options,
        ILogger<KnowledgeBaseService> logger)
    {
        _embeddingService = embeddingService;
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<DocumentationChunk>> GetContextAsync(string query, int matchCount = 5, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(query))
            return Array.Empty<DocumentationChunk>();

        var connectionString = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _logger.LogWarning("Supabase connection string not configured");
            return Array.Empty<DocumentationChunk>();
        }

        var embedding = await _embeddingService.GetEmbeddingAsync(query, cancellationToken);
        if (embedding.Length == 0)
            return Array.Empty<DocumentationChunk>();

        var vectorString = "[" + string.Join(",", embedding.Select(x => x.ToString("R", System.Globalization.CultureInfo.InvariantCulture))) + "]";
        var results = new List<DocumentationChunk>();

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            "SELECT id, content, metadata, similarity FROM public.match_documentation(@query_embedding::extensions.vector(768), @match_count, 0.0)",
            conn);
        cmd.Parameters.AddWithValue("query_embedding", vectorString);
        cmd.Parameters.AddWithValue("match_count", matchCount);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            results.Add(new DocumentationChunk
            {
                Id = reader.GetGuid(0),
                Content = reader.GetString(1),
                MetadataJson = reader.IsDBNull(2) ? null : reader.GetString(2),
                Similarity = reader.GetDouble(3)
            });
        }

        return results;
    }
}

/// <summary>
/// Supabase / Postgres connection for RAG (match_documentation).
/// </summary>
public class SupabaseOptions
{
    public const string SectionName = "Supabase";
    /// <summary>Postgres connection string (e.g. from Supabase project settings).</summary>
    public string? ConnectionString { get; set; }
}
