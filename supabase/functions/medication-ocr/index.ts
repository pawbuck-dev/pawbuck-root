// Medication OCR using Gemini 2.5 Flash with structured function calling
// Analyzes prescription/medication images and extracts structured data
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  getFileAsBase64,
  getMimeTypeFromPath,
} from "../_shared/supabase-utils.ts";

interface MedicationExtraction {
  name: string;
  type:
    | "Tablet"
    | "Capsule"
    | "Liquid"
    | "Injection"
    | "Topical"
    | "chewable"
    | "Other";
  dosage: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "As Needed";
  purpose_notes?: string;
  prescribed_by?: string;
  start_date?: string | null;
  end_date?: string | null;
}

interface MedicationOCRResponse {
  confidence: number;
  medicines: MedicationExtraction[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }

  try {
    const body = await req.json();
    const { bucket, path } = body;

    if (!bucket || !path) {
      throw new Error("Missing bucket or path in request body");
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    console.log(`[Medication OCR] Processing file from ${bucket}/${path}`);

    // Download the file and convert to base64 using shared utility
    const base64Image = await getFileAsBase64(bucket, path);
    const mimeType = getMimeTypeFromPath(path);

    console.log(`[Medication OCR] File MIME type: ${mimeType}`);

    const currentYear = new Date().getFullYear();

    // Use Gemini 2.5 Flash with structured function calling
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `ARole: You are the PawBuck Medication Specialist. Your goal is to extract pet prescription data into a structured format while translating medical shorthand into plain English for pet owners.

### 1. EXTRACTION & TRANSLATION RULES
- CANONICALIZE: Identify the active ingredient if a brand name is used (e.g., Brand: "Apoquel" -> Active: "Oclacitinib"). 
- DECODE SHORTHAND: Translate veterinary Latin/shorthand:
  - "SID" or "q24h" -> "Once Daily"
  - "BID" or "q12h" -> "Twice Daily"
  - "TID" or "q8h" -> "Three times Daily"
  - "EOD" -> "Every Other Day"
  - "PO" -> "By Mouth"
  - "AU/AD/AS" -> "In Ears" | "PRN" -> "As Needed"

### 2. DATA FIELDS (JSON)
For each medication found, extract:
- name: Standardized Name (Brand + Active Ingredient if possible).
- type: Tablet, Capsule, Liquid, Injection, Topical, or Chewable.
- dosage: Exact strength (e.g., "16mg") AND quantity (e.g., "1.5 tablets").
- frequency: Use decoded English (e.g., "Twice Daily").
- category: Pain, Antibiotic, Allergy, Parasite, Heart, or Other.
- dates: start_date and end_date (YYYY-MM-DD). 
  - *Logic*: Reference date is January 11, 2026. If no end date is listed but it's a 10-day supply, calculate end_date.

### 3. SAFETY & CONFIDENCE
- CONFIDENCE: Assign 0-100 score.

Return a structured JSON response with confidence score and medicines array.`,
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
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                confidence: {
                  type: "number",
                  description: "Overall confidence score from 0-100",
                },
                medicines: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: "Medicine name",
                      },
                      type: {
                        type: "string",
                        enum: [
                          "Tablet",
                          "Capsule",
                          "Liquid",
                          "Injection",
                          "Topical",
                          "Chewable",
                          "Other",
                        ],
                        description: "Type of medication",
                      },
                      dosage: {
                        type: "string",
                        description: "Dosage amount with unit",
                      },
                      frequency: {
                        type: "string",
                        enum: ["Daily", "Weekly", "Monthly", "As Needed"],
                        description: "How often to take",
                      },
                      purpose: {
                        type: "string",
                        description: "Purpose or notes about the medication",
                      },
                      prescribed_by: {
                        type: "string",
                        description: "Prescribing doctor or clinic",
                      },
                      start_date: {
                        type: "string",
                        description: "Start date in YYYY-MM-DD format",
                      },
                      end_date: {
                        type: "string",
                        description: "End date in YYYY-MM-DD format",
                      },
                    },
                    required: ["name", "type", "dosage", "frequency"],
                  },
                },
              },
              required: ["confidence", "medicines"],
            },
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);

      if (geminiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (geminiResponse.status === 402) {
        throw new Error(
          "AI usage limit reached. Please add credits to continue."
        );
      }

      throw new Error(`AI parsing error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let result: MedicationOCRResponse;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error("Failed to parse medication data");
    }

    // Validate and fix dates
    if (result.medicines) {
      result.medicines = result.medicines.map((med) => {
        // Validate start_date
        if (med.start_date) {
          const startDate = new Date(med.start_date);
          const startYear = startDate.getFullYear();

          // Fix common OCR errors (1420 -> 2024, 2120 -> 2024)
          if (startYear < 2020 || startYear > 2030) {
            console.log(`Invalid start year ${startYear}, setting to null`);
            med.start_date = null;
          }
        }

        // Validate end_date
        if (med.end_date) {
          const endDate = new Date(med.end_date);
          const endYear = endDate.getFullYear();

          // Fix common OCR errors
          if (endYear < 2020 || endYear > 2030) {
            console.log(`Invalid end year ${endYear}, setting to null`);
            med.end_date = null;
          }

          // Ensure end date is after start date if both exist
          if (med.start_date && med.end_date) {
            const start = new Date(med.start_date);
            const end = new Date(med.end_date);
            if (end <= start) {
              console.log("End date before start date, clearing end date");
              med.end_date = null;
            }
          }
        }

        return med;
      });
    }

    console.log(
      `[Medication OCR] Successfully extracted ${result.medicines.length} medicines with ${result.confidence}% confidence`
    );

    return jsonResponse(result);
  } catch (error) {
    console.error("[Medication OCR] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      400
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with Supabase Storage bucket and path:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/medication-ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"pets","path":"user-id/pet-name_pet-id/medications/prescription.jpg"}'

  Note: This function uses Gemini 2.5 Flash with structured function calling for accurate
  medication extraction from prescription images.

*/
