import type { Tables } from "@/database.types";
import { supabase } from "@/utils/supabase";

/** Remove vault row and its file in the pets bucket (owner-only per RLS). */
export async function deletePetDocument(
  row: Pick<Tables<"pet_documents">, "id" | "storage_path">
): Promise<void> {
  if (row.storage_path?.trim()) {
    const { error: storageError } = await supabase.storage
      .from("pets")
      .remove([row.storage_path]);
    if (storageError) {
      console.warn("[deletePetDocument] storage remove:", storageError.message);
    }
  }

  const { error } = await supabase.from("pet_documents").delete().eq("id", row.id);
  if (error) throw error;
}
