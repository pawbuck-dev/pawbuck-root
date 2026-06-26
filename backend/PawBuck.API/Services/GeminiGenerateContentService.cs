using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;

namespace PawBuck.API.Services;

public sealed class GeminiGenerateContentResult
{
    public bool Success { get; init; }
    public HttpStatusCode StatusCode { get; init; }
    public string ResponseJson { get; init; } = "";
    public GeminiUsageMetadata? Usage { get; init; }
    public long DurationMs { get; init; }
    public TimeSpan? RetryAfter { get; init; }
}

public interface IGeminiGenerateContentService
{
    Task<GeminiGenerateContentResult> GenerateContentAsync(
        string operationKind,
        string model,
        object requestBody,
        string apiKey,
        CancellationToken cancellationToken = default);
}

/// <summary>Shared Gemini <c>generateContent</c> HTTP client with Phase 0 telemetry.</summary>
public sealed class GeminiGenerateContentService : IGeminiGenerateContentService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IGeminiTelemetryRecorder _telemetry;
    private readonly ILogger<GeminiGenerateContentService> _logger;

    public GeminiGenerateContentService(
        IHttpClientFactory httpClientFactory,
        IGeminiTelemetryRecorder telemetry,
        ILogger<GeminiGenerateContentService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _telemetry = telemetry;
        _logger = logger;
    }

    public async Task<GeminiGenerateContentResult> GenerateContentAsync(
        string operationKind,
        string model,
        object requestBody,
        string apiKey,
        CancellationToken cancellationToken = default)
    {
        var resolvedModel = string.IsNullOrWhiteSpace(model) ? GeminiOptions.DefaultModelId : model.Trim();
        var sw = Stopwatch.StartNew();
        var client = _httpClientFactory.CreateClient("Gemini");
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{resolvedModel}:generateContent";

        using var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        request.SetGeminiApiKey(apiKey);

        HttpResponseMessage httpResponse;
        try
        {
            httpResponse = await client.SendAsync(request, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            sw.Stop();
            _telemetry.Record(operationKind, resolvedModel, sw.ElapsedMilliseconds, success: false);
            _logger.LogWarning(ex, "Gemini generateContent transport failure kind={Kind}", operationKind);
            throw;
        }

        using (httpResponse)
        {
            var body = await httpResponse.Content.ReadAsStringAsync(cancellationToken);
            sw.Stop();
            var success = httpResponse.IsSuccessStatusCode;
            var usage = success ? GeminiResponseParser.TryParseUsageMetadata(body) : null;
            _telemetry.Record(
                operationKind,
                resolvedModel,
                sw.ElapsedMilliseconds,
                success,
                usage,
                httpResponse.StatusCode);

            TimeSpan? retryAfter = null;
            if (httpResponse.StatusCode == HttpStatusCode.TooManyRequests)
                retryAfter = TryParseRetryAfterHeader(httpResponse);

            return new GeminiGenerateContentResult
            {
                Success = success,
                StatusCode = httpResponse.StatusCode,
                ResponseJson = body,
                Usage = usage,
                DurationMs = sw.ElapsedMilliseconds,
                RetryAfter = retryAfter,
            };
        }
    }

    private static TimeSpan? TryParseRetryAfterHeader(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Retry-After", out var values))
            return null;
        var raw = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        if (int.TryParse(raw, out var seconds))
            return TimeSpan.FromSeconds(Math.Clamp(seconds, 1, 120));
        return null;
    }
}
