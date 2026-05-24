import { callGeminiAPI } from "./gemini-api.ts";

/** Subset of Milo flexible vault JSON used for email pet verification fallback. */
export type FlexibleVaultLike = {
  title?: string;
  summary?: string;
  keyFacts?: { label: string; value: string }[];
  confidenceScore?: number;
};

export type LegacyPetInfoFields = {
  microchip: string | null;
  name: string | null;
  age: string | null;
  breed: string | null;
  gender: string | null;
  confidence: number;
};

const PET_NAME_LABELS = ["pet name", "patient name", "animal name", "name"];
const BREED_LABELS = ["breed", "species/breed", "species"];

function pickKeyFact(
  keyFacts: { label: string; value: string }[],
  labelHints: string[],
): string | null {
  for (const fact of keyFacts) {
    const label = fact.label.trim().toLowerCase();
    if (!label) continue;
    if (labelHints.some((hint) => label === hint || label.includes(hint))) {
      const value = fact.value?.trim();
      if (value) return value;
    }
  }
  return null;
}

/** e.g. "Vaccination Record for Benji Srinivasan" → "Benji Srinivasan" */
export function parsePetNameFromTitle(title: string | undefined | null): string | null {
  if (!title?.trim()) return null;
  const forMatch = title.match(/\bfor\s+([A-Za-z][A-Za-z\s'.-]+)$/i);
  if (forMatch?.[1]?.trim()) return forMatch[1].trim();
  return null;
}

/** Strip leading species prefix ("Canine - …", "Feline - …"). */
export function normalizeDocumentBreed(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const speciesPrefix = trimmed.match(/^(canine|feline|dog|cat)\s*[-–—]\s*(.+)$/i);
  return (speciesPrefix?.[2] ?? trimmed).trim() || null;
}

/** Map Milo flexible vault fields to legacy pet-verification shape. */
export function mapFlexibleVaultToPetInfo(flexible: FlexibleVaultLike): LegacyPetInfoFields {
  const keyFacts = flexible.keyFacts ?? [];
  const name =
    pickKeyFact(keyFacts, PET_NAME_LABELS) ?? parsePetNameFromTitle(flexible.title);
  const breed = normalizeDocumentBreed(pickKeyFact(keyFacts, BREED_LABELS));
  const confidence = typeof flexible.confidenceScore === "number"
    ? flexible.confidenceScore
    : 0;

  return {
    microchip: pickKeyFact(keyFacts, ["microchip", "chip", "chip #", "microchip number"]),
    name,
    age: pickKeyFact(keyFacts, ["age", "date of birth", "dob"]),
    breed,
    gender: pickKeyFact(keyFacts, ["gender", "sex"]),
    confidence,
  };
}

export function mergePetInfoFields(
  primary: LegacyPetInfoFields,
  supplemental: LegacyPetInfoFields,
): LegacyPetInfoFields {
  return {
    microchip: primary.microchip ?? supplemental.microchip,
    name: primary.name ?? supplemental.name,
    age: primary.age ?? supplemental.age,
    breed: primary.breed ?? supplemental.breed,
    gender: primary.gender ?? supplemental.gender,
    confidence: Math.max(primary.confidence, supplemental.confidence),
  };
}

export function petInfoNeedsFallback(fields: LegacyPetInfoFields): boolean {
  return !fields.name?.trim() || !fields.breed?.trim();
}

const flexibleResponseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    primaryDate: { type: "string", nullable: true },
    keyFacts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
        required: ["label", "value"],
      },
    },
    confidenceScore: { type: "number" },
  },
  required: ["title", "summary", "keyFacts", "confidenceScore"],
};

/**
 * Same flexible vault extraction shape as PawBuck.API MiloVisionService (admin preview).
 * Used when legacy pet-id Gemini extraction misses name/breed on the PDF.
 */
export async function extractPetInfoViaFlexibleVault(
  attachment: { filename: string; mimeType: string; content: string },
  emailSubject: string,
  documentType = "vaccinations",
): Promise<LegacyPetInfoFields> {
  const empty: LegacyPetInfoFields = {
    microchip: null,
    name: null,
    age: null,
    breed: null,
    gender: null,
    confidence: 0,
  };

  try {
    const apiResult = await callGeminiAPI(
      {
        contents: [
          {
            parts: [
              {
                text: `You are a veterinary document specialist. Extract key information from the attached document for a pet owner app.

The document was classified as type: ${documentType}

Context:
- Email Subject: ${emailSubject}
- Filename: ${attachment.filename}

Return ONLY valid JSON (no markdown):
{
  "title": "Short display title (e.g. Vaccination Record for Max)",
  "summary": "1-3 sentences in plain English",
  "primaryDate": "YYYY-MM-DD or null if none",
  "keyFacts": [
    { "label": "Field label", "value": "Value" }
  ],
  "confidenceScore": <0-100>
}

Rules:
- keyFacts MUST include pet name and breed when visible (labels like "Pet Name", "Breed", "Species/Breed").
- Use ISO-8601 dates (YYYY-MM-DD) only for primaryDate.
- keyFacts: 3-12 entries when possible.
- Do not invent data.`,
              },
              {
                inline_data: {
                  mime_type: attachment.mimeType,
                  data: attachment.content,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json",
          response_schema: flexibleResponseSchema,
        },
      },
      "extractPetInfoViaFlexibleVault",
    );

    const flexible = JSON.parse(
      apiResult.data.candidates[0].content.parts[0].text,
    ) as FlexibleVaultLike;
    const mapped = mapFlexibleVaultToPetInfo(flexible);
    console.log("Flexible vault pet-id fallback:", mapped);
    return mapped;
  } catch (error) {
    console.error("Flexible vault pet-id fallback failed:", error);
    return empty;
  }
}
