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
