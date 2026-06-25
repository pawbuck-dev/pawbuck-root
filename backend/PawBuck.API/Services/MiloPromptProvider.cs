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
    { "name": "string", "category": "string", "administeredDate": "YYYY-MM-DD", "expiryDate": "YYYY-MM-DD" }
  ],
  "confidenceScore": 0-100
}

## Date formatting (ISO-8601)
- All dates MUST be in ISO-8601 date format: YYYY-MM-DD (e.g. 2025-11-10).
- Do not use MM/DD/YYYY, DD-MM-YYYY, or any other format.

## Expiry dates vs administered / visit dates
- **dateOfVisit**: The date the pet was seen or the certificate was signed (e.g. "Date:", "Date of Visit"). There is exactly one such date per document; use it for `dateOfVisit`. This is **not** proof that every vaccine on the page was administered that day.
- **items[].administeredDate**: ISO-8601 date when **this specific** vaccine was given, only if the document clearly states it was administered (e.g. under "Vaccinations Administered", "Given", "Date administered"). **Omit** `administeredDate` (or omit the entire item) when the vaccine appears only under "due for booster", "next due", "expires", or similar future-due sections without a given/administered date.
- **items[].expiryDate**: Next due, valid until, or booster due date for that vaccine. Do not put administered/given dates into `expiryDate`.

## Items
- **name**: Vaccine name, medication name, test name, or service name (e.g. "DHPP", "Rabies", "Annual exam", "Chemistry panel").
- **category**: Broad category such as "vaccination", "medication", "lab", "exam".
- **administeredDate**: Required on an item only when administration is explicitly documented for that vaccine. Never infer administration from `dateOfVisit` alone.
- **expiryDate**: ISO-8601 date for when this item expires or is next due.
- For vaccination certificates with separate **administered** vs **due/booster** lists: include in `items[]` only vaccines from the administered list (each with `administeredDate`). Do **not** add vaccines that appear only in the due/booster list.
- Canonicalize common vaccine aliases:
  - DHPP/DAPP/DA2PP → "DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)"
  - Bordetella/Kennel Cough → "Bordetella"
  - Lepto/L4 → "Leptospirosis"
  - Rabies 1yr/3yr → "Rabies"
  - FVRCP → "FVRCP (Core Feline)"

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

    private const string BillingInvoiceFlexibleSuffix = """

Additional rules for billing_invoice:
- title: short label such as "Vet invoice" or "{clinic name} invoice".
- primaryDate: invoice date or date of service (not today's date).
- keyFacts MUST include when visible on the document:
  - "Total" with the full amount due in USD (e.g. "$142.50") — use this exact label for the invoice total.
  - "Provider" or "Clinic" with the veterinary clinic or vendor name.
  - "Invoice date" or "Service date" when shown separately from primaryDate.
  - "Insurance paid", "Covered", or "Plan paid" when insurance adjustments appear (USD amounts).
  - Up to 6 line items as separate keyFacts (label = service name, value = USD amount) when itemized.
- Include dollar signs in amount values. Do not omit totals when they are legible.
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
        var prompt = FlexibleExtractionTemplate.Replace("{{DOCUMENT_TYPE}}", t, StringComparison.Ordinal);
        if (t.Equals("billing_invoice", StringComparison.OrdinalIgnoreCase))
            prompt += BillingInvoiceFlexibleSuffix;
        return prompt;
    }
}
