using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>POST /api/support/milo/journal/chat-smoke — support-only Milo chat diagnostic (same pipeline as consumer, no subscription gate).</summary>
public sealed class MiloJournalChatSmokeRequest
{
    [JsonPropertyName("userId")]
    public Guid UserId { get; set; }

    [JsonPropertyName("petId")]
    public Guid PetId { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = "";

    [JsonPropertyName("journalMode")]
    public bool JournalMode { get; set; } = true;
}
