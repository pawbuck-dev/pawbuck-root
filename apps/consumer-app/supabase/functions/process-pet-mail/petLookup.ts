import { createClient } from "jsr:@supabase/supabase-js@2";
import type { Pet } from "./types.ts";

/**
 * Creates a Supabase client with service role key
 */
function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Extracts email_id from a full email address
 * Example: "fluffy123@pawbuck.com" -> "fluffy123"
 */
export function extractEmailId(emailAddress: string): string {
  const match = emailAddress.match(/^([^@]+)@/);
  if (!match) {
    throw new Error(`Invalid email address format: ${emailAddress}`);
  }
  return match[1];
}

/**
 * Looks up a pet by email_id from the pets table
 * @param emailId - The email_id to search for (e.g., "fluffy123")
 * @returns Pet record if found, null otherwise
 */
export async function findPetByEmailId(emailId: string): Promise<Pet | null> {
  console.log(`Looking up pet with email_id: ${emailId}`);

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("pets")
    .select("id, name, email_id, user_id, animal_type, breed, microchip_number, date_of_birth, sex")
    .eq("email_id", emailId.toLowerCase())
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      console.log(`No pet found with email_id: ${emailId}`);
      return null;
    }
    console.error("Error querying pets table:", error);
    throw new Error(`Database error: ${error.message}`);
  }

  console.log(`Found pet: ${data.name} (ID: ${data.id})`);
  return data;
}

/**
 * Looks up a pet from a full email address
 * @param emailAddress - Full email address (e.g., "fluffy123@pawbuck.com")
 * @returns Pet record if found, null otherwise
 */
export async function findPetByEmail(
  emailAddress: string
): Promise<Pet | null> {
  const emailId = extractEmailId(emailAddress);
  return await findPetByEmailId(emailId);
}





