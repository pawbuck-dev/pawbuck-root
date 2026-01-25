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
const MIN_ATTRIBUTE_MATCH_THRESHOLD = 0.7;
// Fuzzy match threshold for name and breed matching
const FUZZY_MATCH_THRESHOLD = 0.7;
// Age tolerance in years for matching
const AGE_TOLERANCE_YEARS = 1;

// Field weights for weighted scoring (must sum to 100)
const FIELD_WEIGHTS = {
  microchip: 100,  // If present, exact match required
  name: 40,
  breed: 30,
  age: 20,
  gender: 10,
};

// High confidence threshold for individual fields
const HIGH_CONFIDENCE_THRESHOLD = 0.9;
// Minimum confidence for partial match acceptance
const PARTIAL_MATCH_MIN_CONFIDENCE = 0.75;

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
 * Check if one name is likely a nickname of another
 */
function isLikelyNickname(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // One is a substring of the other (e.g., "Max" in "Maximus")
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length >= n2.length ? n1 : n2;
    // If shorter is at least 60% of longer, likely nickname
    if (shorter.length >= longer.length * 0.6) {
      return true;
    }
  }
  
  // Common nickname patterns
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

/**
 * Check if one breed is an abbreviation or partial match of another
 */
function isBreedAbbreviation(breed1: string, breed2: string): boolean {
  const b1 = breed1.toLowerCase().trim();
  const b2 = breed2.toLowerCase().trim();
  
  // One contains the other (e.g., "Golden" in "Golden Retriever")
  if (b1.includes(b2) || b2.includes(b1)) {
    const shorter = b1.length < b2.length ? b1 : b2;
    const longer = b1.length >= b2.length ? b1 : b2;
    // If shorter is at least 70% of longer, likely abbreviation
    if (shorter.length >= longer.length * 0.7) {
      return true;
    }
  }
  
  // Check if one is a word from the other (e.g., "Retriever" from "Golden Retriever")
  const words1 = b1.split(/\s+/);
  const words2 = b2.split(/\s+/);
  
  // If all words from shorter are in longer, it's likely an abbreviation
  const shorter = words1.length < words2.length ? words1 : words2;
  const longer = words1.length >= words2.length ? words1 : words2;
  
  return shorter.every(word => longer.some(lw => lw.includes(word) || word.includes(lw)));
}

/**
 * Enhanced fuzzy match with intelligent nickname/abbreviation detection
 */
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
  
  // Check for intelligent variations
  let isLikelyVariation = false;
  if (fieldType === "name" && similarity >= 0.6 && similarity < threshold) {
    isLikelyVariation = isLikelyNickname(extracted, expected);
  } else if (fieldType === "breed" && similarity >= 0.7 && similarity < threshold) {
    isLikelyVariation = isBreedAbbreviation(extracted, expected);
  }
  
  // Accept if above threshold OR if it's a likely variation
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
 * Returns match result with difference for detailed error messages
 */
