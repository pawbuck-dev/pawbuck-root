using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Configuration;

/// <summary>
/// Builds an Npgsql connection string from the same Supabase project URL the mobile app uses plus the
/// database password from the dashboard (not the anon key). See <see cref="SupabaseOptions"/>.
/// </summary>
internal static class SupabaseConnectionStringComposer
{
    /// <summary>Returns true if a new connection string was written to <paramref name="options"/>.</summary>
    internal static bool TryCompose(
        SupabaseOptions options,
        string? envSupabaseUrl,
        string? envDbPassword,
        string? envPostgresHost,
        string? envPoolerAwsRegion,
        string? envPoolerAwsCluster)
    {
        if (!string.IsNullOrWhiteSpace(options.ConnectionString))
            return false;

        var url = FirstNonEmpty(options.Url, envSupabaseUrl);
        var password = FirstNonEmpty(options.DbPassword, envDbPassword);
        var hostOverride = FirstNonEmpty(options.PostgresHost, envPostgresHost);
        if (string.IsNullOrWhiteSpace(hostOverride))
        {
            var region = FirstNonEmpty(options.PoolerAwsRegion, envPoolerAwsRegion);
            if (!string.IsNullOrWhiteSpace(region))
            {
                var cluster = (FirstNonEmpty(options.PoolerAwsCluster, envPoolerAwsCluster, "0") ?? "0").Trim();
                if (cluster != "0" && cluster != "1")
                    cluster = "0";
                hostOverride = $"aws-{cluster}-{region.Trim()}.pooler.supabase.com";
            }
        }

        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(password))
            return false;

        if (!TryParseProjectRef(url, out var projectRef, out _))
            return false;

        var host = string.IsNullOrWhiteSpace(hostOverride)
            ? $"db.{projectRef}.supabase.co"
            : hostOverride.Trim();

        var username = host.Contains("pooler.supabase.com", StringComparison.OrdinalIgnoreCase)
            ? $"postgres.{projectRef}"
            : "postgres";

        var cb = new NpgsqlConnectionStringBuilder
        {
            Host = host,
            Port = 5432,
            Database = "postgres",
            Username = username,
            Password = password,
            SslMode = SslMode.Require,
        };

        options.ConnectionString = cb.ConnectionString;
        return true;
    }

    internal static bool TryParseProjectRef(string supabaseUrl, out string projectRef, out string? error)
    {
        projectRef = "";
        error = null;

        var trimmed = supabaseUrl.Trim();
        if (!trimmed.Contains("://", StringComparison.Ordinal))
            trimmed = "https://" + trimmed;

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
        {
            error = "Supabase URL must be an https URL like https://YOUR_REF.supabase.co";
            return false;
        }

        if (!string.Equals(uri.Scheme, "https", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(uri.Scheme, "http", StringComparison.OrdinalIgnoreCase))
        {
            error = "Supabase URL must use https (or http)";
            return false;
        }

        var host = uri.Host;
        const string suffix = ".supabase.co";
        if (!host.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
        {
            error = $"Supabase URL host must end with {suffix}";
            return false;
        }

        projectRef = host[..^suffix.Length];
        if (string.IsNullOrWhiteSpace(projectRef) || projectRef.Contains('.'))
        {
            error = "Could not read project reference from Supabase URL host";
            return false;
        }

        return true;
    }

    private static string? FirstNonEmpty(params string?[] values)
    {
        foreach (var v in values)
        {
            if (!string.IsNullOrWhiteSpace(v))
                return v.Trim();
        }

        return null;
    }
}
