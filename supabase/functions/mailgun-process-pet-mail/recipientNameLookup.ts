/**
 * Recipient Name Lookup Utilities
 * 
 * Functions to look up recipient names from care team or vet information
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

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
 * Look up recipient name from vet_information or care_team_members
 */
export async function lookupRecipientName(email: string): Promise<string | null> {
  const supabase = createSupabaseClient();
  
  // Try vet_information first
  const { data: vetInfo } = await supabase
    .from("vet_information")
    .select("vet_name, clinic_name")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  
  if (vetInfo) {
    return vetInfo.vet_name || vetInfo.clinic_name || null;
  }
  
  // Try care_team_members
  const { data: careTeamMember } = await supabase
    .from("care_team_members")
    .select("name, business_name")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  
  if (careTeamMember) {
    return careTeamMember.name || careTeamMember.business_name || null;
  }
  
  return null;
}
