import { describe, expect, it } from "vitest";
import { isLocalSupabaseReachable } from "./env.ts";
import {
  createPetFamilyInvite,
  createTestPet,
  createTestUser,
  deleteTestUser,
  grantFamilyPlan,
  userClient,
} from "./fixtures.ts";

const reachable = await isLocalSupabaseReachable();
const d = reachable ? describe : describe.skip;

d("process_pet_family_invite_token RPC", () => {
  it("creates grant when invite email matches auth user", async () => {
    const owner = await createTestUser("email-owner");
    const invitee = await createTestUser("email-invitee");
    await grantFamilyPlan(owner.id);
    const petId = await createTestPet(owner, "Coco");
    const { token } = await createPetFamilyInvite(owner, petId, invitee.email);

    const client = await userClient(invitee);
    const { data, error } = await client.rpc("process_pet_family_invite_token", {
      p_token: token,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: true, pet_id: petId, role: "contributor" });

    const { data: grants } = await client
      .from("pet_family_grants")
      .select("pet_id, role")
      .eq("grantee_id", invitee.id)
      .eq("pet_id", petId);
    expect(grants).toEqual([{ pet_id: petId, role: "contributor" }]);

    await deleteTestUser(owner.id);
    await deleteTestUser(invitee.id);
  });

  it("returns email_mismatch for wrong signed-in user", async () => {
    const owner = await createTestUser("mismatch-owner");
    const invitee = await createTestUser("mismatch-invitee");
    const other = await createTestUser("mismatch-other");
    await grantFamilyPlan(owner.id);
    const petId = await createTestPet(owner, "Rex");
    const { token } = await createPetFamilyInvite(owner, petId, invitee.email);

    const client = await userClient(other);
    const { data } = await client.rpc("process_pet_family_invite_token", {
      p_token: token,
    });
    expect(data).toMatchObject({ ok: false, error: "email_mismatch" });

    await deleteTestUser(owner.id);
    await deleteTestUser(invitee.id);
    await deleteTestUser(other.id);
  });
});
