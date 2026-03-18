import { Tables } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type DailyIntake = Tables<"daily_intake">;

const DEFAULT_FOOD_TARGET = 4;
const DEFAULT_WATER_TARGET = 6;

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyIntake(petId: string): Promise<DailyIntake> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("User not authenticated");

  const today = todayDate();

  const { data, error } = await supabase
    .from("daily_intake")
    .select("*")
    .eq("pet_id", petId)
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (error) throw error;

  if (data) return data;

  const { data: created, error: insertError } = await supabase
    .from("daily_intake")
    .insert({
      pet_id: petId,
      user_id: user.id,
      date: today,
      food_intake: 0,
      water_intake: 0,
      food_target: DEFAULT_FOOD_TARGET,
      water_target: DEFAULT_WATER_TARGET,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created;
}

export async function updateDailyIntake(
  petId: string,
  updates: Partial<Pick<DailyIntake, "food_intake" | "water_intake" | "food_target" | "water_target">>
): Promise<DailyIntake> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("User not authenticated");

  const today = todayDate();

  const { data, error } = await supabase
    .from("daily_intake")
    .upsert(
      {
        pet_id: petId,
        user_id: user.id,
        date: today,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "pet_id,user_id,date" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
