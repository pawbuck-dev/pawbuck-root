namespace PawBuck.API.Services;

/// <summary>
/// Central library for Milo extraction prompts. Mirrors <c>packages/milo-core</c> prompt strings (TS source of truth).
/// </summary>
public class MiloPromptProvider : IMiloPromptProvider
{
    private static readonly string MedicalRecordExtractionPrompt = """
You are a veterinary document specialist. Your task is to analyze images or text of pet medical documents and extract structured data into a single JSON object.

## Output schema
Return ONLY valid JSON matching this shape (no markdown, no commentary):
{
  "petName": "string",
  "documentType": "medications" | "lab_results" | "clinical_exams" | "vaccinations" | "billing_invoice" | "travel_certificate" | "irrelevant",
  "clinicName": "string",
  "dateOfVisit": "YYYY-MM-DD",
  "items": [
    { "name": "string", "category": "string", "expiryDate": "YYYY-MM-DD" }
  ],
  "confidenceScore": 0-100
}

## Date formatting (ISO-8601)
- All dates MUST be in ISO-8601 date format: YYYY-MM-DD (e.g. 2025-11-10).
- Do not use MM/DD/YYYY, DD-MM-YYYY, or any other format.

## Expiry dates vs administered / visit dates
- **dateOfVisit**: The date the pet was seen or the main event date (e.g. "Date of Visit", "Date Given", "Service Date"). There is exactly one such date per document; use it for `dateOfVisit`.
- **items[].expiryDate**: For each vaccine, medication, or certificate, use the **expiry** or **next due** date (e.g. "Next due", "Valid until", "Expires", "Next dose due"). This is the date after which the item is no longer valid or another dose is due. Put this in `expiryDate` for that item.
- Do not put administered/given dates into `expiryDate`; reserve `expiryDate` for next-due or expiry only.

## Items
- **name**: Vaccine name, medication name, or service name (e.g. "DHPP", "Rabies", "Annual exam").
- **category**: Broad category such as "vaccination", "medication", "lab", "exam".
- **expiryDate**: ISO-8601 date for when this item expires or is next due.

## Confidence score
- Set `confidenceScore` (0-100) based on document clarity and completeness:
  - 80-100: Clear, legible, all key fields present and unambiguous.
  - 50-79: Mostly clear with minor gaps or ambiguity.
  - 20-49: Handwritten, stained, or partially missing; multiple plausible interpretations.
  - 0-19: Very unclear, multiple pets without clear attribution, or irrelevant document.
- When in doubt, use a lower score rather than overstating confidence.

## Single-pet assumption
- If the document clearly refers to multiple pets, extract the primary or first-mentioned pet only and set a lower `confidenceScore` to reflect the ambiguity.
""";

    private static readonly string FlexibleExtractionTemplate = """
You are a veterinary document specialist. Extract key information from the attached document for a pet owner app.

The document was classified as type: {{DOCUMENT_TYPE}}

Return ONLY valid JSON (no markdown):
{
  "title": "Short display title (e.g. policy name, certificate name)",
  "summary": "1-3 sentences in plain English",
  "primaryDate": "YYYY-MM-DD or null if none",
  "keyFacts": [
    { "label": "Field label", "value": "Value" }
  ],
  "confidenceScore": <0-100>
}

Rules:
- Use ISO-8601 dates (YYYY-MM-DD) only for primaryDate.
- keyFacts: 3-12 entries when possible (policy number, clinic, pet name, expiry, amounts, etc.).
- If text is illegible, lower confidenceScore and still return best-effort title/summary.
- Do not invent data; use null or empty strings when unknown.
""";

    private static readonly string PetDocumentClassificationPromptValue = """
You are a veterinary records expert. Classify the attached pet health or identity document into exactly one type.

## Types (use these exact snake_case strings)
- medications — prescriptions, medication labels, pharmacy printouts
- lab_results — lab reports, bloodwork, urinalysis
- clinical_exams — exam notes, SOAP, visit summaries (non-lab)
- vaccinations — vaccine certificates, immunization records
- billing_invoice — invoices, receipts, payment summaries from a vet
- travel_certificate — health certificates for travel
- insurance_policy — pet insurance policy, coverage summary, renewal
- pedigree — breed registry, pedigree papers, registration certificates (AKC/CKC/etc.)
- identity_document — microchip paperwork, ID photos of registration cards, owner/pet ID tied to the pet
- irrelevant — not a pet document, unreadable, or unrelated

Return ONLY valid JSON (no markdown):
{
  "documentType": "<one of the types above>",
  "confidence": <number 0-100>,
  "reasoning": "<short string>"
}
""";

    private readonly Dictionary<string, string> _promptsByType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Vaccine"] = MedicalRecordExtractionPrompt,
        ["vaccinations"] = MedicalRecordExtractionPrompt,
        ["Invoice"] = MedicalRecordExtractionPrompt,
        ["billing_invoice"] = MedicalRecordExtractionPrompt,
        ["Prescription"] = MedicalRecordExtractionPrompt,
        ["medications"] = MedicalRecordExtractionPrompt,
        ["lab_results"] = MedicalRecordExtractionPrompt,
        ["clinical_exams"] = MedicalRecordExtractionPrompt,
        ["travel_certificate"] = MedicalRecordExtractionPrompt,
        ["Irrelevant"] = MedicalRecordExtractionPrompt,
        ["irrelevant"] = MedicalRecordExtractionPrompt,
    };

    /// <inheritdoc />
    public string PetDocumentClassificationPrompt => PetDocumentClassificationPromptValue;

    /// <inheritdoc />
    public string GetPromptForType(string documentType)
    {
        var dt = documentType?.Trim() ?? "";
        if (dt.Equals("insurance_policy", StringComparison.OrdinalIgnoreCase)
            || dt.Equals("pedigree", StringComparison.OrdinalIgnoreCase)
            || dt.Equals("identity_document", StringComparison.OrdinalIgnoreCase))
            return GetFlexibleExtractionPrompt(dt);

        return _promptsByType.TryGetValue(documentType ?? "", out var prompt)
            ? prompt
            : MedicalRecordExtractionPrompt;
    }

    /// <inheritdoc />
    public string GetFlexibleExtractionPrompt(string documentType)
    {
        var t = string.IsNullOrWhiteSpace(documentType) ? "unknown" : documentType.Trim();
        return FlexibleExtractionTemplate.Replace("{{DOCUMENT_TYPE}}", t, StringComparison.Ordinal);
    }
}
