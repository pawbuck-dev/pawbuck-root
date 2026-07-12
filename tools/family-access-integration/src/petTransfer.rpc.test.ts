import { describe, expect, it } from "vitest";
import { createServiceClient, isLocalSupabaseReachable } from "./env.ts";
import {
  createPetTransferCode,
  createTestPet,
  createTestUser,
  deleteTestUser,
  grantFamilyPlan,
  userClient,
} from "./fixtures.ts";

const reachable = await isLocalSupabaseReachable();
const d = reachable ? describe : describe.skip;

d("pet transfer RPCs", () => {
  it("preview_pet_transfer returns payload for active code", async () => {
    const owner = await createTestUser("preview-owner");
    const petId = await createTestPet(owner, "Luna");
    const code = await createPetTransferCode(owner, petId);

    const admin = createServiceClient();
    const { data, error } = await admin.rpc("preview_pet_transfer", { p_code: code });
    expect(error).toBeNull();
    expect(data).toMatchObject({
      pet: expect.objectContaining({ id: petId, name: "Luna" }),
    });

    await deleteTestUser(owner.id);
  });

  it("accept_pet_transfer moves ownership and clears family grants", async () => {
    const owner = await createTestUser("xfer-owner");
    const recipient = await createTestUser("xfer-recipient");
    const grantee = await createTestUser("xfer-grantee");
    const petId = await createTestPet(owner, "Nova");

    const admin = createServiceClient();
    await admin.from("pet_family_grants").insert({
      pet_id: petId,
      grantee_id: grantee.id,
      role: "view_only",
      invited_by: owner.id,
    });

    const code = await createPetTransferCode(owner, petId);
    const recipientClient = await userClient(recipient);
    const { data: petIdResult, error } = await recipientClient.rpc("accept_pet_transfer", {
      p_code: code,
      p_pet_parent_display_name: "Alex",
    });
    expect(error).toBeNull();
    expect(petIdResult).toBe(petId);

    const { data: pet } = await recipientClient
      .from("pets")
      .select("user_id, pet_parent_display_name")
      .eq("id", petId)
      .single();
    expect(pet).toMatchObject({ user_id: recipient.id, pet_parent_display_name: "Alex" });

    const { data: grants } = await admin
      .from("pet_family_grants")
      .select("id")
      .eq("pet_id", petId);
    expect(grants?.length ?? 0).toBe(0);

    await deleteTestUser(owner.id);
    await deleteTestUser(recipient.id);
    await deleteTestUser(grantee.id);
  });

  it("accept_pet_transfer preserves care team links for recipient", async () => {
    const owner = await createTestUser("xfer-care-owner");
    const recipient = await createTestUser("xfer-care-recipient");
    await grantFamilyPlan(recipient);
    const petId = await createTestPet(owner, "Buddy");

    const admin = createServiceClient();
    const { data: vet, error: vetErr } = await admin
      .from("vet_information")
      .insert({
        clinic_name: "Happy Paws Vet",
        vet_name: "Dr. Smith",
        email: `vet-${Date.now()}@care.test`,
        phone: "555-0100",
        address: "1 Main St",
        type: "veterinarian",
      })
      .select("id")
      .single();
    expect(vetErr).toBeNull();
    expect(vet?.id).toBeTruthy();

    const { error: linkErr } = await admin.from("pet_care_team_members").insert({
      pet_id: petId,
      care_team_member_id: vet!.id,
    });
    expect(linkErr).toBeNull();

    const code = await createPetTransferCode(owner, petId);
    const recipientClient = await userClient(recipient);
    const { error } = await recipientClient.rpc("accept_pet_transfer", {
      p_code: code,
      p_pet_parent_display_name: "Sam",
    });
    expect(error).toBeNull();

    const { data: links, error: linksErr } = await recipientClient
      .from("pet_care_team_members")
      .select("care_team_member_id, vet_information:care_team_member_id(clinic_name)")
      .eq("pet_id", petId);
    expect(linksErr).toBeNull();
    expect(links?.length).toBe(1);
    expect(links?.[0]?.vet_information).toMatchObject({ clinic_name: "Happy Paws Vet" });

    await deleteTestUser(owner.id);
    await deleteTestUser(recipient.id);
  });

  it("rejects self-transfer", async () => {
    const owner = await createTestUser("self-xfer");
    const petId = await createTestPet(owner, "Solo");
    const code = await createPetTransferCode(owner, petId);
    const client = await userClient(owner);

    const { error } = await client.rpc("accept_pet_transfer", { p_code: code });
    expect(error?.message).toMatch(/yourself/i);

    await deleteTestUser(owner.id);
  });
});
