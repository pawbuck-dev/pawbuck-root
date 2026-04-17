using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class UserEntitlementService : IUserEntitlementService
{
    private readonly IOptions<SupabaseOptions> _options;

    public UserEntitlementService(IOptions<SupabaseOptions> options)
    {
        _options = options;
    }

    private NpgsqlConnection CreateConnection()
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            throw new InvalidOperationException("Database not configured (Supabase:ConnectionString).");
        return new NpgsqlConnection(cs);
    }

    /// <inheritdoc />
    public async Task<bool> HasActivePremiumAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.Value.ConnectionString))
            return false;

        const string sql = """
            SELECT 1
            FROM public.user_entitlements
            WHERE user_id = @userId
              AND plan = 'premium'
              AND (expires_at IS NULL OR expires_at > now())
            LIMIT 1
            """;

        await using var conn = CreateConnection();
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("userId", userId);
        var o = await cmd.ExecuteScalarAsync(cancellationToken);
        return o != null;
    }
}
