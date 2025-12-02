// Lab Results OCR using Gemini 2.5 Flash with structured function calling
// Analyzes lab result images and extracts structured test data
import {
    errorResponse,
    handleCorsRequest,
    jsonResponse,
} from "../_shared/cors.ts";
import {
    getFileAsBase64,
    getMimeTypeFromPath,
} from "../_shared/supabase-utils.ts";

interface LabTestResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: "normal" | "low" | "high";
}

interface LabResultExtraction {
  testType: string;
  labName: string;
  testDate: string | null;
  orderedBy?: string;
  results: LabTestResult[];
}

interface LabResultOCRResponse {
  confidence: number;
  labResult: LabResultExtraction;
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

    console.log(`[Lab Results OCR] Processing file from ${bucket}/${path}`);

    // Download the file and convert to base64 using shared utility
    const base64Image = await getFileAsBase64(bucket, path);
    const mimeType = getMimeTypeFromPath(path);

    console.log(`[Lab Results OCR] File MIME type: ${mimeType}`);

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
                  text: `Analyze this laboratory/veterinary test results image and extract all information.

IMPORTANT GUIDELINES:
- Current year is ${currentYear}
- Extract the main test type (e.g., Complete Blood Count, Chemistry Panel, Thyroid Panel)
- Extract laboratory name if visible
- Extract test date in YYYY-MM-DD format (only if clearly visible)
- Extract ordering veterinarian/doctor if visible
- For each test parameter, extract:
  * testName: Name of the parameter (e.g., "White Blood Cells", "Glucose", "ALT")
  * value: The measured value as a number or text
  * unit: Unit of measurement (e.g., "K/µL", "mg/dL", "U/L")
  * referenceRange: Normal reference range (e.g., "6.0-17.0", "70-138")
  * status: Determine if "normal", "low", or "high" by comparing value to reference range

DATE HANDLING:
- If date looks like DD/MM/YYYY or DD/MM/YY, convert to YYYY-MM-DD
- Only extract date if clearly visible, otherwise leave null
- Validate year is between 2020 and ${currentYear + 1}

STATUS DETERMINATION:
- Parse the value and reference range
- If value is within range → "normal"
- If value is below range → "low"
- If value is above range → "high"
- If cannot determine or no range → "normal"

Also provide an overall confidence score (0-100) for the extraction quality.

Return structured JSON with confidence score and lab result data.`,
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
                labResult: {
                  type: "object",
                  properties: {
                    testType: {
                      type: "string",
                      description: "Main test type (e.g., Complete Blood Count)",
                    },
                    labName: {
                      type: "string",
                      description: "Laboratory name",
                    },
                    testDate: {
                      type: "string",
                      description: "Test date in YYYY-MM-DD format",
                    },
                    orderedBy: {
                      type: "string",
                      description: "Ordering veterinarian/doctor",
                    },
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          testName: {
                            type: "string",
                            description: "Test parameter name",
                          },
                          value: {
                            type: "string",
                            description: "Measured value",
                          },
                          unit: {
                            type: "string",
                            description: "Unit of measurement",
                          },
                          referenceRange: {
                            type: "string",
                            description: "Normal reference range",
                          },
                          status: {
                            type: "string",
                            enum: ["normal", "low", "high"],
                            description: "Result status",
                          },
                        },
                        required: ["testName", "value", "unit", "referenceRange", "status"],
                      },
                    },
                  },
                  required: ["testType", "labName", "results"],
                },
              },
              required: ["confidence", "labResult"],
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
        throw new Error("AI usage limit reached. Please add credits to continue.");
      }
      
      throw new Error(`AI parsing error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let result: LabResultOCRResponse;
    try {
      result = JSON.parse(content);
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error("Failed to parse lab result data");
    }

    // Validate and fix date if present
    if (result.labResult.testDate) {
      const testDate = new Date(result.labResult.testDate);
      const testYear = testDate.getFullYear();

      // Fix common OCR errors
      if (testYear < 2020 || testYear > 2030) {
        console.log(`Invalid test year ${testYear}, setting to null`);
        result.labResult.testDate = null;
      }
    }

    console.log(
      `[Lab Results OCR] Successfully extracted ${result.labResult.results.length} test results with ${result.confidence}% confidence`
    );
    
    return jsonResponse(result);
  } catch (error) {
    console.error("[Lab Results OCR] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      400
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request with Supabase Storage bucket and path:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/lab-results-ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"pets","path":"user-id/pet-name_pet-id/lab-results/result.jpg"}'

  Note: This function uses Gemini 2.5 Flash with structured function calling for accurate
  lab result extraction from test report images.

*/

