import type { Tables, TablesInsert, TablesUpdate } from "@/database.types";

/**
 * Owner-provided behavior baseline ("normal for this pet"). One row per pet,
 * persisted in `public.pet_behavior_baselines` and surfaced to Milo / journal
 * so today's entries can be contrasted against the owner's stated norms.
 *
 * The string-literal unions below mirror the Postgres CHECK constraints in
 * `supabase/migrations/20260530120000_pet_behavior_baselines.sql`. Keep them in
 * lockstep with the migration if values are added or renamed.
 */

export const SOCIAL_DISPOSITIONS = [
  "social_butterfly",
  "indifferent",
  "selective",
] as const;
export type SocialDisposition = (typeof SOCIAL_DISPOSITIONS)[number];

export const FOOD_MOTIVATIONS = ["high", "normal", "finicky"] as const;
export type FoodMotivation = (typeof FOOD_MOTIVATIONS)[number];

export const SLEEP_RESTFULNESS_OPTIONS = ["restful", "restless", "mixed"] as const;
export type SleepRestfulness = (typeof SLEEP_RESTFULNESS_OPTIONS)[number];

export const VOCALIZATION_LEVELS = [
  "quiet",
  "occasional_alerts",
  "very_talkative",
] as const;
export type VocalizationLevel = (typeof VOCALIZATION_LEVELS)[number];

/** Energy is stored as smallint 1..5; the union keeps callers from passing 0/6. */
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

/** Maximum number of stress triggers persisted (DB CHECK enforces <= 3). */
export const MAX_STRESS_TRIGGERS = 3;

export type BehaviorBaselineRow = Tables<"pet_behavior_baselines">;
export type BehaviorBaselineInsert = TablesInsert<"pet_behavior_baselines">;
export type BehaviorBaselineUpdate = TablesUpdate<"pet_behavior_baselines">;

/**
 * Shape submitted from the baseline UI. `user_id` is filled from the session in
 * the service layer (RLS requires `auth.uid() = user_id`).
 */
export type BehaviorBaselineUpsertPayload = Omit<
  BehaviorBaselineInsert,
  "user_id" | "id" | "created_at" | "updated_at"
>;
