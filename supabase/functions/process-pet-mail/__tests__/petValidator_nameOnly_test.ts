import { DEFAULT_EMAIL_DOCUMENT_VERIFICATION } from "../../_shared/emailDocumentVerificationConfig.ts";
import { evaluatePetVerification } from "../petValidator.ts";
import type { ExtractedPetInfo, Pet } from "../types.ts";

const basePet: Pet = {
  id: "p1",
  name: "Milo Jones",
  email_id: "e1",
  user_id: "u1",
  animal_type: "dog",
  breed: "Golden Retriever",
  microchip_number: null,
  date_of_birth: "2020-01-01",
  sex: "male",
  country: "Canada",
};

function extracted(overrides: Partial<ExtractedPetInfo>): ExtractedPetInfo {
  return {
    microchip: null,
    name: "Milo",
    age: null,
    breed: null,
    gender: null,
    confidence: 90,
    ...overrides,
  };
}

Deno.test("name-only: clinical_exams without breed passes when config allows", () => {
  const result = evaluatePetVerification(extracted({ breed: null }), basePet, {
    documentType: "clinical_exams",
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });
  if (!result.isValid || result.method !== "name_only") {
    throw new Error(JSON.stringify(result));
  }
});

Deno.test("name-only: vaccinations without breed fails breed_required", () => {
  const result = evaluatePetVerification(extracted({ breed: null }), basePet, {
    documentType: "vaccinations",
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });
  if (result.isValid || result.skipReason !== "breed_required_on_document") {
    throw new Error(JSON.stringify(result));
  }
});

Deno.test("name-only: medications without breed passes when config allows", () => {
  const result = evaluatePetVerification(extracted({ breed: null }), basePet, {
    documentType: "medications",
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });
  if (!result.isValid || result.method !== "name_only") {
    throw new Error(JSON.stringify(result));
  }
});

Deno.test("name-only: wrong first name fails attributes_mismatch", () => {
  const result = evaluatePetVerification(
    extracted({ name: "Benji", breed: null }),
    basePet,
    {
      documentType: "clinical_exams",
      verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
    },
  );
  if (result.isValid || result.skipReason !== "attributes_mismatch") {
    throw new Error(JSON.stringify(result));
  }
});

Deno.test("name-only: disabled when type not in allow list", () => {
  const config = {
    ...DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
    allowNameOnlyDocumentTypes: [] as string[],
  };
  const result = evaluatePetVerification(extracted({ breed: null }), basePet, {
    documentType: "clinical_exams",
    verificationConfig: config,
  });
  if (result.isValid) throw new Error("expected fail when name-only list empty");
});
