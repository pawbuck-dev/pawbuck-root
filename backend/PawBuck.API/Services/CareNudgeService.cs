using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class CareNudgeService : ICareNudgeService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly IMiloPetFactsService _petFacts;

    public CareNudgeService(IOptions<SupabaseOptions> options, IMiloPetFactsService petFacts)
    {
        _options = options;
        _petFacts = petFacts;
    }

    public async Task<IReadOnlyList<CareNudgeDto>> GetNudgesForPetAsync(
        Guid userId,
        Guid petId,
        CancellationToken cancellationToken = default)
    {
        if (!await _petFacts.VerifyPetAccessAsync(userId, petId, cancellationToken))
            return Array.Empty<CareNudgeDto>();

        var input = await LoadPetInputAsync(petId, userId, cancellationToken);
        if (input == null)
            return Array.Empty<CareNudgeDto>();

        var nudges = CareNudgeRules.BuildForPet(input, DateTime.UtcNow);
        var dismissals = await LoadDismissalsAsync(userId, cancellationToken);
        return CareNudgeRules.ApplyDismissals(nudges, dismissals, DateOnly.FromDateTime(DateTime.UtcNow));
    }

    public async Task<IReadOnlyList<CareNudgeDto>> GetNudgesForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return Array.Empty<CareNudgeDto>();

        var petIds = new List<Guid>();
        await using (var conn = new NpgsqlConnection(cs))
        {
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                """
                SELECT id FROM public.pets
                WHERE user_id = @uid AND deleted_at IS NULL
                """,
                conn);
            cmd.Parameters.AddWithValue("uid", userId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
                petIds.Add(reader.GetGuid(0));
        }

        var all = new List<CareNudgeDto>();
        foreach (var petId in petIds)
        {
            var input = await LoadPetInputAsync(petId, userId, cancellationToken);
            if (input != null)
                all.AddRange(CareNudgeRules.BuildForPet(input, DateTime.UtcNow));
        }

        var dismissals = await LoadDismissalsAsync(userId, cancellationToken);
        return CareNudgeRules.ApplyDismissals(CareNudgeRules.Rank(all), dismissals, DateOnly.FromDateTime(DateTime.UtcNow));
    }

    public async Task DismissNudgeAsync(
        Guid userId,
        CareNudgeDismissRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await _petFacts.VerifyPetAccessAsync(userId, request.PetId, cancellationToken))
            throw new InvalidOperationException("Pet not found or access denied.");

        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured.");

        DateOnly? until = null;
        if (request.SnoozeDays is > 0)
            until = DateOnly.FromDateTime(DateTime.UtcNow.Date.AddDays(request.SnoozeDays.Value));

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            INSERT INTO public.care_nudge_dismissals (user_id, pet_id, nudge_kind, dismissed_until, updated_at)
            VALUES (@uid, @pet, @kind, @until, timezone('utc', now()))
            ON CONFLICT (user_id, pet_id, nudge_kind)
            DO UPDATE SET dismissed_until = EXCLUDED.dismissed_until, updated_at = timezone('utc', now())
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        cmd.Parameters.AddWithValue("pet", request.PetId);
        cmd.Parameters.AddWithValue("kind", request.NudgeKind.Trim());
        cmd.Parameters.AddWithValue("until", (object?)until ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    internal async Task<CareNudgePetInput?> LoadPetInputAsync(
        Guid petId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return null;

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);

        string? petName = null;
        string? petCountry = null;
        string? animalType = null;
        await using (var petCmd = new NpgsqlCommand(
                   """
                   SELECT name, country, animal_type FROM public.pets
                   WHERE id = @id AND user_id = @uid AND deleted_at IS NULL
                   """,
                   conn))
        {
            petCmd.Parameters.AddWithValue("id", petId);
            petCmd.Parameters.AddWithValue("uid", userId);
            await using var reader = await petCmd.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return null;
            petName = reader.GetString(0);
            petCountry = reader.IsDBNull(1) ? null : reader.GetString(1);
            animalType = reader.IsDBNull(2) ? null : reader.GetString(2);
        }

        var vaccinations = new List<CareNudgeVaccinationInput>();
        await using (var vacCmd = new NpgsqlCommand(
                   """
                   SELECT id, name, date::text, next_due_date::text
                   FROM public.vaccinations
                   WHERE pet_id = @pet
                   """,
                   conn))
        {
            vacCmd.Parameters.AddWithValue("pet", petId);
            await using var reader = await vacCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                vaccinations.Add(new CareNudgeVaccinationInput
                {
                    Id = reader.GetGuid(0),
                    Name = reader.GetString(1),
                    Date = reader.GetString(2),
                    NextDueDate = reader.IsDBNull(3) ? null : reader.GetString(3),
                });
            }
        }

        var missingRequired = await LoadMissingRequiredAsync(
            conn,
            petCountry,
            animalType,
            vaccinations,
            cancellationToken);

        return new CareNudgePetInput
        {
            PetId = petId,
            UserId = userId,
            PetName = petName,
            PetCountry = petCountry,
            Vaccinations = vaccinations,
            Medications = [],
            MissingRequired = missingRequired,
        };
    }

    private static async Task<IReadOnlyList<CareNudgeMissingRequiredInput>> LoadMissingRequiredAsync(
        NpgsqlConnection conn,
        string? country,
        string? animalType,
        IReadOnlyList<CareNudgeVaccinationInput> vaccinations,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(country) || string.IsNullOrWhiteSpace(animalType))
            return [];

        var requirements = new List<CareNudgeRequiredVaccineResolver.RequirementRow>();
        await using (var cmd = new NpgsqlCommand(
                   """
                   SELECT vaccine_name, canonical_key, is_required
                   FROM public.country_vaccine_requirements
                   WHERE country = @country AND lower(animal_type) = lower(@animal)
                   """,
                   conn))
        {
            cmd.Parameters.AddWithValue("country", country.Trim());
            cmd.Parameters.AddWithValue("animal", animalType.Trim());
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                requirements.Add(new CareNudgeRequiredVaccineResolver.RequirementRow
                {
                    VaccineName = reader.GetString(0),
                    CanonicalKey = reader.GetString(1),
                    IsRequired = reader.GetBoolean(2),
                });
            }
        }

        if (requirements.Count == 0)
            return [];

        var equivalencies = new List<CareNudgeRequiredVaccineResolver.EquivalencyRow>();
        await using (var eqCmd = new NpgsqlCommand(
                   """
                   SELECT canonical_name, variant_name
                   FROM public.vaccine_equivalencies
                   """,
                   conn))
        {
            await using var reader = await eqCmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                equivalencies.Add(new CareNudgeRequiredVaccineResolver.EquivalencyRow
                {
                    CanonicalName = reader.GetString(0),
                    VariantName = reader.GetString(1),
                });
            }
        }

        return CareNudgeRequiredVaccineResolver.ComputeMissing(
            vaccinations,
            requirements,
            equivalencies,
            DateTime.UtcNow);
    }

    private async Task<IReadOnlyList<CareNudgeDismissalRow>> LoadDismissalsAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return [];

        var rows = new List<CareNudgeDismissalRow>();
        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            """
            SELECT pet_id, nudge_kind, dismissed_until::text
            FROM public.care_nudge_dismissals
            WHERE user_id = @uid
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            DateOnly? until = null;
            if (!reader.IsDBNull(2) && DateOnly.TryParse(reader.GetString(2), out var parsed))
                until = parsed;

            rows.Add(new CareNudgeDismissalRow
            {
                PetId = reader.GetGuid(0),
                NudgeKind = reader.GetString(1),
                DismissedUntil = until,
            });
        }

        return rows;
    }
}
