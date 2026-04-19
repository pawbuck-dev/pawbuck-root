namespace PawBuck.API.Models;

/// <summary>POST /api/milo/documents/analyze-internal (Edge / Mailgun pipeline; protected by internal key).</summary>
public class AnalyzePetDocumentInternalRequest
{
    public Guid PetId { get; set; }
    public Guid UserId { get; set; }
    public string Bucket { get; set; } = "pets";
    public string Path { get; set; } = string.Empty;
    public string? MimeType { get; set; }
}

/// <summary>POST /api/milo/documents/analyze</summary>
public class AnalyzePetDocumentRequest
{
    public Guid PetId { get; set; }

    /// <summary>Supabase Storage bucket (default pets).</summary>
    public string Bucket { get; set; } = "pets";

    /// <summary>Object path within the bucket (same as client upload path).</summary>
    public string Path { get; set; } = string.Empty;

    /// <summary>Optional MIME type hint for Gemini (e.g. image/jpeg, application/pdf).</summary>
    public string? MimeType { get; set; }
}

/// <summary>Row returned after analyze + insert.</summary>
public class PetDocumentVaultRowDto
{
    public Guid Id { get; set; }
    public Guid PetId { get; set; }
    public Guid UserId { get; set; }
    public string StoragePath { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public string ExtractedJson { get; set; } = "{}";
    public string? Metadata { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
