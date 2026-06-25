/**
 * Seeds staging/local Supabase fixtures for Maestro E2E and prints env vars.
 *
 * Prerequisites: supabase start (or staging credentials in env)
 *
 * Usage:
 *   pnpm run maestro:seed
 *   source .maestro/.env.local   # optional — copy printed exports
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHouseholdInviteCode,
  createPetFamilyInvite,
  createPetTransferCode,
  createTestPet,
  createTestUser,
  deleteTestUser,
  grantFamilyPlan,
} from "../../family-access-integration/src/fixtures.ts";

async function main() {
  const owner = await createTestUser("maestro-owner");
  const recipient = await createTestUser("maestro-recipient");
  const emptyUser = await createTestUser("maestro-empty");

  await grantFamilyPlan(owner.id);

  const petId = await createTestPet(owner, "MaestroPet");
  const householdCode = await createHouseholdInviteCode(owner);
  const transferCode = await createPetTransferCode(owner, petId);
  const { token: inviteToken } = await createPetFamilyInvite(owner, petId, recipient.email);

  const petEmailLocal = `maestropet${Date.now().toString(36)}`;

  const env = {
    MAESTRO_OWNER_EMAIL: owner.email,
    MAESTRO_OWNER_PASSWORD: owner.password,
    MAESTRO_RECIPIENT_EMAIL: recipient.email,
    MAESTRO_RECIPIENT_PASSWORD: recipient.password,
    MAESTRO_EMPTY_USER_EMAIL: emptyUser.email,
    MAESTRO_EMPTY_USER_PASSWORD: emptyUser.password,
    MAESTRO_HOUSEHOLD_CODE: householdCode,
    MAESTRO_TRANSFER_CODE: transferCode,
    MAESTRO_INVITE_TOKEN: inviteToken,
    MAESTRO_PET_NAME: "MaestroDog",
    MAESTRO_PET_EMAIL_LOCAL: petEmailLocal,
  };

  const lines = Object.entries(env).map(([k, v]) => `${k}=${v}`);
  const dotenv = lines.join("\n") + "\n";
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const outPath = resolve(repoRoot, ".maestro/.env.local");
  writeFileSync(outPath, dotenv, "utf8");

  console.log("Maestro fixtures seeded. Wrote", outPath);
  console.log("\nExport for current shell:");
  for (const line of lines) {
    console.log(`export ${line}`);
  }

  console.log("\nCleanup user ids (manual if needed):");
  console.log(`  owner=${owner.id} recipient=${recipient.id} empty=${emptyUser.id}`);
  console.log("Run deleteTestUser for each after E2E, or rely on local DB reset.");

  // Keep users alive for Maestro run — do not delete here
  void deleteTestUser;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
