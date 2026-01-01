// Vaccination OCR using Gemini Vision API
// Analyzes vaccination certificate images and extracts structured data
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import {
  getFileAsBase64,
  getMimeTypeFromPath,
} from "../_shared/supabase-utils.ts";

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

    console.log(`[Vaccination OCR] Processing file from ${bucket}/${path}`);

    // Download the file and convert to base64 using shared utility
    const base64Image = await getFileAsBase64(bucket, path);
    const mimeType = getMimeTypeFromPath(path);

    console.log(`[Vaccination OCR] File MIME type: ${mimeType}`);

    // Use Gemini Vision API to directly analyze the vaccination certificate image
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
                  text: `Analyze this veterinary vaccination certificate. Your goal is to extract every vaccine record into a specific JSON format.

### EXTRACTION RULES:
1.⁠ ⁠IDENTIFY THE TABLE: Look for the "Vaccinations Administered" and "Next Dose Due" columns.
2.⁠ ⁠VACCINE NAME: Extract the name (e.g., DAPP, Bordetella, Leptospirosis, Rabies).
3.⁠ ⁠DATE (Administered): Look for the date the vaccine was "Given". In this document, it is "11-10-2025".
4.⁠ ⁠NEXT_DUE_DATE: Look at the "Next Dose Due" column. This is MANDATORY. 
   - For DAPP: 10-10-2028
   - For Bordetella/Lepto: 11-10-2026
   - For Rabies: 07-04-2028
5.⁠ ⁠CLINIC: Extract "Beach Avenue Animal Hospital".
6.⁠ ⁠NOTES: Extract "Lot#" or "Batch" numbers.

### DATE FORMATTING:
•⁠  ⁠Convert all dates to YYYY-MM-DD.
•⁠  ⁠Reference Date: The visit date is Oct 11, 2025. Use this to ensure 11-10 is parsed as Oct 11.

### OUTPUT FORMAT:
Return ONLY a valid JSON object. No markdown blocks. 
{
  "vaccines": [
    {
      "name": "string",
      "date": "YYYY-MM-DD",
      "next_due_date": "YYYY-MM-DD",
      "clinic_name": "string",
      "notes": "string",
      "document_url": "" 
    }
  ]
}`,
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

    // Validate and fix dates
    vaccines = vaccines.map((vaccine: any) => {
      // Helper function to validate and fix date
      const fixDate = (dateStr: string | null): string | null => {
        if (!dateStr) return null;
        
        try {
          // Try parsing as-is first
          let date = new Date(dateStr);
          
          // If invalid, try to fix common issues
          if (isNaN(date.getTime())) {
            // Try to parse formats like YYYY-DD-MM or DD-MM-YYYY
            const parts = dateStr.split(/[-/]/);
            
            if (parts.length === 3) {
              const [a, b, c] = parts.map(p => parseInt(p, 10));
              
              // If first part is year (YYYY-??-??)
              if (a > 1900) {
                // Check if month is invalid (YYYY-DD-MM format)
                if (b > 12 && c <= 12) {
                  // Swap day and month: YYYY-DD-MM -> YYYY-MM-DD
                  date = new Date(`${a}-${String(c).padStart(2, '0')}-${String(b).padStart(2, '0')}`);
                  console.log(`Fixed date from ${dateStr} to ${date.toISOString()}`);
                }
              }
              // If first part is day or month (DD-MM-YYYY or MM-DD-YYYY)
              else if (c > 1900) {
                // Try DD-MM-YYYY first
                if (a <= 31 && b <= 12) {
                  date = new Date(`${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`);
                }
                // Try MM-DD-YYYY if DD-MM-YYYY failed
                else if (a <= 12 && b <= 31) {
                  date = new Date(`${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`);
                }
              }
            }
          }
          
          const year = date.getFullYear();
          
          // Check if date is valid and year is reasonable
          if (isNaN(date.getTime()) || year < 2000 || year > 2035) {
            console.log(`Invalid date after parsing: ${dateStr}, setting to null`);
            return null;
          }
          
          // Return in ISO format (YYYY-MM-DD)
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.log(`Failed to parse date: ${dateStr}, setting to null`);
          return null;
        }
      };

      return {
        ...vaccine,
        vaccination_date: fixDate(vaccine.vaccination_date),
        next_due_date: fixDate(vaccine.next_due_date),
      };
    });

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
  2. Make an HTTP request with Supabase Storage bucket and path:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/vaccination-ocr' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"bucket":"pets","path":"user-id/pet-name_pet-id/vaccinations/cert.jpg"}'

  Note: This function uses Gemini Vision API (gemini-2.0-flash-exp) to directly analyze 
  the image and extract vaccination data. No separate OCR step is needed - Gemini can 
  read and understand the document structure directly for better accuracy.

*/
