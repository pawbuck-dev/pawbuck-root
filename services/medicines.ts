import { Tables, TablesInsert } from "@/database.types";
import { MedicineData, MedicineFormData } from "@/models/medication";
import { supabase } from "@/utils/supabase";

export const addMedicine = async (
  medicine: TablesInsert<"medicines">
): Promise<Tables<"medicines">> => {
  const { error: insertError, data: insertedMedicine } = await supabase
    .from("medicines")
    .insert(medicine)
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting medicine:", insertError);
    throw insertError;
  }

  return insertedMedicine;
};

export const fetchMedicines = async (
  petId: string
): Promise<MedicineData[]> => {
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
