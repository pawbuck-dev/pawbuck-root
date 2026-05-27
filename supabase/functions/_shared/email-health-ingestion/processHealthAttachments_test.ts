import { assertEquals, assertExists } from "jsr:@std/assert@1";
import {
  defaultProcessHealthAttachmentDeps,
  processHealthAttachments,
  type ProcessHealthAttachmentDeps,
} from "./processHealthAttachments.ts";
import type {
  EmailContext,
  ParsedAttachment,
  Pet,
} from "../../process-pet-mail/types.ts";

const pet: Pet = {
  id: "pet-1",
  user_id: "user-1",
  name: "Rex",
  breed: "Lab",
  animal_type: "dog",
  country: "US",
  email_id: "rex123",
};

const emailContext: EmailContext = {
  subject: "Vaccine record",
  textBody: "Attached",
  from: "vet@clinic.com",
  to: "rex123@pets.pawbuck.com",
  messageId: "<msg-1>",
};

function attachment(name = "vax.pdf"): ParsedAttachment {
  return {
    filename: name,
    mimeType: "application/pdf",
    size: 100,
    content: new Uint8Array([1, 2, 3]),
  };
}

function stubDeps(overrides: Partial<ProcessHealthAttachmentDeps>): ProcessHealthAttachmentDeps {
  return { ...defaultProcessHealthAttachmentDeps, ...overrides };
}

Deno.test("processHealthAttachments vault happy path with owner confirm", async () => {
  let analyzeType: string | undefined;
  const deps = stubDeps({
    useVaultHealthPipeline: () => true,
    useLegacyOcrPipeline: () => false,
    uploadCanonicalDocument: async () => "user-1/pet_Rex__pet-1/documents/doc.pdf",
    analyzePetDocumentInternal: async (req) => {
      analyzeType = req.documentTypeOverride;
      return { ok: true, row: { id: "vault-row-1" } };
    },
  });

  const results = await processHealthAttachments(
    pet,
    [attachment()],
    emailContext,
    {
      ingestionSource: "email_mailgun",
      forcedDocumentType: "vaccinations",
      apiDocumentTypeOverride: "vaccinations",
      skipPetVerification: true,
    },
    deps,
  );

  assertEquals(results.length, 1);
  assertEquals(results[0].vaultPersisted, true);
  assertEquals(results[0].ocrSuccess, true);
  assertEquals(analyzeType, "vaccinations");
});

Deno.test("processHealthAttachments skips irrelevant classification", async () => {
  const deps = stubDeps({
    classifyAttachment: async () => ({
      type: "irrelevant",
      confidence: 0.9,
      reasoning: "not health",
    }),
  });

  const results = await processHealthAttachments(
    pet,
    [attachment()],
    emailContext,
    { ingestionSource: "email_mailgun" },
    deps,
  );

  assertEquals(results[0].uploaded, false);
  assertEquals(results[0].classification.type, "irrelevant");
});

Deno.test("processHealthAttachments validation failure returns skippedReason", async () => {
  const deps = stubDeps({
    classifyAttachment: async () => ({
      type: "vaccinations",
      confidence: 0.9,
      reasoning: "vax",
    }),
    loadEmailDocumentVerificationConfig: async () => ({}),
    validatePetFromDocument: async () => ({
      isValid: false,
      method: "gemini",
      skipReason: "breed mismatch",
      extractedInfo: {
        microchip: null,
        name: null,
        age: null,
        breed: "Poodle",
        gender: null,
        confidence: 0.8,
      },
      matchDetails: {},
    }),
  });

  const results = await processHealthAttachments(
    pet,
    [attachment()],
    emailContext,
    { ingestionSource: "email_mailgun" },
    deps,
  );

  assertEquals(results[0].skippedReason, "breed mismatch");
  assertEquals(results[0].uploaded, false);
});

Deno.test("processHealthAttachments calls microchip mismatch callback", async () => {
  let notified = false;
  const deps = stubDeps({
    classifyAttachment: async () => ({
      type: "vaccinations",
      confidence: 0.9,
      reasoning: "vax",
    }),
    loadEmailDocumentVerificationConfig: async () => ({}),
    validatePetFromDocument: async () => ({
      isValid: false,
      method: "gemini",
      skipReason: "microchip mismatch",
      microchipMismatchNotify: true,
      extractedInfo: {
        microchip: "123",
        name: null,
        age: null,
        breed: null,
        gender: null,
        confidence: 0.8,
      },
      matchDetails: {},
    }),
  });

  await processHealthAttachments(
    pet,
    [attachment()],
    emailContext,
    {
      ingestionSource: "email_mailgun",
      onMicrochipMismatch: async () => {
        notified = true;
      },
    },
    deps,
  );

  assertEquals(notified, true);
});

Deno.test("processHealthAttachments legacy OCR path", async () => {
  const deps = stubDeps({
    useVaultHealthPipeline: () => false,
    useLegacyOcrPipeline: () => true,
    uploadAttachment: async () => "legacy/path.pdf",
    triggerOCR: async () => ({ success: true, data: { ok: true } }),
    saveOCRResults: async () => ({ success: true, recordIds: ["rec-1"] }),
  });

  const results = await processHealthAttachments(
    pet,
    [attachment()],
    emailContext,
    {
      ingestionSource: "email_mailgun",
      forcedDocumentType: "medications",
      skipPetVerification: true,
    },
    deps,
  );

  assertEquals(results[0].ocrSuccess, true);
  assertEquals(results[0].dbInserted, true);
  assertExists(results[0].dbRecordIds);
});

Deno.test("processHealthAttachments both pipelines disabled fails", async () => {
  const deps = stubDeps({
    useVaultHealthPipeline: () => false,
    useLegacyOcrPipeline: () => false,
  });

  const results = await processHealthAttachments(
    pet,
    [attachment()],
    emailContext,
    {
      ingestionSource: "email_mailgun",
      forcedDocumentType: "lab_results",
      skipPetVerification: true,
    },
    deps,
  );

  assertEquals(results[0].error?.includes("Vault pipeline disabled"), true);
});

Deno.test("processHealthAttachments forced type only applies within index limit", async () => {
  let classifyCalls = 0;
  const deps = stubDeps({
    classifyAttachment: async () => {
      classifyCalls++;
      return { type: "clinical_exams", confidence: 1, reasoning: "exam" };
    },
    useVaultHealthPipeline: () => false,
    useLegacyOcrPipeline: () => false,
  });

  const results = await processHealthAttachments(
    pet,
    [attachment("a.pdf"), attachment("b.pdf")],
    emailContext,
    {
      ingestionSource: "email_mailgun",
      forcedDocumentType: "vaccinations",
      forcedAttachmentIndexLimit: 1,
      skipPetVerification: true,
    },
    deps,
  );

  assertEquals(results[0].classification.type, "vaccinations");
  assertEquals(results[1].classification.type, "clinical_exams");
  assertEquals(classifyCalls, 1);
});
