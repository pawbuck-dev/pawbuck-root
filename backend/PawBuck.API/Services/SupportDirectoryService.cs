using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class SupportDirectoryService : ISupportDirectoryService
{
    private readonly IOptions<SupabaseOptions> _options;

    public SupportDirectoryService(IOptions<SupabaseOptions> options)
    {
        _options = options;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured");
        return new NpgsqlConnection(cs);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SupportUserRow>> ListUsersAsync(
        string segment,
        CancellationToken cancellationToken = default)
    {
        var s = (segment ?? "").Trim().ToLowerInvariant();
        string sql = s switch
        {
            "all" =>
                """
                SELECT id, email, created_at
                FROM auth.users
                ORDER BY created_at DESC NULLS LAST
                LIMIT 500
                """,
            "withpets" =>
                """
                SELECT DISTINCT u.id, u.email, u.created_at
                FROM auth.users u
                INNER JOIN public.pets p ON p.user_id = u.id AND p.deleted_at IS NULL
                ORDER BY u.created_at DESC NULLS LAST
                LIMIT 500
                """,
            "withhealth" =>
                """
                SELECT DISTINCT u.id, u.email, u.created_at
                FROM auth.users u
                WHERE EXISTS (
                  SELECT 1
                  FROM public.pets p
                  WHERE p.user_id = u.id
                    AND p.deleted_at IS NULL
                    AND (
                      EXISTS (SELECT 1 FROM public.vaccinations v WHERE v.pet_id = p.id)
                      OR EXISTS (SELECT 1 FROM public.medicines m WHERE m.pet_id = p.id)
                      OR EXISTS (SELECT 1 FROM public.lab_results l WHERE l.pet_id = p.id)
                      OR EXISTS (SELECT 1 FROM public.clinical_exams e WHERE e.pet_id = p.id)
                    )
                )
                ORDER BY u.created_at DESC NULLS LAST
                LIMIT 500
                """,
            _ => throw new ArgumentException("segment must be all, withPets, or withHealth.", nameof(segment)),
        };

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(sql, conn);
        var list = new List<SupportUserRow>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new SupportUserRow
            {
                Id = reader.GetGuid(0),
                Email = reader.IsDBNull(1) ? null : reader.GetString(1),
                CreatedAt = reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2),
            });
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SupportUserRow>> SearchUsersByEmailAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var q = query.Trim();
        if (q.Length < 2)
            return Array.Empty<SupportUserRow>();

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, email, created_at
            FROM auth.users
            WHERE email IS NOT NULL AND email ILIKE '%' || @q || '%'
            ORDER BY created_at DESC NULLS LAST
            LIMIT 25
            """,
            conn);
        cmd.Parameters.AddWithValue("q", q);

        var list = new List<SupportUserRow>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new SupportUserRow
            {
                Id = reader.GetGuid(0),
                Email = reader.IsDBNull(1) ? null : reader.GetString(1),
                CreatedAt = reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2),
            });
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SupportPetRow>> GetPetsForUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, user_id, name, breed, animal_type, date_of_birth, sex, created_at
            FROM public.pets
            WHERE user_id = @uid AND deleted_at IS NULL
            ORDER BY created_at DESC
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);

        var list = new List<SupportPetRow>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(ReadPet(reader));
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<SupportPetRow?> GetPetByIdAsync(Guid petId, CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT id, user_id, name, breed, animal_type, date_of_birth, sex, created_at
            FROM public.pets
            WHERE id = @id AND deleted_at IS NULL
            """,
            conn);
        cmd.Parameters.AddWithValue("id", petId);

        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;
        return ReadPet(reader);
    }

    private static SupportPetRow ReadPet(NpgsqlDataReader reader)
    {
        return new SupportPetRow
        {
            Id = reader.GetGuid(0),
            UserId = reader.GetGuid(1),
            Name = reader.GetString(2),
            Breed = reader.GetString(3),
            AnimalType = reader.GetString(4),
            DateOfBirth = reader.GetFieldValue<DateTime>(5),
            Sex = reader.GetString(6),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(7),
        };
    }
}
