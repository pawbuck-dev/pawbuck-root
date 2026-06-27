import type { SupabaseClient } from "@supabase/supabase-js";
import { createAnonClient, createServiceClient } from "./env.ts";

export type TestUser = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
};

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createTestUser(label: string): Promise<TestUser> {
  const admin = createServiceClient();
  const email = `${label}-${randomSuffix()}@family-access-test.local`;
  const password = "TestPassword123!";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`createUser failed: ${error?.message ?? "no user"}`);
  }

  const anon = createAnonClient();
  const { data: session, error: signInErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr || !session.session?.access_token) {
    throw new Error(`signIn failed: ${signInErr?.message ?? "no session"}`);
  }

  return {
    id: data.user.id,
    email,
    password,
    accessToken: session.session.access_token,
  };
}

export async function grantFamilyPlan(userId: string): Promise<void> {
  const admin = createServiceClient();
  const { error } = await admin.from("user_entitlements").upsert(
    {
      user_id: userId,
      plan: "family",
      is_founding_member: true,
    },
    { onConflict: "user_id" }
  );
  if (error) {
    throw new Error(`grantFamilyPlan failed: ${error.message}`);
  }
}

export async function createTestPet(owner: TestUser, name = "Max"): Promise<string> {
  const client = createAnonClient(owner.accessToken);
  const { data, error } = await client
    .from("pets")
    .insert({
      name,
      animal_type: "dog",
      breed: "Mixed",
      sex: "male",
      date_of_birth: "2020-01-01",
      country: "United States",
      weight_unit: "lb",
      weight_value: 40,
      email_id: `${name.toLowerCase()}-${randomSuffix()}@pets.test`,
      user_id: owner.id,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`createTestPet failed: ${error?.message ?? "no id"}`);
  }
  return data.id as string;
}

export async function createHouseholdInviteCode(
  owner: TestUser,
  code?: string
): Promise<string> {
  const admin = createServiceClient();
  const inviteCode = code ?? `MTCH-2026-${randomSuffix().slice(0, 6).toUpperCase()}`;
  const { error } = await admin.from("household_invites").insert({
    code: inviteCode,
    created_by: owner.id,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    is_active: true,
  });
  if (error) {
    throw new Error(`createHouseholdInviteCode failed: ${error.message}`);
  }
  return inviteCode;
}

export async function createPetTransferCode(
  owner: TestUser,
  petId: string,
  code?: string
): Promise<string> {
  const admin = createServiceClient();
  const transferCode =
    code ?? `TRF-TEST-${new Date().getFullYear()}-${randomSuffix().slice(0, 4).toUpperCase()}`;
  const { error } = await admin.from("pet_transfers").insert({
    code: transferCode,
    pet_id: petId,
    from_user_id: owner.id,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    is_active: true,
  });
  if (error) {
    throw new Error(`createPetTransferCode failed: ${error.message}`);
  }
  return transferCode;
}

export async function createPetFamilyInvite(
  owner: TestUser,
  petId: string,
  inviteeEmail: string
): Promise<{ token: string }> {
  const client = createAnonClient(owner.accessToken);
  const { data, error } = await client
    .from("pet_family_invites")
    .insert({
      pet_id: petId,
      email: inviteeEmail.toLowerCase(),
      role: "contributor",
    })
    .select("token")
    .single();

  if (error || !data?.token) {
    throw new Error(`createPetFamilyInvite failed: ${error?.message ?? "no token"}`);
  }
  return { token: data.token as string };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = createServiceClient();
  await admin.auth.admin.deleteUser(userId);
}

export async function userClient(user: TestUser): Promise<SupabaseClient> {
  return createAnonClient(user.accessToken);
}
