import { getSupabaseClient } from "../supabase.js";

export interface Medication {
  id: string;
  pet_id: string;
  name: string;
  type: string;
  dosage: string;
  frequency: string;
  custom_frequency_value: number | null;
  custom_frequency_unit: string | null;
  start_date: string | null;
  end_date: string | null;
  prescribed_by: string | null;
  purpose: string | null;
  last_given_at: string | null;
  next_due_date: string | null;
  reminder_enabled: boolean;
  created_at: string;
}

export async function getMedications(petId: string): Promise<Medication[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch medications: ${error.message}`);
  }

  return data || [];
}

export function formatMedicationsForAI(medications: Medication[]): string {
  if (medications.length === 0) {
    return "No medication records found for this pet.";
  }

  const formatted = medications.map((m) => {
    const lines = [
      `- ${m.name} (${m.type})`,
      `  Dosage: ${m.dosage}`,
      `  Frequency: ${m.frequency}`,
    ];
    
    if (m.start_date) {
      lines.push(`  Start Date: ${m.start_date}`);
    }
    if (m.end_date) {
      lines.push(`  End Date: ${m.end_date}`);
    }
    if (m.prescribed_by) {
      lines.push(`  Prescribed By: ${m.prescribed_by}`);
    }
    if (m.purpose) {
      lines.push(`  Purpose: ${m.purpose}`);
    }
    if (m.next_due_date) {
      lines.push(`  Next Due: ${m.next_due_date}`);
    }
    
    return lines.join("\n");
  });

  return `Medication Records (${medications.length} total):\n\n${formatted.join("\n\n")}`;
}
