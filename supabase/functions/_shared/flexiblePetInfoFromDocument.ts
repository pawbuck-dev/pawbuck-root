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

const PET_NAME_LABELS = [
  "pet name",
  "patient name",
  "animal name",
  "patient",
  "animal",
  "name",
];
/** Labels for actual breed fields — never match standalone "Species" (see pickBreedFromKeyFacts). */
const BREED_LABEL_HINTS = ["breed", "species/breed", "breed/species"];
const MICROCHIP_LABELS = [
  "microchip",
  "microchip #",
  "chip",
  "chip #",
  "microchip number",
  "id chip",
];

function labelMatchesHint(label: string, hint: string): boolean {
  return label === hint || label.includes(hint);
}

function pickKeyFact(
  keyFacts: { label: string; value: string }[],
  labelHints: string[],
): string | null {
  for (const fact of keyFacts) {
    const label = fact.label.trim().toLowerCase();
    if (!label) continue;
    if (labelHints.some((hint) => labelMatchesHint(label, hint))) {
      const value = fact.value?.trim();
      if (value) return value;
    }
  }
  return null;
}

/** Species-only values are not breeds (e.g. "Canine (Dog)", "Dog", "Feline"). */
export function isSpeciesOnlyBreedValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  const speciesOnly = [
    /^(canine|feline|dog|cat)$/,
    /^(canine|feline)\s*\(\s*(dog|cat)\s*\)$/,
    /^(canine|feline)\s*\(\s*dog\s*\)$/,
    /^domestic\s+(dog|cat)$/,
  ];
  return speciesOnly.some((p) => p.test(v));
}

function pickBreedFromKeyFacts(
  keyFacts: { label: string; value: string }[],
): string | null {
  for (const fact of keyFacts) {
    const label = fact.label.trim().toLowerCase();
    if (!label) continue;
    if (!BREED_LABEL_HINTS.some((hint) => labelMatchesHint(label, hint))) continue;
    const value = fact.value?.trim();
    if (!value) continue;
    const normalized = normalizeDocumentBreed(value);
    if (normalized) return normalized;
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

/** Strip leading species prefix ("Canine - …"); drop species-only values. */
export function normalizeDocumentBreed(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const speciesPrefix = trimmed.match(/^(canine|feline|dog|cat)\s*[-–—]\s*(.+)$/i);
  const candidate = (speciesPrefix?.[2] ?? trimmed).trim();
  if (!candidate || isSpeciesOnlyBreedValue(candidate)) return null;
  return candidate;
}

/** Map Milo flexible vault fields to legacy pet-verification shape. */
export function mapFlexibleVaultToPetInfo(flexible: FlexibleVaultLike): LegacyPetInfoFields {
  const keyFacts = flexible.keyFacts ?? [];
  const name =
    pickKeyFact(keyFacts, PET_NAME_LABELS) ?? parsePetNameFromTitle(flexible.title);
  const breed = pickBreedFromKeyFacts(keyFacts);
  const confidence = typeof flexible.confidenceScore === "number"
    ? flexible.confidenceScore
    : 0;

  return {
    microchip: pickKeyFact(keyFacts, MICROCHIP_LABELS),
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

/** True when name or a real breed (not species-only) is missing. */
export function petInfoNeedsFallback(fields: LegacyPetInfoFields): boolean {
  const breed = normalizeDocumentBreed(fields.breed);
  return !fields.name?.trim() || !breed?.trim();
}

/** Normalize breed on every extraction path before verification. */
export function sanitizePetInfoFields(
  fields: LegacyPetInfoFields,
): LegacyPetInfoFields {
  return {
    ...fields,
    breed: normalizeDocumentBreed(fields.breed),
  };
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
- keyFacts MUST include pet/animal name and breed when visible. Use labels such as "Pet Name", "Patient Name", "Animal Name", "Breed".
- When the form has both Species and Breed, use separate keyFacts (e.g. Species: "Canine (Dog)", Breed: "Maltese"). Never put species-only text in the Breed field.
- Do NOT put the owner/client name in the pet name field.
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

function normalizeContextToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function petFirstNameFromProfile(petName: string): string {
  return petName.trim().split(/\s+/)[0] ?? "";
}

/**
 * When OCR misses pet name, infer from filename/subject if it contains the profile first name.
 */
export function inferPetNameFromEmailContext(
  profilePetName: string,
  filename?: string | null,
  emailSubject?: string | null,
): string | null {
  const first = petFirstNameFromProfile(profilePetName);
  if (first.length < 2) return null;

  const needle = first.toLowerCase();
  const haystacks = [filename, emailSubject]
    .filter((v): v is string => Boolean(v?.trim()))
    .map(normalizeContextToken);

  for (const hay of haystacks) {
    const padded = ` ${hay} `;
    if (padded.includes(` ${needle} `) || hay === needle) {
      return first;
    }
  }

  return null;
}

export function applyEmailContextPetNameHint<T extends LegacyPetInfoFields>(
  extracted: T,
  profilePetName: string,
  filename?: string | null,
  emailSubject?: string | null,
): T {
  if (extracted.name?.trim()) return extracted;
  const inferred = inferPetNameFromEmailContext(profilePetName, filename, emailSubject);
  if (!inferred) return extracted;
  return {
    ...extracted,
    name: inferred,
    confidence: Math.max(extracted.confidence, 55),
  };
}
