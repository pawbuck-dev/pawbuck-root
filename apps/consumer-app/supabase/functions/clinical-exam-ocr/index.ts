// Clinical Exam OCR using Gemini Vision API
// Analyzes clinical exam documents and extracts structured data
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  getFileAsBase64,
  getMimeTypeFromPath,
} from "../_shared/supabase-utils.ts";
import { callGeminiAPI } from "../_shared/gemini-api.ts";

interface ClinicalExamExtraction {
  exam_type: string;
  exam_date: string | null;
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
  validity_date: string | null;
}

interface ClinicalExamOCRResponse {
  confidence: number;
  exam: ClinicalExamExtraction;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }

  try {
    const body = await req.json();
    const { bucket, path, exam_type } = body;

    if (!bucket || !path) {
      throw new Error("Missing bucket or path in request body");
    }

    console.log(`[Clinical Exam OCR] Processing file from ${bucket}/${path}`);

    // Download the file and convert to base64 using shared utility
    const base64Image = await getFileAsBase64(bucket, path);
    const mimeType = getMimeTypeFromPath(path);

    console.log(`[Clinical Exam OCR] File MIME type: ${mimeType}`);

    const currentYear = new Date().getFullYear();

    // Build context about document type if provided
    const documentTypeContext = exam_type 
      ? `The user has indicated this is a "${exam_type}" document.` 
      : "";

    // Use Gemini Vision API with structured function calling
    const apiResult = await callGeminiAPI(
      {
        contents: [
            {
              parts: [
                {
                  text: `Analyze this veterinary clinical examination document and extract all relevant information.

${documentTypeContext}

IMPORTANT GUIDELINES:
- Current year is ${currentYear}
- This could be a routine checkup, travel certificate, invoice, or other veterinary document
- Extract the exam/document type (e.g., "Routine Checkup", "Annual Wellness Exam", "Travel Certificate", "Invoice", "Dental Examination", "Follow-up Examination")
- Extract exam/visit date in YYYY-MM-DD format
- Extract clinic/hospital name and veterinarian name if visible
- Extract pet vitals if present:
  * weight_value: numeric value (e.g., 28.5)
  * weight_unit: unit of measurement (e.g., "lbs", "kg")
  * temperature: in Fahrenheit (e.g., 101.2)
  * heart_rate: beats per minute (e.g., 92)
  * respiratory_rate: breaths per minute if visible
- Extract findings/observations from the examination
- Extract notes, recommendations, or treatment instructions
- Extract follow-up date if mentioned
- For TRAVEL DOCUMENTS/CERTIFICATES: Extract the validity/expiry date (validity_date) - this is the date until which the travel certificate is valid

DATE HANDLING:
- If date looks like DD/MM/YYYY or DD/MM/YY, convert to YYYY-MM-DD
- Only extract date if clearly visible, otherwise leave null
- Validate year is between 2020 and ${currentYear + 1}

WEIGHT HANDLING:
- Extract numeric value separately from unit
- Common units: lbs, kg, pounds, kilograms
- If weight shows "28.5 lbs", weight_value=28.5, weight_unit="lbs"

TEMPERATURE HANDLING:
- Extract as Fahrenheit value
- Normal pet temperature is around 100-102°F
- If in Celsius, convert to Fahrenheit

Also provide an overall confidence score (0-100) for the extraction quality.

Return structured JSON with confidence score and exam data.`,
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                confidence: {
                  type: "number",
                  description: "Overall confidence score from 0-100",
                },
                exam: {
                  type: "object",
                  properties: {
                    exam_type: {
                      type: "string",
                      description: "Type of exam (e.g., Routine Checkup, Travel Certificate, Invoice)",
                    },
                    exam_date: {
                      type: "string",
                      description: "Exam date in YYYY-MM-DD format",
                    },
                    clinic_name: {
                      type: "string",
                      description: "Veterinary clinic or hospital name",
                    },
                    vet_name: {
                      type: "string",
                      description: "Veterinarian name",
                    },
                    weight_value: {
                      type: "number",
                      description: "Pet weight numeric value",
                    },
                    weight_unit: {
                      type: "string",
                      description: "Weight unit (lbs, kg)",
                    },
                    temperature: {
                      type: "number",
                      description: "Body temperature in Fahrenheit",
                    },
                    heart_rate: {
                      type: "number",
                      description: "Heart rate in beats per minute",
                    },
                    respiratory_rate: {
                      type: "number",
                      description: "Respiratory rate in breaths per minute",
                    },
                    findings: {
                      type: "string",
                      description: "Clinical findings and observations",
                    },
                    notes: {
                      type: "string",
                      description: "Recommendations, notes, or treatment instructions",
                    },
                    follow_up_date: {
                      type: "string",
                      description: "Follow-up date in YYYY-MM-DD format if mentioned",
                    },
                    validity_date: {
                      type: "string",
                      description: "Validity/expiry date in YYYY-MM-DD format for travel documents/certificates",
                    },
                  },
                  required: ["exam_type"],
                },
              },
              required: ["confidence", "exam"],
            },
          },
        },
      "clinical-exam-ocr"
    );

    const content = apiResult.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let result: ClinicalExamOCRResponse;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error("Failed to parse clinical exam data");
    }

    // Validate and fix dates
    const fixDate = (dateStr: string | null): string | null => {
      if (!dateStr) return null;
      
      try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        
        if (isNaN(date.getTime()) || year < 2020 || year > currentYear + 1) {
          console.log(`Invalid date ${dateStr}, setting to null`);
          return null;
        }
        
        return date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    };

    // Validate dates for validity (validity_date can be further in the future)
    const fixValidityDate = (dateStr: string | null): string | null => {
      if (!dateStr) return null;
      
      try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        
        // Validity dates can be up to 5 years in the future for travel documents
        if (isNaN(date.getTime()) || year < 2020 || year > currentYear + 5) {
          console.log(`Invalid validity date ${dateStr}, setting to null`);
          return null;
        }
        
        return date.toISOString().split('T')[0];
      } catch {
        return null;
      }
    };

    if (result.exam.exam_date) {
      result.exam.exam_date = fixDate(result.exam.exam_date);
    }
    if (result.exam.follow_up_date) {
      result.exam.follow_up_date = fixDate(result.exam.follow_up_date);
    }
    if (result.exam.validity_date) {
      result.exam.validity_date = fixValidityDate(result.exam.validity_date);
    }

    console.log(
      `[Clinical Exam OCR] Successfully extracted exam data with ${result.confidence}% confidence`
    );

    return jsonResponse(result);
  } catch (error) {
    console.error("[Clinical Exam OCR] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      400
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with Supabase Storage bucket and path:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/clinical-exam-ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"pets","path":"user-id/pet-name_pet-id/clinical-exams/exam.jpg","exam_type":"Routine Checkup"}'

  Note: This function uses Gemini Vision API with structured function calling for accurate
  clinical exam extraction from veterinary documents.

*/
