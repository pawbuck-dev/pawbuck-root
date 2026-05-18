import { callGeminiAPI } from "../_shared/gemini-api.ts";
import {
  emptyNlpExtraction,
  NLP_APPOINTMENT_CATEGORIES,
  parseNlpAppointmentExtraction,
  type NlpAppointmentExtraction,
} from "./nlpAppointmentTypes.ts";
import { resolveEmailBodyForNlp } from "./emailBodyForNlp.ts";
import type { ParsedEmail, Pet } from "./types.ts";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    is_appointment_found: {
      type: "boolean",
      description:
        "True only for a confirmed upcoming appointment. False for tentative proposals, questions, past receipts, or general chatter.",
    },
    confidence_score: {
      type: "number",
      description: "Confidence from 0.0 to 1.0 that this is a real confirmed upcoming appointment.",
    },
    category: {
      type: "string",
      enum: [...NLP_APPOINTMENT_CATEGORIES],
    },
    service_label: {
      type: "string",
      description: "Short human-readable title, e.g. Full grooming and nail trim",
    },
    start_at: {
      type: "string",
      description:
        "Local wall datetime in ISO-like form WITHOUT timezone offset, e.g. 2026-05-19T16:00:00. Null if unknown.",
    },
    end_at: {
      type: "string",
      description:
        "Local wall end datetime without offset, or null to use default duration by category.",
    },
    provider_name: {
      type: "string",
      description: "Business, clinic, groomer, or walker name.",
    },
    notes: {
      type: "string",
      description: "Operational instructions from the email, or null.",
    },
  },
  required: [
    "is_appointment_found",
    "confidence_score",
    "category",
    "service_label",
    "start_at",
    "end_at",
    "provider_name",
    "notes",
  ],
};

export type ExtractNlpAppointmentParams = {
  parsedEmail: ParsedEmail;
  pet: Pet;
  senderEmail: string;
  homeTimezone: string;
  referenceYear: number;
};

export async function extractNlpAppointmentFromEmail(
  params: ExtractNlpAppointmentParams
): Promise<NlpAppointmentExtraction> {
  const body = resolveEmailBodyForNlp(params.parsedEmail);
  if (!body) return emptyNlpExtraction();

  const emailDate = params.parsedEmail.date ?? new Date().toISOString();
  const prompt = `You extract confirmed upcoming pet care appointments from inbound email text.

Rules:
- Reference year is ${params.referenceYear}. Email received: ${emailDate}.
- Pet: ${params.pet.name}. Pet home timezone for wall times: ${params.homeTimezone}.
- Sender: ${params.senderEmail}
- Subject: ${params.parsedEmail.subject || "(no subject)"}

Set is_appointment_found TRUE only when the message clearly confirms a specific future appointment with a date and time (or date with explicit time like "4PM").
Set FALSE for: past visit receipts, vaccine records without a scheduled visit, "let me know if Tuesday works", marketing, invoices, general questions, or cancelled appointments.

Category hints:
- vet: clinic, exam, vaccine booster at clinic, surgery
- grooming: bath, groom, nails, deshed
- walk: dog walk, walker
- boarding: kennel, board, stay
- training: trainer, obedience class
- unknown: pet event that does not fit above

Output start_at and end_at as LOCAL wall datetimes WITHOUT timezone offset (YYYY-MM-DDTHH:mm:ss). Use ${params.referenceYear} when the year is missing from the text.

Email body:
---
${body}
---`;

  try {
    const apiResult = await callGeminiAPI(
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json",
          response_schema: RESPONSE_SCHEMA,
        },
      },
      "extractNlpAppointmentFromEmail"
    );

    const text = apiResult.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      console.warn("[nlpAppointmentExtractor] empty Gemini response");
      return emptyNlpExtraction();
    }

    const parsed = parseNlpAppointmentExtraction(JSON.parse(text));
    console.log(
      `[nlpAppointmentExtractor] found=${parsed.is_appointment_found} confidence=${parsed.confidence_score} category=${parsed.category}`
    );
    return parsed;
  } catch (e) {
    console.error("[nlpAppointmentExtractor] failed", e);
    return emptyNlpExtraction();
  }
}
