using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class CountryEmailDocumentVerificationService : ICountryEmailDocumentVerificationService
{
    public const string CacheKey = "country_email_document_verification_all";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(60);

    private static readonly string[] ValidDocumentTypes =
    [
        "medications",
        "lab_results",
        "clinical_exams",
        "vaccinations",
        "billing_invoice",
        "travel_certificate",
        "irrelevant",
    ];

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMemoryCache _cache;
    private readonly ILogger<CountryEmailDocumentVerificationService> _logger;

    public CountryEmailDocumentVerificationService(
        IOptions<SupabaseOptions> options,
        IMemoryCache cache,
        ILogger<CountryEmailDocumentVerificationService> logger)
    {
        _options = options;
        _cache = cache;
        _logger = logger;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    public async Task<IReadOnlyList<CountryEmailDocumentVerificationDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return Array.Empty<CountryEmailDocumentVerificationDto>();

        return await _cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;
            return await LoadAllFromDbAsync(cancellationToken);
        }) ?? Array.Empty<CountryEmailDocumentVerificationDto>();
    }

    public async Task<CountryEmailDocumentVerificationDto?> TryUpdateAsync(
        string country,
        PatchCountryEmailDocumentVerificationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(country))
            return null;

        if (request.AllowNameOnlyDocumentTypes is not null)
            ValidateTypes(request.AllowNameOnlyDocumentTypes);
        if (request.BreedRequiredDocumentTypes is not null)
            ValidateTypes(request.BreedRequiredDocumentTypes);

        if (request.FuzzyMatchThreshold is { } t && (t < 0.5m || t > 1m))
            throw new ArgumentOutOfRangeException(nameof(request), "FuzzyMatchThreshold must be between 0.5 and 1.0");

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        var sets = new List<string>();
        var parameters = new List<NpgsqlParameter>
        {
            new("country", country),
        };

        if (request.AllowNameOnlyDocumentTypes is not null)
        {
            sets.Add("allow_name_only_document_types = @allowNameOnly");
            parameters.Add(new NpgsqlParameter("allowNameOnly", request.AllowNameOnlyDocumentTypes.ToArray()));
        }
        if (request.BreedRequiredDocumentTypes is not null)
        {
            sets.Add("breed_required_document_types = @breedRequired");
            parameters.Add(new NpgsqlParameter("breedRequired", request.BreedRequiredDocumentTypes.ToArray()));
        }
        if (request.FuzzyMatchThreshold is not null)
        {
            sets.Add("fuzzy_match_threshold = @threshold");
            parameters.Add(new NpgsqlParameter("threshold", request.FuzzyMatchThreshold.Value));
        }
        if (request.Enabled is not null)
        {
            sets.Add("enabled = @enabled");
            parameters.Add(new NpgsqlParameter("enabled", request.Enabled.Value));
        }
        if (request.Notes is not null)
        {
            sets.Add("notes = @notes");
            parameters.Add(new NpgsqlParameter("notes", request.Notes));
        }

        if (sets.Count == 0)
            return (await GetAllAsync(cancellationToken))
                .FirstOrDefault(x => string.Equals(x.Country, country, StringComparison.Ordinal));

        sets.Add("updated_at = now()");

        var sql = $"""
            UPDATE public.country_email_document_verification
            SET {string.Join(", ", sets)}
            WHERE country = @country
            RETURNING country, allow_name_only_document_types, breed_required_document_types,
                      fuzzy_match_threshold, enabled, notes, updated_at
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        foreach (var p in parameters)
            cmd.Parameters.Add(p);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        var row = ReadRow(reader);
        _cache.Remove(CacheKey);
        _logger.LogInformation("Updated email document verification rules for country {Country}", country);
        return row;
    }

    private static void ValidateTypes(IReadOnlyList<string> types)
    {
        foreach (var t in types)
        {
            if (!ValidDocumentTypes.Contains(t, StringComparer.Ordinal))
                throw new ArgumentException($"Invalid document type: {t}");
        }
    }

    private async Task<IReadOnlyList<CountryEmailDocumentVerificationDto>> LoadAllFromDbAsync(
        CancellationToken cancellationToken)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        const string sql = """
            SELECT country, allow_name_only_document_types, breed_required_document_types,
                   fuzzy_match_threshold, enabled, notes, updated_at
            FROM public.country_email_document_verification
            ORDER BY country
            """;

        await using var cmd = new NpgsqlCommand(sql, conn);
        var list = new List<CountryEmailDocumentVerificationDto>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
            list.Add(ReadRow(reader));

        return list;
    }

    private static CountryEmailDocumentVerificationDto ReadRow(NpgsqlDataReader reader)
    {
        return new CountryEmailDocumentVerificationDto
        {
            Country = reader.GetString(0),
            AllowNameOnlyDocumentTypes = reader.GetFieldValue<string[]>(1),
            BreedRequiredDocumentTypes = reader.GetFieldValue<string[]>(2),
            FuzzyMatchThreshold = reader.GetDecimal(3),
            Enabled = reader.GetBoolean(4),
            Notes = reader.IsDBNull(5) ? null : reader.GetString(5),
            UpdatedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6),
        };
    }
}
