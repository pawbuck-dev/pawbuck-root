using System.Text.Json.Serialization;

namespace PawBuck.API.Models;

/// <summary>Request for POST /api/mail/resolve (Review Inbox reprocess).</summary>
public class MailResolveRequest
{
    [JsonPropertyName("email_id")]
    public Guid EmailId { get; set; }

    [JsonPropertyName("selected_pet_id")]
    public Guid SelectedPetId { get; set; }

    /// <summary>Pipeline type: <c>vaccinations</c>, <c>medications</c>, <c>lab_results</c>, or <c>clinical_exams</c> (short aliases accepted).</summary>
    [JsonPropertyName("selected_doc_type")]
    public string SelectedDocType { get; set; } = "";
}
