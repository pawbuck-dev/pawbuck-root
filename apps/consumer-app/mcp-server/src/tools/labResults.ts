import { getSupabaseClient } from "../supabase.js";

export interface LabTestResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: "normal" | "low" | "high";
}

export interface LabResult {
  id: string;
  pet_id: string;
  test_type: string;
  lab_name: string;
  test_date: string | null;
  ordered_by: string | null;
  results: LabTestResult[];
  created_at: string;
}

export async function getLabResults(petId: string): Promise<LabResult[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("pet_id", petId)
    .order("test_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch lab results: ${error.message}`);
  }

  return data || [];
}

export function formatLabResultsForAI(labResults: LabResult[]): string {
  if (labResults.length === 0) {
    return "No lab result records found for this pet.";
  }

  const formatted = labResults.map((lr) => {
    const lines = [
      `- ${lr.test_type}`,
      `  Lab: ${lr.lab_name}`,
    ];
    
    if (lr.test_date) {
      lines.push(`  Date: ${lr.test_date}`);
    }
    if (lr.ordered_by) {
      lines.push(`  Ordered By: ${lr.ordered_by}`);
    }
    
    if (lr.results && lr.results.length > 0) {
      lines.push(`  Results:`);
      lr.results.forEach((r) => {
        const statusEmoji = r.status === "normal" ? "✓" : r.status === "high" ? "↑" : "↓";
        lines.push(`    ${statusEmoji} ${r.testName}: ${r.value} ${r.unit} (Ref: ${r.referenceRange})`);
      });
    }
    
    return lines.join("\n");
  });

  return `Lab Results (${labResults.length} total):\n\n${formatted.join("\n\n")}`;
}
