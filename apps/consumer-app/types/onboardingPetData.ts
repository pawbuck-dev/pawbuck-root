import type { TablesInsert } from "@/database.types";

type PetInsert = TablesInsert<"pets">;

/** Pet fields collected during onboarding (pre-auth or in-app), aligned with `pets` insert shape. */
export type OnboardingPetData = Partial<Omit<PetInsert, "user_id" | "created_at" | "id">>;
