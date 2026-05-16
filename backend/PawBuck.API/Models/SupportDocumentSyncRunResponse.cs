using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>POST /api/support/document-sync/run — one-shot pending vault → clinical sync (same batch as the document sync background worker).</summary>
public sealed class SupportDocumentSyncRunResponse
{
    [JsonPropertyName("rowsAttempted")]
    public int RowsAttempted { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }
}
