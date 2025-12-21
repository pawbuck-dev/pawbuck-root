import { Tables, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

export const fetchMedicines = async (
  petId: string
): Promise<Tables<"medicines">[]> => {
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
  updates: TablesUpdate<"medicines">
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
