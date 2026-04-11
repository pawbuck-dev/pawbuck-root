using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text.Json;
using Npgsql;

namespace PawBuck.API.Configuration;

/// <summary>
/// Supabase <c>db.*</c> hostnames often resolve to IPv6 first (or only AAAA from some resolvers); many networks have no usable IPv6 route to AWS.
/// Prefer IPv4 by picking A records from system DNS, then (for Supabase-managed hosts only) from Cloudflare DNS-over-HTTPS if needed.
/// </summary>
internal static class SupabaseConnectionStringNormalizer
{
    internal const string DohHttpClientName = "supabase-doh";

    public static string? ApplyPreferIpv4(
        string? connectionString,
        bool preferIpv4,
        ILogger logger,
        HttpClient? dohHttpClient = null)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || !preferIpv4)
            return connectionString;

        NpgsqlConnectionStringBuilder cb;
        try
        {
            cb = new NpgsqlConnectionStringBuilder(connectionString);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "Skipped PreferIpv4: could not parse connection string.");
            return connectionString;
        }

        var host = cb.Host?.Trim();
        if (string.IsNullOrWhiteSpace(host) || host.Contains(',', StringComparison.Ordinal))
            return connectionString;

        if (IsIpv4Literal(host) || IsIpv6Literal(host))
            return connectionString;

        // Shared Supavisor pooler hostnames already have IPv4 (A records). Do not rewrite to a literal IP: some edges
        // route tenants using the pooler hostname / SNI; "Tenant or user not found" (XX000) can occur when the IP path
        // does not match the project region or pooler routing table.
        if (host.Contains("pooler.supabase.com", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogDebug(
                "PreferIpv4: keeping pooler hostname {Host} (do not substitute IP for *.pooler.supabase.com).",
                host);
            return connectionString;
        }

        try
        {
            var all = Dns.GetHostAddresses(host);
            var v4 = FirstIpv4(all);
            if (v4 is not null)
            {
                ApplyIpv4Host(cb, host, v4, logger, "system DNS");
                return cb.ConnectionString;
            }

            if (dohHttpClient is not null && IsSupabaseManagedHost(host))
            {
                v4 = TryResolveIpv4ViaDoh(host, dohHttpClient, logger);
                if (v4 is not null)
                {
                    ApplyIpv4Host(cb, host, v4, logger, "DNS-over-HTTPS (A record)");
                    return cb.ConnectionString;
                }

                if (IsSupabaseDirectDbHost(host))
                {
                    logger.LogWarning(
                        "PreferIpv4: public DNS has no A record for {Host} (often IPv6-only). Use the Session pooler host from Supabase Dashboard → Connect (aws-0-REGION or aws-1-REGION per project, port 5432, user postgres.PROJECT_REF).",
                        host);
                }
            }

            logger.LogDebug(
                "PreferIpv4: no IPv4 for {Host} after system DNS and DoH ({Count} local address(es)). Using hostname (may use IPv6).",
                host,
                all.Length);
            return connectionString;
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "PreferIpv4: DNS failed for {Host}, using original connection string.", host);
            return connectionString;
        }
    }

    private static void ApplyIpv4Host(
        NpgsqlConnectionStringBuilder cb,
        string originalHost,
        IPAddress v4,
        ILogger logger,
        string via)
    {
        var ip = v4.ToString();
        logger.LogInformation(
            "PreferIpv4: connecting to {Host} via IPv4 {Ip} ({Via}).",
            originalHost,
            ip,
            via);
        cb.Host = ip;
    }

    private static IPAddress? FirstIpv4(IPAddress[] all)
    {
        foreach (var a in all)
        {
            if (a.AddressFamily == AddressFamily.InterNetwork)
                return a;
            if (a.AddressFamily == AddressFamily.InterNetworkV6 && a.IsIPv4MappedToIPv6)
                return a.MapToIPv4();
        }

        return null;
    }

    private static bool IsSupabaseManagedHost(string host) =>
        host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase)
        || host.Contains("pooler.supabase.com", StringComparison.OrdinalIgnoreCase);

    /// <summary><c>db.*.supabase.co</c> is often IPv6-only in public DNS (no A record); pooler hosts have A records.</summary>
    private static bool IsSupabaseDirectDbHost(string host) =>
        host.StartsWith("db.", StringComparison.OrdinalIgnoreCase) &&
        host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase);

    private static IPAddress? TryResolveIpv4ViaDoh(string host, HttpClient http, ILogger logger)
    {
        foreach (var (baseUrl, acceptDnsJson) in new (string Url, bool DnsJson)[]
                 {
                     ($"https://cloudflare-dns.com/dns-query?name={Uri.EscapeDataString(host)}&type=A", true),
                     ($"https://dns.google/resolve?name={Uri.EscapeDataString(host)}&type=1", false),
                 })
        {
            var ip = TryOneDoh(baseUrl, acceptDnsJson, http, logger, host);
            if (ip is not null)
                return ip;
        }

        return null;
    }

    private static IPAddress? TryOneDoh(string url, bool acceptDnsJson, HttpClient http, ILogger logger, string host)
    {
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            if (acceptDnsJson)
                req.Headers.TryAddWithoutValidation("Accept", "application/dns-json");
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
            using var resp = http.Send(req, cts.Token);
            resp.EnsureSuccessStatusCode();
            var json = resp.Content.ReadAsStringAsync(cts.Token).GetAwaiter().GetResult();
            return ParseFirstARecordFromDnsJson(json);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "PreferIpv4: DoH lookup failed for {Host} ({Url})", host, url);
            return null;
        }
    }

    private static IPAddress? ParseFirstARecordFromDnsJson(string json)
    {
        using var doc = JsonDocument.Parse(json);
        if (!doc.RootElement.TryGetProperty("Answer", out var answers))
            return null;
        foreach (var ans in answers.EnumerateArray())
        {
            if (!ans.TryGetProperty("type", out var typeEl))
                continue;
            var type = typeEl.ValueKind == JsonValueKind.Number ? typeEl.GetInt32() : int.TryParse(typeEl.GetString(), out var t) ? t : -1;
            if (type != 1)
                continue;
            if (!ans.TryGetProperty("data", out var dataEl))
                continue;
            var s = dataEl.GetString();
            if (!string.IsNullOrEmpty(s) &&
                IPAddress.TryParse(s, out var ip) &&
                ip.AddressFamily == AddressFamily.InterNetwork)
                return ip;
        }

        return null;
    }

    private static bool IsIpv4Literal(string host) =>
        IPAddress.TryParse(host, out var a) && a.AddressFamily == AddressFamily.InterNetwork;

    private static bool IsIpv6Literal(string host) =>
        IPAddress.TryParse(host, out var a) && a.AddressFamily == AddressFamily.InterNetworkV6;
}
