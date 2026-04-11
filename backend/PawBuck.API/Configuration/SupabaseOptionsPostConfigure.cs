using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Configuration;

/// <summary>
/// Resolves <see cref="SupabaseOptions.ConnectionString"/> from bound <c>Supabase:ConnectionString</c>,
/// <see cref="IConfiguration.GetConnectionString"/> <c>DefaultConnection</c> (Supabase Session pooler / .NET docs),
/// then <c>SUPABASE_CONNECTION_STRING</c>, then <c>DATABASE_URL</c>, then composed <c>Url</c> + <c>DbPassword</c>.
/// <c>DefaultConnection</c> is preferred before <c>DATABASE_URL</c> so a stale shell env does not override appsettings.
/// Then applies <see cref="SupabaseConnectionStringNormalizer"/> for direct <c>db.*</c> hosts when <c>PreferIpv4</c> is true.
/// </summary>
public sealed class SupabaseOptionsPostConfigure(
    IConfiguration configuration,
    IHttpClientFactory httpClientFactory,
    ILogger<SupabaseOptionsPostConfigure> logger) : IPostConfigureOptions<SupabaseOptions>
{
    public void PostConfigure(string? name, SupabaseOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.Url))
        {
            options.Url = Environment.GetEnvironmentVariable("SUPABASE_URL")
                          ?? Environment.GetEnvironmentVariable("EXPO_PUBLIC_SUPABASE_URL");
        }

        if (string.IsNullOrWhiteSpace(options.AnonKey))
        {
            options.AnonKey = Environment.GetEnvironmentVariable("SUPABASE_ANON_KEY")
                              ?? Environment.GetEnvironmentVariable("SUPABASE_KEY")
                              ?? Environment.GetEnvironmentVariable("EXPO_PUBLIC_SUPABASE_KEY");
        }

        string? npgsqlSource = null;
        if (string.IsNullOrWhiteSpace(options.ConnectionString))
        {
            var defaultCs = configuration.GetConnectionString("DefaultConnection");
            if (!string.IsNullOrWhiteSpace(defaultCs))
            {
                options.ConnectionString = defaultCs.Trim();
                npgsqlSource = "ConnectionStrings:DefaultConnection";
                logger.LogInformation(
                    "Supabase Npgsql connection string from ConnectionStrings:DefaultConnection (Supabase Dashboard → Connect → Session pooler → .NET).");
                LogIfEnvConnectionVarsIgnored(logger);
            }
        }

        if (string.IsNullOrWhiteSpace(options.ConnectionString))
        {
            var fromSupabaseEnv = Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING");
            var fromDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
            var envCs = fromSupabaseEnv ?? fromDatabaseUrl;
            if (!string.IsNullOrWhiteSpace(envCs))
            {
                options.ConnectionString = envCs.Trim();
                npgsqlSource = fromSupabaseEnv != null ? "SUPABASE_CONNECTION_STRING" : "DATABASE_URL";
                logger.LogInformation(
                    "Supabase Npgsql connection string taken from environment variable {EnvVar} (set Supabase:ConnectionString or ConnectionStrings:DefaultConnection in appsettings to override).",
                    npgsqlSource);
            }
        }

        if (string.IsNullOrWhiteSpace(options.ConnectionString))
        {
            var envUrl = Environment.GetEnvironmentVariable("SUPABASE_URL");
            var envPassword = Environment.GetEnvironmentVariable("SUPABASE_DB_PASSWORD")
                              ?? Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")
                              ?? Environment.GetEnvironmentVariable("PGPASSWORD");
            var envHost = Environment.GetEnvironmentVariable("SUPABASE_POSTGRES_HOST");
            var envRegion = Environment.GetEnvironmentVariable("SUPABASE_POOLER_AWS_REGION");
            var envCluster = Environment.GetEnvironmentVariable("SUPABASE_POOLER_AWS_CLUSTER");

            if (SupabaseConnectionStringComposer.TryCompose(options, envUrl, envPassword, envHost, envRegion, envCluster))
            {
                npgsqlSource = string.IsNullOrWhiteSpace(options.DbPassword) && !string.IsNullOrWhiteSpace(envPassword)
                    ? "composed from Url + password from env (SUPABASE_DB_PASSWORD / POSTGRES_PASSWORD / PGPASSWORD)"
                    : "composed from Url + Supabase:DbPassword (and optional pooler host/region)";
                logger.LogInformation("Supabase Npgsql connection string {Source}.", npgsqlSource);
            }
            else
            {
                var url = !string.IsNullOrWhiteSpace(options.Url) ? options.Url.Trim() : envUrl?.Trim();
                var passwordPresent = !string.IsNullOrWhiteSpace(options.DbPassword) ||
                                        !string.IsNullOrWhiteSpace(envPassword);
                if (!string.IsNullOrWhiteSpace(url) && passwordPresent &&
                    !SupabaseConnectionStringComposer.TryParseProjectRef(url, out _, out var parseError))
                    logger.LogWarning("Supabase: invalid project URL ({Message}).", parseError);
                else if (!string.IsNullOrWhiteSpace(url) && !passwordPresent)
                    logger.LogWarning(
                        "Supabase: set Supabase:DbPassword, SUPABASE_DB_PASSWORD, or POSTGRES_PASSWORD when using a project URL without ConnectionString.");
            }
        }

        var http = httpClientFactory.CreateClient(SupabaseConnectionStringNormalizer.DohHttpClientName);
        options.ConnectionString = SupabaseConnectionStringNormalizer.ApplyPreferIpv4(
            options.ConnectionString,
            options.PreferIpv4,
            logger,
            http);

        LogResolvedNpgsql(logger, options.ConnectionString);
    }

    private static void LogIfEnvConnectionVarsIgnored(ILogger logger)
    {
        var dbUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
        var supaCs = Environment.GetEnvironmentVariable("SUPABASE_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(dbUrl) && string.IsNullOrWhiteSpace(supaCs))
            return;
        logger.LogWarning(
            "DATABASE_URL and/or SUPABASE_CONNECTION_STRING are set but ignored because ConnectionStrings:DefaultConnection is set. Unset them if they point at a different project or host (they previously overrode appsettings and could cause Supavisor XX000).");
    }

    private static void LogResolvedNpgsql(ILogger logger, string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return;
        try
        {
            var b = new NpgsqlConnectionStringBuilder(connectionString);
            logger.LogInformation(
                "Supabase Npgsql resolved: Host={Host}; Port={Port}; Username={Username}; Database={Database}",
                b.Host,
                b.Port,
                b.Username,
                b.Database);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Could not parse connection string for logging.");
        }
    }
}
