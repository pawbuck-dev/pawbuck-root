namespace PawBuck.API.Services;

/// <summary>
/// Maps free-text <c>processed_emails.failure_reason</c> values to stable categories for admin metrics.
/// Keep in sync with edge formatters in <c>mailgun-process-pet-mail</c> / <c>process-pet-mail</c>.
/// </summary>
public static class EmailFailureReasonClassifier
{
    public const string Configuration = "configuration";
    public const string MiloApiError = "milo_api_error";
    public const string MiloExtractionFailed = "milo_extraction_failed";
    public const string PetNameMismatch = "pet_name_mismatch";
    public const string PetBreedMismatch = "pet_breed_mismatch";
    public const string PetNoIdentification = "pet_no_identification";
    public const string PetVerification = "pet_verification";
    public const string DbPersistFailed = "db_persist_failed";
    public const string AttachmentPipeline = "attachment_pipeline";
    public const string CalendarImport = "calendar_import";
    public const string ArchiveStorage = "archive_storage";
    public const string GatewayTimeout = "gateway_timeout";
    public const string Other = "other";
    public const string Unknown = "unknown";

    /// <summary>Postgres <c>CASE</c> expression classifying <paramref name="failureReasonColumn"/>.</summary>
    public static string BuildSqlCategoryCaseExpression(string failureReasonColumn = "COALESCE(NULLIF(trim(pe.failure_reason), ''), '')")
    {
        return $"""
            CASE
              WHEN {failureReasonColumn} ILIKE '%analyze-internal not configured%'
                OR {failureReasonColumn} ILIKE '%miloanalyzeinternalconfigured%' THEN '{Configuration}'
              WHEN {failureReasonColumn} ILIKE '%analyze-internal%'
                AND (
                  {failureReasonColumn} ILIKE '%HTTP%'
                  OR {failureReasonColumn} ILIKE '%error%'
                  OR {failureReasonColumn} ILIKE '%502%'
                  OR {failureReasonColumn} ILIKE '%503%'
                ) THEN '{MiloApiError}'
              WHEN {failureReasonColumn} ILIKE '%Failed to extract data%' THEN '{MiloExtractionFailed}'
              WHEN {failureReasonColumn} ILIKE '%first name mismatch%' THEN '{PetNameMismatch}'
              WHEN {failureReasonColumn} ILIKE '%breed mismatch%' THEN '{PetBreedMismatch}'
              WHEN {failureReasonColumn} ILIKE '%no pet identification%'
                OR {failureReasonColumn} ILIKE '%missing: pet name%'
                OR ({failureReasonColumn} ILIKE '%Could not verify%' AND {failureReasonColumn} ILIKE '%missing:%')
                THEN '{PetNoIdentification}'
              WHEN {failureReasonColumn} ILIKE '%attachment_failures%'
                OR ({failureReasonColumn} ILIKE '%Failed to process%' AND {failureReasonColumn} ILIKE '%document(s)%')
                THEN '{AttachmentPipeline}'
              WHEN {failureReasonColumn} ILIKE '%Pet verification failed%'
                OR {failureReasonColumn} ILIKE '%attributes_mismatch%'
                OR {failureReasonColumn} ILIKE '%Validation failed%'
                OR {failureReasonColumn} ILIKE '%microchip%does not match%'
                THEN '{PetVerification}'
              WHEN {failureReasonColumn} ILIKE '%Failed to save to database%'
                OR {failureReasonColumn} ILIKE '%Failed to save record%'
                THEN '{DbPersistFailed}'
              WHEN {failureReasonColumn} ILIKE '%calendar_import%'
                OR {failureReasonColumn} ILIKE '%calendar_no_import%'
                THEN '{CalendarImport}'
              WHEN {failureReasonColumn} ILIKE '%message_storage_failed%' THEN '{ArchiveStorage}'
              WHEN {failureReasonColumn} ILIKE '%504%'
                OR {failureReasonColumn} ILIKE '%gateway time-out%'
                OR {failureReasonColumn} ILIKE '%gateway timeout%'
                THEN '{GatewayTimeout}'
              WHEN {failureReasonColumn} = '' THEN '{Unknown}'
              ELSE '{Other}'
            END
            """;
    }

