import type {
  DocumentType,
  ExtractedPetInfo,
  MatchDetails,
  ParsedAttachment,
  Pet,
  PetValidationResult,
} from "./types.ts";

const FUZZY_MATCH_THRESHOLD = 0.7;

import { callGeminiAPI } from "../_shared/gemini-api.ts";
import {
  DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  type EmailDocumentVerificationConfig,
  allowsNameOnlyForDocumentType,
  breedRequiredForDocumentType,
} from "../_shared/emailDocumentVerificationConfig.ts";
import { matchBreeds } from "../_shared/petBreedMatch.ts";

export type ValidatePetFromDocumentOptions = {
  documentType?: DocumentType;
  verificationConfig?: EmailDocumentVerificationConfig;
};

export async function extractPetInfoFromDocument(
  attachment: ParsedAttachment,
  emailSubject: string
): Promise<ExtractedPetInfo> {
  const responseSchema = {
    type: "object",
    properties: {
      microchip: {
        type: "string",
        description: "The microchip/chip number of the pet (usually 15 digits)",
      },
      name: {
        type: "string",
        description: "The name of the pet/animal",
      },
      age: {
        type: "string",
        description: "The age of the pet (e.g., '3 years', '6 months', '2 years 4 months')",
      },
      breed: {
        type: "string",
        description: "The breed of the pet (e.g., 'Golden Retriever', 'Persian Cat')",
      },
      gender: {
        type: "string",
        description: "The gender/sex of the pet (Male, Female, M, F, Neutered Male, Spayed Female)",
      },
      confidence: {
        type: "number",
        description: "Overall confidence score from 0-100 for the extracted information",
      },
    },
    required: ["confidence"],
  };

  try {
    const apiResult = await callGeminiAPI(
      {
        contents: [
          {
            parts: [
              {
                text: `You are analyzing a veterinary document to extract pet identification information.

Context:
- Email Subject: ${emailSubject}
- Filename: ${attachment.filename}

Extract ALL of the following information if present in the document:

1. MICROCHIP NUMBER: Look for fields labeled "Microchip", "Chip #", "Microchip Number", "ID Chip", etc.
   - Usually a 15-digit number (e.g., "123456789012345")
   - This is the most reliable identifier

2. PET NAME: Look for "Patient Name", "Pet Name", "Animal Name", "Name"
   - Usually a single word or short phrase (e.g., "Fluffy", "Max")
   - Do NOT confuse with owner name or clinic name

3. AGE: Look for "Age", "DOB", "Date of Birth"
   - Return as a readable string (e.g., "3 years", "6 months", "2 years 4 months")
   - If DOB is given, calculate age from current date

4. BREED: Look for "Breed", "Species/Breed"
   - Include the full breed name (e.g., "Golden Retriever", "Domestic Shorthair")

5. GENDER/SEX: Look for "Sex", "Gender"
   - Return as found (Male, Female, M, F, Neutered Male, Spayed Female, etc.)

Return null for any field that is not clearly visible in the document.
Provide an overall confidence score (0-100) based on how clearly the information was extracted.`,
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
          response_schema: responseSchema,
        },
      },
      "extractPetInfoFromDocument"
    );

    const result = JSON.parse(apiResult.data.candidates[0].content.parts[0].text);

    result.microchip = result.microchip === "null" || result.microchip === "undefined" ? null : result.microchip;
    result.name = result.name === "null" || result.name === "undefined" ? null : result.name;
    result.age = result.age === "null" || result.age === "undefined" ? null : result.age;
    result.breed = result.breed === "null" || result.breed === "undefined" ? null : result.breed;
    result.gender = result.gender === "null" || result.gender === "undefined" ? null : result.gender;
    result.confidence = result.confidence === "null" || result.confidence === "undefined" ? 0 : result.confidence;

    console.log(`Pet info extraction result:`, result);

    return {
      microchip: result.microchip || null,
      name: result.name || null,
      age: result.age || null,
      breed: result.breed || null,
      gender: result.gender || null,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error("Error extracting pet info from document:", error);
    return createEmptyExtraction();
  }
}

function createEmptyExtraction(): ExtractedPetInfo {
  return {
    microchip: null,
    name: null,
    age: null,
    breed: null,
    gender: null,
    confidence: 0,
  };
}

function nonEmpty(s: string | null | undefined): boolean {
  return typeof s === "string" && s.trim().length > 0;
}

function petFirstName(petName: string): string {
  const t = petName.trim();
  if (!t) return "";
  const parts = t.split(/\s+/);
  return parts[0] ?? "";
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],
          dp[i][j - 1],
          dp[i - 1][j - 1]
        );
      }
    }
  }

  return dp[m][n];
}

