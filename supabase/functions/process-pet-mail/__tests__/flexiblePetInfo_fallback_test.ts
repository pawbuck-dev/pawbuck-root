import {
  isSpeciesOnlyBreedValue,
  mapFlexibleVaultToPetInfo,
  mergePetInfoFields,
  normalizeDocumentBreed,
  parsePetNameFromTitle,
  petInfoNeedsFallback,
} from "../../_shared/flexiblePetInfoFromDocument.ts";
import { evaluatePetVerification } from "../petValidator.ts";
import { DEFAULT_EMAIL_DOCUMENT_VERIFICATION } from "../../_shared/emailDocumentVerificationConfig.ts";
import type { Pet } from "../types.ts";

const miloPet: Pet = {
  id: "milo-1",
  name: "Milo",
  email_id: "test@milo.app",
  user_id: "u2",
  animal_type: "dog",
  breed: "Maltese",
  microchip_number: null,
  date_of_birth: "2020-01-01",
  sex: "male",
  country: "Canada",
};

const benjiPet: Pet = {
  id: "d7a01808-aa0e-46b7-bc04-3c7eb5c8a4a7",
  name: "Benji",
  email_id: "test123@pawbuck.app",
  user_id: "u1",
  animal_type: "dog",
  breed: "Shih Tzu/Yorkshire Terrier",
  microchip_number: null,
  date_of_birth: "2020-01-01",
  sex: "male",
  country: "Canada",
};

Deno.test("mapFlexibleVaultToPetInfo reads Benji vaccination PDF keyFacts", () => {
  const mapped = mapFlexibleVaultToPetInfo({
    title: "Vaccination Record for Benji Srinivasan",
    summary: "Vaccination record from Caring Heart Animal Hospital.",
    confidenceScore: 98,
    keyFacts: [
      { label: "Pet Name", value: "Benji Srinivasan" },
      { label: "Breed", value: "Canine - Shih Tzu/Yorkshire Terrier (Mixed)" },
    ],
  });

  if (mapped.name !== "Benji Srinivasan") {
    throw new Error(`expected name, got ${mapped.name}`);
  }
  if (mapped.breed !== "Shih Tzu/Yorkshire Terrier (Mixed)") {
    throw new Error(`expected normalized breed, got ${mapped.breed}`);
  }
});

Deno.test("parsePetNameFromTitle extracts full name from title", () => {
  const name = parsePetNameFromTitle("Vaccination Record for Benji Srinivasan");
  if (name !== "Benji Srinivasan") throw new Error(name);
});

Deno.test("normalizeDocumentBreed strips canine prefix", () => {
  const breed = normalizeDocumentBreed("Canine - Shih Tzu/Yorkshire Terrier (Mixed)");
  if (breed !== "Shih Tzu/Yorkshire Terrier (Mixed)") throw new Error(breed ?? "null");
});

Deno.test("normalizeDocumentBreed rejects species-only values", () => {
  if (normalizeDocumentBreed("Canine (Dog)") !== null) {
    throw new Error("expected null for Canine (Dog)");
  }
  if (normalizeDocumentBreed("Dog") !== null) throw new Error("expected null for Dog");
  if (!isSpeciesOnlyBreedValue("Feline (Cat)")) throw new Error("expected species-only");
});

Deno.test("mapFlexibleVaultToPetInfo prefers Breed over Species (Milo vaccine cert)", () => {
  const mapped = mapFlexibleVaultToPetInfo({
    title: "Vaccine Certificate for Milo",
    summary: "Rabies vaccination for Milo, a Maltese.",
    confidenceScore: 95,
    keyFacts: [
      { label: "Patient", value: "Milo" },
      { label: "Species", value: "Canine (Dog)" },
      { label: "Breed", value: "Maltese" },
      { label: "Sex", value: "Male Neutered" },
    ],
  });

  if (mapped.name !== "Milo") throw new Error(`name: ${mapped.name}`);
  if (mapped.breed !== "Maltese") throw new Error(`breed: ${mapped.breed}`);
});

