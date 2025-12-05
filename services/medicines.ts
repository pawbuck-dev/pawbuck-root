import { supabase } from "@/utils/supabase";

export interface Medicine {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  type: string;
  dosage: string;
  frequency: string;
  custom_frequency_value?: number | null;
  custom_frequency_unit?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  prescribed_by?: string | null;
  purpose?: string | null;
  last_given_at?: string | null;
  next_due_date?: string | null;
  reminder_enabled: boolean;
  reminder_timing?: string | null;
  created_at: string;
  updated_at: string;
}

export const fetchMedicines = async (petId: string): Promise<Medicine[]> => {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching medicines:", error);
    throw error;
  }

  return data || [];
};

export const deleteMedicine = async (medicineId: string): Promise<void> => {
  const { error } = await supabase
    .from("medicines")
    .delete()
    .eq("id", medicineId);

  if (error) {
    console.error("Error deleting medicine:", error);
    throw error;
  }
};

export const updateMedicine = async (
  medicineId: string,
  updates: Partial<Medicine>
): Promise<void> => {
  const { error } = await supabase
    .from("medicines")
    .update(updates)
    .eq("id", medicineId);

  if (error) {
    console.error("Error updating medicine:", error);
    throw error;
  }
};

