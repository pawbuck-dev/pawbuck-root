import type {
    ExtractedPetInfo,
    MatchDetails,
    ParsedAttachment,
    Pet,
    PetValidationResult,
    SkipReason,
    ValidationMethod,
} from "./types.ts";

// Minimum number of attribute matches required when no microchip is available
const MIN_ATTRIBUTE_MATCHES = 3;
// Fuzzy match threshold for name and breed matching
const FUZZY_MATCH_THRESHOLD = 0.7;
// Age tolerance in years for matching
const AGE_TOLERANCE_YEARS = 1;

/**
 * Extract all pet information from a document using Gemini AI
 */
export async function extractPetInfoFromDocument(
  attachment: ParsedAttachment,
  emailSubject: string
): Promise<ExtractedPetInfo> {
  const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!GOOGLE_GEMINI_API_KEY) {
    console.error("GOOGLE_GEMINI_API_KEY not configured for pet info extraction");
    return createEmptyExtraction();
  }

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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      }
    );

    if (!response.ok) {
      console.error(`Gemini API error for pet info extraction: ${response.status}`);
      return createEmptyExtraction();
    }

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    // convert all values to null if they are "null" or "undefined"
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

/**
 * Create an empty extraction result
 */
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

/**
 * Calculate Levenshtein distance between two strings
 */
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

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - distance / maxLength;
}

/**
 * Fuzzy match two strings
 */
function fuzzyMatch(
  extracted: string | null,
  expected: string,
  threshold: number = FUZZY_MATCH_THRESHOLD
): { similarity: number; matches: boolean } {
  if (!extracted) {
    return { similarity: 0, matches: false };
  }

  const similarity = similarityRatio(extracted, expected);
  
  console.log(
    `Fuzzy match: "${extracted}" vs "${expected}" = ${(similarity * 100).toFixed(1)}% (threshold: ${threshold * 100}%)`
  );

  return {
    similarity,
    matches: similarity >= threshold,
  };
}

/**
 * Calculate age in years from date of birth
 */
function calculateAgeInYears(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  
  // Also calculate months for more precision
  let months = monthDiff;
  if (months < 0) months += 12;
  
  return years + (months / 12);
}

/**
 * Parse age string to approximate years
 * Handles formats like "3 years", "6 months", "2 years 4 months"
 */
function parseAgeToYears(ageString: string): number | null {
  if (!ageString) return null;
  
  const lowerAge = ageString.toLowerCase();
  let totalYears = 0;

  // Match years
  const yearsMatch = lowerAge.match(/(\d+)\s*(?:years?|yrs?|y)/);
  if (yearsMatch) {
    totalYears += parseInt(yearsMatch[1], 10);
  }

  // Match months
  const monthsMatch = lowerAge.match(/(\d+)\s*(?:months?|mos?|m(?!\w))/);
  if (monthsMatch) {
    totalYears += parseInt(monthsMatch[1], 10) / 12;
  }

  // Match weeks (convert to years)
  const weeksMatch = lowerAge.match(/(\d+)\s*(?:weeks?|wks?|w)/);
  if (weeksMatch) {
    totalYears += parseInt(weeksMatch[1], 10) / 52;
  }

  return totalYears > 0 ? totalYears : null;
}

/**
 * Check if extracted age matches pet's age from date of birth
 */
function matchAge(
  extractedAge: string | null,
  dateOfBirth: string,
  toleranceYears: number = AGE_TOLERANCE_YEARS
): boolean {
  if (!extractedAge) return false;

  const extractedYears = parseAgeToYears(extractedAge);
  if (extractedYears === null) return false;

  const actualYears = calculateAgeInYears(dateOfBirth);
  const difference = Math.abs(extractedYears - actualYears);

  const matches = difference <= toleranceYears;
  
  console.log(
    `Age match: extracted "${extractedAge}" (${extractedYears.toFixed(1)} years) vs ` +
    `DOB ${dateOfBirth} (${actualYears.toFixed(1)} years) = ${matches ? "MATCH" : "NO MATCH"} ` +
    `(diff: ${difference.toFixed(1)} years, tolerance: ${toleranceYears})`
  );

  return matches;
}

/**
 * Normalize gender string for comparison
 */
function normalizeGender(gender: string | null): string | null {
  if (!gender) return null;
  
  const lower = gender.toLowerCase().trim();
  
  // Male variants
  if (lower === "m" || lower === "male" || lower.includes("male") || lower.includes("intact male")) {
    return "male";
  }
  
  // Female variants
  if (lower === "f" || lower === "female" || lower.includes("female") || lower.includes("intact female")) {
    return "female";
  }
  
  // Neutered/Spayed (still male/female)
  if (lower.includes("neutered") || lower.includes("castrated")) {
    return "male";
  }
  if (lower.includes("spayed")) {
    return "female";
  }
  
  return lower;
}

/**
 * Check if genders match
 */
function matchGender(extractedGender: string | null, expectedGender: string): boolean {
  const normalizedExtracted = normalizeGender(extractedGender);
  const normalizedExpected = normalizeGender(expectedGender);
  
  if (!normalizedExtracted || !normalizedExpected) return false;
  
  const matches = normalizedExtracted === normalizedExpected;
  
  console.log(
    `Gender match: "${extractedGender}" (${normalizedExtracted}) vs ` +
    `"${expectedGender}" (${normalizedExpected}) = ${matches ? "MATCH" : "NO MATCH"}`
  );
  
  return matches;
}

/**
 * Check if microchip numbers match (exact match, ignoring whitespace)
 */
