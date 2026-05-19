using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;
using PawBuck.MedicationAdr;

namespace PawBuck.API.Services;

public interface IMedicationAdrIngestionService
{
    Task<MedicationAdrIngestionResult> RunDailyMedIngestAsync(
        string sourceVersion,
        CancellationToken cancellationToken = default);
}

public sealed class MedicationAdrIngestionResult
{
    public required string Status { get; init; }
    public int ProductsUpserted { get; init; }
    public int EntriesUpserted { get; init; }
    public string? ErrorMessage { get; init; }
}

public sealed class MedicationAdrIngestionService : IMedicationAdrIngestionService
{
    private static readonly string[] DefaultDrugNames =
    [
        "carprofen", "oclacitinib", "enalapril", "meloxicam", "prednisone", "gabapentin", "fluoxetine",
    ];

    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMedicationAdrIngestRunner _runner;
    private readonly ILogger<MedicationAdrIngestionService> _logger;

    public MedicationAdrIngestionService(
        IOptions<SupabaseOptions> options,
        IMedicationAdrIngestRunner runner,
        ILogger<MedicationAdrIngestionService> logger)
    {
        _options = options;
        _runner = runner;
        _logger = logger;
    }

    public async Task<MedicationAdrIngestionResult> RunDailyMedIngestAsync(
        string sourceVersion,
        CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
        {
            return new MedicationAdrIngestionResult
            {
                Status = "failed",
                ErrorMessage = "Database not configured.",
            };
        }

        Guid runId;
        await using (var conn = new NpgsqlConnection(cs))
        {
            await conn.OpenAsync(cancellationToken);
            const string startSql = """
                INSERT INTO public.medication_adr_ingestion_runs (source, source_version, status)
                VALUES ('dailymed', @version, 'running')
                RETURNING id
                """;
            await using var cmd = new NpgsqlCommand(startSql, conn);
            cmd.Parameters.AddWithValue("version", sourceVersion);
            runId = (Guid)(await cmd.ExecuteScalarAsync(cancellationToken))!;
        }

        try
        {
            var parsed = await _runner.IngestDrugNamesAsync(DefaultDrugNames, cancellationToken);
            var products = 0;
            var entries = 0;

            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);

            foreach (var group in parsed.GroupBy(p => p.GenericName, StringComparer.OrdinalIgnoreCase))
            {
                var productId = await UpsertProductAsync(conn, group.Key, group.First().BrandNames, sourceVersion, cancellationToken);
                if (productId == null)
                    continue;
                products++;

                foreach (var entry in group)
                {
                    var upserted = await UpsertEntryAsync(conn, productId.Value, entry, sourceVersion, cancellationToken);
                    if (upserted)
                        entries++;
                }
            }

            const string finishSql = """
                UPDATE public.medication_adr_ingestion_runs
                SET status = 'completed', products_upserted = @p, entries_upserted = @e,
                    finished_at = timezone('utc', now())
                WHERE id = @id
                """;
            await using (var cmd = new NpgsqlCommand(finishSql, conn))
            {
                cmd.Parameters.AddWithValue("id", runId);
                cmd.Parameters.AddWithValue("p", products);
                cmd.Parameters.AddWithValue("e", entries);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }

            _logger.LogInformation(
                "DailyMed ingest {Version}: {Products} products, {Entries} ADR entries",
                sourceVersion,
                products,
                entries);

            return new MedicationAdrIngestionResult
            {
                Status = "completed",
                ProductsUpserted = products,
                EntriesUpserted = entries,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DailyMed ingest failed");
            await using var conn = new NpgsqlConnection(cs);
            await conn.OpenAsync(cancellationToken);
            const string failSql = """
                UPDATE public.medication_adr_ingestion_runs
                SET status = 'failed', error_message = @err, finished_at = timezone('utc', now())
                WHERE id = @id
                """;
            await using var cmd = new NpgsqlCommand(failSql, conn);
            cmd.Parameters.AddWithValue("id", runId);
            cmd.Parameters.AddWithValue("err", ex.Message);
            await cmd.ExecuteNonQueryAsync(cancellationToken);

            return new MedicationAdrIngestionResult
            {
                Status = "failed",
                ErrorMessage = ex.Message,
            };
        }
    }

    private static async Task<Guid?> UpsertProductAsync(
        NpgsqlConnection conn,
        string genericName,
        IReadOnlyList<string> brandNames,
        string sourceVersion,
        CancellationToken cancellationToken)
    {
        const string findSql = """
            SELECT id FROM public.medication_products WHERE lower(generic_name) = lower(@name) LIMIT 1
            """;
        await using (var find = new NpgsqlCommand(findSql, conn))
        {
            find.Parameters.AddWithValue("name", genericName);
            var existing = await find.ExecuteScalarAsync(cancellationToken);
            if (existing is Guid eg)
            {
                const string upd = """
                    UPDATE public.medication_products
                    SET brand_names = @brands, source = 'dailymed', source_version = @version,
                        updated_at = timezone('utc', now())
                    WHERE id = @id
                    """;
                await using var u = new NpgsqlCommand(upd, conn);
                u.Parameters.AddWithValue("id", eg);
                u.Parameters.AddWithValue("brands", brandNames.ToArray());
                u.Parameters.AddWithValue("version", sourceVersion);
                await u.ExecuteNonQueryAsync(cancellationToken);
                return eg;
            }
        }

        const string ins = """
            INSERT INTO public.medication_products (generic_name, brand_names, source, source_version)
            VALUES (@name, @brands, 'dailymed', @version)
            RETURNING id
            """;
        await using var cmd = new NpgsqlCommand(ins, conn);
        cmd.Parameters.AddWithValue("name", genericName.ToLowerInvariant());
        cmd.Parameters.AddWithValue("brands", brandNames.ToArray());
        cmd.Parameters.AddWithValue("version", sourceVersion);
        var scalar = await cmd.ExecuteScalarAsync(cancellationToken);
        return scalar is Guid g ? g : null;
    }

    private static async Task<bool> UpsertEntryAsync(
        NpgsqlConnection conn,
        Guid productId,
        ParsedAdrEntry entry,
        string sourceVersion,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO public.medication_adr_entries (
              product_id, symptom_taxonomy, severity, label_text, confidence, source, source_version)
            SELECT @pid, @tax, 'soft', @label, @conf, 'dailymed', @version
            WHERE NOT EXISTS (
              SELECT 1 FROM public.medication_adr_entries e
              WHERE e.product_id = @pid
                AND e.label_text = @label
                AND e.source = 'dailymed'
            )
            """;
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("pid", productId);
        cmd.Parameters.AddWithValue("tax", entry.SymptomTaxonomy.ToArray());
        cmd.Parameters.AddWithValue("label", entry.LabelText);
        cmd.Parameters.AddWithValue("conf", entry.Confidence);
        cmd.Parameters.AddWithValue("version", sourceVersion);
        return await cmd.ExecuteNonQueryAsync(cancellationToken) > 0;
    }
}
