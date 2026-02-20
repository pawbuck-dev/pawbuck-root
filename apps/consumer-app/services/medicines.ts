import { Tables, TablesInsert } from "@/database.types";
import { MedicineData, MedicineFormData } from "@/models/medication";
import { supabase } from "@/utils/supabase";

/**
 * Add a new medicine record
 * @throws Error with "DUPLICATE_MEDICATION:" prefix if medication already exists for this pet
 */
export const addMedicine = async (
  medicine: TablesInsert<"medicines">
): Promise<Tables<"medicines">> => {
  const { error: insertError, data: insertedMedicine } = await supabase
    .from("medicines")
    .insert(medicine)
    .select()
    .single();

  if (insertError) {
    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (insertError.code === "23505") {
      throw new Error(
        "DUPLICATE_MEDICATION: This medication record already exists for this pet."
      );
    }
    console.error("Error inserting medicine:", insertError);
    throw insertError;
  }

  return insertedMedicine;
};

export const fetchMedicines = async (
  petId: string
): Promise<MedicineData[]> => {
  console.log("Fetching medicines for petId:", petId);
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching medicines:", error);
    throw error;
  }

  return data as MedicineData[];
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
  medicine: MedicineFormData
): Promise<void> => {
  const { error } = await supabase
    .from("medicines")
    .update(medicine)
    .eq("id", medicine.id || "");

  if (error) {
    console.error("Error updating medicine:", error);
    throw error;
  }
};
