import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";

/** Map UI labels to PawBuck.API / edge pipeline document types. */
export type ReviewInboxDocumentPipelineType =
  | "vaccinations"
  | "medications"
  | "lab_results"
  | "clinical_exams";

/**
 * Re-run email processing with user-chosen pet and document type (POST /api/mail/resolve).
 */
export async function resolveReviewInboxEmail(params: {
  emailId: string;
  selectedPetId: string;
  selectedDocType: ReviewInboxDocumentPipelineType;
}): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Please sign in to resolve this item.");
  }

  const base = getPawbuckApiBaseUrl();
  if (!base) {
    throw new Error("PawBuck API URL is not configured (EXPO_PUBLIC_PAWBUCK_API_URL).");
  }

  const res = await fetch(`${base}/api/mail/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      email_id: params.emailId,
      selected_pet_id: params.selectedPetId,
      selected_doc_type: params.selectedDocType,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) message = j.error;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
}
