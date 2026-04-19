namespace PawBuck.API.Models;

/// <summary>
/// Admin test harness: classify uploaded bytes in-memory (no storage).
/// </summary>
public class ClassifyPreviewRequest
{
    /// <summary>Base64-encoded file content (image or PDF).</summary>
    public string? FileBase64 { get; set; }

    /// <summary>MIME type, e.g. image/jpeg or application/pdf.</summary>
    public string? MimeType { get; set; }
}
