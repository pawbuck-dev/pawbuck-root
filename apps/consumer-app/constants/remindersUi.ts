/** User-facing copy + helpers for Profile → Reminders. */

export const EVENING_JOURNAL_HOURS = [
  { hour: 17, label: "5 PM" },
  { hour: 18, label: "6 PM" },
  { hour: 19, label: "7 PM" },
  { hour: 20, label: "8 PM" },
  { hour: 21, label: "9 PM" },
  { hour: 22, label: "10 PM" },
] as const;

export function formatJournalHourLabel(hour: number): string {
  return EVENING_JOURNAL_HOURS.find((slot) => slot.hour === hour)?.label ?? "8 PM";
}

type ReminderPrefsSummary = {
  journal_prompt_enabled?: boolean | null;
  journal_prompt_hour?: number | null;
  document_expiry_push_enabled?: boolean | null;
  vet_appointment_reminder_push_enabled?: boolean | null;
};

/** One-line subtitle for the Profile reminders row. */
export function formatRemindersProfileSubtitle(prefs: ReminderPrefsSummary | null | undefined): string {
  const journalOn = prefs?.journal_prompt_enabled ?? true;
  const docPush = prefs?.document_expiry_push_enabled ?? true;
  const vetPush = prefs?.vet_appointment_reminder_push_enabled ?? true;
  const pushCount = [docPush, vetPush].filter(Boolean).length;

  const journalPart = journalOn
    ? `Journal at ${formatJournalHourLabel(prefs?.journal_prompt_hour ?? 20)}`
    : "Journal off";

  const pushPart =
    pushCount === 0
      ? "Push alerts off"
      : pushCount === 2
        ? "Expiry & vet alerts on"
        : docPush
          ? "Expiry alerts on"
          : "Vet alerts on";

  return `${journalPart} · ${pushPart}`;
}
