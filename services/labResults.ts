import { supabase } from "@/utils/supabase";

export interface LabTestResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: "normal" | "low" | "high";
}

export interface LabResult {
  id: string;
  pet_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  test_type: string;
  lab_name: string;
  test_date: string | null;
  ordered_by: string | null;
  results: LabTestResult[];
  document_url?: string | null;
  confidence?: number | null;
}

/**
 * Fetch all lab results for a specific pet
 */
export async function fetchLabResults(petId: string): Promise<LabResult[]> {
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("pet_id", petId)
    .order("test_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lab results:", error);
    throw error;
  }

  return data as LabResult[];
}

/**
 * Create a new lab result
 */
export async function createLabResult(
  labResult: Omit<LabResult, "id" | "created_at" | "updated_at">
): Promise<LabResult> {
  const { data, error } = await supabase
    .from("lab_results")
    .insert(labResult)
    .select()
    .single();

  if (error) {
    console.error("Error creating lab result:", error);
    throw error;
  }

  return data as LabResult;
}

/**
 * Update an existing lab result
 */
export async function updateLabResult(
  labResultId: string,
  updates: Partial<LabResult>
): Promise<LabResult> {
  const { data, error } = await supabase
    .from("lab_results")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", labResultId)
    .select()
    .single();

  if (error) {
    console.error("Error updating lab result:", error);
    throw error;
  }

  return data as LabResult;
}

/**
 * Delete a lab result
 */
export async function deleteLabResult(labResultId: string): Promise<void> {
  const { error } = await supabase
    .from("lab_results")
    .delete()
    .eq("id", labResultId);

  if (error) {
    console.error("Error deleting lab result:", error);
    throw error;
  }
}

