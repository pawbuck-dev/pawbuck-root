namespace PawBuck.API.Models;

/// <summary>POST /api/milo/documents/analyze-internal (Edge / Mailgun pipeline; protected by internal key).</summary>
public class AnalyzePetDocumentInternalRequest
{
    public Guid PetId { get; set; }
    public Guid UserId { get; set; }
    public string Bucket { get; set; } = "pets";
    public string Path { get; set; } = string.Empty;
    public string? MimeType { get; set; }

    /// <summary>Pre-assigned vault row id (must match the storage object path segment).</summary>
    public Guid? DocumentId { get; set; }

    /// <summary>When set, skips Gemini classification and uses this document type (Review Inbox ground truth).</summary>
    public string? DocumentTypeOverride { get; set; }

    /// <summary>Provenance for metadata, e.g. email_ses, email_mailgun, review_inbox.</summary>
    public string? IngestionSource { get; set; }
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

    /// <summary>Populated when the document type maps to clinical tables (vaccines, meds, exams, labs).</summary>
    public PetDocumentClinicalSyncResult? ClinicalSync { get; set; }
}
