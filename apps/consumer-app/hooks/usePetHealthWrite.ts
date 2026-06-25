import { useAuth } from "@/context/authContext";
import { supabase } from "@/utils/supabase";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { Alert } from "react-native";

export type PetRole = "owner" | "admin" | "contributor" | "view_only";

export async function fetchPetRole(petId: string): Promise<PetRole | null> {
  const { data, error } = await supabase.rpc("get_user_pet_role", { p_pet_id: petId });
  if (error) throw error;
  if (!data) return null;
  return data as PetRole;
}

export function canWritePetHealth(role: PetRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "contributor";
}

export function usePetRole(petId: string | undefined) {
  return useQuery({
    queryKey: ["pet_role", petId],
    queryFn: () => fetchPetRole(petId!),
    enabled: !!petId,
    staleTime: 60_000,
  });
}

export function usePetHealthWrite(petId: string | undefined) {
  const { data: role, isLoading } = usePetRole(petId);
  const canWrite = canWritePetHealth(role);

  const warnReadOnly = useCallback(() => {
    Alert.alert(
      "View only",
      "You can see this pet's daily care, but only contributors and admins can log meals, water, and bathroom breaks."
    );
  }, []);

  const guardWrite = useCallback(
    (action: () => void) => {
      if (!canWrite) {
        warnReadOnly();
        return;
      }
      action();
    },
    [canWrite, warnReadOnly]
  );

  return { role, canWrite, isLoading, warnReadOnly, guardWrite };
}

export async function fetchDisplayNameForUser(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc("display_name_for_user", { p_user_id: userId });
  if (error) throw error;
  return (data as string) || "Someone";
}

export function useDailyIntakeAttribution(lastUpdatedBy: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["display_name", lastUpdatedBy],
    queryFn: () => fetchDisplayNameForUser(lastUpdatedBy!),
    enabled: !!lastUpdatedBy && lastUpdatedBy !== user?.id,
    staleTime: 300_000,
  });
}
