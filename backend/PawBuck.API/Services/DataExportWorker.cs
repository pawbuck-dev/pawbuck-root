using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using Npgsql;
using PawBuck.API.Configuration;
using PawBuck.API.Models;

namespace PawBuck.API.Services;

public sealed class DataExportWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<PrivacyExportOptions> _options;
    private readonly IOptions<SupabaseOptions> _supabase;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DataExportWorker> _logger;

    public DataExportWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<PrivacyExportOptions> options,
        IOptions<SupabaseOptions> supabase,
        IHttpClientFactory httpClientFactory,
        ILogger<DataExportWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _supabase = supabase;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var opts = _options.CurrentValue;
            if (!opts.Enabled)
            {
                await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);
                continue;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var export = scope.ServiceProvider.GetRequiredService<IPrivacyExportService>();
                var email = scope.ServiceProvider.GetRequiredService<IPrivacyEmailNotifier>();
                var queued = await export.GetQueuedRequestsAsync(opts.BatchSize, stoppingToken);

                foreach (var req in queued)
                {
                    await ProcessOneAsync(export, email, req, stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "DataExportWorker iteration failed");
            }

            var delay = Math.Clamp(opts.PollIntervalMinutes, 1, 60);
            await Task.Delay(TimeSpan.FromMinutes(delay), stoppingToken);
        }
    }

    private async Task ProcessOneAsync(
        IPrivacyExportService export,
        IPrivacyEmailNotifier email,
        DataExportRequestRow req,
        CancellationToken cancellationToken)
    {
        try
        {
            await export.MarkRunningAsync(req.Id, cancellationToken);
            var bundle = await export.BuildBundleAsync(req.UserId, cancellationToken);
            var json = JsonSerializer.Serialize(new
            {
                bundle.Version,
                bundle.ExportedAt,
                bundle.UserId,
                sections = bundle.Sections,
            });

            var opts = _options.CurrentValue;
            var path = $"{req.UserId:D}/{req.Id:D}/export.json";
            await UploadExportAsync(opts.ExportBucket, path, json, cancellationToken);

            var expires = DateTimeOffset.UtcNow.AddDays(opts.ExportExpiresDays);
            var signedUrl = await CreateSignedUrlAsync(
                opts.ExportBucket,
                path,
                opts.SignedUrlTtlSeconds,
                cancellationToken);

            await export.MarkReadyAsync(req.Id, path, expires, cancellationToken);

            var userEmail = await LoadUserEmailAsync(req.UserId, cancellationToken);
            if (!string.IsNullOrEmpty(userEmail))
                await email.SendExportReadyAsync(userEmail, signedUrl, expires, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Export failed for request {RequestId}", req.Id);
            await export.MarkFailedAsync(req.Id, ex.Message, cancellationToken);
        }
    }

    private async Task UploadExportAsync(
        string bucket,
        string path,
        string json,
        CancellationToken cancellationToken)
    {
        var url = _supabase.Value.Url?.Trim();
        var key = _supabase.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Supabase not configured for export upload.");

        var encoded = string.Join("/", path.Split('/').Select(Uri.EscapeDataString));
        var uploadUrl = $"{url.TrimEnd('/')}/storage/v1/object/{Uri.EscapeDataString(bucket)}/{encoded}";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Post, uploadUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        req.Content = new StringContent(json, Encoding.UTF8, "application/json");

        using var resp = await client.SendAsync(req, cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            var body = await resp.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Export upload failed: {resp.StatusCode} {body}");
        }
    }

    private async Task<string> CreateSignedUrlAsync(
        string bucket,
        string objectPath,
        int ttlSeconds,
        CancellationToken cancellationToken)
    {
        var url = _supabase.Value.Url?.Trim();
        var key = _supabase.Value.ServiceRoleKey?.Trim();
        if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Supabase not configured for signed URLs.");

        var encoded = string.Join("/", objectPath.Split('/').Select(Uri.EscapeDataString));
        var signUrl =
            $"{url.TrimEnd('/')}/storage/v1/object/sign/{Uri.EscapeDataString(bucket)}/{encoded}";

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        using var req = new HttpRequestMessage(HttpMethod.Post, signUrl);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        req.Content = new StringContent(
            $"{{\"expiresIn\":{ttlSeconds}}}",
            Encoding.UTF8,
            "application/json");

        using var response = await client.SendAsync(req, cancellationToken);
        var json = await response.Content.ReadAsStringAsync(cancellationToken);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        if (root.TryGetProperty("signedURL", out var p1) && p1.GetString() is { Length: > 0 } s1)
            return NormalizeSignedUrl(url, s1);
        if (root.TryGetProperty("signedUrl", out var p2) && p2.GetString() is { Length: > 0 } s2)
            return NormalizeSignedUrl(url, s2);
        throw new InvalidOperationException("Signed URL missing from storage response.");
    }

    private static string NormalizeSignedUrl(string supabaseUrl, string signed) =>
        signed.StartsWith("http", StringComparison.OrdinalIgnoreCase)
            ? signed
            : $"{supabaseUrl.TrimEnd('/')}/storage/v1{signed}";

    private async Task<string?> LoadUserEmailAsync(Guid userId, CancellationToken cancellationToken)
    {
        var cs = _supabase.Value.ConnectionString;
        if (string.IsNullOrWhiteSpace(cs))
            return null;

        await using var conn = new NpgsqlConnection(cs);
        await conn.OpenAsync(cancellationToken);
        await using var cmd = new NpgsqlCommand(
            "SELECT email FROM auth.users WHERE id = @id",
            conn);
        cmd.Parameters.AddWithValue("id", userId);
        var result = await cmd.ExecuteScalarAsync(cancellationToken);
        return result as string;
    }
}
