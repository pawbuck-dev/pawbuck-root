/**
 * Extract human-readable facts for vault display (any document type).
 * Output JSON must match flexibleDocumentExtractionSchema in schema.ts.
 */

export const FLEXIBLE_DOCUMENT_EXTRACTION_SYSTEM_PROMPT = `You are a veterinary document specialist. Extract key information from the attached document for a pet owner app.

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
- Do not invent data; use null or empty strings when unknown.`;

export const BILLING_INVOICE_FLEXIBLE_EXTRACTION_SUFFIX = `

Additional rules for billing_invoice:
- title: short label such as "Vet invoice" or "{clinic name} invoice".
- primaryDate: invoice date or date of service (not today's date).
- keyFacts MUST include when visible on the document:
  - "Total" with the full amount due in USD (e.g. "$142.50") — use this exact label for the invoice total.
  - "Provider" or "Clinic" with the veterinary clinic or vendor name.
  - "Invoice date" or "Service date" when shown separately from primaryDate.
  - "Insurance paid", "Covered", or "Plan paid" when insurance adjustments appear (USD amounts).
  - Up to 6 line items as separate keyFacts (label = service name, value = USD amount) when itemized.
- Include dollar signs in amount values. Do not omit totals when they are legible.`;

/** Prompt for Milo flexible vault extraction; mirrors backend MiloPromptProvider. */
export function getFlexibleExtractionPrompt(documentType: string): string {
  const t = (documentType ?? "unknown").trim() || "unknown";
  const base = FLEXIBLE_DOCUMENT_EXTRACTION_SYSTEM_PROMPT.replace("{{DOCUMENT_TYPE}}", t);
  if (t.toLowerCase() === "billing_invoice") {
    return base + BILLING_INVOICE_FLEXIBLE_EXTRACTION_SUFFIX;
  }
  return base;
}
