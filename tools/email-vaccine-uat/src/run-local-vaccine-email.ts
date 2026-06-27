/**
 * Local UAT: seed pet, archive vaccine PDF, invoke mailgun-process-pet-mail (reprocess JSON).
 *
 * Prerequisites:
 *   1. colima/docker + `supabase start`
 *   2. Edge secrets loaded:
 *        supabase functions serve mailgun-process-pet-mail --env-file supabase/.env --no-verify-jwt
 *   3. Optional: PawBuck.API on PAWBUCK_API_URL for vault filing (analyze-internal)
 *
 * Usage: pnpm run email-vaccine:uat
 */
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createTestUser, grantFamilyPlan } from "../../family-access-integration/src/fixtures.ts";
import {
  createServiceClient,
  LOCAL_SERVICE_ROLE_KEY,
  LOCAL_SUPABASE_URL,
} from "../../family-access-integration/src/env.ts";

const MAILGUN_SECRET = process.env.MAILGUN_SECRET?.trim() || "local-uat-test-secret";
const VET_SENDER = process.env.UAT_VET_SENDER?.trim() || "vet-uat@clinic.test";
const PDF_PATH =
  process.env.UAT_VACCINE_PDF?.trim() ||
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/design/templates/Milo_Vet_Summary_v2.pdf");
const FUNCTIONS_URL =
  process.env.SUPABASE_FUNCTIONS_URL?.trim() || `${LOCAL_SUPABASE_URL}/functions/v1/mailgun-process-pet-mail`;
const PENDING_BUCKET = "pending-emails";

function loadGeminiKey(): string | undefined {
  const fromEnv = process.env.GOOGLE_GEMINI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  const consumerEnv = resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/consumer-app/.env.local");
  if (!existsSync(consumerEnv)) return undefined;
  const text = readFileSync(consumerEnv, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^(?:EXPO_GOOGLE_GEMINI_API_KEY|GOOGLE_GEMINI_API_KEY)=(.*)$/);
    if (m?.[1]?.trim()) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

function writeSupabaseFunctionEnv(geminiKey?: string): boolean {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const envPath = resolve(repoRoot, "supabase/.env");
  const lines = [
    `MAILGUN_SECRET=${MAILGUN_SECRET}`,
    `GOOGLE_GEMINI_API_KEY=${geminiKey ?? ""}`,
  ];
  const apiUrl =
    process.env.PAWBUCK_API_URL?.trim() ||
    process.env.EXPO_PUBLIC_PAWBUCK_API_URL?.trim() ||
    "http://host.docker.internal:5289";
  lines.push(`PAWBUCK_API_URL=${apiUrl}`);
  const miloKey = process.env.MILO_INTERNAL_SERVICE_KEY?.trim() || "local-milo-internal-uat-key";
  lines.push(`MILO_INTERNAL_SERVICE_KEY=${miloKey}`);
  const content = lines.join("\n") + "\n";
  if (existsSync(envPath) && readFileSync(envPath, "utf8") === content) {
    return false;
  }
  writeFileSync(envPath, content, "utf8");
  const fnEnv = resolve(repoRoot, "supabase/functions/.env");
  writeFileSync(fnEnv, content, "utf8");
  console.log("Wrote", envPath, "(restart: supabase functions serve ... if edge was already running)");
  return true;
}

function sanitizeMessageId(messageId: string): string {
  return messageId.replace(/[<>]/g, "").replace(/[^a-zA-Z0-9._@-]/g, "_");
}

async function ensureLocalStorageBuckets(): Promise<void> {
  const admin = createServiceClient();
  for (const id of ["pets", "pending-emails"]) {
    const { error } = await admin.storage.createBucket(id, { public: false });
    if (error && !/already exists|Duplicate/i.test(error.message)) {
      console.warn(`Bucket ${id}: ${error.message}`);
    }
  }
}

async function seedPetAndWhitelist(): Promise<{ petEmailLocal: string; petId: string; userId: string }> {
  const admin = createServiceClient();
  const owner = await createTestUser("email-vax-uat");
  await grantFamilyPlan(owner.id);
  const petEmailLocal = `vaxuat${Date.now().toString(36)}`;
  const { data: pet, error: petErr } = await admin
    .from("pets")
    .insert({
      name: "VaxUAT",
      animal_type: "dog",
      breed: "Golden Retriever",
      sex: "male",
      date_of_birth: "2020-01-01",
      country: "United States",
      weight_unit: "pounds",
      weight_value: 45,
      email_id: petEmailLocal,
      user_id: owner.id,
      microchip_number: "123456789012345",
    })
    .select("id")
    .single();
  if (petErr || !pet?.id) throw new Error(`pet insert failed: ${petErr?.message ?? "no id"}`);

  const { error: listErr } = await admin.from("pet_email_list").insert({
    pet_id: pet.id,
    user_id: owner.id,
    email_id: VET_SENDER.toLowerCase(),
    is_blocked: false,
  });
  if (listErr) throw new Error(`whitelist insert failed: ${listErr.message}`);

  return { petEmailLocal, petId: pet.id, userId: owner.id };
}

async function archiveEmailWithPdf(
  messageId: string,
  recipient: string,
  pdfBytes: Buffer,
): Promise<string> {
  const storagePath = `${sanitizeMessageId(messageId)}.json`;
  const parsedEmail = {
    from: { name: "Vet UAT", address: VET_SENDER },
    to: [{ name: "", address: recipient }],
    cc: [],
    subject: "Vaccination record UAT",
    date: new Date().toISOString(),
    messageId,
    textBody: "Attached vaccination certificate for VaxUAT.",
    htmlBody: null,
    attachments: [
      {
        filename: "vaccination-uat.pdf",
        mimeType: "application/pdf",
        size: pdfBytes.length,
        content: pdfBytes.toString("base64"),
      },
    ],
  };

  const admin = createServiceClient();
  const { error } = await admin.storage
    .from(PENDING_BUCKET)
    .upload(storagePath, JSON.stringify(parsedEmail), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw new Error(`archive upload failed: ${error.message}`);
  return storagePath;
}

async function invokeReprocessVaccine(
  fileKey: string,
  petId: string,
): Promise<Response> {
  return fetch(FUNCTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileKey,
      overridePetId: petId,
      documentTypeOverride: "vaccinations",
    }),
  });
}

