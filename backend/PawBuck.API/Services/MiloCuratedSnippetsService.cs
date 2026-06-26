using System.Text;
using Microsoft.Extensions.Options;
using Npgsql;
using NpgsqlTypes;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <inheritdoc />
public class MiloCuratedSnippetsService : IMiloCuratedSnippetsService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<MiloCuratedSnippetsService> _logger;

    public MiloCuratedSnippetsService(
        IOptions<SupabaseOptions> options,
        ILogger<MiloCuratedSnippetsService> logger)
    {
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<MiloCuratedSnippetDto>> GetGuidanceAsync(
        string? breedKey,
        string? animalType,
        string? topic,
        CancellationToken cancellationToken = default)
    {
        var connectionString = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            _logger.LogWarning("Supabase connection string not configured; curated snippets empty");
            return Array.Empty<MiloCuratedSnippetDto>();
        }

        var normalizedBreed = NormalizeBreedKey(breedKey);
        var normalizedAnimal = string.IsNullOrWhiteSpace(animalType) ? null : animalType.Trim();
        var topicFilter = string.IsNullOrWhiteSpace(topic) ? null : topic.Trim();

        const string sql = """
            SELECT id, topic, content, source_attribution
            FROM public.milo_curated_snippets s
            WHERE ($3::text IS NULL OR s.topic = $3)
              AND (
                s.animal_type IS NULL
                OR $2::text IS NULL
                OR lower(trim(s.animal_type)) = lower(trim($2))
              )
              AND (
                s.breed_key IS NULL
                OR $1::text IS NULL
                OR lower(trim(s.breed_key)) = lower(trim($1))
              )
            ORDER BY
              CASE
                WHEN $1::text IS NOT NULL AND s.breed_key IS NOT NULL
                     AND lower(trim(s.breed_key)) = lower(trim($1)) THEN 0
                WHEN s.breed_key IS NULL AND s.animal_type IS NOT NULL THEN 1
                ELSE 2
              END,
              s.topic
            LIMIT 12
            """;

        var results = new List<MiloCuratedSnippetDto>();
        await using var conn = new NpgsqlConnection(connectionString);
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = normalizedBreed ?? (object)DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = normalizedAnimal ?? (object)DBNull.Value });
        cmd.Parameters.Add(new NpgsqlParameter { NpgsqlDbType = NpgsqlDbType.Text, Value = topicFilter ?? (object)DBNull.Value });

        await using (var reader = await cmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                results.Add(new MiloCuratedSnippetDto
                {
                    Id = reader.GetGuid(0),
                    Topic = reader.GetString(1),
                    Content = reader.GetString(2),
                    SourceAttribution = reader.GetString(3),
                });
            }
        }

        return results;
    }

    /// <summary>Match Edge normalization: lowercase, spaces/hyphens to underscore, keep letters/digits/underscore.</summary>
    public static string? NormalizeBreedKey(string? breed)
    {
        if (string.IsNullOrWhiteSpace(breed))
            return null;
        var sb = new StringBuilder();
        foreach (var c in breed.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(c))
                sb.Append(c);
            else if (c is ' ' or '-' or '_')
                sb.Append('_');
        }
        var s = sb.ToString();
        while (s.Contains("__", StringComparison.Ordinal))
            s = s.Replace("__", "_", StringComparison.Ordinal);
        s = s.Trim('_');
        return string.IsNullOrEmpty(s) ? null : s;
    }
}
