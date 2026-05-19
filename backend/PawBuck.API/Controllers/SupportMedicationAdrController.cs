using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;
using PawBuck.API.Security;
using PawBuck.API.Services;

namespace PawBuck.API.Controllers;

[ApiController]
[Route("api/support/medication-adr")]
[Authorize(Policy = AuthorizationPolicies.AdminSupport)]
public sealed class SupportMedicationAdrController : ControllerBase
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMedicationAdrIngestionService _ingestion;

    public SupportMedicationAdrController(
        IOptions<SupabaseOptions> options,
        IMedicationAdrIngestionService ingestion)
    {
        _options = options;
        _ingestion = ingestion;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<MedicationAdrStatsResponse>> Stats(CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return Ok(new MedicationAdrStatsResponse());

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        async Task<int> Count(string sql)
        {
            await using var cmd = new NpgsqlCommand(sql, conn);
            return Convert.ToInt32(await cmd.ExecuteScalarAsync(cancellationToken));
        }

        var products = await Count("SELECT count(*)::int FROM public.medication_products");
        var entries = await Count("SELECT count(*)::int FROM public.medication_adr_entries");
        var overrides = await Count("SELECT count(*)::int FROM public.medication_adr_overrides WHERE active = true");

        string? lastRun = null;
        await using (var cmd = new NpgsqlCommand(
                         """
                         SELECT coalesce(source_version, '') || ' · ' || status || ' · ' || coalesce(finished_at::text, started_at::text)
                         FROM public.medication_adr_ingestion_runs
                         ORDER BY started_at DESC LIMIT 1
                         """,
                         conn))
        {
            var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
            lastRun = scalar as string;
        }

        return Ok(new MedicationAdrStatsResponse
        {
            ProductCount = products,
            EntryCount = entries,
            OverrideCount = overrides,
            LastIngestionRun = lastRun,
        });
    }

    [HttpPost("ingest")]
    public async Task<ActionResult<MedicationAdrIngestionResult>> Ingest(
        [FromQuery] string? sourceVersion,
        CancellationToken cancellationToken)
    {
        var version = string.IsNullOrWhiteSpace(sourceVersion) ? "dailymed-manual" : sourceVersion.Trim();
        var result = await _ingestion.RunDailyMedIngestAsync(version, cancellationToken);
        return Ok(result);
    }

    [HttpGet("overrides")]
    public async Task<ActionResult<IReadOnlyList<MedicationAdrOverrideRow>>> ListOverrides(CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return Ok(Array.Empty<MedicationAdrOverrideRow>());

        var rows = new List<MedicationAdrOverrideRow>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            SELECT o.id, coalesce(p.generic_name, o.generic_name), o.label_text, o.symptom_taxonomy, o.confidence, o.active
            FROM public.medication_adr_overrides o
            LEFT JOIN public.medication_products p ON p.id = o.product_id
            ORDER BY o.created_at DESC
            LIMIT 100
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(new MedicationAdrOverrideRow
            {
                Id = reader.GetGuid(0),
                GenericName = reader.IsDBNull(1) ? null : reader.GetString(1),
                LabelText = reader.GetString(2),
                SymptomTaxonomy = reader.GetFieldValue<string[]>(3),
                Confidence = reader.GetDecimal(4),
                Active = reader.GetBoolean(5),
            });
        }

        return Ok(rows);
    }

    [HttpPost("overrides")]
    public async Task<ActionResult<MedicationAdrOverrideRow>> CreateOverride(
        [FromBody] CreateMedicationAdrOverrideRequest body,
        CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return BadRequest();

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        const string sql = """
            INSERT INTO public.medication_adr_overrides (
              generic_name, symptom_taxonomy, severity, label_text, confidence, active, notes)
            VALUES (@generic, @tax, 'soft', @label, @conf, true, @notes)
            RETURNING id
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("generic", body.GenericName?.Trim().ToLowerInvariant() ?? "");
        cmd.Parameters.AddWithValue("tax", body.SymptomTaxonomy);
        cmd.Parameters.AddWithValue("label", body.LabelText.Trim());
        cmd.Parameters.AddWithValue("conf", body.Confidence);
        cmd.Parameters.AddWithValue("notes", (object?)body.Notes ?? DBNull.Value);
        var id = (Guid)(await cmd.ExecuteScalarAsync(cancellationToken))!;

        return Ok(new MedicationAdrOverrideRow
        {
            Id = id,
            GenericName = body.GenericName,
            LabelText = body.LabelText,
            SymptomTaxonomy = body.SymptomTaxonomy,
            Confidence = body.Confidence,
            Active = true,
        });
    }

    [HttpPost("overrides/{id:guid}/deactivate")]
    public async Task<IActionResult> DeactivateOverride(Guid id, CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return BadRequest();

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            "UPDATE public.medication_adr_overrides SET active = false WHERE id = @id",
            conn);
        cmd.Parameters.AddWithValue("id", id);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
        return Ok(new { ok = true });
    }
}

public sealed class MedicationAdrOverrideRow
{
    public Guid Id { get; init; }
    public string? GenericName { get; init; }
    public required string LabelText { get; init; }
    public required string[] SymptomTaxonomy { get; init; }
    public decimal Confidence { get; init; }
    public bool Active { get; init; }
}

public sealed class CreateMedicationAdrOverrideRequest
{
    public string? GenericName { get; set; }
    public required string LabelText { get; set; }
    public required string[] SymptomTaxonomy { get; set; }
    public decimal Confidence { get; set; } = 0.95m;
    public string? Notes { get; set; }
}

public sealed class MedicationAdrStatsResponse
{
    public int ProductCount { get; init; }
    public int EntryCount { get; init; }
    public int OverrideCount { get; init; }
    public string? LastIngestionRun { get; init; }
}