function matchMicrochip(extractedMicrochip: string | null, expectedMicrochip: string | null): boolean {
  if (!extractedMicrochip || !expectedMicrochip) return false;
  
  // Remove all whitespace and compare
  const cleanExtracted = extractedMicrochip.replace(/\s/g, "");
  const cleanExpected = expectedMicrochip.replace(/\s/g, "");
  
  const matches = cleanExtracted === cleanExpected;
  
  console.log(
    `Microchip match: "${extractedMicrochip}" vs "${expectedMicrochip}" = ${matches ? "MATCH" : "NO MATCH"}`
  );
  
  return matches;
}

/**
 * Validate pet from document against expected pet record
 * Uses microchip as primary validator, falls back to attributes combination
 */
export async function validatePetFromDocument(
  attachment: ParsedAttachment,
  emailSubject: string,
  pet: Pet
): Promise<PetValidationResult> {
  console.log(`\n=== Validating pet: ${pet.name} (ID: ${pet.id}) ===`);
  
  // Extract all pet info from document
  const extractedInfo = await extractPetInfoFromDocument(attachment, emailSubject);
  
  // Build match details
  const matchDetails: MatchDetails = {};
  let method: ValidationMethod = "none";
  let isValid = false;
  let skipReason: SkipReason | undefined;

  // Check if we have any identifiable information
  const hasAnyInfo = extractedInfo.microchip || extractedInfo.name || 
                     extractedInfo.age || extractedInfo.breed || extractedInfo.gender;
  
  if (!hasAnyInfo) {
    console.log("No pet identification info found in document");
    return {
      isValid: false,
      method: "none",
      extractedInfo,
      matchDetails,
      skipReason: "no_pet_info",
    };
  }

  // PRIORITY 1: Microchip validation (if microchip found in document)
  if (extractedInfo.microchip) {
    console.log("\n--- Microchip validation ---");
    const microchipMatches = matchMicrochip(extractedInfo.microchip, pet.microchip_number);
    matchDetails.microchipMatch = microchipMatches;
    method = "microchip";
    
    if (microchipMatches) {
      console.log("✅ Microchip validated successfully");
      return {
        isValid: true,
        method: "microchip",
        extractedInfo,
        matchDetails,
      };
    } else {
      console.log("❌ Microchip mismatch - document does not belong to this pet");
      return {
        isValid: false,
        method: "microchip",
        extractedInfo,
        matchDetails,
        skipReason: "microchip_mismatch",
      };
    }
  }

  // PRIORITY 2: Attributes validation (name + age + breed + gender)
  console.log("\n--- Attributes validation (no microchip found) ---");
  method = "attributes";
  let matchCount = 0;

  // Name match (fuzzy)
  if (extractedInfo.name) {
    const nameMatch = fuzzyMatch(extractedInfo.name, pet.name);
    matchDetails.nameMatch = nameMatch;
    if (nameMatch.matches) matchCount++;
  }

  // Age match (with tolerance)
  if (extractedInfo.age && pet.date_of_birth) {
    const ageMatches = matchAge(extractedInfo.age, pet.date_of_birth);
    matchDetails.ageMatch = ageMatches;
    if (ageMatches) matchCount++;
  }

  // Breed match (fuzzy)
  if (extractedInfo.breed) {
    const breedMatch = fuzzyMatch(extractedInfo.breed, pet.breed);
    matchDetails.breedMatch = breedMatch;
    if (breedMatch.matches) matchCount++;
  }

  // Gender match (normalized)
  if (extractedInfo.gender) {
    const genderMatches = matchGender(extractedInfo.gender, pet.sex);
    matchDetails.genderMatch = genderMatches;
    if (genderMatches) matchCount++;
  }

  console.log(`\nAttribute matches: ${matchCount}/${MIN_ATTRIBUTE_MATCHES} required`);

  if (matchCount >= MIN_ATTRIBUTE_MATCHES) {
    console.log("✅ Attributes validated successfully");
    isValid = true;
  } else {
    console.log("❌ Insufficient attribute matches - document may not belong to this pet");
    skipReason = "attributes_mismatch";
  }

  return {
    isValid,
    method,
    extractedInfo,
    matchDetails,
    skipReason,
  };
}

/**
 * Format validation result for logging
 */
export function formatValidationResult(result: PetValidationResult): string {
  const { isValid, method, extractedInfo, matchDetails } = result;
  
  let summary = `Validation: ${isValid ? "PASSED" : "FAILED"} (method: ${method})\n`;
  summary += `Extracted: name="${extractedInfo.name}", age="${extractedInfo.age}", `;
  summary += `breed="${extractedInfo.breed}", gender="${extractedInfo.gender}", `;
  summary += `microchip="${extractedInfo.microchip}"\n`;
  
  if (matchDetails.microchipMatch !== undefined) {
    summary += `  Microchip: ${matchDetails.microchipMatch ? "✅" : "❌"}\n`;
  }
  if (matchDetails.nameMatch) {
    summary += `  Name: ${matchDetails.nameMatch.matches ? "✅" : "❌"} (${(matchDetails.nameMatch.similarity * 100).toFixed(0)}%)\n`;
  }
  if (matchDetails.ageMatch !== undefined) {
    summary += `  Age: ${matchDetails.ageMatch ? "✅" : "❌"}\n`;
  }
  if (matchDetails.breedMatch) {
    summary += `  Breed: ${matchDetails.breedMatch.matches ? "✅" : "❌"} (${(matchDetails.breedMatch.similarity * 100).toFixed(0)}%)\n`;
  }
  if (matchDetails.genderMatch !== undefined) {
    summary += `  Gender: ${matchDetails.genderMatch ? "✅" : "❌"}\n`;
  }
  
  return summary;
}

