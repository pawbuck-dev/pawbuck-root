/** Print email gate matrix results. Run from process-pet-mail: npx deno run --allow-read __tests__/email_gate_matrix_report.ts */
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

type Scenario = {
  id: string;
  category: string;
  description: string;
  docType: string;
  extracted: ExtractedPetInfo;
  expectUserOutcome: string;
};

const docScenarios: Scenario[] = [
  { id: "DOC-01", category: "Validation", description: "Vax PDF: Max + Golden Retriever", docType: "vaccinations", extracted: ext({}), expectUserOutcome: "Auto-filed" },
  { id: "DOC-02", category: "Validation", description: "Lab PDF: Max + Golden Retriever", docType: "lab_results", extracted: ext({}), expectUserOutcome: "Auto-filed" },
  { id: "DOC-03", category: "Validation", description: "Microchip match (wrong name Charlie)", docType: "vaccinations", extracted: ext({ name: "Charlie", breed: "Labrador", microchip: "123456789012345" }), expectUserOutcome: "Auto-filed" },
  { id: "DOC-04", category: "Validation", description: "Clinical note: Max, no breed", docType: "clinical_exams", extracted: ext({ breed: null }), expectUserOutcome: "Auto-filed" },
  { id: "DOC-05", category: "Validation", description: "Medication Rx: Max, no breed", docType: "medications", extracted: ext({ breed: null }), expectUserOutcome: "Auto-filed" },
  { id: "DOC-06", category: "Validation", description: 'Nickname "Maximus" vs profile Max', docType: "clinical_exams", extracted: ext({ name: "Maximus", breed: null }), expectUserOutcome: "Processing errors" },
  { id: "DOC-07", category: "Validation", description: "Wrong name Charlie", docType: "vaccinations", extracted: ext({ name: "Charlie" }), expectUserOutcome: "Processing errors" },
  { id: "DOC-08", category: "Validation", description: "Wrong breed Labrador", docType: "lab_results", extracted: ext({ breed: "Labrador Retriever" }), expectUserOutcome: "Processing errors" },
  { id: "DOC-09", category: "Validation", description: "Blank doc (no pet info)", docType: "vaccinations", extracted: ext({ name: null, breed: null, microchip: null, confidence: 0 }), expectUserOutcome: "Processing errors" },
  { id: "DOC-10", category: "Validation", description: "Vax missing breed on PDF", docType: "vaccinations", extracted: ext({ breed: null }), expectUserOutcome: "Processing errors (breed required)" },
  { id: "DOC-11", category: "Validation", description: "Chip mismatch + name+breed match", docType: "lab_results", extracted: ext({ microchip: "999999999999999" }), expectUserOutcome: "Auto-filed (+ chip notify push)" },
  { id: "DOC-12", category: "Validation", description: "Chip mismatch + wrong name", docType: "vaccinations", extracted: ext({ microchip: "999999999999999", name: "Charlie" }), expectUserOutcome: "Processing errors" },
];

console.log("\n=== PawBuck Email Gate — Verified Results (pet: Max Jones, Golden Retriever) ===\n");
console.log("ID\tCategory\tDocument content\tDoc type\tValidation\tUser outcome\tNotes");

for (const s of docScenarios) {
  const result = evaluatePetVerification(s.extracted, pet, {
    documentType: s.docType as "vaccinations",
    verificationConfig: DEFAULT_EMAIL_DOCUMENT_VERIFICATION,
  });
  const validation = result.isValid ? "PASS" : `FAIL (${result.skipReason})`;
  let userOutcome = s.expectUserOutcome;
  if (result.isValid && s.id === "DOC-11") userOutcome = "Auto-filed (+ chip notify push)";
  else if (result.isValid) userOutcome = "Auto-filed";
  else if (result.skipReason === "breed_required_on_document") userOutcome = "Soft skip (see pipeline)";
  else userOutcome = "Processing errors";

  const notes = result.microchipMismatchNotify ? "microchipMismatchNotify=true" : "";
  console.log(`${s.id}\t${s.category}\t${s.description}\t${s.docType}\t${validation}\t${userOutcome}\t${notes}`);
}

console.log("\n=== Pipeline outcome (after validation) ===\n");
console.log("ID\tScenario\tEmail success\tReview Inbox?");

const pipelineCases = [
  { id: "PL-01", label: "Valid vax saved to vault", attachments: [{ vaultPersisted: true }], expectSuccess: true },
  { id: "PL-02", label: "Name mismatch on vax", attachments: [{ skippedReason: "attributes_mismatch" }], expectSuccess: false },
  { id: "PL-03", label: "Only irrelevant attachment", attachments: [{ classification: { type: "irrelevant", confidence: 0.9 } }], expectSuccess: true },
  { id: "PL-04", label: "Irrelevant + failed vax", attachments: [{ classification: { type: "irrelevant", confidence: 0.9 } }, { skippedReason: "attributes_mismatch" }], expectSuccess: false },
  { id: "PL-05", label: "Only breed_required skip", attachments: [{ skippedReason: "breed_required_on_document" }], expectSuccess: true },
  { id: "PL-06", label: "no_pet_info skip", attachments: [{ skippedReason: "no_pet_info" }], expectSuccess: false },
];

for (const c of pipelineCases) {
  const processed = c.attachments.map((a, i) => ({
    filename: `f${i}.pdf`,
    mimeType: "application/pdf",
    size: 1,
    classification: a.classification ?? { type: "vaccinations", confidence: 0.9 },
    uploaded: false,
    ocrTriggered: false,
    ocrSuccess: false,
    dbInserted: false,
    vaultPersisted: a.vaultPersisted ?? false,
    skippedReason: a.skippedReason,
  })) as ProcessedAttachment[];
  const tally = tallyAttachmentOutcomes(processed);
  const outcome = createInitialPipelineOutcome();
  outcome.attachments = { ...outcome.attachments, ...tally };
  const success = computeEmailSuccess(outcome);
  const review = success ? "No" : "Yes — Processing errors";
  const match = success === c.expectSuccess ? "✓" : "✗ UNEXPECTED";
  console.log(`${c.id}\t${c.label}\t${success ? "true" : "false"}\t${review}\t${match}`);
}

console.log("\n=== Sender gates (logic-only; not live Mailgun) ===\n");
console.log("Scenario\tExpected user outcome");
console.log("Whitelisted sender + valid doc\tAuto-filed");
console.log("Unknown sender\tPending sender approval (HELD)");
console.log("Blocked sender\tNothing in app (BLOCKED)");
console.log("Care team vet email\tAuto-filed, no approval");
console.log("Wrong pet email address\tNothing in app (BLOCKED)");
