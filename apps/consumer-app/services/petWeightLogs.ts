import { Tables } from "@/database.types";
import { WeightUnit, convertWeight } from "@/utils/weightUnits";
import { supabase } from "@/utils/supabase";

export type PetWeightLog = Tables<"pet_weight_logs">;

export async function listWeightLogs(petId: string, limit = 30): Promise<PetWeightLog[]> {
  const { data, error } = await supabase
    .from("pet_weight_logs")
    .select("*")
    .eq("pet_id", petId)
    .order("recorded_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

/** Insert a log and sync pets.current weight for the rest of the app. */
export async function insertWeightLog(
  petId: string,
  weightValue: number,
  unit: WeightUnit
): Promise<PetWeightLog> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("User not authenticated");

  const { data: row, error } = await supabase
    .from("pet_weight_logs")
    .insert({
      pet_id: petId,
      user_id: user.id,
      weight_value: weightValue,
      weight_unit: unit,
      recorded_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  const wv =
    unit === "kg" ? convertWeight(weightValue, "kg", "lbs") : weightValue;
  await supabase
    .from("pets")
    .update({
      weight_value: wv,
      weight_unit: "lbs",
    })
    .eq("id", petId)
    .eq("user_id", user.id);

  return row;
}

export async function updatePetTargetWeight(
  petId: string,
  targetValue: number | null,
  targetUnit: WeightUnit | null
): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("pets")
    .update({
      target_weight_value: targetValue,
      target_weight_unit: targetUnit,
    })
    .eq("id", petId)
    .eq("user_id", user.id);

  if (error) throw error;
}
