using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

/// <summary>Expo Push API (same contract as consumer Supabase <c>sendPushNotifications</c>).</summary>
public sealed class ExpoPushService : IExpoPushService
{
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptions<SupabaseOptions> _options;
    private readonly ILogger<ExpoPushService> _logger;

    public ExpoPushService(
        IHttpClientFactory httpClientFactory,
        IOptions<SupabaseOptions> options,
        ILogger<ExpoPushService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task SendToUserAsync(
        Guid userId,
        string title,
        string body,
        IReadOnlyDictionary<string, string>? data,
        CancellationToken cancellationToken = default)
    {
        var cs = _options.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return;

        var tokens = new List<string>();
        await using (var conn = new NpgsqlConnection(cs))
        {
            await conn.OpenAsync(cancellationToken);
            await using var cmd = new NpgsqlCommand(
                """
                SELECT DISTINCT token
                FROM public.push_tokens
                WHERE user_id = @uid
                """,
                conn);
            cmd.Parameters.AddWithValue("uid", userId);
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                if (!reader.IsDBNull(0))
                {
                    var t = reader.GetString(0);
                    if (!string.IsNullOrWhiteSpace(t))
                        tokens.Add(t.Trim());
                }
            }
        }

        if (tokens.Count == 0)
        {
            _logger.LogDebug("ExpoPush: no tokens for user {UserId}", userId);
            return;
        }

        var payload = tokens.Distinct(StringComparer.Ordinal).Select(token =>
        {
            var o = new Dictionary<string, object?>
            {
                ["to"] = token,
                ["title"] = title,
                ["body"] = body,
                ["sound"] = "default",
            };
            if (data is { Count: > 0 })
                o["data"] = data.ToDictionary(k => k.Key, v => (object)v.Value);
            return o;
        }).ToList();

        var client = _httpClientFactory.CreateClient("ExpoPush");
        using var request = new HttpRequestMessage(HttpMethod.Post, ExpoPushUrl)
        {
            Content = JsonContent.Create(payload),
        };

        using var response = await client.SendAsync(request, cancellationToken);
        var text = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
            _logger.LogWarning("Expo push HTTP {Status}: {Body}", (int)response.StatusCode, text.Length > 400 ? text[..400] : text);
    }
}
