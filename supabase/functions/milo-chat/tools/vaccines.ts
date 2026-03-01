// Vaccine requirements by location (county/country). Uses country_vaccine_requirements.
// When a county_vaccines table is added, switch the query to that table for county-level data.
import { createSupabaseClient } from "../../_shared/supabase-utils.ts";

/** Normalize location string (county or country) to a country key for country_vaccine_requirements. */
function locationToCountry(location: string): string {
  const lower = location.trim().toLowerCase();
  if (!lower) return "United States";
  // US state/county hints -> USA
  const usPatterns = [
    "usa", "united states", "us", "u.s.", "america",
    "tx", "texas", "ca", "california", "fl", "florida", "ny", "new york",
    "county", "harris", "dallas", "tarrant", "bexar", "cook", "la ", "los angeles",
  ];
  for (const p of usPatterns) {
    if (lower.includes(p)) return "United States";
  }
  // UK
  if (lower.includes("uk") || lower.includes("united kingdom") || lower.includes("england")) return "United Kingdom";
  // Canada
  if (lower.includes("canada") || lower.includes("ontario") || lower.includes("bc ")) return "Canada";
  // Return as-is capitalized for other countries (e.g. "Germany", "Australia")
  return location.trim();
}

/** Normalize pet_type to animal_type (Dog, Cat, etc.). */
function toAnimalType(petType: string): string {
  const lower = petType.trim().toLowerCase();
  if (lower.includes("dog")) return "dog";
  if (lower.includes("cat")) return "cat";
  return lower || "dog";
}

/**
 * Get vaccine requirements for a location (county or country) and pet type.
 * Queries country_vaccine_requirements; when county_vaccines table exists, query that for county-level data.
 */
export async function get_county_vaccines(
  county: string,
  pet_type: string
): Promise<string> {
  const supabase = createSupabaseClient();
  const country = locationToCountry(county);
  const animal_type = toAnimalType(pet_type);

  const { data, error } = await supabase
    .from("country_vaccine_requirements")
    .select("vaccine_name, is_required, frequency_months, description")
    .eq("country", country)
    .eq("animal_type", animal_type)
    .order("is_required", { ascending: false });

  if (error) {
    console.error("[vaccines] country_vaccine_requirements error:", error.message);
    return "Unable to fetch vaccine requirements for that location.";
  }

  if (!data || data.length === 0) {
    return "I don't have the local vaccine records for that county/region yet. Please check with your local animal control or veterinarian for current requirements.";
  }

  const required = data.filter((r) => r.is_required);
  const recommended = data.filter((r) => !r.is_required);
  const lines: string[] = [
    `Vaccine requirements for ${country} (${animal_type}):`,
    "",
  ];
  if (required.length > 0) {
    lines.push("Required:");
    required.forEach((r) => {
      const freq = r.frequency_months ? ` every ${r.frequency_months} months` : "";
      lines.push(`  - ${r.vaccine_name}${freq}${r.description ? `: ${r.description}` : ""}`);
    });
    lines.push("");
  }
  if (recommended.length > 0) {
    lines.push("Recommended:");
    recommended.forEach((r) => {
      const freq = r.frequency_months ? ` every ${r.frequency_months} months` : "";
      lines.push(`  - ${r.vaccine_name}${freq}${r.description ? `: ${r.description}` : ""}`);
    });
  }
  return lines.join("\n");
}
