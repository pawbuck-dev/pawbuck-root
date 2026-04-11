using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PawBuck.API.Models;
using SbClientOptions = Supabase.SupabaseOptions;

namespace PawBuck.API.Configuration;

/// <summary>
/// Community <see cref="Supabase.Client"/> (REST/Auth/Storage) when <see cref="SupabaseOptions.Url"/> and
/// <see cref="SupabaseOptions.AnonKey"/> are configured — same values as the Expo app. Raw SQL via Npgsql still needs
/// <see cref="SupabaseOptions.ConnectionString"/> or <see cref="SupabaseOptions.DbPassword"/>.
/// </summary>
public sealed class SupabaseClientAccessor
{
    public Supabase.Client? Client { get; }

    public SupabaseClientAccessor(IOptions<SupabaseOptions> options, ILogger<SupabaseClientAccessor> logger)
    {
        var o = options.Value;
        if (string.IsNullOrWhiteSpace(o.Url) || string.IsNullOrWhiteSpace(o.AnonKey))
        {
            logger.LogInformation(
                "Supabase REST client not created: Url or AnonKey is empty (optional if you only use Postgres).");
            Client = null;
            return;
        }

        var url = o.Url.Trim();
        var key = o.AnonKey.Trim();
        var sbOpts = new SbClientOptions { AutoConnectRealtime = false };
        var client = new Supabase.Client(url, key, sbOpts);
        client.InitializeAsync().GetAwaiter().GetResult();
        Client = client;
    }
}
