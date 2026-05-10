using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>POST /api/milo/health-records/bundle — one Milo “event” (file and/or text).</summary>
public class MiloHealthBundleRequest
{
    [JsonPropertyName("petId")]
    public Guid PetId { get; set; }

    /// <summary>Optional owner note (symptoms, context). Saved to <c>pet_journal_entries</c> when non-empty.</summary>
    [JsonPropertyName("textNote")]
    public string? TextNote { get; set; }

    [JsonPropertyName("documentBucket")]
    public string? DocumentBucket { get; set; }

    [JsonPropertyName("documentPath")]
    public string? DocumentPath { get; set; }

    [JsonPropertyName("documentMimeType")]
    public string? DocumentMimeType { get; set; }
}

/// <summary>Result of processing a health bundle.</summary>
public class MiloHealthBundleResponse
{
    [JsonPropertyName("confirmation")]
    public string Confirmation { get; set; } = "";

    /// <summary><c>file_only</c>, <c>text_only</c>, or <c>hybrid</c>.</summary>
    [JsonPropertyName("scenario")]
    public string Scenario { get; set; } = "";

    [JsonPropertyName("routedTo")]
    public IReadOnlyList<string> RoutedTo { get; set; } = Array.Empty<string>();

    [JsonPropertyName("document")]
    public PetDocumentVaultRowDto? Document { get; set; }

    [JsonPropertyName("journalEntryId")]
    public string? JournalEntryId { get; set; }
}
