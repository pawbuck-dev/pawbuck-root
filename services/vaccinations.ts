import { TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";
import * as FileSystem from "expo-file-system";

/**
 * Fetch all vaccinations for a specific pet
 */
export const getVaccinationsByPetId = async (petId: string) => {
  const { data, error } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("pet_id", petId)
    .order("vaccination_date", { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Create a new vaccination record
 */
export const createVaccination = async (
  vaccinationData: TablesInsert<"vaccinations">
) => {
  const { data, error } = await supabase
    .from("vaccinations")
    .insert(vaccinationData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update an existing vaccination record
 */
export const updateVaccination = async (
  id: string,
  vaccinationData: TablesUpdate<"vaccinations">
) => {
  const { data, error } = await supabase
    .from("vaccinations")
    .update(vaccinationData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a vaccination record
 */
export const deleteVaccination = async (id: string) => {
  const { error } = await supabase.from("vaccinations").delete().eq("id", id);

  if (error) throw error;
};

// /**
//  * Upload vaccination document to Supabase storage
//  * @param fileUri Local file URI from image picker
//  * @param petId Pet ID for organizing storage
//  * @returns Public URL of uploaded document
//  */
// export const uploadVaccinationDocument = async (
//   fileUri: string,
//   petId: string
// ): Promise<string> => {
//   try {
//     // Read file as base64
//     const base64 = await FileSystem.readAsStringAsync(fileUri, {
//       encoding: FileSystem.EncodingType.Base64,
//     });

//     // Get file extension
//     const fileExtension = fileUri.split(".").pop() || "jpg";
//     const timestamp = Date.now();
//     const fileName = `${timestamp}.${fileExtension}`;
//     const filePath = `${petId}/${fileName}`;

//     // Convert base64 to blob
//     const response = await fetch(
//       `data:image/${fileExtension};base64,${base64}`
//     );
//     const blob = await response.blob();

//     // Upload to Supabase storage
//     const { data, error } = await supabase.storage
//       .from("vaccination-documents")
//       .upload(filePath, blob, {
//         contentType: `image/${fileExtension}`,
//         upsert: false,
//       });

//     if (error) throw error;

//     // Get public URL
//     const {
//       data: { publicUrl },
//     } = supabase.storage.from("vaccination-documents").getPublicUrl(data.path);

//     return publicUrl;
//   } catch (error) {
//     console.error("Error uploading document:", error);
//     throw error;
//   }
// };
