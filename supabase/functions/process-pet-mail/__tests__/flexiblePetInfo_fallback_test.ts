import {
  mapFlexibleVaultToPetInfo,
  mergePetInfoFields,
  normalizeDocumentBreed,
  parsePetNameFromTitle,
  petInfoNeedsFallback,
} from "../_shared/flexiblePetInfoFromDocument.ts";
import { evaluatePetVerification } from "../process-pet-mail/petValidator.ts";
import { DEFAULT_EMAIL_DOCUMENT_VERIFICATION } from "../_shared/emailDocumentVerificationConfig.ts";
import type { Pet } from "../process-pet-mail/types.ts";

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
