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
            Breed = reader.IsDBNull(3) ? "" : reader.GetString(3),
            AnimalType = reader.IsDBNull(4) ? "" : reader.GetString(4),
            DateOfBirth = reader.IsDBNull(5) ? null : reader.GetFieldValue<DateTime>(5),
            Sex = reader.IsDBNull(6) ? "" : reader.GetString(6),
            CreatedAt = reader.GetFieldValue<DateTimeOffset>(7),
        };
    }

    /// <inheritdoc />
    public async Task<SupportUserDirectoryResponse> GetUserDirectoryAsync(
        string? query,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var q = (query ?? "").Trim();
        var offset = (page - 1) * pageSize;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        int total;
        await using (var countCmd = new NpgsqlCommand(
                           """
                           SELECT COUNT(*)::int
                           FROM auth.users u
                           LEFT JOIN public.user_preferences up ON up.user_id = u.id
                           WHERE (
                             @q = ''
                             OR (u.email IS NOT NULL AND u.email ILIKE '%' || @q || '%')
                             OR COALESCE(up.full_name, '') ILIKE '%' || @q || '%'
                           )
                           """,
                           conn))
        {
            countCmd.Parameters.AddWithValue("q", q);
            var totalObj = await countCmd.ExecuteScalarAsync(cancellationToken);
            total = totalObj is int ti ? ti : Convert.ToInt32(totalObj);
        }

        await using (var listCmd = new NpgsqlCommand(
                """
                SELECT u.id, u.email, u.created_at,
                       COALESCE(up.full_name, '') AS display_name,
                       COALESCE(pc.cnt, 0)::int AS pet_count,
                       CASE
                         WHEN ue.plan = 'premium' THEN 'individual'
                         WHEN ue.plan IN ('individual', 'family') THEN ue.plan
                         ELSE 'free'
                       END AS plan,
                       COALESCE(ue.is_founding_member, FALSE) AS is_founding_member
                FROM auth.users u
                LEFT JOIN public.user_preferences up ON up.user_id = u.id
                LEFT JOIN public.user_entitlements ue ON ue.user_id = u.id
                LEFT JOIN (
                  SELECT user_id, COUNT(*)::bigint AS cnt
                  FROM public.pets
                  WHERE deleted_at IS NULL
                  GROUP BY user_id
                ) pc ON pc.user_id = u.id
                WHERE (
                  @q = ''
                  OR (u.email IS NOT NULL AND u.email ILIKE '%' || @q || '%')
                  OR COALESCE(up.full_name, '') ILIKE '%' || @q || '%'
                )
                ORDER BY u.created_at DESC NULLS LAST
                LIMIT @take OFFSET @skip
                """,
                conn))
        {
            listCmd.Parameters.AddWithValue("q", q);
            listCmd.Parameters.AddWithValue("take", pageSize);
            listCmd.Parameters.AddWithValue("skip", offset);

            var items = new List<SupportUserDirectoryRow>();
            await using (var reader = await listCmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    items.Add(new SupportUserDirectoryRow
                    {
                        Id = reader.GetGuid(0),
                        Email = reader.IsDBNull(1) ? null : reader.GetString(1),
                        CreatedAt = reader.IsDBNull(2) ? null : reader.GetFieldValue<DateTimeOffset>(2),
                        DisplayName = reader.IsDBNull(3) ? null : reader.GetString(3),
                        PetCount = reader.GetInt32(4),
                        Plan = reader.IsDBNull(5) ? "free" : reader.GetString(5),
                        IsFoundingMember = !reader.IsDBNull(6) && reader.GetBoolean(6),
                    });
                }
            }

            return new SupportUserDirectoryResponse
            {
                Items = items,
                TotalCount = total,
                Page = page,
                PageSize = pageSize,
            };
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SupportPetExplorerRow>> SearchPetsAsync(
        string query,
        CancellationToken cancellationToken = default)
    {
        var q = query.Trim();
        if (q.Length < 2)
            return Array.Empty<SupportPetExplorerRow>();

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT
              p.id,
              p.user_id,
              u.email,
              p.name,
              p.breed,
              p.animal_type,
              CASE
                WHEN EXISTS (
                  SELECT 1 FROM public.vaccinations v
                  WHERE v.pet_id = p.id AND v.next_due_date IS NOT NULL AND v.next_due_date < CURRENT_DATE
                ) THEN 'attention'
                WHEN EXISTS (SELECT 1 FROM public.vaccinations v WHERE v.pet_id = p.id)
                  OR EXISTS (SELECT 1 FROM public.medicines m WHERE m.pet_id = p.id)
                  OR EXISTS (SELECT 1 FROM public.lab_results l WHERE l.pet_id = p.id)
                  OR EXISTS (SELECT 1 FROM public.clinical_exams e WHERE e.pet_id = p.id)
                THEN 'good'
                ELSE 'minimal'
              END AS health_status
            FROM public.pets p
            LEFT JOIN auth.users u ON u.id = p.user_id
            WHERE p.deleted_at IS NULL AND p.name ILIKE '%' || @q || '%'
            ORDER BY p.name ASC
            LIMIT 50
            """,
            conn);
        cmd.Parameters.AddWithValue("q", q);

        var list = new List<SupportPetExplorerRow>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new SupportPetExplorerRow
            {
                Id = reader.GetGuid(0),
                UserId = reader.GetGuid(1),
                OwnerEmail = reader.IsDBNull(2) ? null : reader.GetString(2),
                Name = reader.GetString(3),
                Breed = reader.GetString(4),
                AnimalType = reader.GetString(5),
                HealthStatus = reader.GetString(6),
            });
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<SupportHealthTimelineEvent>> GetUserHealthTimelineAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);

        await using var cmd = new NpgsqlCommand(
            """
            SELECT occurred_at, event_type, title, related_id, pet_id, pet_name
            FROM (
              SELECT v.created_at AS occurred_at, 'vaccination'::text AS event_type, v.name AS title,
                     v.id AS related_id, p.id AS pet_id, p.name AS pet_name
              FROM public.vaccinations v
              INNER JOIN public.pets p ON p.id = v.pet_id AND p.user_id = @uid AND p.deleted_at IS NULL
              UNION ALL
              SELECT m.updated_at, 'medicine', m.name, m.id, p.id, p.name
              FROM public.medicines m
              INNER JOIN public.pets p ON p.id = m.pet_id AND p.user_id = @uid AND p.deleted_at IS NULL
              UNION ALL
              SELECT COALESCE(l.updated_at, l.created_at), 'lab_result', l.test_type, l.id, p.id, p.name
              FROM public.lab_results l
              INNER JOIN public.pets p ON p.id = l.pet_id AND p.user_id = @uid AND p.deleted_at IS NULL
              UNION ALL
              SELECT COALESCE(e.updated_at, e.created_at), 'clinical_exam', COALESCE(e.exam_type, 'Exam'), e.id, p.id, p.name
              FROM public.clinical_exams e
              INNER JOIN public.pets p ON p.id = e.pet_id AND p.user_id = @uid AND p.deleted_at IS NULL
              UNION ALL
              SELECT COALESCE(j.updated_at, j.created_at), 'journal', j.domain, j.id, p.id, p.name
              FROM public.pet_journal_entries j
              INNER JOIN public.pets p ON p.id = j.pet_id AND p.user_id = @uid AND p.deleted_at IS NULL
            ) t
            ORDER BY occurred_at DESC
            LIMIT 200
            """,
            conn);
        cmd.Parameters.AddWithValue("uid", userId);

        var list = new List<SupportHealthTimelineEvent>();
        await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new SupportHealthTimelineEvent
            {
                OccurredAt = reader.GetFieldValue<DateTimeOffset>(0),
                EventType = reader.GetString(1),
                Title = reader.GetString(2),
                RelatedId = reader.GetGuid(3),
                PetId = reader.GetGuid(4),
                PetName = reader.GetString(5),
            });
        }

        return list;
    }
}
