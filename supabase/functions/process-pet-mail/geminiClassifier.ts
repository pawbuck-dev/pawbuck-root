import type { DocumentClassification, ParsedAttachment } from "./types.ts";

/**
 * Classifies pet health documents (Images & PDFs) using multimodal analysis.
 */
export async function classifyAttachment(
  attachment: ParsedAttachment,
  emailSubject: string,
  emailBody: string | null
): Promise<DocumentClassification> {
  const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
  if (!GOOGLE_GEMINI_API_KEY) throw new Error("API Key not configured");

  // Strict schema ensures valid JSON every time
  const responseSchema = {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["medications", "lab_results", "clinical_exams", "vaccinations", "irrelevant"],
      },
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["type", "confidence", "reasoning"],
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a veterinary records expert. Classify the attached document (which may be an image or a multi-page PDF). 
                  
                  Context:
                  - Subject: ${emailSubject}
                  - Filename: ${attachment.filename}`,
                },
                {
                  inline_data: {
                    // This will now handle 'application/pdf' or 'image/jpeg/png'
                    mime_type: attachment.mimeType, 
                    data: attachment.content,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: "application/json",
            response_schema: responseSchema,
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);

    return result as DocumentClassification;
  } catch (error) {
    console.error("Classification error:", error);
    return {
      type: "irrelevant",
      confidence: 0,
      reasoning: "Failed to process document.",
    };
  }
}