function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);

  if (maxLength === 0) return 1;

  return 1 - distance / maxLength;
}

function isLikelyNickname(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  const shorter = n1.length < n2.length ? n1 : n2;
  const longer = n1.length >= n2.length ? n1 : n2;

  if (n1.includes(n2) || n2.includes(n1)) {
    if (shorter.length >= longer.length * 0.6) {
      return true;
    }
  }

  const nicknamePatterns: Record<string, string[]> = {
    "maximus": ["max"],
    "maximilian": ["max"],
    "alexander": ["alex"],
    "alexandra": ["alex"],
    "christopher": ["chris"],
    "christina": ["chris"],
    "william": ["will", "bill"],
    "robert": ["rob", "bob"],
    "richard": ["rick", "dick"],
    "jennifer": ["jen", "jenny"],
    "elizabeth": ["liz", "beth"],
  };

  const patterns = nicknamePatterns[longer] || [];
  return patterns.includes(shorter);
}

function isBreedAbbreviation(breed1: string, breed2: string): boolean {
  const b1 = breed1.toLowerCase().trim();
  const b2 = breed2.toLowerCase().trim();

  if (b1.includes(b2) || b2.includes(b1)) {
    const shorter = b1.length < b2.length ? b1 : b2;
    const longer = b1.length >= b2.length ? b1 : b2;
    if (shorter.length >= longer.length * 0.7) {
      return true;
    }
  }

  const words1 = b1.split(/\s+/);
  const words2 = b2.split(/\s+/);

  const shorter = words1.length < words2.length ? words1 : words2;
  const longer = words1.length >= words2.length ? words1 : words2;

  return shorter.every((word) => longer.some((lw) => lw.includes(word) || word.includes(lw)));
}

function fuzzyMatch(
  extracted: string | null,
  expected: string,
  threshold: number = FUZZY_MATCH_THRESHOLD,
  fieldType: "name" | "breed" = "name"
): { similarity: number; matches: boolean; isLikelyVariation?: boolean } {
  if (!extracted) {
    return { similarity: 0, matches: false };
  }

  const similarity = similarityRatio(extracted, expected);

  let isLikelyVariation = false;
  if (fieldType === "name" && similarity >= 0.6 && similarity < threshold) {
    isLikelyVariation = isLikelyNickname(extracted, expected);
  } else if (fieldType === "breed" && similarity >= 0.7 && similarity < threshold) {
    isLikelyVariation = isBreedAbbreviation(extracted, expected);
  }

  const matches = similarity >= threshold || isLikelyVariation;

  console.log(
    `Fuzzy match: "${extracted}" vs "${expected}" = ${(similarity * 100).toFixed(1)}% ` +
      `(threshold: ${threshold * 100}%, matches: ${matches}, variation: ${isLikelyVariation})`
  );

  return {
    similarity,
    matches,
    isLikelyVariation,
  };
}

function matchMicrochip(extractedMicrochip: string | null, expectedMicrochip: string | null): boolean {
  if (!extractedMicrochip || !expectedMicrochip) return false;

  const cleanExtracted = extractedMicrochip.replace(/\s/g, "");
  const cleanExpected = expectedMicrochip.replace(/\s/g, "");

  const matches = cleanExtracted === cleanExpected;

  console.log(
    `Microchip match: "${extractedMicrochip}" vs "${expectedMicrochip}" = ${matches ? "MATCH" : "NO MATCH"}`
  );

  return matches;
}

function chipMismatchExtras(
  extractedInfo: ExtractedPetInfo,
  pet: Pet
): Pick<
  PetValidationResult,
  "microchipMismatchNotify" | "microchipDocumentValue" | "microchipProfileValue"
> {
  return {
    microchipMismatchNotify: true,
    microchipDocumentValue: extractedInfo.microchip,
    microchipProfileValue: pet.microchip_number,
  };
}

/**
 * Validate pet from document: microchip exact match wins; otherwise name+breed,
 * or name-only when country config allows for this document type.
 * Microchip mismatch (both sides present) does not block; it only sets
 * microchipMismatchNotify for a user push.
 */
