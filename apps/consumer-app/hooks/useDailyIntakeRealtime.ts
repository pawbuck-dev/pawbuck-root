import { supabase } from "@/utils/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/** Invalidate shared Today / body tracker when another household member updates daily_intake. */
export function useDailyIntakeRealtime(petId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!petId) return;

    const channel = supabase
      .channel(`daily_intake:${petId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_intake",
          filter: `pet_id=eq.${petId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["daily_intake", petId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [petId, queryClient]);
}
