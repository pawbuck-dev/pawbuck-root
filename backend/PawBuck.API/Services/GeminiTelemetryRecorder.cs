using System.Collections.Concurrent;
using System.Net;

namespace PawBuck.API.Services;

public sealed class GeminiCallAggregate
{
    public long CallCount { get; init; }
    public long SuccessCount { get; init; }
    public long FailureCount { get; init; }
    public long TotalDurationMs { get; init; }
    public long? TotalTokenCount { get; init; }
}

public sealed class GeminiTelemetrySnapshot
{
    public DateTimeOffset SnapshotUtc { get; init; }
    public DateTimeOffset ProcessStartedUtc { get; init; }
    public IReadOnlyDictionary<string, GeminiCallAggregate> ByKind { get; init; } =
        new Dictionary<string, GeminiCallAggregate>();
}

public interface IGeminiTelemetryRecorder
{
    void Record(
        string operationKind,
        string model,
        long durationMs,
        bool success,
        GeminiUsageMetadata? usage = null,
        HttpStatusCode? statusCode = null);

    GeminiTelemetrySnapshot GetSnapshot();
}

/// <summary>
/// In-process Gemini call counters + structured logs for CloudWatch Insights.
/// Production rollups: filter logs on <c>GeminiCall</c> event id or query this endpoint.
/// </summary>
public sealed class GeminiTelemetryRecorder : IGeminiTelemetryRecorder
{
    private readonly ILogger<GeminiTelemetryRecorder> _logger;
    private readonly DateTimeOffset _processStartedUtc = DateTimeOffset.UtcNow;
    private readonly ConcurrentDictionary<string, MutableAggregate> _byKind = new(StringComparer.Ordinal);

    public GeminiTelemetryRecorder(ILogger<GeminiTelemetryRecorder> logger) => _logger = logger;

    public void Record(
        string operationKind,
        string model,
        long durationMs,
        bool success,
        GeminiUsageMetadata? usage = null,
        HttpStatusCode? statusCode = null)
    {
        var kind = string.IsNullOrWhiteSpace(operationKind) ? "unknown" : operationKind.Trim();
        var modelId = string.IsNullOrWhiteSpace(model) ? GeminiOptions.DefaultModelId : model.Trim();

        _logger.LogInformation(
            "GeminiCall kind={Kind} model={Model} durationMs={DurationMs} success={Success} statusCode={StatusCode} promptTokens={PromptTokens} outputTokens={OutputTokens} totalTokens={TotalTokens}",
            kind,
            modelId,
            durationMs,
            success,
            statusCode.HasValue ? (int)statusCode.Value : null,
            usage?.PromptTokenCount,
            usage?.CandidatesTokenCount,
            usage?.TotalTokenCount);

        var bucket = _byKind.GetOrAdd(kind, _ => new MutableAggregate());
        bucket.Add(durationMs, success, usage?.TotalTokenCount);
    }

    public GeminiTelemetrySnapshot GetSnapshot()
    {
        var dict = new Dictionary<string, GeminiCallAggregate>(StringComparer.Ordinal);
        foreach (var pair in _byKind)
        {
            dict[pair.Key] = new GeminiCallAggregate
            {
                CallCount = pair.Value.CallCount,
                SuccessCount = pair.Value.SuccessCount,
                FailureCount = pair.Value.FailureCount,
                TotalDurationMs = pair.Value.TotalDurationMs,
                TotalTokenCount = pair.Value.TotalTokenCount,
            };
        }

        return new GeminiTelemetrySnapshot
        {
            SnapshotUtc = DateTimeOffset.UtcNow,
            ProcessStartedUtc = _processStartedUtc,
            ByKind = dict,
        };
    }

    private sealed class MutableAggregate
    {
        private long _callCount;
        private long _successCount;
        private long _failureCount;
        private long _totalDurationMs;
        private long _totalTokenCount;
        private long _hasTokenCount;

        public long CallCount => Interlocked.Read(ref _callCount);
        public long SuccessCount => Interlocked.Read(ref _successCount);
        public long FailureCount => Interlocked.Read(ref _failureCount);
        public long TotalDurationMs => Interlocked.Read(ref _totalDurationMs);
        public long? TotalTokenCount => Interlocked.Read(ref _hasTokenCount) == 1 ? Interlocked.Read(ref _totalTokenCount) : null;

        public void Add(long durationMs, bool success, int? totalTokens)
        {
            Interlocked.Increment(ref _callCount);
            if (success)
                Interlocked.Increment(ref _successCount);
            else
                Interlocked.Increment(ref _failureCount);
            Interlocked.Add(ref _totalDurationMs, durationMs);
            if (totalTokens.HasValue)
            {
                Interlocked.Add(ref _totalTokenCount, totalTokens.Value);
                Interlocked.Exchange(ref _hasTokenCount, 1);
            }
        }
    }
}