Deno.test("evaluatePetVerification accepts Milo Maltese vs Species on same PDF", () => {
  const mapped = mapFlexibleVaultToPetInfo({
    title: "Vaccine Certificate for Milo",
    summary: "Certificate for Milo.",
    confidenceScore: 95,
    keyFacts: [
      { label: "Patient", value: "Milo" },
      { label: "Species", value: "Canine (Dog)" },
      { label: "Breed", value: "Maltese" },
    ],
  });

  const result = evaluatePetVerification(mapped, miloPet, {
    documentType: "vaccinations",
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });

  if (!result.isValid) throw new Error(JSON.stringify(result));
});

Deno.test("petInfoNeedsFallback when legacy extraction empty", () => {
  if (!petInfoNeedsFallback({
    microchip: null,
    name: null,
    age: null,
    breed: null,
    gender: null,
    confidence: 0,
  })) {
    throw new Error("expected fallback needed");
  }
});

Deno.test("mapFlexibleVaultToPetInfo reads Animal Name label", () => {
  const mapped = mapFlexibleVaultToPetInfo({
    title: "Rabies Vaccination Certificate",
    summary: "Rabies cert for Benji.",
    confidenceScore: 98,
    keyFacts: [
      { label: "Animal Name", value: "Benji" },
      { label: "Breed", value: "Shih Tzu" },
    ],
  });

  if (mapped.name !== "Benji") throw new Error(`expected Benji, got ${mapped.name}`);
  if (mapped.breed !== "Shih Tzu") throw new Error(`expected Shih Tzu, got ${mapped.breed}`);
});

Deno.test("mapFlexibleVaultToPetInfo reads rabies certificate keyFacts", () => {
  const mapped = mapFlexibleVaultToPetInfo({
    title: "Rabies Vaccination Certificate",
    summary:
      "Benji, a Shih Tzu dog, received a 3-year rabies vaccination on November 4, 2021.",
    confidenceScore: 98,
    keyFacts: [
      { label: "Pet Name", value: "Benji" },
      { label: "Owner Name", value: "Srinivasan Balajikumar" },
      { label: "Species", value: "Dog" },
      { label: "Breed", value: "Shih Tzu" },
      { label: "Microchip #", value: "981020037635578" },
    ],
  });

  if (mapped.name !== "Benji") throw new Error(`name: ${mapped.name}`);
  if (mapped.breed !== "Shih Tzu") throw new Error(`breed: ${mapped.breed}`);
  if (mapped.microchip !== "981020037635578") {
    throw new Error(`microchip: ${mapped.microchip}`);
  }
});

Deno.test("evaluatePetVerification accepts rabies cert mixed breed vs profile", () => {
  const mapped = mapFlexibleVaultToPetInfo({
    title: "Rabies Vaccination Certificate",
    summary: "Benji rabies cert.",
    confidenceScore: 98,
    keyFacts: [
      { label: "Pet Name", value: "Benji" },
      { label: "Species", value: "Dog" },
      { label: "Breed", value: "Canine - Shih Tzu/Yorkshire Terrier (Mixed)" },
    ],
  });

  const result = evaluatePetVerification(mapped, benjiPet, {
    documentType: "vaccinations",
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });

  if (!result.isValid) throw new Error(JSON.stringify(result));
});

Deno.test("mergePetInfoFields fills gaps from flexible fallback", () => {
  const merged = mergePetInfoFields(
    {
      microchip: null,
      name: null,
      age: null,
      breed: null,
      gender: null,
      confidence: 0,
    },
    mapFlexibleVaultToPetInfo({
      title: "Vaccination Record for Benji Srinivasan",
      keyFacts: [
        { label: "Pet Name", value: "Benji Srinivasan" },
        { label: "Breed", value: "Canine - Shih Tzu/Yorkshire Terrier (Mixed)" },
      ],
      confidenceScore: 98,
    }),
  );

  if (!merged.name || !merged.breed) throw new Error(JSON.stringify(merged));
});

Deno.test("evaluatePetVerification accepts full doc name vs profile Benji", () => {
  const result = evaluatePetVerification(
    {
      microchip: null,
      name: "Benji Srinivasan",
      age: null,
      breed: "Shih Tzu/Yorkshire Terrier (Mixed)",
      gender: null,
      confidence: 98,
    },
    benjiPet,
    {
      documentType: "vaccinations",
      verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
    },
  );

  if (!result.isValid) throw new Error(JSON.stringify(result));
});
