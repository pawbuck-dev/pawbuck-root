import type { ClinicalSummaryResult } from "@/services/buildClinicalSummary";
import { buildDeterministicClinicalSummary } from "@/services/buildClinicalSummary";
import type { HealthExportBundle } from "@/services/healthExportBundle";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

/**
 * Prefer Milo/API health summary when available; otherwise deterministic bundle text.
 * Phase 5: extend when a dedicated GET /api/pets/{id}/clinical-summary exists.
 */
export async function fetchClinicalSummaryForExport(
  bundle: HealthExportBundle
): Promise<ClinicalSummaryResult> {
  const fallback = buildDeterministicClinicalSummary(bundle);
  const baseUrl = getPawbuckApiBaseUrl();
  if (!baseUrl) return fallback;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return fallback;

    const url = `${baseUrl.replace(/\/$/, "")}/api/milo/pets/${encodeURIComponent(bundle.pet.id)}/health-summary`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as {
      narrative?: string;
      confidencePercent?: number | null;
    };
    if (typeof data.narrative === "string" && data.narrative.trim().length > 20) {
      return {
        narrative: data.narrative.trim(),
        confidencePercent:
          typeof data.confidencePercent === "number" ? data.confidencePercent : null,
      };
    }
  } catch {
    /* API optional */
  }

  return fallback;
}