export async function validatePetFromDocument(
  attachment: ParsedAttachment,
  emailSubject: string,
  pet: Pet,
  options?: ValidatePetFromDocumentOptions,
): Promise<PetValidationResult> {
  console.log(`\n=== Validating pet: ${pet.name} (ID: ${pet.id}) ===`);

  const extractedInfo = await extractPetInfoFromDocument(attachment, emailSubject);
  return evaluatePetVerification(extractedInfo, pet, options);
}

/** Pure validation from OCR extraction (testable without Gemini). */
export function evaluatePetVerification(
  extractedInfo: ExtractedPetInfo,
  pet: Pet,
  options?: ValidatePetFromDocumentOptions,
): PetValidationResult {
  const verificationConfig = options?.verificationConfig ??
    DEFAULT_EMAIL_DOCUMENT_VERIFICATION;
  const documentType = options?.documentType;
  const matchThreshold = verificationConfig.fuzzyMatchThreshold > 0
    ? verificationConfig.fuzzyMatchThreshold
    : FUZZY_MATCH_THRESHOLD;

  const matchDetails: MatchDetails = {};
  let microchipMismatchNotify = false;

  const hasAnyRaw =
    nonEmpty(extractedInfo.microchip) ||
    nonEmpty(extractedInfo.name) ||
    nonEmpty(extractedInfo.breed) ||
    nonEmpty(extractedInfo.age) ||
    nonEmpty(extractedInfo.gender);

  if (!hasAnyRaw) {
    console.log("No pet identification info found in document");
    return {
      isValid: false,
      method: "none",
      extractedInfo,
      matchDetails,
      skipReason: "no_pet_info",
    };
  }

  if (nonEmpty(extractedInfo.microchip) && nonEmpty(pet.microchip_number)) {
    console.log("\n--- Microchip validation ---");
    const microchipMatches = matchMicrochip(extractedInfo.microchip, pet.microchip_number);
    matchDetails.microchipMatch = microchipMatches;

    if (microchipMatches) {
      console.log("✅ Microchip validated successfully");
      return {
        isValid: true,
        method: "microchip",
        extractedInfo,
        matchDetails,
      };
    }

    console.log("⚠️ Microchip mismatch — notify only; checking name and breed");
    microchipMismatchNotify = true;
    matchDetails.microchipMatch = false;
  }

  console.log("\n--- Name / breed validation ---");

  if (!nonEmpty(extractedInfo.name)) {
    console.log("❌ Document must include pet name for verification");
    return {
      isValid: false,
      method: microchipMismatchNotify ? "microchip" : "attributes",
      extractedInfo,
      matchDetails,
      skipReason: "no_pet_info",
      ...(microchipMismatchNotify ? chipMismatchExtras(extractedInfo, pet) : {}),
    };
  }

  const first = petFirstName(pet.name);
  const nameMatch = fuzzyMatch(extractedInfo.name, first, matchThreshold, "name");
  matchDetails.nameMatch = nameMatch;

  if (!nameMatch.matches) {
    console.log("❌ First name does not match profile");
    return {
      isValid: false,
      method: "attributes",
      extractedInfo,
      matchDetails,
      skipReason: "attributes_mismatch",
      ...(microchipMismatchNotify ? chipMismatchExtras(extractedInfo, pet) : {}),
    };
  }

  const hasBreedOnDoc = nonEmpty(extractedInfo.breed);

  if (
    !hasBreedOnDoc &&
    documentType &&
    breedRequiredForDocumentType(verificationConfig, documentType)
  ) {
    console.log(
      `❌ Breed required on document for type ${documentType} (country: ${verificationConfig.country})`,
    );
    return {
      isValid: false,
      method: "attributes",
      extractedInfo,
      matchDetails,
      skipReason: "breed_required_on_document",
      ...(microchipMismatchNotify ? chipMismatchExtras(extractedInfo, pet) : {}),
    };
  }

  if (
    !hasBreedOnDoc &&
    documentType &&
    allowsNameOnlyForDocumentType(verificationConfig, documentType)
  ) {
    console.log(
      `✅ Name-only verification (${documentType}, country: ${verificationConfig.country})`,
    );
    return {
      isValid: true,
      method: "name_only",
      extractedInfo,
      matchDetails,
      ...(microchipMismatchNotify ? chipMismatchExtras(extractedInfo, pet) : {}),
    };
  }

  if (!hasBreedOnDoc) {
    console.log("❌ Breed missing on document and name-only not allowed for this type");
    return {
      isValid: false,
      method: "attributes",
      extractedInfo,
      matchDetails,
      skipReason: "no_pet_info",
      ...(microchipMismatchNotify ? chipMismatchExtras(extractedInfo, pet) : {}),
    };
  }

  const breedMatch = matchBreeds(
    extractedInfo.breed,
    pet.breed ?? "",
    similarityRatio,
    matchThreshold,
  );
  console.log(
    `Breed match: "${extractedInfo.breed}" vs profile "${pet.breed}" = ` +
      `${(breedMatch.similarity * 100).toFixed(1)}% (matches: ${breedMatch.matches}` +
      `${breedMatch.isLikelyVariation ? ", cross/mixed component" : ""})`,
  );
  matchDetails.breedMatch = breedMatch;

  const isValid = breedMatch.matches;

  if (isValid) {
    console.log("✅ First name and breed validated successfully");
  } else {
    console.log("❌ Breed does not match profile");
  }

  return {
    isValid,
    method: "attributes",
    extractedInfo,
    matchDetails,
    skipReason: isValid ? undefined : "attributes_mismatch",
    ...(microchipMismatchNotify ? chipMismatchExtras(extractedInfo, pet) : {}),
  };
}

