import { beforeAll, describe, expect, it } from "vitest";
import { isLocalSupabaseReachable } from "./env.ts";
import {
  createHouseholdInviteCode,
  createTestPet,
  createTestUser,
  grantFamilyPlan,
  type TestUser,
  userClient,
} from "./fixtures.ts";

const reachable = await isLocalSupabaseReachable();
const d = reachable ? describe : describe.skip;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

d("shared pet daily_intake (household Today)", () => {
  let owner: TestUser;
  let recipient: TestUser;
  let petId: string;

  beforeAll(async () => {
    owner = await createTestUser("daily-owner");
    recipient = await createTestUser("daily-recipient");
    await grantFamilyPlan(owner.id);
    await grantFamilyPlan(recipient.id);
    petId = await createTestPet(owner, "Milo");

    const code = await createHouseholdInviteCode(owner);
    const joinClient = await userClient(recipient);
    const { data, error } = await joinClient.rpc("accept_household_invite_code", {
      p_code: code,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ ok: true });
  });

  it("owner logs intake; grantee reads the same shared row", async () => {
    const ownerClient = await userClient(owner);
    const recipientClient = await userClient(recipient);
    const today = todayIsoDate();

    const { data: ownerRow, error: ownerErr } = await ownerClient
      .from("daily_intake")
      .upsert(
        {
          pet_id: petId,
          user_id: owner.id,
          date: today,
          food_intake: 2,
          water_intake: 1,
          poop_count: 1,
          pee_count: 0,
          food_target: 4,
          water_target: 6,
          poop_target: 6,
          pee_target: 6,
        },
        { onConflict: "pet_id,date" }
      )
      .select("*")
      .single();

    expect(ownerErr).toBeNull();
    expect(ownerRow?.food_intake).toBe(2);

    const { data: granteeRow, error: granteeErr } = await recipientClient
      .from("daily_intake")
      .select("*")
      .eq("pet_id", petId)
      .eq("date", today)
      .maybeSingle();

    expect(granteeErr).toBeNull();
    expect(granteeRow?.id).toBe(ownerRow?.id);
    expect(granteeRow?.food_intake).toBe(2);
    expect(granteeRow?.water_intake).toBe(1);
    expect(granteeRow?.poop_count).toBe(1);
  });

  it("grantee can update shared intake counts", async () => {
    const recipientClient = await userClient(recipient);
    const today = todayIsoDate();

    const { data, error } = await recipientClient
      .from("daily_intake")
      .update({ food_intake: 3, user_id: recipient.id })
      .eq("pet_id", petId)
      .eq("date", today)
      .select("food_intake, user_id")
      .single();

    expect(error).toBeNull();
    expect(data?.food_intake).toBe(3);
    expect(data?.user_id).toBe(recipient.id);
  });
});
