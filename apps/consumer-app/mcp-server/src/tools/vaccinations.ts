import { getSupabaseClient } from "../supabase.js";

export interface Vaccination {
  id: string;
  pet_id: string;
  name: string;
  date: string;
  expiry_date: string | null;
  batch_number: string | null;
  vet_name: string | null;
  clinic_name: string | null;
  notes: string | null;
  created_at: string;
}

export async function getVaccinations(petId: string): Promise<Vaccination[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch vaccinations: ${error.message}`);
  }

  return data || [];
}

export function formatVaccinationsForAI(vaccinations: Vaccination[]): string {
  if (vaccinations.length === 0) {
    return "No vaccination records found for this pet.";
  }

  const formatted = vaccinations.map((v) => {
    const lines = [
      `- ${v.name}`,
      `  Date: ${v.date}`,
    ];
    
    if (v.expiry_date) {
      lines.push(`  Expiry: ${v.expiry_date}`);
    }
    if (v.batch_number) {
      lines.push(`  Batch: ${v.batch_number}`);
    }
    if (v.vet_name) {
      lines.push(`  Vet: ${v.vet_name}`);
    }
    if (v.clinic_name) {
      lines.push(`  Clinic: ${v.clinic_name}`);
    }
    if (v.notes) {
      lines.push(`  Notes: ${v.notes}`);
    }
    
    return lines.join("\n");
  });

  return `Vaccination Records (${vaccinations.length} total):\n\n${formatted.join("\n\n")}`;
}
