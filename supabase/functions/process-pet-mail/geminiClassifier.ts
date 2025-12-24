import type { DocumentClassification, ParsedAttachment } from "./types.ts";

/**
 * Classifies an attachment using Gemini AI to determine document type
 */
export async function classifyAttachment(
  attachment: ParsedAttachment,
  emailSubject: string,
  emailBody: string | null
): Promise<DocumentClassification> {
  const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

  if (!GOOGLE_GEMINI_API_KEY) {
    throw new Error("GOOGLE_GEMINI_API_KEY not configured");
  }

  console.log(`Classifying attachment: ${attachment.filename}`);

  // Prepare context for Gemini
  const context = `
Email Subject: ${emailSubject}
Email Body Preview: ${emailBody?.substring(0, 500) || "N/A"}
Attachment Filename: ${attachment.filename}
Attachment MIME Type: ${attachment.mimeType}
Attachment Size: ${attachment.size} bytes
  `.trim();

  try {
    const response = await fetch(
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
                  text: `You are a pet health document classifier. Analyze the following email and attachment information to classify the document type.

${context}

Classify this attachment into ONE of these categories:
1. "medications" - Prescription documents, medication lists, pharmacy receipts
2. "lab_results" - Laboratory test results, blood work, urinalysis, pathology reports
3. "clinical_exams" - Veterinary examination records, checkup notes, health certificates, travel certificates
4. "vaccinations" - Vaccination certificates, immunization records
5. "irrelevant" - Not related to pet health records (invoices, appointment reminders, marketing emails)

Consider:
- File name patterns (e.g., "prescription.pdf", "lab_results.pdf", "vaccination_card.pdf")
- Email subject context
- MIME type (PDF, image, etc.)

Respond with a JSON object containing:
- "type": one of the categories above
- "confidence": a number between 0 and 1 (e.g., 0.95)
- "reasoning": brief explanation of your classification

Example response:
{
  "type": "medications",
  "confidence": 0.92,
  "reasoning": "Filename contains 'prescription' and email subject mentions medication"
}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract the text response
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!textResponse) {
      throw new Error("No response from Gemini AI");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonText = textResponse.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const classification = JSON.parse(jsonText);

    // Validate response
    const validTypes = [
      "medications",
      "lab_results",
      "clinical_exams",
      "vaccinations",
      "irrelevant",
    ];
    if (!validTypes.includes(classification.type)) {
      console.warn(
        `Invalid classification type: ${classification.type}, defaulting to irrelevant`
      );
      classification.type = "irrelevant";
      classification.confidence = 0.5;
    }

    console.log(
      `Classification: ${classification.type} (confidence: ${classification.confidence})`
    );

    return classification as DocumentClassification;
  } catch (error) {
    console.error("Error classifying attachment:", error);
    // Return default classification on error
    return {
      type: "irrelevant",
      confidence: 0,
      reasoning: `Classification failed: ${error.message}`,
    };
  }
}