/** Optional: simulate Mailgun webhook (signature + multipart) — attachments need Mailgun URLs in prod. */
async function postMailgunWebhook(recipient: string, messageId: string, pdfBytes: Buffer): Promise<Response> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const token = randomUUID();
  const signature = createHmac("sha256", MAILGUN_SECRET).update(timestamp + token).digest("hex");
  const form = new FormData();
  form.append("timestamp", timestamp);
  form.append("token", token);
  form.append("signature", signature);
  form.append("sender", VET_SENDER);
  form.append("recipient", recipient);
  form.append("subject", "Vaccination record UAT");
  form.append("body-plain", "Attached vaccination certificate for VaxUAT.");
  form.append("Message-Id", messageId);
  form.append(
    "attachment-1",
    new Blob([pdfBytes], { type: "application/pdf" }),
    "vaccination-uat.pdf",
  );
  return fetch(FUNCTIONS_URL, { method: "POST", body: form });
}

async function fetchProcessedEmail(messageId: string) {
  const admin = createServiceClient();
  return admin.from("processed_emails").select("*").eq("s3_key", messageId).maybeSingle();
}

async function main() {
  process.env.SUPABASE_URL = LOCAL_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = LOCAL_SERVICE_ROLE_KEY;

  const geminiKey = loadGeminiKey();
  const envUpdated = writeSupabaseFunctionEnv(geminiKey);
  if (envUpdated) {
    console.log("Waiting 6s for edge runtime reload after .env change…");
    await new Promise((r) => setTimeout(r, 6000));
  }
  await ensureLocalStorageBuckets();

  if (!existsSync(PDF_PATH)) throw new Error(`PDF not found: ${PDF_PATH}`);
  const pdfBytes = readFileSync(PDF_PATH);

  console.log("\n--- Seed ---");
  const { petEmailLocal, petId, userId } = await seedPetAndWhitelist();
  const recipient = `${petEmailLocal}@pets.pawbuck.com`;
  const messageId = `<uat-vax-${Date.now()}@mailgun.test>`;
  console.log(`Pet id: ${petId}`);
  console.log(`Owner id: ${userId}`);
  console.log(`Recipient: ${recipient}`);
  console.log(`Whitelisted sender: ${VET_SENDER}`);
  console.log(`PDF: ${PDF_PATH} (${pdfBytes.length} bytes)`);
  console.log(`Message-Id: ${messageId}`);

  console.log("\n--- Archive + reprocess (local vaccine PDF path) ---");
  const fileKey = await archiveEmailWithPdf(messageId, recipient, pdfBytes);
  console.log(`Archived: ${PENDING_BUCKET}/${fileKey}`);

  const res = await invokeReprocessVaccine(fileKey, petId);
  const bodyText = await res.text();
  let bodyJson: unknown;
  try {
    bodyJson = JSON.parse(bodyText);
  } catch {
    bodyJson = bodyText;
  }
  console.log(`HTTP ${res.status}`);
  console.log(JSON.stringify(bodyJson, null, 2));

  console.log("\n--- processed_emails row ---");
  await new Promise((r) => setTimeout(r, 2000));
  const { data: row, error } = await fetchProcessedEmail(messageId);
  if (error) console.error("Query error:", error.message);
  else if (!row) console.log("(no row yet)");
  else {
    console.log({
      status: row.status,
      success: row.success,
      review_status: row.review_status,
      failure_reason: row.failure_reason,
      document_type: row.document_type,
    });
  }

  console.log("\n--- Review in app ---");
  console.log(`Log in as owner (create password reset in Studio if needed): user id ${userId}`);
  console.log("Messages → Processing errors (if success=false) → Confirm as Vaccine");
  console.log("Studio: http://127.0.0.1:54323");
  console.log("\nEdge secrets: keep `supabase functions serve mailgun-process-pet-mail --env-file supabase/.env --no-verify-jwt` running.");
  if (!process.env.PAWBUCK_API_URL && !process.env.EXPO_PUBLIC_PAWBUCK_API_URL) {
    console.log("Tip: run PawBuck.API locally with Milo__InternalServiceKey=local-milo-internal-uat-key for auto-file.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
