import { Tables, TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

export type VetInformation = Tables<"vet_information">;

/**
 * Fetch a single vet information record by ID
 */
export const getVetInformation = async (id: string): Promise<VetInformation | null> => {
  const { data, error } = await supabase
    .from("vet_information")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    throw error;
  }
  return data;
};

/**
 * Create a new vet information record
 */
export const createVetInformation = async (
  vetData: TablesInsert<"vet_information">
): Promise<VetInformation> => {
  const { data, error } = await supabase
    .from("vet_information")
    .insert(vetData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing vet information record
 */
export const updateVetInformation = async (
  id: string,
  vetData: TablesUpdate<"vet_information">
): Promise<VetInformation> => {
  const { data, error } = await supabase
    .from("vet_information")
    .update(vetData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a vet information record
 */
export const deleteVetInformation = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("vet_information")
    .delete()
    .eq("id", id);

  if (error) throw error;
};
