import { formatDetailedError } from "../petValidator.ts";
import type { ExtractedPetInfo, MatchDetails, Pet, PetValidationResult } from "../types.ts";

function basePet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: "p1",
    name: "Milo Jones",
    email_id: "e1",
    user_id: "u1",
    animal_type: "dog",
    breed: "Golden Retriever",
    microchip_number: "111111111111111",
    date_of_birth: "2020-01-01",
    sex: "male",
    ...overrides,
  };
}

function emptyExtracted(overrides: Partial<ExtractedPetInfo> = {}): ExtractedPetInfo {
  return {
    microchip: null,
    name: null,
    age: null,
    breed: null,
    gender: null,
    confidence: 0,
    ...overrides,
  };
}

Deno.test("formatDetailedError: attributes_mismatch mentions first name and breed", () => {
  const pet = basePet();
  const extractedInfo = emptyExtracted({
    name: "Max",
    breed: "Golden Retriever",
  });
  const matchDetails: MatchDetails = {
    nameMatch: { similarity: 0.2, matches: false },
    breedMatch: { similarity: 1, matches: true },
  };
  const result: PetValidationResult = {
    isValid: false,
    method: "attributes",
    extractedInfo,
    matchDetails,
    skipReason: "attributes_mismatch",
  };
  const msg = formatDetailedError(result, pet);
  if (!msg.includes("Milo")) throw new Error(`expected pet name in: ${msg}`);
  if (!msg.toLowerCase().includes("first name")) {
    throw new Error(`expected first name in: ${msg}`);
  }
  if (!msg.toLowerCase().includes("breed")) throw new Error(`expected breed in: ${msg}`);
});

Deno.test("formatDetailedError: no_pet_info when name or breed missing", () => {
  const pet = basePet();
  const result: PetValidationResult = {
    isValid: false,
    method: "attributes",
    extractedInfo: emptyExtracted({ name: "Milo", breed: null }),
    matchDetails: {},
    skipReason: "no_pet_info",
    microchipMismatchNotify: true,
    microchipDocumentValue: "222",
    microchipProfileValue: "111",
  };
  const msg = formatDetailedError(result, pet);
  if (!msg.toLowerCase().includes("breed")) throw new Error(`expected breed missing hint: ${msg}`);
});
