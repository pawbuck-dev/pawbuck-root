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
        return input == null ? Array.Empty<CareNudgeDto>() : CareNudgeRules.BuildForPet(input, DateTime.UtcNow);
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

        return CareNudgeRules.Rank(all);
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
        await using (var petCmd = new NpgsqlCommand(
                   """
                   SELECT name, country FROM public.pets
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

        return new CareNudgePetInput
        {
            PetId = petId,
            UserId = userId,
            PetName = petName,
            PetCountry = petCountry,
            Vaccinations = vaccinations,
            Medications = [],
            MissingRequired = [],
        };
    }
}
