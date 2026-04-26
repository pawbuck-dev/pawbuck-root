// Health records tool: vaccinations, medications, lab results, clinical exams
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

async function fetchVaccinations(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  if (error) throw new Error(`Failed to fetch vaccinations: ${error.message}`);
  return data || [];
}

async function fetchMedications(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch medications: ${error.message}`);
  return data || [];
}

async function fetchLabResults(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("pet_id", petId)
    .order("test_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch lab results: ${error.message}`);
  return data || [];
}

async function fetchClinicalExams(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("clinical_exams")
    .select("*")
    .eq("pet_id", petId)
    .order("exam_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch clinical exams: ${error.message}`);
  return data || [];
}

function formatVaccinations(vaccinations: unknown[]): string {
  if (vaccinations.length === 0) {
    return "No vaccination records found for this pet.";
  }

  const formatted = vaccinations.map((v: Record<string, unknown>) => {
    const lines = [`- ${v.name}`, `  Date: ${v.date}`];
    if (v.expiry_date) lines.push(`  Expiry: ${v.expiry_date}`);
    if (v.batch_number) lines.push(`  Batch: ${v.batch_number}`);
    if (v.vet_name) lines.push(`  Vet: ${v.vet_name}`);
    if (v.clinic_name) lines.push(`  Clinic: ${v.clinic_name}`);
    if (v.notes) lines.push(`  Notes: ${v.notes}`);
    return lines.join("\n");
  });

  return `Vaccination Records (${vaccinations.length} total):\n\n${formatted.join("\n\n")}`;
}

function formatMedications(medications: unknown[]): string {
  if (medications.length === 0) {
    return "No medication records found for this pet.";
  }

  const formatted = medications.map((m: Record<string, unknown>) => {
    const lines = [`- ${m.name} (${m.type})`, `  Dosage: ${m.dosage}`, `  Frequency: ${m.frequency}`];
    if (m.start_date) lines.push(`  Start Date: ${m.start_date}`);
    if (m.end_date) lines.push(`  End Date: ${m.end_date}`);
    if (m.prescribed_by) lines.push(`  Prescribed By: ${m.prescribed_by}`);
    if (m.purpose) lines.push(`  Purpose: ${m.purpose}`);
    if (m.next_due_date) lines.push(`  Next Due: ${m.next_due_date}`);
    return lines.join("\n");
  });

  return `Medication Records (${medications.length} total):\n\n${formatted.join("\n\n")}`;
}

function formatLabResults(labResults: unknown[]): string {
  if (labResults.length === 0) {
    return "No lab result records found for this pet.";
  }

  const formatted = labResults.map((lr: Record<string, unknown>) => {
    const lines = [`- ${lr.test_type}`, `  Lab: ${lr.lab_name}`];
    if (lr.test_date) lines.push(`  Date: ${lr.test_date}`);
    if (lr.ordered_by) lines.push(`  Ordered By: ${lr.ordered_by}`);

    const results = lr.results as Array<{ status?: string; testName?: string; value?: string; unit?: string; referenceRange?: string }> | undefined;
    if (results && Array.isArray(results) && results.length > 0) {
      lines.push("  Results:");
      results.forEach((r) => {
        const statusEmoji = r.status === "normal" ? "✓" : r.status === "high" ? "↑" : "↓";
        lines.push(`    ${statusEmoji} ${r.testName}: ${r.value} ${r.unit} (Ref: ${r.referenceRange})`);
      });
    }
    return lines.join("\n");
  });

  return `Lab Results (${labResults.length} total):\n\n${formatted.join("\n\n")}`;
}

function formatClinicalExams(exams: unknown[]): string {
  if (exams.length === 0) {
    return "No clinical exam records found for this pet.";
  }

  const formatted = exams.map((e: Record<string, unknown>) => {
    const lines = [`- ${e.exam_type || "General Exam"}`, `  Date: ${e.exam_date}`];
    if (e.clinic_name) lines.push(`  Clinic: ${e.clinic_name}`);
    if (e.vet_name) lines.push(`  Vet: ${e.vet_name}`);

    const vitals: string[] = [];
    if (e.weight_value) vitals.push(`Weight: ${e.weight_value} ${e.weight_unit || "kg"}`);
    if (e.temperature) vitals.push(`Temp: ${e.temperature}°F`);
    if (e.heart_rate) vitals.push(`HR: ${e.heart_rate} bpm`);
    if (e.respiratory_rate) vitals.push(`RR: ${e.respiratory_rate}/min`);
    if (vitals.length > 0) lines.push(`  Vitals: ${vitals.join(", ")}`);

    if (e.findings) lines.push(`  Findings: ${e.findings}`);
    if (e.notes) lines.push(`  Notes: ${e.notes}`);
    if (e.follow_up_date) lines.push(`  Follow-up: ${e.follow_up_date}`);
    return lines.join("\n");
  });

  return `Clinical Exam Records (${exams.length} total):\n\n${formatted.join("\n\n")}`;
}

const HEALTH_TOOL_NAMES = [
  "get_pet_vaccinations",
  "get_pet_medications",
  "get_pet_lab_results",
  "get_pet_clinical_exams",
  "get_pet_health_summary",
] as const;

export function isHealthTool(name: string): name is (typeof HEALTH_TOOL_NAMES)[number] {
  return (HEALTH_TOOL_NAMES as readonly string[]).includes(name);
}

/**
 * Execute a health-record tool for the given pet. Use for get_pet_vaccinations,
 * get_pet_medications, get_pet_lab_results, get_pet_clinical_exams, get_pet_health_summary.
 */
export async function executeHealthTool(
  functionName: string,
  petId: string,
  supabase: SupabaseClient
): Promise<string> {
  switch (functionName) {
    case "get_pet_vaccinations": {
      const data = await fetchVaccinations(supabase, petId);
      return formatVaccinations(data);
    }
    case "get_pet_medications": {
      const data = await fetchMedications(supabase, petId);
      return formatMedications(data);
    }
    case "get_pet_lab_results": {
      const data = await fetchLabResults(supabase, petId);
      return formatLabResults(data);
    }
    case "get_pet_clinical_exams": {
      const data = await fetchClinicalExams(supabase, petId);
      return formatClinicalExams(data);
    }
    case "get_pet_health_summary": {
      const [vaccinations, medications, labResults, exams] = await Promise.all([
        fetchVaccinations(supabase, petId),
        fetchMedications(supabase, petId),
        fetchLabResults(supabase, petId),
        fetchClinicalExams(supabase, petId),
      ]);
      return `=== PET HEALTH SUMMARY ===\n\n${formatVaccinations(vaccinations)}\n\n---\n\n${formatMedications(medications)}\n\n---\n\n${formatLabResults(labResults)}\n\n---\n\n${formatClinicalExams(exams)}`;
    }
    default:
      throw new Error(`Unknown health function: ${functionName}`);
  }
}
