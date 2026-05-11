/**
 * Subset of PawBuck Vet Notification Format spec §4 (JSON for Milo / client compose).
 * Field names match API `MiloChatResponse` / journal Gemini JSON.
 */

export type VetTriageLevel = "fyi" | "soon" | "advice" | "emergency";

export type VetNotificationObservation = {
  taxonomy?: string;
  displayLabel?: string;
  primaryChip?: string;
  userText?: string;
  onset?: string;
  frequency?: string;
  severity?: string;
  trend?: string;
  onsetContext?: string;
  /** ISO yyyy-MM-dd when anchored at write time */
  onsetDate?: string;
  /** e.g. approximate */
  onsetPrecision?: string;
  redFlags?: string[];
};

export type VetNotificationTriage = {
  level: VetTriageLevel;
  rationale?: string;
  confidence?: number;
  redFlagsRuledOut?: string[];
};

export type VetNotificationPayload = {
  triage?: VetNotificationTriage;
  observations?: VetNotificationObservation[];
  negativeFindings?: string[];
  askLine?: string;
};

export type VetMedicalContext = {
  lastVisitDate?: string;
  lastVisitLabel?: string;
  /** e.g. "Current" | "Lapsed" */
  vaccinesStatus?: string;
  vaccinesDetail?: string;
  medicationsLine?: string;
  allergiesLine?: string;
  insuranceLine?: string;
  weightTrendSummary?: string;
};

export type VetOwnerContact = {
  phone?: string;
  email?: string;
  /** e.g. "Email reply" | "Phone callback before 18:00 PT" */
  preferredContactLine?: string;
};
