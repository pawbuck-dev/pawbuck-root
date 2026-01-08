import { supabase } from "@/utils/supabase";

export type MedicationDose = {
  id: string;
  pet_id: string;
  medication_id: string;
  scheduled_time: string;
  completed_at: string | null;
  created_at: string;
};

/**
 * Get all medication doses for today for a specific pet
 */
export const getTodaysMedicationDoses = async (
  petId: string
): Promise<MedicationDose[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("medication_doses")
    .select("*")
    .eq("pet_id", petId)
    .gte("scheduled_time", today.toISOString())
    .lt("scheduled_time", tomorrow.toISOString())
    .order("scheduled_time", { ascending: true });

  if (error) {
    console.error("Error fetching medication doses:", error);
    throw error;
  }

  return data || [];
};

/**
 * Mark a medication dose as complete
 * Creates a new dose record if it doesn't exist, or updates existing one
 */
export const markMedicationDoseComplete = async (
  petId: string,
  medicationId: string,
  scheduledTime: Date
): Promise<MedicationDose> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // Check if dose already exists
  const { data: existing } = await supabase
    .from("medication_doses")
    .select("*")
    .eq("pet_id", petId)
    .eq("medication_id", medicationId)
    .eq("scheduled_time", scheduledTime.toISOString())
    .single();

  if (existing) {
    // Update existing dose
    const { data, error } = await supabase
      .from("medication_doses")
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating medication dose:", error);
      throw error;
    }

    return data;
  } else {
    // Create new dose record
    const { data, error } = await supabase
      .from("medication_doses")
      .insert({
        pet_id: petId,
        medication_id: medicationId,
        scheduled_time: scheduledTime.toISOString(),
        completed_at: new Date().toISOString(),
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating medication dose:", error);
      throw error;
    }

    // Also update the medicine's last_given_at if it exists in the schema
    try {
      await supabase
        .from("medicines")
        .update({
          last_given_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", medicationId);
    } catch (err) {
      // Ignore if last_given_at column doesn't exist
      console.warn("Could not update last_given_at:", err);
    }

    return data;
  }
};

