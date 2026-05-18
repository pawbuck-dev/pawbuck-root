import { createClient } from "jsr:@supabase/supabase-js@2";

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/** Coarse IANA default when pets.home_timezone is unset (v1). */
export function countryDefaultTimezone(country: string | null | undefined): string {
  const c = (country ?? "").trim().toLowerCase();
  if (!c) return "UTC";
  if (c === "us" || c === "usa" || c === "united states") return "America/New_York";
  if (c === "ca" || c === "canada") return "America/Toronto";
  if (c === "uk" || c === "gb" || c === "united kingdom") return "Europe/London";
  if (c === "au" || c === "australia") return "Australia/Sydney";
  if (c === "nz" || c === "new zealand") return "Pacific/Auckland";
  if (c === "ie" || c === "ireland") return "Europe/Dublin";
  if (c === "de" || c === "germany") return "Europe/Berlin";
  if (c === "fr" || c === "france") return "Europe/Paris";
  return "UTC";
}

function isValidIanaTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve pet home IANA timezone: pets.home_timezone, else country fallback, else UTC.
 */
export async function resolvePetHomeTimezone(petId: string): Promise<string> {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pets")
    .select("home_timezone, country")
    .eq("id", petId)
    .maybeSingle();

  if (error) {
    console.warn("[petTimezoneResolver] fetch failed", error.message);
    return "UTC";
  }

  const stored = typeof data?.home_timezone === "string" ? data.home_timezone.trim() : "";
  if (stored && isValidIanaTimezone(stored)) return stored;

  const fallback = countryDefaultTimezone(
    typeof data?.country === "string" ? data.country : null
  );
  if (!stored) {
    console.log(`[petTimezoneResolver] using country fallback ${fallback} for pet ${petId}`);
  } else {
    console.warn(`[petTimezoneResolver] invalid home_timezone "${stored}", using ${fallback}`);
  }
  return isValidIanaTimezone(fallback) ? fallback : "UTC";
}
