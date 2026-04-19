import { supabase } from "@/utils/supabase";
import type { Tables } from "@/database.types";
import { useQuery } from "@tanstack/react-query";

export function usePetDocuments(petId: string | undefined) {
  return useQuery({
    queryKey: ["pet_documents", petId],
    enabled: !!petId,
    queryFn: async (): Promise<Tables<"pet_documents">[]> => {
      if (!petId) return [];
      const { data, error } = await supabase
        .from("pet_documents")
        .select("*")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
