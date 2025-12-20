import { TablesInsert, TablesUpdate } from "@/database.types";
import { supabase } from "@/utils/supabase";

export const getPets = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to fetch pets");
  }

  const { data, error } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

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

export const updatePet = async (petId: string, petData: TablesUpdate<"pets">) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to update a pet");
  }

  const { data, error } = await supabase
    .from("pets")
    .update(petData)
    .eq("id", petId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
};

export const deletePet = async (petId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to delete a pet");
  }

  // Soft delete by setting deleted_at timestamp
  const { data, error } = await supabase
    .from("pets")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", petId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) throw error;

  return data;
};
