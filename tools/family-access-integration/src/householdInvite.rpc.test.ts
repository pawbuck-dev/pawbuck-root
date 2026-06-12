import { beforeAll, describe, expect, it } from "vitest";
import { isLocalSupabaseReachable } from "./env.ts";
import {
  createHouseholdInviteCode,
  createTestPet,
  createTestUser,
  deleteTestUser,
  grantFamilyPlan,
  type TestUser,
  userClient,
} from "./fixtures.ts";

const reachable = await isLocalSupabaseReachable();
const d = reachable ? describe : describe.skip;

d("accept_household_invite_code RPC", () => {
  let owner: TestUser;
  let recipient: TestUser;
  let petId: string;

  beforeAll(async () => {
    owner = await createTestUser("owner");
    recipient = await createTestUser("recipient");
    await grantFamilyPlan(owner.id);
    petId = await createTestPet(owner, "Buddy");
  });

  it("grants admin on all owner pets and marks invite used", async () => {
    const code = await createHouseholdInviteCode(owner);
    const client = await userClient(recipient);

    const { data, error } = await client.rpc("accept_household_invite_code", {
      p_code: code,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: true, pets_granted: 1 });

    const { data: grants } = await client
      .from("pet_family_grants")
      .select("pet_id, role")
      .eq("grantee_id", recipient.id)
      .eq("pet_id", petId);
    expect(grants).toEqual([{ pet_id: petId, role: "admin" }]);

    const { data: members } = await client
      .from("household_members")
      .select("user_id, household_owner_id, is_active")
      .eq("user_id", recipient.id)
      .eq("household_owner_id", owner.id)
      .eq("is_active", true);
    expect(members?.length).toBe(1);
  });

  it("rejects self-join", async () => {
    const code = await createHouseholdInviteCode(owner);
    const client = await userClient(owner);
    const { data } = await client.rpc("accept_household_invite_code", { p_code: code });
    expect(data).toMatchObject({ ok: false, error: "self_join" });
  });

  it("rejects already-used code", async () => {
    const code = await createHouseholdInviteCode(owner);
    const recipient2 = await createTestUser("recipient2");
    const client = await userClient(recipient2);

    const first = await client.rpc("accept_household_invite_code", { p_code: code });
    expect(first.data).toMatchObject({ ok: true });

    const second = await client.rpc("accept_household_invite_code", { p_code: code });
    expect(second.data).toMatchObject({ ok: false, error: "already_used" });

    await deleteTestUser(recipient2.id);
  });
});

d("revoke_household_member_access RPC", () => {
  it("removes member grants on owner pets", async () => {
    const owner = await createTestUser("revoke-owner");
    const recipient = await createTestUser("revoke-recipient");
    await grantFamilyPlan(owner.id);
    const petId = await createTestPet(owner, "Milo");
    const code = await createHouseholdInviteCode(owner);

    const recipientClient = await userClient(recipient);
    await recipientClient.rpc("accept_household_invite_code", { p_code: code });

    const ownerClient = await userClient(owner);
    const { data: members } = await ownerClient
      .from("household_members")
      .select("id")
      .eq("household_owner_id", owner.id)
      .eq("user_id", recipient.id)
      .eq("is_active", true)
      .single();

    const { data: revoke } = await ownerClient.rpc("revoke_household_member_access", {
      p_member_id: members!.id,
    });
    expect(revoke).toMatchObject({ ok: true, grants_revoked: 1 });

    const { data: grants } = await recipientClient
      .from("pet_family_grants")
      .select("id")
      .eq("grantee_id", recipient.id)
      .eq("pet_id", petId);
    expect(grants?.length ?? 0).toBe(0);

    await deleteTestUser(owner.id);
    await deleteTestUser(recipient.id);
  });
});
