using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

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
    public async Task<IReadOnlyList<DocumentationChunk>> GetContextAsync(
        string query,
        int matchCount = 5,
        CancellationToken cancellationToken = default,
        IReadOnlyList<string>? boostSourceFiles = null)
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
        var vectorHits = new List<DocumentationChunk>();

        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        await using (var cmd = new NpgsqlCommand(
                         "SELECT id, content, metadata, similarity FROM public.match_documentation(@query_embedding::extensions.vector(768), @match_count, 0.0)",
                         conn))
        {
            cmd.Parameters.AddWithValue("query_embedding", vectorString);
            cmd.Parameters.AddWithValue("match_count", matchCount);

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                vectorHits.Add(new DocumentationChunk
                {
                    Id = reader.GetGuid(0),
                    Content = reader.GetString(1),
                    MetadataJson = reader.IsDBNull(2) ? null : reader.GetString(2),
                    Similarity = reader.GetDouble(3),
                });
            }
        }

        if (boostSourceFiles == null || boostSourceFiles.Count == 0)
            return vectorHits;

        var boostRows = await FetchBoostChunksAsync(conn, boostSourceFiles, cancellationToken).ConfigureAwait(false);
        if (boostRows.Count == 0)
            return vectorHits;

        return MergeBoostedChunks(boostRows, vectorHits, matchCount);
    }

    private static async Task<List<DocumentationChunk>> FetchBoostChunksAsync(
        NpgsqlConnection conn,
        IReadOnlyList<string> boostSourceFiles,
        CancellationToken cancellationToken)
    {
        var files = boostSourceFiles.Where(f => !string.IsNullOrWhiteSpace(f)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (files.Length == 0)
            return new List<DocumentationChunk>();

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, content, metadata, 1.0::double precision AS similarity
            FROM public.documentation d
            WHERE d.metadata->>'source_file' = ANY(@files)
            ORDER BY d.metadata->>'source_file', COALESCE((d.metadata->>'chunk_index')::int, 0)
            LIMIT 12
            """,
            conn);
        cmd.Parameters.AddWithValue("files", files);

        var list = new List<DocumentationChunk>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
        while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
        {
            list.Add(new DocumentationChunk
            {
                Id = reader.GetGuid(0),
                Content = reader.GetString(1),
                MetadataJson = reader.IsDBNull(2) ? null : reader.GetString(2),
                Similarity = reader.GetDouble(3),
            });
        }

        return list;
    }

    /// <summary>
    /// Prefer boosted article chunks first, then fill with vector hits (dedupe by id, cap at <paramref name="matchCount"/>).
    /// </summary>
    private static List<DocumentationChunk> MergeBoostedChunks(
        IReadOnlyList<DocumentationChunk> boostRows,
        IReadOnlyList<DocumentationChunk> vectorHits,
        int matchCount)
    {
        var seen = new HashSet<Guid>();
        var merged = new List<DocumentationChunk>(matchCount);

        foreach (var row in boostRows)
        {
            if (!seen.Add(row.Id))
                continue;
            merged.Add(row);
            if (merged.Count >= matchCount)
                return merged;
        }

        foreach (var row in vectorHits)
        {
            if (!seen.Add(row.Id))
                continue;
            merged.Add(row);
            if (merged.Count >= matchCount)
                break;
        }

        return merged;
    }
}
