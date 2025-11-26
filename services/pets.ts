import { TablesInsert } from "@/database.types";
import { supabase } from "@/utils/supabase";

export const getPets = async () => {
  const { data, error } = await supabase.from("pets").select("*");
  if (error) throw error;

  return data;
};

export const createPet = async (petData: TablesInsert<"pets">) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to create a pet");
  }

  const { data, error } = await supabase
    .from("pets")
    .insert(petData)
    .select()
    .single();

  if (error) throw error;

  return data;
};