function matchAge(
  extractedAge: string | null,
  dateOfBirth: string,
  toleranceYears: number = AGE_TOLERANCE_YEARS,
  hasStrongOtherMatches: boolean = false
): { matches: boolean; difference: number; extractedYears: number; actualYears: number } {
  if (!extractedAge) {
    return { matches: false, difference: Infinity, extractedYears: 0, actualYears: 0 };
  }

  const extractedYears = parseAgeToYears(extractedAge);
  if (extractedYears === null) {
    return { matches: false, difference: Infinity, extractedYears: 0, actualYears: 0 };
  }

  const actualYears = calculateAgeInYears(dateOfBirth);
  const difference = Math.abs(extractedYears - actualYears);
  
  // Increase tolerance if we have strong matches in other fields
  const effectiveTolerance = hasStrongOtherMatches ? toleranceYears * 2 : toleranceYears;
  const matches = difference <= effectiveTolerance;
  
  console.log(
    `Age match: extracted "${extractedAge}" (${extractedYears.toFixed(1)} years) vs ` +
    `DOB ${dateOfBirth} (${actualYears.toFixed(1)} years) = ${matches ? "MATCH" : "NO MATCH"} ` +
    `(diff: ${difference.toFixed(1)} years, tolerance: ${effectiveTolerance})`
  );

  return { matches, difference, extractedYears, actualYears };
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
 * Calculate weighted confidence score based on field matches
 */
export function calculateValidationConfidence(
  matchDetails: MatchDetails,
  extractedInfo: ExtractedPetInfo,
  pet: Pet
): { confidence: number; recommendation: string; fieldBreakdown: Record<string, number> } {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const fieldBreakdown: Record<string, number> = {};

  // Microchip (100% weight if present)
  if (extractedInfo.microchip) {
    maxPossibleScore += FIELD_WEIGHTS.microchip;
    if (matchDetails.microchipMatch) {
      totalScore += FIELD_WEIGHTS.microchip;
      fieldBreakdown.microchip = 100;
    } else {
      fieldBreakdown.microchip = 0;
    }
  }

  // Name (40% weight)
  if (extractedInfo.name) {
    maxPossibleScore += FIELD_WEIGHTS.name;
    if (matchDetails.nameMatch) {
      const similarity = matchDetails.nameMatch.similarity;
      const score = FIELD_WEIGHTS.name * similarity;
      totalScore += score;
      fieldBreakdown.name = similarity * 100;
    } else {
      fieldBreakdown.name = 0;
    }
  }

  // Breed (30% weight)
  if (extractedInfo.breed) {
    maxPossibleScore += FIELD_WEIGHTS.breed;
    if (matchDetails.breedMatch) {
      const similarity = matchDetails.breedMatch.similarity;
      const score = FIELD_WEIGHTS.breed * similarity;
      totalScore += score;
      fieldBreakdown.breed = similarity * 100;
    } else {
      fieldBreakdown.breed = 0;
    }
  }

  // Age (20% weight)
  if (extractedInfo.age && pet.date_of_birth) {
    maxPossibleScore += FIELD_WEIGHTS.age;
    if (matchDetails.ageMatch) {
      totalScore += FIELD_WEIGHTS.age;
      fieldBreakdown.age = 100;
    } else {
      fieldBreakdown.age = 0;
    }
  }

  // Gender (10% weight)
  if (extractedInfo.gender) {
    maxPossibleScore += FIELD_WEIGHTS.gender;
    if (matchDetails.genderMatch) {
      totalScore += FIELD_WEIGHTS.gender;
      fieldBreakdown.gender = 100;
    } else {
      fieldBreakdown.gender = 0;
    }
  }

  const confidence = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  let recommendation: string;
  if (confidence >= 90) {
    recommendation = "High confidence";
  } else if (confidence >= 70) {
    recommendation = "Medium confidence";
  } else if (confidence >= 50) {
    recommendation = "Low confidence - manual review needed";
  } else {
    recommendation = "Very low confidence";
  }

  return { confidence, recommendation, fieldBreakdown };
}

/**
 * Determine if partial matches should be accepted based on high-confidence fields
 */
export function shouldAcceptPartialMatch(
  matchDetails: MatchDetails,
  confidence: number,
  hasStrongMatches: boolean
): boolean {
  // If overall confidence is high enough, accept
  if (confidence >= PARTIAL_MATCH_MIN_CONFIDENCE) {
    return true;
  }

  // If we have strong name + breed matches (both 90%+), accept even if below threshold
  if (hasStrongMatches) {
    const nameStrong = matchDetails.nameMatch && matchDetails.nameMatch.similarity >= HIGH_CONFIDENCE_THRESHOLD;
    const breedStrong = matchDetails.breedMatch && matchDetails.breedMatch.similarity >= HIGH_CONFIDENCE_THRESHOLD;
    
    if (nameStrong && breedStrong) {
      return true;
    }
  }

  // If we have name + age matches (both high confidence), accept
  const nameMatches = matchDetails.nameMatch?.matches && 
                      matchDetails.nameMatch.similarity >= HIGH_CONFIDENCE_THRESHOLD;
  const ageMatches = matchDetails.ageMatch === true;
  
  if (nameMatches && ageMatches) {
    return true;
  }

  return false;
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

  // PRIORITY 2: Attributes validation (name + age + breed + gender) with intelligent matching
  console.log("\n--- Attributes validation (no microchip found) ---");
  method = "attributes";
  let matchCount = 0;
  let availableAttributes = 0;

  // Name match (fuzzy with nickname detection)
  let nameMatch: { similarity: number; matches: boolean; isLikelyVariation?: boolean } | undefined;
  if (extractedInfo.name) {
    nameMatch = fuzzyMatch(extractedInfo.name, pet.name, FUZZY_MATCH_THRESHOLD, "name");
    matchDetails.nameMatch = nameMatch;
    if (nameMatch.matches) matchCount++;
    availableAttributes++;
  } 

  // Breed match (fuzzy with abbreviation detection)
  let breedMatch: { similarity: number; matches: boolean; isLikelyVariation?: boolean } | undefined;
  if (extractedInfo.breed) {
    breedMatch = fuzzyMatch(extractedInfo.breed, pet.breed, FUZZY_MATCH_THRESHOLD, "breed");
    matchDetails.breedMatch = breedMatch;
    if (breedMatch.matches) matchCount++;
    availableAttributes++;
  }

  // Check if we have strong matches (name + breed both high confidence)
  const hasStrongNameMatch = nameMatch && nameMatch.similarity >= HIGH_CONFIDENCE_THRESHOLD;
  const hasStrongBreedMatch = breedMatch && breedMatch.similarity >= HIGH_CONFIDENCE_THRESHOLD;
  const hasStrongMatches = hasStrongNameMatch && hasStrongBreedMatch;

  // Age match (with flexible tolerance based on other matches)
  let ageMatchResult: { matches: boolean; difference: number; extractedYears: number; actualYears: number } | undefined;
  if (extractedInfo.age && pet.date_of_birth) {
    ageMatchResult = matchAge(extractedInfo.age, pet.date_of_birth, AGE_TOLERANCE_YEARS, hasStrongMatches);
    matchDetails.ageMatch = ageMatchResult.matches;
    if (ageMatchResult.matches) matchCount++;
    availableAttributes++;
  }

  // Gender match (normalized)
  if (extractedInfo.gender) {
    const genderMatches = matchGender(extractedInfo.gender, pet.sex);
    matchDetails.genderMatch = genderMatches;
    if (genderMatches) matchCount++;
    availableAttributes++;
  }

  const minAttributeMatches = availableAttributes * MIN_ATTRIBUTE_MATCH_THRESHOLD;

  console.log(`\nAttribute matches: ${matchCount}/${availableAttributes} found, ${minAttributeMatches.toFixed(1)} required`);

  // Calculate weighted confidence score
  const confidenceResult = calculateValidationConfidence(matchDetails, extractedInfo, pet);
  console.log(`Weighted confidence: ${confidenceResult.confidence.toFixed(1)}% (${confidenceResult.recommendation})`);

  // Check if we should accept based on weighted confidence or high-confidence partial matches
  const shouldAccept = matchCount >= minAttributeMatches || 
                       shouldAcceptPartialMatch(matchDetails, confidenceResult.confidence, hasStrongMatches);

  if (shouldAccept) {
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
 * Format detailed error message for user display
 */
export function formatDetailedError(
  result: PetValidationResult,
  pet: Pet
): string {
  const { isValid, method, extractedInfo, matchDetails, skipReason } = result;
  
  if (isValid) {
    return `Validation passed for ${pet.name}`;
  }

  const confidenceResult = calculateValidationConfidence(matchDetails, extractedInfo, pet);
  const confidence = confidenceResult.confidence;
  
  // No pet info found
  if (skipReason === "no_pet_info") {
    const searchedFields: string[] = [];
    if (extractedInfo.microchip === null) searchedFields.push("microchip number");
    if (extractedInfo.name === null) searchedFields.push("pet name");
    if (extractedInfo.age === null) searchedFields.push("age");
    if (extractedInfo.breed === null) searchedFields.push("breed");
    if (extractedInfo.gender === null) searchedFields.push("gender");
    
    return `No pet identification found. Document did not contain: ${searchedFields.join(", ")}.`;
  }

  // Microchip mismatch
  if (skipReason === "microchip_mismatch") {
    return `Microchip number mismatch. Document shows: '${extractedInfo.microchip}' but expected: '${pet.microchip_number}' for ${pet.name}.`;
  }

  // Attributes mismatch - build detailed message
  if (skipReason === "attributes_mismatch") {
    const details: string[] = [];
    const matchedFields: string[] = [];
    const mismatchedFields: string[] = [];
    const missingFields: string[] = [];

    // Name
    if (extractedInfo.name) {
      if (matchDetails.nameMatch) {
        const sim = matchDetails.nameMatch.similarity;
        if (matchDetails.nameMatch.matches) {
          if (sim >= HIGH_CONFIDENCE_THRESHOLD) {
            matchedFields.push(`name ('${extractedInfo.name}', ${(sim * 100).toFixed(0)}% similarity)`);
          } else {
            matchedFields.push(`name ('${extractedInfo.name}', ${(sim * 100).toFixed(0)}% similarity)`);
          }
        } else {
          if (matchDetails.nameMatch.isLikelyVariation) {
            mismatchedFields.push(`name is close: '${extractedInfo.name}' vs '${pet.name}' (${(sim * 100).toFixed(0)}% similarity) - may be a nickname`);
          } else {
            mismatchedFields.push(`name ('${extractedInfo.name}' vs '${pet.name}', ${(sim * 100).toFixed(0)}% similarity)`);
          }
        }
      }
    } else {
      missingFields.push("name");
    }

    // Age
    if (extractedInfo.age && pet.date_of_birth) {
      if (matchDetails.ageMatch) {
        matchedFields.push("age");
      } else {
        // Recalculate to get difference for error message
        const ageResult = matchAge(extractedInfo.age, pet.date_of_birth, AGE_TOLERANCE_YEARS, false);
        if (ageResult.actualYears > 0) {
          mismatchedFields.push(`age ('${extractedInfo.age}' vs expected ~${ageResult.actualYears.toFixed(1)} years, ${ageResult.difference.toFixed(1)} year difference)`);
        } else {
          mismatchedFields.push(`age ('${extractedInfo.age}' - could not calculate expected age)`);
        }
      }
    } else {
      missingFields.push("age");
    }

    // Breed
    if (extractedInfo.breed) {
      if (matchDetails.breedMatch && matchDetails.breedMatch.matches) {
        const sim = matchDetails.breedMatch.similarity;
        if (sim >= HIGH_CONFIDENCE_THRESHOLD) {
          matchedFields.push(`breed ('${extractedInfo.breed}', ${(sim * 100).toFixed(0)}% similarity)`);
        } else {
          matchedFields.push(`breed ('${extractedInfo.breed}', ${(sim * 100).toFixed(0)}% similarity)`);
        }
      } else {
        const sim = matchDetails.breedMatch?.similarity || 0;
        if (matchDetails.breedMatch?.isLikelyVariation) {
          mismatchedFields.push(`breed partial match: '${extractedInfo.breed}' vs '${pet.breed}' (${(sim * 100).toFixed(0)}% similarity) - may be abbreviated`);
        } else {
          mismatchedFields.push(`breed ('${extractedInfo.breed}' vs '${pet.breed}', ${(sim * 100).toFixed(0)}% similarity)`);
        }
      }
    } else {
      missingFields.push("breed");
    }

    // Gender
    if (extractedInfo.gender) {
      if (matchDetails.genderMatch) {
        matchedFields.push("gender");
      } else {
        mismatchedFields.push(`gender ('${extractedInfo.gender}' vs '${pet.sex}')`);
      }
    } else {
      missingFields.push("gender");
    }

    // Build message
    let message = "";
    
    if (mismatchedFields.length > 0) {
      if (mismatchedFields.length === 1) {
        message = `${mismatchedFields[0].charAt(0).toUpperCase() + mismatchedFields[0].slice(1)}. `;
      } else {
        message = `Multiple mismatches found: ${mismatchedFields.join(", ")}. `;
      }
    }

    if (matchedFields.length > 0) {
      message += `Matched: ${matchedFields.join(", ")}. `;
    }

    if (missingFields.length > 0) {
      message += `Missing: ${missingFields.join(", ")}. `;
    }

    message += `Overall confidence: ${confidence.toFixed(0)}% (${confidenceResult.recommendation}).`;

    // Add helpful context
    if (confidence >= 50 && confidence < 70) {
      message += " High-confidence fields match - this may still be the same pet. Consider manual review.";
    } else if (confidence < 50) {
      message += " Need at least 2 matching fields for validation.";
    }

    return message;
  }

  return "Validation failed for unknown reason.";
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

