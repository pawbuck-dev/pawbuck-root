import { describe, expect, it } from "vitest";
import { createAnonClient, createServiceClient, isLocalSupabaseReachable } from "./env.ts";
import { createTestPet, createTestUser, deleteTestUser } from "./env.ts";

async function grantPlan(userId: string, plan: "individual" | "family") {
  const admin = createServiceClient();
  const { error } = await admin.from("user_entitlements").upsert(
    { user_id: userId, plan, status: "active" },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

const reachable = await isLocalSupabaseReachable();
const d = reachable ? describe : describe.skip;

async function seedDocumentsAtCap(userId: string, petId: string, admin: ReturnType<typeof createServiceClient>) {
  for (let i = 0; i < 10; i++) {
    const { error } = await admin.from("pet_documents").insert({
      pet_id: petId,
      user_id: userId,
      document_type: "irrelevant",
      storage_path: `limits-test/${userId}/${i}.pdf`,
      mime_type: "application/pdf",
    });
    if (error) throw error;
  }
}

d("subscription limits (pricing v1.5)", () => {
  it("blocks second pet insert for Free user", async () => {
    const owner = await createTestUser("limits-pet");
    await createTestPet(owner, "First");
    const client = createAnonClient(owner.accessToken);

    const { error } = await client.from("pets").insert({
      name: "Second",
      animal_type: "dog",
      breed: "Mixed",
      sex: "female",
      date_of_birth: "2021-01-01",
      country: "United States",
      weight_unit: "lb",
      weight_value: 30,
      email_id: `second-${Date.now()}@pets.test`,
      user_id: owner.id,
    });

    expect(error?.code).toBe("P0001");
    expect(error?.message).toMatch(/pet profile limit/i);

    await deleteTestUser(owner.id);
  });

  it("blocks vaccination insert with document_url when document cap reached", async () => {
    const owner = await createTestUser("limits-doc");
    const petId = await createTestPet(owner, "DocCap");
    const admin = createServiceClient();
    await seedDocumentsAtCap(owner.id, petId, admin);

    const client = createAnonClient(owner.accessToken);
    const { error } = await client.from("vaccinations").insert({
      pet_id: petId,
      user_id: owner.id,
      name: "Rabies",
      date: "2026-01-01",
      created_at: new Date().toISOString(),
      document_url: "health-docs/test/rabies.pdf",
    });

    expect(error?.code).toBe("P0001");
    expect(error?.message).toMatch(/document upload limit/i);

    await deleteTestUser(owner.id);
  });

  it("excludes soft-deleted pets from pet limit count", async () => {
    const owner = await createTestUser("limits-soft");
    const petId = await createTestPet(owner, "Alive");
    const admin = createServiceClient();
    const deletedEmail = `deleted-${Date.now()}@pets.test`;
    const { data: deletedPet, error: insertErr } = await admin.from("pets").insert({
      name: "Deleted",
      animal_type: "dog",
      breed: "Mixed",
      sex: "male",
      date_of_birth: "2019-01-01",
      country: "United States",
      weight_unit: "lb",
      weight_value: 20,
      email_id: deletedEmail,
      user_id: owner.id,
      deleted_at: new Date().toISOString(),
    }).select("id").single();
    expect(insertErr).toBeNull();

    const client = createAnonClient(owner.accessToken);
    const { error } = await client.from("pets").insert({
      name: "Replacement",
      animal_type: "cat",
      breed: "Mixed",
      sex: "female",
      date_of_birth: "2022-01-01",
      country: "United States",
      weight_unit: "lb",
      weight_value: 10,
      email_id: `replacement-${Date.now()}@pets.test`,
      user_id: owner.id,
    });

    expect(error).toBeNull();

    await admin.from("pets").delete().eq("id", deletedPet!.id);
    await deleteTestUser(owner.id);
  });

  it("blocks second pet insert for Individual user (max_pets = 1)", async () => {
    const owner = await createTestUser("limits-ind-pet");
    await grantPlan(owner.id, "individual");
    await createTestPet(owner, "Only");
    const client = createAnonClient(owner.accessToken);

    const { error } = await client.from("pets").insert({
      name: "Second",
      animal_type: "dog",
      breed: "Mixed",
      sex: "female",
      date_of_birth: "2021-01-01",
      country: "United States",
      weight_unit: "lb",
      weight_value: 30,
      email_id: `ind-second-${Date.now()}@pets.test`,
      user_id: owner.id,
    });

    expect(error?.code).toBe("P0001");
    expect(error?.message).toMatch(/pet profile limit/i);
    await deleteTestUser(owner.id);
  });

  it("allows second pet insert for Family user", async () => {
    const owner = await createTestUser("limits-family-pet");
    await grantPlan(owner.id, "family");
    await createTestPet(owner, "First");
    const client = createAnonClient(owner.accessToken);

    const { error } = await client.from("pets").insert({
      name: "Second",
      animal_type: "cat",
      breed: "Mixed",
      sex: "female",
      date_of_birth: "2022-01-01",
      country: "United States",
      weight_unit: "lb",
      weight_value: 12,
      email_id: `family-second-${Date.now()}@pets.test`,
      user_id: owner.id,
    });

    expect(error).toBeNull();
    await deleteTestUser(owner.id);
  });

  it("blocks fourth Milo conversation increment for Free user", async () => {
    const owner = await createTestUser("limits-milo");
    const admin = createServiceClient();

    for (let i = 0; i < 3; i++) {
      const { error } = await admin.rpc("increment_milo_conversation_usage", {
        p_user_id: owner.id,
      });
      expect(error).toBeNull();
    }

    const { error: blocked } = await admin.rpc("increment_milo_conversation_usage", {
      p_user_id: owner.id,
    });
    expect(blocked?.code).toBe("P0001");
    expect(blocked?.message).toMatch(/milo conversation limit/i);
    await deleteTestUser(owner.id);
  });

  it("allows unlimited Milo increments for Individual user", async () => {
    const owner = await createTestUser("limits-milo-ind");
    await grantPlan(owner.id, "individual");
    const admin = createServiceClient();

    for (let i = 0; i < 5; i++) {
      const { error } = await admin.rpc("increment_milo_conversation_usage", {
        p_user_id: owner.id,
      });
      expect(error).toBeNull();
    }
    await deleteTestUser(owner.id);
  });

  it("blocks third AI journal increment for Free user", async () => {
    const owner = await createTestUser("limits-ai-journal");
    const admin = createServiceClient();

    for (let i = 0; i < 2; i++) {
      const { error } = await admin.rpc("increment_ai_journal_usage", {
        p_user_id: owner.id,
      });
      expect(error).toBeNull();
    }

    const { error: blocked } = await admin.rpc("increment_ai_journal_usage", {
      p_user_id: owner.id,
    });
    expect(blocked?.code).toBe("P0001");
    expect(blocked?.message).toMatch(/ai journal entry limit/i);
    await deleteTestUser(owner.id);
  });

  it("allows eleventh document for Individual user at prior free cap", async () => {
    const owner = await createTestUser("limits-doc-ind");
    await grantPlan(owner.id, "individual");
    const petId = await createTestPet(owner, "UnlimitedDocs");
    const admin = createServiceClient();
    await seedDocumentsAtCap(owner.id, petId, admin);

    const client = createAnonClient(owner.accessToken);
    const { error } = await client.from("pet_documents").insert({
      pet_id: petId,
      user_id: owner.id,
      document_type: "irrelevant",
      storage_path: `limits-test/${owner.id}/extra.pdf`,
      mime_type: "application/pdf",
    });

    expect(error).toBeNull();
    await deleteTestUser(owner.id);
  });
});
