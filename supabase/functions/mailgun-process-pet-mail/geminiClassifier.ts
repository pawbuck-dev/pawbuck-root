import { callGeminiAPI } from "../_shared/gemini-api";
import type { DocumentClassification, ParsedAttachment } from "./types.ts";

/**
 * Classifies pet health documents (Images & PDFs) using multimodal analysis.
 */
export async function classifyAttachment(
  attachment: ParsedAttachment,
  emailSubject: string,
  emailBody: string | null
): Promise<DocumentClassification> {
  // Strict schema ensures valid JSON every time
  const responseSchema = {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: [
          "medications",
          "lab_results",
          "clinical_exams",
          "vaccinations",
          "billing_invoice",
          "travel_certificate",
          "irrelevant",
        ],
      },
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["type", "confidence", "reasoning"],
  };

  try {
    const apiResult = await callGeminiAPI(
      {
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
      },
      "classifyAttachment"
    );

    const result = JSON.parse(apiResult.data.candidates[0].content.parts[0].text);

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