export function formatDetailedError(
  result: PetValidationResult,
  pet: Pet
): string {
  const { isValid, extractedInfo, matchDetails, skipReason } = result;

  if (isValid) {
    return `Validation passed for ${pet.name}`;
  }

  if (skipReason === "breed_required_on_document") {
    return `Could not verify ${pet.name}: this document type requires breed on the PDF, but no breed was found. Add breed to the document or adjust country rules in admin.`;
  }

  if (skipReason === "no_pet_info") {
    const missing: string[] = [];
    if (!nonEmpty(extractedInfo.name)) missing.push("pet name");
    if (!nonEmpty(extractedInfo.breed)) missing.push("breed");
    if (missing.length > 0) {
      return `Could not verify ${pet.name}: the document must clearly include pet identification (missing: ${missing.join(", ")}).`;
    }
    return `No pet identification found in the document for ${pet.name}.`;
  }

  if (skipReason === "microchip_mismatch") {
    return `Microchip on document ('${extractedInfo.microchip}') does not match ${pet.name}'s profile ('${pet.microchip_number}').`;
  }

  if (skipReason === "attributes_mismatch") {
    const first = petFirstName(pet.name);
    const parts: string[] = [];
    if (matchDetails.nameMatch) {
      if (matchDetails.nameMatch.matches) {
        parts.push(
          `first name OK ('${extractedInfo.name}' vs '${first}', ${(matchDetails.nameMatch.similarity * 100).toFixed(0)}%)`
        );
      } else {
        parts.push(
          `first name mismatch ('${extractedInfo.name}' vs profile first name '${first}', ${(matchDetails.nameMatch.similarity * 100).toFixed(0)}%)`
        );
      }
    }
    if (matchDetails.breedMatch) {
      if (matchDetails.breedMatch.matches) {
        parts.push(
          `breed OK ('${extractedInfo.breed}' vs '${pet.breed}', ${(matchDetails.breedMatch.similarity * 100).toFixed(0)}%)`
        );
      } else {
        parts.push(
          `breed mismatch ('${extractedInfo.breed}' vs '${pet.breed}', ${(matchDetails.breedMatch.similarity * 100).toFixed(0)}%)`
        );
      }
    }
    return `Pet verification failed for ${pet.name}: ${parts.join("; ")}.`;
  }

  return "Validation failed for unknown reason.";
}

export function formatValidationResult(result: PetValidationResult): string {
  const { isValid, method, extractedInfo, matchDetails, microchipMismatchNotify } = result;

  let summary = `Validation: ${isValid ? "PASSED" : "FAILED"} (method: ${method})\n`;
  if (microchipMismatchNotify) {
    summary += `  Microchip mismatch (notify only)\n`;
  }
  summary += `Extracted: name="${extractedInfo.name}", breed="${extractedInfo.breed}", microchip="${extractedInfo.microchip}"\n`;

  if (matchDetails.microchipMatch !== undefined) {
    summary += `  Microchip: ${matchDetails.microchipMatch ? "✅" : "❌"}\n`;
  }
  if (matchDetails.nameMatch) {
    summary += `  Name: ${matchDetails.nameMatch.matches ? "✅" : "❌"} (${(matchDetails.nameMatch.similarity * 100).toFixed(0)}%)\n`;
  }
  if (matchDetails.breedMatch) {
    summary += `  Breed: ${matchDetails.breedMatch.matches ? "✅" : "❌"} (${(matchDetails.breedMatch.similarity * 100).toFixed(0)}%)\n`;
  }

  return summary;
}
