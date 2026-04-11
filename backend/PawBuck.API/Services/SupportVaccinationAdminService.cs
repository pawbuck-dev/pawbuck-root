using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class SupportVaccinationAdminService : ISupportVaccinationAdminService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly ISupportDirectoryService _directory;
    private readonly ILogger<SupportVaccinationAdminService> _logger;

    public SupportVaccinationAdminService(
        IOptions<SupabaseOptions> options,
        ISupportDirectoryService directory,
        ILogger<SupportVaccinationAdminService> logger)
    {
        _options = options;
        _directory = directory;
        _logger = logger;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured");
        return new NpgsqlConnection(cs);
    }

    private static DateTime UtcDate(DateOnly d) =>
        DateTime.SpecifyKind(d.ToDateTime(TimeOnly.MinValue), DateTimeKind.Utc);

    /// <inheritdoc />
    public async Task<IReadOnlyList<SupportVaccinationRow>> ListForPetAsync(
        Guid petId,
        CancellationToken cancellationToken = default)
    {
        if (await _directory.GetPetByIdAsync(petId, cancellationToken) is null)
            throw new KeyNotFoundException("Pet not found");

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, pet_id, user_id, name,
                   (date AT TIME ZONE 'UTC')::date,
                   CASE WHEN next_due_date IS NULL THEN NULL ELSE (next_due_date AT TIME ZONE 'UTC')::date END,
                   clinic_name, notes, document_url, created_at
            FROM public.vaccinations
            WHERE pet_id = @pet
            ORDER BY date DESC
            """,
            conn);
        cmd.Parameters.AddWithValue("pet", petId);

        var list = new List<SupportVaccinationRow>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(ReadRow(reader));
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<SupportVaccinationRow> CreateAsync(
        Guid petId,
        CreateSupportVaccinationRequest request,
        CancellationToken cancellationToken = default)
    {
        var pet = await _directory.GetPetByIdAsync(petId, cancellationToken)
                  ?? throw new KeyNotFoundException("Pet not found");

        var name = request.Name.Trim();
        if (name.Length == 0)
            throw new ArgumentException("Name is required");

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.vaccinations
              (pet_id, user_id, name, date, next_due_date, clinic_name, notes, document_url, created_at)
            VALUES
              (@pet_id, @user_id, @name, @date, @next_due, @clinic, @notes, @doc, now() AT TIME ZONE 'utc')
            RETURNING id, pet_id, user_id, name,
              (date AT TIME ZONE 'UTC')::date,
              CASE WHEN next_due_date IS NULL THEN NULL ELSE (next_due_date AT TIME ZONE 'UTC')::date END,
              clinic_name, notes, document_url, created_at
            """,
            conn);

        cmd.Parameters.AddWithValue("pet_id", petId);
        cmd.Parameters.AddWithValue("user_id", pet.UserId);
        cmd.Parameters.AddWithValue("name", name);
        cmd.Parameters.AddWithValue("date", UtcDate(request.Date));
        cmd.Parameters.AddWithValue("next_due", request.NextDueDate.HasValue ? UtcDate(request.NextDueDate.Value) : DBNull.Value);
        cmd.Parameters.AddWithValue("clinic", (object?)request.ClinicName?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("notes", (object?)request.Notes?.Trim() ?? DBNull.Value);
        cmd.Parameters.AddWithValue("doc", (object?)request.DocumentUrl?.Trim() ?? DBNull.Value);

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                throw new InvalidOperationException("Insert returned no row");
            return ReadRow(reader);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            _logger.LogWarning(ex, "Duplicate vaccination for pet {PetId}", petId);
            throw new InvalidOperationException(
                "DUPLICATE_VACCINATION: A vaccination with this name and date already exists for this pet.");
        }
    }

    /// <inheritdoc />
    public async Task<SupportVaccinationRow?> UpdateAsync(
        Guid vaccinationId,
        UpdateSupportVaccinationRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using (var load = new NpgsqlCommand(
                          "SELECT pet_id FROM public.vaccinations WHERE id = @id",
                          conn))
        {
            load.Parameters.AddWithValue("id", vaccinationId);
            var petObj = await load.ExecuteScalarAsync(cancellationToken);
            if (petObj is not Guid petId)
                return null;
            if (await _directory.GetPetByIdAsync(petId, cancellationToken) is null)
                return null;
        }

        var sets = new List<string>();
        var cmd = new NpgsqlCommand { Connection = conn };

        void addSet(string col, string param, object? value)
        {
            sets.Add($"{col} = @{param}");
            cmd.Parameters.AddWithValue(param, value ?? DBNull.Value);
        }

        if (request.Name is { } n && n.Trim().Length > 0)
            addSet("name", "name", n.Trim());
        if (request.Date.HasValue)
            addSet("date", "date", UtcDate(request.Date.Value));
        if (request.NextDueDate.HasValue)
            addSet("next_due_date", "next_due", UtcDate(request.NextDueDate.Value));
        if (request.ClinicName != null)
            addSet("clinic_name", "clinic", string.IsNullOrWhiteSpace(request.ClinicName) ? DBNull.Value : request.ClinicName.Trim());
        if (request.Notes != null)
            addSet("notes", "notes", string.IsNullOrWhiteSpace(request.Notes) ? DBNull.Value : request.Notes.Trim());
        if (request.DocumentUrl != null)
            addSet("document_url", "doc", string.IsNullOrWhiteSpace(request.DocumentUrl) ? DBNull.Value : request.DocumentUrl.Trim());

        if (sets.Count == 0)
        {
            await using var reload = new NpgsqlCommand(
                """
                SELECT id, pet_id, user_id, name,
                       (date AT TIME ZONE 'UTC')::date,
                       CASE WHEN next_due_date IS NULL THEN NULL ELSE (next_due_date AT TIME ZONE 'UTC')::date END,
                       clinic_name, notes, document_url, created_at
                FROM public.vaccinations WHERE id = @id
                """,
                conn);
            reload.Parameters.AddWithValue("id", vaccinationId);
            await using var r = await reload.ExecuteReaderAsync(cancellationToken);
            return await r.ReadAsync(cancellationToken) ? ReadRow(r) : null;
        }

        cmd.CommandText = $"""
            UPDATE public.vaccinations
            SET {string.Join(", ", sets)}
            WHERE id = @id
            RETURNING id, pet_id, user_id, name,
              (date AT TIME ZONE 'UTC')::date,
              CASE WHEN next_due_date IS NULL THEN NULL ELSE (next_due_date AT TIME ZONE 'UTC')::date END,
              clinic_name, notes, document_url, created_at
            """;
        cmd.Parameters.AddWithValue("id", vaccinationId);

        try
        {
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;
            return ReadRow(reader);
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            throw new InvalidOperationException(
                "DUPLICATE_VACCINATION: Update would duplicate name/date for this pet.");
        }
    }

    private static SupportVaccinationRow ReadRow(NpgsqlDataReader reader)
    {
        return new SupportVaccinationRow
        {
            Id = reader.GetGuid(0),
            PetId = reader.GetGuid(1),
            UserId = reader.GetGuid(2),
            Name = reader.GetString(3),
            Date = DateOnly.FromDateTime(reader.GetFieldValue<DateTime>(4)),
            NextDueDate = reader.IsDBNull(5) ? null : DateOnly.FromDateTime(reader.GetFieldValue<DateTime>(5)),
            ClinicName = reader.IsDBNull(6) ? null : reader.GetString(6),
            Notes = reader.IsDBNull(7) ? null : reader.GetString(7),
            DocumentUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(9),
        };
    }
}
