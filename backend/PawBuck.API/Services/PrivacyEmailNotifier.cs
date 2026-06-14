using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using PawBuck.API.Configuration;

namespace PawBuck.API.Services;

public interface IPrivacyEmailNotifier
{
    Task SendExportReadyAsync(string toEmail, string downloadUrl, DateTimeOffset expiresAt, CancellationToken cancellationToken);
}

public sealed class PrivacyEmailNotifier : IPrivacyEmailNotifier
{
    private readonly IOptions<PrivacyExportOptions> _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PrivacyEmailNotifier> _logger;

    public PrivacyEmailNotifier(
        IOptions<PrivacyExportOptions> options,
        IHttpClientFactory httpClientFactory,
        ILogger<PrivacyEmailNotifier> logger)
    {
        _options = options;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendExportReadyAsync(
        string toEmail,
        string downloadUrl,
        DateTimeOffset expiresAt,
        CancellationToken cancellationToken)
    {
        var opts = _options.Value;
        var apiKey = opts.MailgunApiKey?.Trim();
        var domain = opts.MailgunDomain?.Trim();
        if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(domain))
        {
            _logger.LogWarning("Mailgun not configured; export link for {Email}: {Url}", toEmail, downloadUrl);
            return;
        }

        var client = _httpClientFactory.CreateClient("DocumentImageDownload");
        var url = $"https://api.mailgun.net/v3/{domain}/messages";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        req.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"api:{apiKey}")));

        var body =
            $"Your PawBuck data export is ready.\n\nDownload (expires {expiresAt:u}):\n{downloadUrl}\n\nIf you did not request this, contact support.";
        req.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["from"] = opts.FromEmail,
            ["to"] = toEmail,
            ["subject"] = "Your PawBuck data export is ready",
            ["text"] = body,
        });

        using var resp = await client.SendAsync(req, cancellationToken);
        if (!resp.IsSuccessStatusCode)
        {
            var err = await resp.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Mailgun export email failed: {Status} {Body}", resp.StatusCode, err);
        }
    }
}
