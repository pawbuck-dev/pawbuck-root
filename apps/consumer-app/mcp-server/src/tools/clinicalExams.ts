import { getSupabaseClient } from "../supabase.js";

export interface ClinicalExam {
  id: string;
  pet_id: string;
  exam_type: string | null;
  exam_date: string;
  clinic_name: string | null;
  vet_name: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  findings: string | null;
  notes: string | null;
  follow_up_date: string | null;
  created_at: string;
}

export async function getClinicalExams(petId: string): Promise<ClinicalExam[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("clinical_exams")
    .select("*")
    .eq("pet_id", petId)
    .order("exam_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch clinical exams: ${error.message}`);
  }

  return data || [];
}

export function formatClinicalExamsForAI(exams: ClinicalExam[]): string {
  if (exams.length === 0) {
    return "No clinical exam records found for this pet.";
  }

  const formatted = exams.map((e) => {
    const lines = [
      `- ${e.exam_type || "General Exam"}`,
      `  Date: ${e.exam_date}`,
    ];
    
    if (e.clinic_name) {
      lines.push(`  Clinic: ${e.clinic_name}`);
    }
    if (e.vet_name) {
      lines.push(`  Vet: ${e.vet_name}`);
    }
    
    // Vitals
    const vitals: string[] = [];
    if (e.weight_value) {
      vitals.push(`Weight: ${e.weight_value} ${e.weight_unit || "kg"}`);
    }
    if (e.temperature) {
      vitals.push(`Temp: ${e.temperature}°F`);
    }
    if (e.heart_rate) {
      vitals.push(`HR: ${e.heart_rate} bpm`);
    }
    if (e.respiratory_rate) {
      vitals.push(`RR: ${e.respiratory_rate}/min`);
    }
    if (vitals.length > 0) {
      lines.push(`  Vitals: ${vitals.join(", ")}`);
    }
    
    if (e.findings) {
      lines.push(`  Findings: ${e.findings}`);
    }
    if (e.notes) {
      lines.push(`  Notes: ${e.notes}`);
    }
    if (e.follow_up_date) {
      lines.push(`  Follow-up: ${e.follow_up_date}`);
    }
    
    return lines.join("\n");
  });

  return `Clinical Exam Records (${exams.length} total):\n\n${formatted.join("\n\n")}`;
}
