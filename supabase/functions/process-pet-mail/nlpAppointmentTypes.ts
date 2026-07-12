export const NLP_APPOINTMENT_CATEGORIES = [
  "vet",
  "grooming",
  "walk",
  "boarding",
  "training",
  "unknown",
] as const;

export type NlpAppointmentCategory = (typeof NLP_APPOINTMENT_CATEGORIES)[number];

export type NlpAppointmentExtraction = {
  is_appointment_found: boolean;
  confidence_score: number;
  category: NlpAppointmentCategory;
  service_label: string;
  start_at: string | null;
  end_at: string | null;
  provider_name: string;
  notes: string | null;
};

export const NLP_CONFIDENCE_THRESHOLD = 0.85;
export const NLP_CALENDAR_INVITE_CONFIDENCE_THRESHOLD = 0.75;

export function emptyNlpExtraction(): NlpAppointmentExtraction {
  return {
    is_appointment_found: false,
    confidence_score: 0,
    category: "unknown",
    service_label: "",
    start_at: null,
    end_at: null,
    provider_name: "",
    notes: null,
  };
}

export function parseNlpAppointmentExtraction(raw: unknown): NlpAppointmentExtraction {
  if (!raw || typeof raw !== "object") return emptyNlpExtraction();
  const o = raw as Record<string, unknown>;

  const categoryRaw = typeof o.category === "string" ? o.category.toLowerCase() : "unknown";
  const category = (NLP_APPOINTMENT_CATEGORIES as readonly string[]).includes(categoryRaw)
    ? (categoryRaw as NlpAppointmentCategory)
    : "unknown";

  const confidence =
    typeof o.confidence_score === "number" && Number.isFinite(o.confidence_score)
      ? Math.min(1, Math.max(0, o.confidence_score))
      : 0;

  return {
    is_appointment_found: o.is_appointment_found === true,
    confidence_score: confidence,
    category,
    service_label: typeof o.service_label === "string" ? o.service_label.trim() : "",
    start_at: typeof o.start_at === "string" && o.start_at.trim() ? o.start_at.trim() : null,
    end_at: typeof o.end_at === "string" && o.end_at.trim() ? o.end_at.trim() : null,
    provider_name: typeof o.provider_name === "string" ? o.provider_name.trim() : "",
    notes:
      typeof o.notes === "string" && o.notes.trim() ? o.notes.trim().slice(0, 8000) : null,
  };
}

export function shouldPersistNlpExtraction(
  extraction: NlpAppointmentExtraction,
  options?: { calendarInviteContext?: boolean },
): boolean {
  const threshold = options?.calendarInviteContext
    ? NLP_CALENDAR_INVITE_CONFIDENCE_THRESHOLD
    : NLP_CONFIDENCE_THRESHOLD;
  return (
    extraction.is_appointment_found &&
    extraction.confidence_score >= threshold &&
    Boolean(extraction.start_at?.trim()) &&
    Boolean(extraction.service_label?.trim())
  );
}

export function formatServiceLabelForStorage(
  category: NlpAppointmentCategory,
  serviceLabel: string
): string {
  const label = serviceLabel.trim() || "Appointment";
  if (category === "unknown" || category === "vet") return label.slice(0, 300);
  const prefix = category.charAt(0).toUpperCase() + category.slice(1);
  if (label.toLowerCase().startsWith(prefix.toLowerCase())) return label.slice(0, 300);
  return `[${prefix}] ${label}`.slice(0, 300);
}

export function buildNlpEmailImportKey(messageId: string | null, fileKey: string): string {
  const id = (messageId ?? "").trim() || fileKey;
  return `nlp:${id}`;
}
