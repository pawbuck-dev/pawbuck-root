import { TablesInsert, TablesUpdate } from "@/database.types";
import { ClinicalExam } from "@/models/clinicalExam";
import { supabase } from "@/utils/supabase";

/**
 * Fetch all clinical exams for a specific pet
 */
export async function fetchClinicalExams(petId: string): Promise<ClinicalExam[]> {
  console.log("Fetching clinical exams for petId:", petId);
  const { data, error } = await supabase
    .from("clinical_exams")
    .select("*")
    .eq("pet_id", petId)
    .order("exam_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching clinical exams:", error);
    throw error;
  }

  return data as ClinicalExam[];
}

/**
 * Create a new clinical exam record
 */
export async function createClinicalExam(
  examData: TablesInsert<"clinical_exams">
): Promise<ClinicalExam> {
  const { data, error } = await supabase
    .from("clinical_exams")
    .insert(examData)
    .select()
    .single();

  if (error) {
    console.error("Error creating clinical exam:", error);
    throw error;
  }

  return data as ClinicalExam;
}

/**
 * Update an existing clinical exam record
 */
export async function updateClinicalExam(
  id: string,
  examData: TablesUpdate<"clinical_exams">
): Promise<ClinicalExam> {
  const { data, error } = await supabase
    .from("clinical_exams")
    .update({ ...examData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating clinical exam:", error);
    throw error;
  }

  return data as ClinicalExam;
}

/**
 * Delete a clinical exam record
 */
export async function deleteClinicalExam(id: string): Promise<void> {
  const { error } = await supabase
    .from("clinical_exams")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting clinical exam:", error);
    throw error;
  }
}
