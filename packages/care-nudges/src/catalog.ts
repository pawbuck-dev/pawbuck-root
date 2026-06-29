import type { CareNudgeChannel, CareNudgeKind } from "./types";

export type CareNudgeCatalogEntry = {
  kind: CareNudgeKind;
  priority: number;
  channels: CareNudgeChannel[];
  /** Server push in Phase B (missing_required waits until Phase D). */
  pushInPhaseB: boolean;
};

export const CARE_NUDGE_CATALOG: Record<CareNudgeKind, CareNudgeCatalogEntry> = {
  vac_overdue: { kind: "vac_overdue", priority: 10, channels: ["in_app", "push"], pushInPhaseB: true },
  vac_due_soon: { kind: "vac_due_soon", priority: 30, channels: ["in_app", "local"], pushInPhaseB: false },
  vac_missing_required: {
    kind: "vac_missing_required",
    priority: 20,
    channels: ["in_app"],
    pushInPhaseB: false,
  },
  med_due_today: { kind: "med_due_today", priority: 40, channels: ["in_app", "local"], pushInPhaseB: false },
  vet_appt_24h: { kind: "vet_appt_24h", priority: 25, channels: ["in_app", "push"], pushInPhaseB: true },
  vet_appt_1h: { kind: "vet_appt_1h", priority: 5, channels: ["in_app", "push"], pushInPhaseB: true },
  doc_expiry: { kind: "doc_expiry", priority: 35, channels: ["in_app", "push"], pushInPhaseB: true },
  journal_prompt: { kind: "journal_prompt", priority: 80, channels: ["in_app", "local"], pushInPhaseB: false },
  senior_mobility_tip: {
    kind: "senior_mobility_tip",
    priority: 70,
    channels: ["push"],
    pushInPhaseB: true,
  },
  pawthon_streak: { kind: "pawthon_streak", priority: 75, channels: ["in_app", "local"], pushInPhaseB: false },
};

export const DEFAULT_MAX_CLINICAL_PUSHES_PER_USER_PER_DAY = 3;
