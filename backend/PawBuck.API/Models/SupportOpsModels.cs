using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

public class SupportOpsHealthCheckDto
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("hint")]
    public string Hint { get; set; } = "";
}

public class SupportOpsHealthResponse
{
    [JsonPropertyName("allReady")]
    public bool AllReady { get; set; }

    [JsonPropertyName("checks")]
    public IReadOnlyList<SupportOpsHealthCheckDto> Checks { get; set; } = Array.Empty<SupportOpsHealthCheckDto>();

    [JsonPropertyName("checkedAt")]
    public DateTimeOffset CheckedAt { get; set; }

    /// <summary>Server-side Postgres round-trip latency for this request.</summary>
    [JsonPropertyName("postgresLatencyMs")]
    public int? PostgresLatencyMs { get; set; }

    [JsonPropertyName("latestProbes")]
    public IReadOnlyList<SupportOpsProbeSnapshotDto> LatestProbes { get; set; } =
        Array.Empty<SupportOpsProbeSnapshotDto>();
}

public class SupportOpsProbeSnapshotDto
{
    [JsonPropertyName("probeName")]
    public string ProbeName { get; set; } = "";

    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("latencyMs")]
    public int? LatencyMs { get; set; }

    [JsonPropertyName("errorSummary")]
    public string? ErrorSummary { get; set; }

    [JsonPropertyName("source")]
    public string Source { get; set; } = "";

    [JsonPropertyName("checkedAt")]
    public DateTimeOffset CheckedAt { get; set; }
}

public class SupportOpsAvailabilityResponse
{
    [JsonPropertyName("asOf")]
    public DateTimeOffset AsOf { get; set; }

    [JsonPropertyName("overallAvailability24h")]
    public decimal OverallAvailability24h { get; set; }

    [JsonPropertyName("overallAvailability7d")]
    public decimal OverallAvailability7d { get; set; }

    [JsonPropertyName("probes")]
    public IReadOnlyList<SupportProbeAvailabilityDto> Probes { get; set; } =
        Array.Empty<SupportProbeAvailabilityDto>();

    [JsonPropertyName("dailyOverall")]
    public IReadOnlyList<SupportDailyAvailabilityDto> DailyOverall { get; set; } =
        Array.Empty<SupportDailyAvailabilityDto>();
}

public class SupportProbeAvailabilityDto
{
    [JsonPropertyName("probeName")]
    public string ProbeName { get; set; } = "";

    [JsonPropertyName("label")]
    public string Label { get; set; } = "";

    [JsonPropertyName("availability24h")]
    public decimal Availability24h { get; set; }

    [JsonPropertyName("availability7d")]
    public decimal Availability7d { get; set; }

    [JsonPropertyName("samples24h")]
    public int Samples24h { get; set; }

    [JsonPropertyName("samples7d")]
    public int Samples7d { get; set; }

    [JsonPropertyName("lastOk")]
    public bool? LastOk { get; set; }

    [JsonPropertyName("lastErrorSummary")]
    public string? LastErrorSummary { get; set; }
}

public class SupportDailyAvailabilityDto
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = "";

    [JsonPropertyName("availabilityPct")]
    public decimal AvailabilityPct { get; set; }

    [JsonPropertyName("samples")]
    public int Samples { get; set; }
}

public class OpsProbeIngestRequest
{
    [JsonPropertyName("probeName")]
    public string? ProbeName { get; set; }

    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("latencyMs")]
    public int? LatencyMs { get; set; }

    [JsonPropertyName("errorSummary")]
    public string? ErrorSummary { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }
}

public class SupportReleaseStuckLockResponse
{
    [JsonPropertyName("released")]
    public bool Released { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";

    [JsonPropertyName("email")]
    public SupportProcessedEmailDetailDto? Email { get; set; }
}
