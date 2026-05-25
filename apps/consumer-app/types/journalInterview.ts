export type JournalInterviewPhase =
  | "context_surface"
  | "question"
  | "summary_draft"
  | "complete";

export type JournalContextSurfaceLine = {
  kind: "ok" | "warn" | "gap";
  text: string;
};

export type JournalContextSurfaceAction = {
  id: string;
  label: string;
};

export type JournalContextSurface = {
  lines: JournalContextSurfaceLine[];
  actions: JournalContextSurfaceAction[];
  adrWarning?: string | null;
  confidence?: number;
  sparseRecord?: boolean;
  puppyGiWarning?: string | null;
  brachyWarning?: string | null;
};

export type JournalStructuredSummary = {
  fields: Record<string, string>;
  redFlags?: string[];
  attachmentHint?: boolean;
  confidenceScore?: number | null;
  lowConfidence?: boolean;
};

export type JournalChipOption = {
  id: string;
  label: string;
  drilldownPrompt?: string;
  drilldownOptional?: boolean;
};

export type JournalCurrentQuestion = {
  id: string;
  type: "single" | "multi" | "two_stage" | "freeform";
  prompt: string;
  options: JournalChipOption[];
  stage1Options?: JournalChipOption[];
  stage2Options?: JournalChipOption[];
  allowMulti?: boolean;
};

export type JournalInterviewMetadata = {
  tree_id: string;
  tree_version: string;
  structured_fields: Record<string, string>;
  ai_confidence?: number | null;
  source: "ai_tree_v1.5";
  session_id?: string;
  turn_id?: string;
  attachment_paths?: string[];
};

export function parseInterviewMetadata(raw: unknown): JournalInterviewMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.tree_id !== "string" || typeof o.structured_fields !== "object" || !o.structured_fields) {
    return null;
  }
  return {
    tree_id: o.tree_id,
    tree_version: typeof o.tree_version === "string" ? o.tree_version : "1.5.0",
    structured_fields: o.structured_fields as Record<string, string>,
    ai_confidence: typeof o.ai_confidence === "number" ? o.ai_confidence : null,
    source: "ai_tree_v1.5",
    session_id: typeof o.session_id === "string" ? o.session_id : undefined,
    turn_id: typeof o.turn_id === "string" ? o.turn_id : undefined,
    attachment_paths: Array.isArray(o.attachment_paths)
      ? o.attachment_paths.filter((p): p is string => typeof p === "string")
      : undefined,
  };
}

export function isTreeInterviewUxEnabled(
  envFlag: boolean,
  apiTreeId?: string | null,
  apiPhase?: JournalInterviewPhase | null
): boolean {
  return envFlag || !!apiTreeId || !!apiPhase;
}

/** Maps quick-start chip label to API tree id when tree interview is enabled. */
export const JOURNAL_TREE_ID_BY_CHIP: Record<string, string> = {
  "Lethargic today": "lethargy_v1.5",
  "Changed appetite": "appetite_v1.5",
  "Vomiting or diarrhea": "vomiting_v1.5",
  "Scratching a lot": "itching_v1.5",
  "Limping": "limping_v1.5",
  "Coughing": "cough_v1.5",
  "Eye or ear issue": "eye_ear_v1.5",
};

export function resolveJournalTreeId(text: string): string | undefined {
  const t = text.trim();
  if (JOURNAL_TREE_ID_BY_CHIP[t]) return JOURNAL_TREE_ID_BY_CHIP[t];
  const lower = t.toLowerCase();
  if (lower.includes("vomit") || lower.includes("diarr")) return "vomiting_v1.5";
  if (lower.includes("letharg")) return "lethargy_v1.5";
  if (lower.includes("appetite") || lower.includes("off food")) return "appetite_v1.5";
  if (lower.includes("itch") || lower.includes("scratch")) return "itching_v1.5";
  if (lower.includes("limp")) return "limping_v1.5";
  if (lower.includes("cough") || lower.includes("breath")) return "cough_v1.5";
  if (lower.includes("eye") || lower.includes("ear")) return "eye_ear_v1.5";
  if (lower.includes("walk") || lower.includes("went for a walk")) return "walk_v1.5";
  if (lower.includes("meal") || lower.includes("ate") || lower.includes("food log")) return "meal_v1.5";
  if (lower.includes("behavior") || lower.includes("acted")) return "behavior_log_v1.5";
  return undefined;
}

export const JOURNAL_TREE_INTERVIEW_ENABLED =
  process.env.EXPO_PUBLIC_JOURNAL_TREE_INTERVIEW === "true";

/** Map context-surface button label (or id) to API journalAction. */
export function resolveContextSurfaceJournalAction(
  text: string,
  surface?: JournalContextSurface | null
): string | undefined {
  if (!surface?.actions?.length) return undefined;
  const t = text.trim().toLowerCase();
  const match = surface.actions.find(
    (a) => a.id.toLowerCase() === t || a.label.trim().toLowerCase() === t
  );
  return match?.id;
}
