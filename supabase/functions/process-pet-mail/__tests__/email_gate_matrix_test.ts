/**
 * End-to-end gate matrix: document content → pass/fail outcome.
 * Run: npx deno test supabase/functions/process-pet-mail/__tests__/email_gate_matrix_test.ts
 */
import { DEFAULT_EMAIL_DOCUMENT_VERIFICATION } from "../../_shared/emailDocumentVerificationConfig.ts";
import {
  computeEmailSuccess,
  createInitialPipelineOutcome,
  tallyAttachmentOutcomes,
} from "../pipelineOutcome.ts";
import { evaluatePetVerification } from "../petValidator.ts";
import type { ExtractedPetInfo, Pet, ProcessedAttachment } from "../types.ts";

const pet: Pet = {
  id: "p1",
  name: "Max Jones",
  email_id: "e1",
  user_id: "u1",
  animal_type: "dog",
  breed: "Golden Retriever",
  microchip_number: "123456789012345",
  date_of_birth: "2020-01-01",
  sex: "male",
  country: "United States",
};

function ext(overrides: Partial<ExtractedPetInfo>): ExtractedPetInfo {
  return {
    microchip: null,
    name: "Max",
    age: null,
    breed: "Golden Retriever",
    gender: null,
    confidence: 90,
    ...overrides,
  };
}

type GateExpect = "PASS" | "FAIL" | "IGNORED";

function expectGate(
  label: string,
  expect: GateExpect,
  docType: string,
  extracted: ExtractedPetInfo,
) {
  const result = evaluatePetVerification(extracted, pet, {
    documentType: docType as Parameters<typeof evaluatePetVerification>[2] extends
      | infer O
      | undefined
      ? O extends { documentType?: infer D }
        ? D
        : never
      : never,
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });

  const actual: GateExpect = result.isValid ? "PASS" : "FAIL";
  if (actual !== expect) {
    throw new Error(
      `[${label}] expected ${expect}, got ${actual} (skipReason=${result.skipReason ?? "none"}, method=${result.method})
      })`,
    );
  }
}

function expectPipeline(
  label: string,
  expectSuccess: boolean,
  attachments: Partial<ProcessedAttachment>[],
) {
  const processed = attachments.map((a, i) => ({
    filename: a.filename ?? `file${i}.pdf`,
    mimeType: a.mimeType ?? "application/pdf",
    size: a.size ?? 100,
    classification: a.classification ?? { type: "vaccinations", confidence: 0.9 },
    uploaded: a.uploaded ?? false,
    ocrTriggered: a.ocrTriggered ?? false,
    ocrSuccess: a.ocrSuccess ?? false,
    dbInserted: a.dbInserted ?? false,
    vaultPersisted: a.vaultPersisted ?? false,
    skippedReason: a.skippedReason,
  })) as ProcessedAttachment[];

  const tally = tallyAttachmentOutcomes(processed);
  const outcome = createInitialPipelineOutcome();
  outcome.attachments = { ...outcome.attachments, ...tally };
  const success = computeEmailSuccess(outcome);

  if (success !== expectSuccess) {
    throw new Error(
      `[${label}] pipeline success expected ${expectSuccess}, got ${success} (hardFailures=${tally.hardFailures}, saved=${tally.dbInserted})`,
    );
  }
}

Deno.test("gate matrix — document validation pass cases", () => {
  expectGate("vax name+breed match", "PASS", "vaccinations", ext({}));
  expectGate("lab name+breed match", "PASS", "lab_results", ext({}));
  expectGate("microchip match wins", "PASS", "vaccinations", ext({
    name: "Charlie",
    breed: "Labrador",
    microchip: "123456789012345",
  }));
  expectGate("name-only clinical", "PASS", "clinical_exams", ext({ breed: null }));
  expectGate("name-only medication", "PASS", "medications", ext({ breed: null }));
  expectGate("nickname Maximus fails (42% similarity)", "FAIL", "clinical_exams", ext({ name: "Maximus", breed: null }));
  expectGate("travel cert", "PASS", "travel_certificate", ext({}));
  expectGate("billing invoice", "PASS", "billing_invoice", ext({}));
});

Deno.test("gate matrix — document validation fail cases", () => {
  expectGate("wrong name", "FAIL", "vaccinations", ext({ name: "Charlie" }));
  expectGate("wrong breed", "FAIL", "lab_results", ext({ breed: "Labrador Retriever" }));
  expectGate("no pet info at all", "FAIL", "vaccinations", ext({
    name: null,
    breed: null,
    microchip: null,
    confidence: 0,
  }));
  expectGate("vax missing breed", "FAIL", "vaccinations", ext({ breed: null }));
  expectGate("lab missing breed", "FAIL", "lab_results", ext({ breed: null }));
  expectGate("missing name", "FAIL", "clinical_exams", ext({ name: null, breed: null }));
  expectGate("chip mismatch + wrong name", "FAIL", "vaccinations", ext({
    microchip: "999999999999999",
    name: "Charlie",
    breed: "Golden Retriever",
  }));
});

Deno.test("gate matrix — pipeline outcome (Review Inbox vs auto-file)", () => {
  expectPipeline("single vax saved", true, [{ vaultPersisted: true }]);
  expectPipeline("name mismatch → hard failure", false, [{
    skippedReason: "attributes_mismatch",
  }]);
  expectPipeline("no pet info → hard failure", false, [{
    skippedReason: "no_pet_info",
  }]);
  expectPipeline("irrelevant only → success (ignored)", true, [{
    classification: { type: "irrelevant", confidence: 0.95 },
    uploaded: false,
    dbInserted: false,
  }]);
  expectPipeline("irrelevant + failed vax → fail", false, [
    { classification: { type: "irrelevant", confidence: 0.95 } },
    { skippedReason: "attributes_mismatch" },
  ]);
  expectPipeline("breed_required soft skip alone → success", true, [{
    skippedReason: "breed_required_on_document",
  }]);
});
