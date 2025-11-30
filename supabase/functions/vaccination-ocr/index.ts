// Setup type definitions for built-in Supabase Runtime APIs
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { getFileAsBase64 } from "../_shared/supabase-utils.ts";

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

    const GOOGLE_VISION_API_KEY = Deno.env.get("GOOGLE_VISION_API_KEY");
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!GOOGLE_VISION_API_KEY || !GOOGLE_GEMINI_API_KEY) {
      throw new Error("API keys not configured");
    }

    console.log(`[Vaccination OCR] Processing file from ${bucket}/${path}`);

    // Download the file and convert to base64 using shared utility
    const base64Image = await getFileAsBase64(bucket, path);

    // Step 1: Extract text from image using Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: "DOCUMENT_TEXT_DETECTION",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Google Vision API error:", errorText);
      throw new Error(`OCR error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const extractedText = visionData.responses?.[0]?.fullTextAnnotation?.text;

    if (!extractedText) {
      return jsonResponse(
        {
          error: "No text found in image",
          vaccines: [],
        },
        400
      );
    }

    // Step 2: Parse vaccination data using Google Gemini
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
                  text: `This is extracted text from a veterinary vaccination certificate. Extract ALL vaccination records from this text.

CRITICAL INSTRUCTIONS FOR DATE EXTRACTION:
1. Look for a two-column structure with:
   - Column 1: "Date de vaccination" / "Vaccination date" / "Given" / dates labeled "1."
   - Column 2: "Valable jusqu'au" / "Valid until" / "Valid till" / "Expiry" / "Expires" / dates labeled "2."

2. The document may be in French, English, or other languages. Common labels include:
   - French: "Date de vaccination" and "Valable jusqu'au"
   - English: "Vaccination date" and "Valid until"
   - The valid until date is often in the SECOND date column or marked with "2."

3. Date formats to handle:
   - DD/MM/YYYY (European format, e.g., 03/09/24 = September 3, 2024)
   - DD/MM/YY (e.g., 03/09/24 = September 3, 2024)
   - MM/DD/YYYY (US format)
   - YYYY-MM-DD (ISO format)

4. For EACH vaccine entry, extract:
   - name: The vaccine product name (e.g., "Nobivac L4", "Nobivac DHPPi", "Nobivac Rabies")
   - date: The date the vaccine was administered (YYYY-MM-DD format)
   - next_due_date: The "valid until" date from column 2 or field labeled "2." (YYYY-MM-DD format) - THIS IS MANDATORY, look carefully for it
   - clinic_name: Veterinary clinic name if visible
   - notes: Batch numbers, lot numbers, or other details

5. CRITICAL: If you see two dates next to each other, the FIRST is date (vaccination date) and the SECOND is next_due_date (valid until).

Return ONLY valid JSON (no markdown, no code blocks): { "vaccines": [{ "name": "...", "date": "YYYY-MM-DD", "next_due_date": "YYYY-MM-DD", "clinic_name": "...", "notes": "...", "document_url": "" }] }

Make absolutely sure to extract the next_due_date (valid until date) for every vaccine - it's the most important field!

Here is the extracted text:
${extractedText}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`AI parsing error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response
    let vaccines = [];
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        vaccines = parsed.vaccines || [];
      }
    } catch (e) {
      console.error("JSON parse error:", e);
      throw new Error("Failed to parse vaccination data");
    }

    console.log(
      `[Vaccination OCR] Successfully extracted ${vaccines.length} vaccines`
    );
    return jsonResponse({ vaccines });
  } catch (error) {
    console.error("[Vaccination OCR] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      400
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  Option 1: With direct image URL
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/vaccination-ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"imageUrl":"https://your-image-url.com/vaccination-cert.jpg"}'

  Option 2: With Supabase Storage bucket and path (automatically generates signed URL)
  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/vaccination-ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"vaccination-images","path":"pet-123/vaccine-cert.jpg"}'

*/
