import type { DocumentType } from "./types.ts";

/**
 * Maps document types to OCR function names
 */
const OCR_FUNCTION_MAP: Record<Exclude<DocumentType, "irrelevant">, string> = {
  medications: "medication-ocr",
  lab_results: "lab-results-ocr",
  clinical_exams: "clinical-exam-ocr",
  billing_invoice: "clinical-exam-ocr",
  travel_certificate: "clinical-exam-ocr",
  vaccinations: "vaccination-ocr",
};

/**
 * Triggers the appropriate OCR function based on document type
 * @param documentType - Type of document to process
 * @param bucket - Storage bucket name
 * @param path - File path in storage
 * @returns OCR result data
 */
export async function triggerOCR(
  documentType: DocumentType,
  bucket: string,
  path: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (documentType === "irrelevant") {
    return {
      success: false,
      error: "Cannot trigger OCR for irrelevant documents",
    };
  }

  const functionName = OCR_FUNCTION_MAP[documentType];
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;

  console.log(`Triggering ${functionName} for file: ${bucket}/${path}`);

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        bucket,
        path,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`OCR function ${functionName} failed:`, responseText);
      return {
        success: false,
        error: `OCR function returned status ${response.status}: ${responseText}`,
      };
    }

    // Try to parse JSON response
    try {
      const data = JSON.parse(responseText);
      console.log(`OCR function ${functionName} completed successfully`);
      return {
        success: true,
        data,
      };
    } catch (parseError) {
      console.error("Failed to parse OCR response:", parseError);
      return {
        success: false,
        error: `Failed to parse OCR response: ${parseError.message}`,
      };
    }
  } catch (error) {
    console.error(`Error calling OCR function ${functionName}:`, error);
    return {
      success: false,
      error: `Failed to call OCR function: ${error.message}`,
    };
  }
}

/**
 * Triggers OCR for multiple files in parallel
 * @param requests - Array of OCR requests
 * @returns Array of OCR results
 */
export async function triggerOCRBatch(
  requests: {
    documentType: DocumentType;
    bucket: string;
    path: string;
  }[]
): Promise<{ success: boolean; data?: any; error?: string }[]> {
  console.log(`Triggering batch OCR for ${requests.length} files`);

  const promises = requests.map((req) =>
    triggerOCR(req.documentType, req.bucket, req.path)
  );

  return await Promise.all(promises);
}

