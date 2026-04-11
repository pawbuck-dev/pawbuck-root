using System.Net.Sockets;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public class SupportMetricsService : ISupportMetricsService
{
    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<SupportMetricsService> _logger;

    public SupportMetricsService(IOptions<SupabaseOptions> options, ILogger<SupportMetricsService> logger)
    {
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<SupportMetricsResponse> GetMetricsAsync(CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
        {
            _logger.LogWarning("Supabase ConnectionString missing");
            throw new InvalidOperationException(
                "Database not configured: paste Session pooler into ConnectionStrings:DefaultConnection or Supabase:ConnectionString (see appsettings.Local.example.json), or set Supabase:Url + Supabase:DbPassword, or env SUPABASE_DB_PASSWORD / composed connection env vars.");
        }

        await using var conn = new NpgsqlConnection(cs);
        try
        {
            await conn.OpenAsync(cancellationToken);
        }
        catch (PostgresException ex) when (ex.SqlState == "XX000" &&
                                           ex.MessageText.Contains("Tenant", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogError(ex, "Supabase pooler rejected tenant (wrong region or host).");
            throw new InvalidOperationException(
                "Session pooler rejected this tenant (Supavisor XX000). Paste the exact Session pooler string from Dashboard → Connect → Session pooler (Type: .NET) into Supabase:ConnectionString or ConnectionStrings:DefaultConnection, then restart. ConnectionStrings:DefaultConnection now takes precedence over DATABASE_URL — unset DATABASE_URL / SUPABASE_CONNECTION_STRING if they point at another project. If it still fails after that, confirm the database password and open a Supabase support ticket.",
                ex);
        }
        catch (PostgresException ex) when (ex.SqlState == "28P01")
        {
            _logger.LogError(ex, "Postgres password authentication failed.");
            throw new InvalidOperationException(
                "Database password rejected (28P01): use the database password from Supabase Dashboard → Project Settings → Database (reset it there if unsure—not the anon or service_role JWT). Update the Password= value in ConnectionStrings:DefaultConnection or Supabase:ConnectionString. If you use SUPABASE_CONNECTION_STRING, DATABASE_URL, or SUPABASE_DB_PASSWORD, update the password there. Passwords with ; or backslashes must be escaped in the connection string.",
                ex);
        }
        catch (NpgsqlException ex) when (ex.InnerException is SocketException)
        {
            _logger.LogError(ex, "Npgsql TCP connection failed (direct host often uses IPv6).");
            var ipv6 = ex.Message.Contains("2600:", StringComparison.Ordinal) ||
                       ex.Message.Contains("]:5432", StringComparison.Ordinal);
            throw new InvalidOperationException(
                (ipv6
                    ? "Cannot reach Supabase over IPv6 from this network (connection refused). "
                    : "Cannot open TCP connection to Postgres. ") +
                "Use the Session pooler (IPv4): in Supabase Dashboard → Connect → Session pooler, copy the full host (aws-0-REGION or aws-1-REGION — use the one shown) and set Supabase:PostgresHost, or set Supabase:PoolerAwsRegion and Supabase:PoolerAwsCluster. Or paste the full Session URI into Supabase:ConnectionString.",
                ex);
        }

        var result = new SupportMetricsResponse();

        await using (var cmd = new NpgsqlCommand(
                       "SELECT COUNT(*)::int FROM auth.users",
                       conn))
        {
            var o = await cmd.ExecuteScalarAsync(cancellationToken);
            result.TotalUsers = o is int i ? i : Convert.ToInt32(o);
        }

        await using (var cmd = new NpgsqlCommand(
                       """
                       SELECT COUNT(DISTINCT user_id)::int
                       FROM public.pets
                       WHERE deleted_at IS NULL
                       """,
                       conn))
        {
            var o = await cmd.ExecuteScalarAsync(cancellationToken);
            result.UsersWithPets = o is int i ? i : Convert.ToInt32(o);
        }

        await using (var cmd = new NpgsqlCommand(
                       """
                       SELECT COUNT(DISTINCT p.user_id)::int
                       FROM public.pets p
                       WHERE p.deleted_at IS NULL
                         AND (
                           EXISTS (SELECT 1 FROM public.vaccinations v WHERE v.pet_id = p.id)
                           OR EXISTS (SELECT 1 FROM public.medicines m WHERE m.pet_id = p.id)
                           OR EXISTS (SELECT 1 FROM public.lab_results l WHERE l.pet_id = p.id)
                           OR EXISTS (SELECT 1 FROM public.clinical_exams e WHERE e.pet_id = p.id)
                         )
                       """,
                       conn))
        {
            var o = await cmd.ExecuteScalarAsync(cancellationToken);
            result.UsersWithPetsAndHealthRecords = o is int i ? i : Convert.ToInt32(o);
        }

        var sevenDaysAgo = DateTime.UtcNow.AddDays(-7);
        await using (var cmd = new NpgsqlCommand(
                       "SELECT COUNT(*)::int FROM auth.users WHERE created_at >= @since",
                       conn))
        {
            cmd.Parameters.AddWithValue("since", sevenDaysAgo);
            var o = await cmd.ExecuteScalarAsync(cancellationToken);
            result.NewUsersLast7Days = o is int i ? i : Convert.ToInt32(o);
        }

        await using (var cmd = new NpgsqlCommand(
                       "SELECT COUNT(*)::int FROM public.pets WHERE deleted_at IS NULL",
                       conn))
        {
            var o = await cmd.ExecuteScalarAsync(cancellationToken);
            result.TotalPets = o is int i ? i : Convert.ToInt32(o);
        }

        var chartStart = DateTime.UtcNow.Date.AddDays(-13);
        var countsByDay = new Dictionary<DateOnly, int>();
        await using (var cmd = new NpgsqlCommand(
                       """
                       SELECT (created_at AT TIME ZONE 'UTC')::date AS d, COUNT(*)::int
                       FROM auth.users
                       WHERE created_at >= @start
                       GROUP BY 1
                       ORDER BY 1
                       """,
                       conn))
        {
            cmd.Parameters.AddWithValue("start", chartStart);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var d = reader.GetFieldValue<DateTime>(0).Date;
                var c = reader.GetInt32(1);
                countsByDay[DateOnly.FromDateTime(d)] = c;
            }
        }

        for (var i = 0; i < 14; i++)
        {
            var day = DateOnly.FromDateTime(chartStart.AddDays(i));
            countsByDay.TryGetValue(day, out var n);
            result.DailySignups.Add(new SupportDailySignupPoint { Date = day, Count = n });
        }

        return result;
    }
}