    public static string Classify(string? failureReason)
    {
        if (string.IsNullOrWhiteSpace(failureReason))
            return Unknown;

        var r = failureReason;

        if (Contains(r, "analyze-internal not configured") || Contains(r, "miloanalyzeinternalconfigured"))
            return Configuration;

        if (Contains(r, "analyze-internal") &&
            (Contains(r, "HTTP") || Contains(r, "error") || Contains(r, "502") || Contains(r, "503")))
            return MiloApiError;

        if (Contains(r, "Failed to extract data"))
            return MiloExtractionFailed;

        if (Contains(r, "first name mismatch"))
            return PetNameMismatch;

        if (Contains(r, "breed mismatch"))
            return PetBreedMismatch;

        if (Contains(r, "no pet identification") ||
            Contains(r, "missing: pet name") ||
            (Contains(r, "Could not verify") && Contains(r, "missing:")))
            return PetNoIdentification;

        if (Contains(r, "attachment_failures") ||
            (Contains(r, "Failed to process") && Contains(r, "document(s)")))
            return AttachmentPipeline;

        if (Contains(r, "Pet verification failed") ||
            Contains(r, "attributes_mismatch") ||
            Contains(r, "Validation failed") ||
            Contains(r, "microchip") && Contains(r, "does not match"))
            return PetVerification;

        if (Contains(r, "Failed to save to database") || Contains(r, "Failed to save record"))
            return DbPersistFailed;

        if (Contains(r, "calendar_import") || Contains(r, "calendar_no_import"))
            return CalendarImport;

        if (Contains(r, "message_storage_failed"))
            return ArchiveStorage;

        if (Contains(r, "504") ||
            Contains(r, "gateway time-out") ||
            Contains(r, "gateway timeout"))
            return GatewayTimeout;

        return Other;
    }

    public static string GetCategoryLabel(string category) =>
        category switch
        {
            Configuration => "Milo API not configured",
            MiloApiError => "Milo analyze-internal error",
            MiloExtractionFailed => "OCR / extraction failed",
            PetNameMismatch => "Pet name mismatch",
            PetBreedMismatch => "Pet breed mismatch",
            PetNoIdentification => "No pet ID on document",
            PetVerification => "Pet verification failed",
            DbPersistFailed => "Database save failed",
            AttachmentPipeline => "Attachment processing failed",
            CalendarImport => "Calendar import failed",
            ArchiveStorage => "Email archive storage failed",
            GatewayTimeout => "Gateway timeout (504)",
            Other => "Other / uncategorized",
            _ => "Unknown",
        };

    public static string GetCategoryDescription(string category) =>
        category switch
        {
            Configuration =>
                "PawBuck.API Milo internal key or edge PAWBUCK_API_URL is missing — analyze-internal cannot run.",
            MiloApiError =>
                "Vault analyze-internal returned an HTTP or server error after pet verification passed.",
            MiloExtractionFailed =>
                "Milo/Gemini could not extract structured data from the attachment (legacy OCR path or empty extraction).",
            PetNameMismatch =>
                "Document first name does not match the pet profile within tolerance.",
            PetBreedMismatch =>
                "Document breed does not match the pet profile within tolerance.",
            PetNoIdentification =>
                "Document lacks required pet name and/or breed for verification.",
            PetVerification =>
                "Combined pet verification failed (name, breed, microchip, or validation rules).",
            DbPersistFailed =>
                "Extraction succeeded but rows could not be inserted into health tables.",
            AttachmentPipeline =>
                "One or more attachments failed during the email health-ingestion pipeline.",
            CalendarImport =>
                "Appointment/calendar NLP import failed after attachments were processed.",
            ArchiveStorage =>
                "Edge could not store the failure archive in pending-emails storage.",
            GatewayTimeout =>
                "ALB/API timed out while Milo analyze-internal ran — retries may help; check ECS/ALB idle timeout.",
            Other =>
                "Failure text did not match a known category — inspect Top failure reasons.",
            _ =>
                "No failure_reason recorded.",
        };

    private static bool Contains(string haystack, string needle) =>
        haystack.Contains(needle, StringComparison.OrdinalIgnoreCase);
}
