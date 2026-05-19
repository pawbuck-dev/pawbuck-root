using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class MedicationAdrMatchDto
{
    public required string GenericName { get; init; }
    public required string LabelText { get; init; }
    public required string Severity { get; init; }
    public decimal Confidence { get; init; }
}

public interface IMedicationAdrService
{
    Task<IReadOnlyList<MedicationAdrMatchDto>> MatchForPetAsync(
        Guid petId,
        IReadOnlyList<string> symptomTaxonomyKeys,
        CancellationToken cancellationToken = default);
}

public sealed class MedicationAdrService : IMedicationAdrService
{
    private const decimal MinConfidence = 0.85m;
    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<MedicationAdrService> _logger;

    public MedicationAdrService(IOptions<SupabaseOptions> options, ILogger<MedicationAdrService> logger)
    {
        _options = options;
        _logger = logger;
    }

    public async Task<IReadOnlyList<MedicationAdrMatchDto>> MatchForPetAsync(
        Guid petId,
        IReadOnlyList<string> symptomTaxonomyKeys,
        CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs) || symptomTaxonomyKeys.Count == 0)
            return Array.Empty<MedicationAdrMatchDto>();

        var keys = symptomTaxonomyKeys
            .Where(k => !string.IsNullOrWhiteSpace(k))
            .Select(k => k.Trim().ToLowerInvariant())
            .Distinct()
            .ToArray();

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        const string medSql = """
            SELECT DISTINCT lower(trim(name)) AS med_name
            FROM public.medicines
            WHERE pet_id = @petId AND name IS NOT NULL AND trim(name) <> ''
            """;
        await using var medCmd = new NpgsqlCommand(medSql, conn);
        medCmd.Parameters.AddWithValue("petId", petId);
        var medNames = new List<string>();
        await using (var reader = await medCmd.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
                medNames.Add(reader.GetString(0));
        }

        if (medNames.Count == 0)
            return Array.Empty<MedicationAdrMatchDto>();

        const string adrSql = """
            SELECT generic_name, label_text, severity, confidence FROM (
              SELECT p.generic_name, e.label_text, e.severity, e.confidence
              FROM public.medication_adr_entries e
              INNER JOIN public.medication_products p ON p.id = e.product_id
              WHERE e.confidence >= @minConf
                AND e.symptom_taxonomy && @keys::text[]
                AND (
                  lower(p.generic_name) = ANY(@medNames)
                  OR EXISTS (
                    SELECT 1 FROM unnest(p.brand_names) b
                    WHERE lower(trim(b)) = ANY(@medNames)
                  )
                )
              UNION ALL
              SELECT coalesce(p.generic_name, o.generic_name), o.label_text, o.severity, o.confidence
              FROM public.medication_adr_overrides o
              LEFT JOIN public.medication_products p ON p.id = o.product_id
              WHERE o.active = true
                AND o.confidence >= @minConf
                AND o.symptom_taxonomy && @keys::text[]
                AND (
                  lower(coalesce(p.generic_name, o.generic_name, '')) = ANY(@medNames)
                  OR EXISTS (
                    SELECT 1 FROM unnest(coalesce(p.brand_names, '{}'::text[])) b
                    WHERE lower(trim(b)) = ANY(@medNames)
                  )
                )
            ) combined
            ORDER BY confidence DESC
            LIMIT 5
            """;

        await using var adrCmd = new NpgsqlCommand(adrSql, conn);
        adrCmd.Parameters.AddWithValue("minConf", MinConfidence);
        adrCmd.Parameters.AddWithValue("keys", keys);
        adrCmd.Parameters.AddWithValue("medNames", medNames.ToArray());

        var results = new List<MedicationAdrMatchDto>();
        await using var adrReader = await adrCmd.ExecuteReaderAsync(cancellationToken);
        while (await adrReader.ReadAsync(cancellationToken))
        {
            results.Add(new MedicationAdrMatchDto
            {
                GenericName = adrReader.GetString(0),
                LabelText = adrReader.GetString(1),
                Severity = adrReader.GetString(2),
                Confidence = adrReader.GetDecimal(3),
            });
        }

        return results;
    }
}
