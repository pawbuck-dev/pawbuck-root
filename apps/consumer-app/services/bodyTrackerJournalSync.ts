import {
  peeNeedsObservationDetail,
  poopNeedsObservationDetail,
} from "@/constants/bodyTracker";
import type { DailyIntake } from "@/services/dailyIntake";
import { updateDailyIntake } from "@/services/dailyIntake";
import {
  createJournalEntry,
  deleteJournalEntry,
  updateJournalEntry,
} from "@/services/petJournal";
import type { QueryClient } from "@tanstack/react-query";

const JOURNAL_DOMAIN = "health" as const;
const JOURNAL_SUBTYPE = "elimination" as const;

export function formatPoopObservationJournalNote(
  intake: Pick<
    DailyIntake,
    | "poop_tags"
    | "poop_count"
    | "poop_target"
    | "poop_observation_note"
    | "poop_observation_photo_path"
  >,
  noteDraft: string
): string {
  const text = noteDraft.trim() || intake.poop_observation_note?.trim() || "";
  const lines: string[] = [
    "Body tracker — stool observation",
    `Logged today: ${intake.poop_count}/${intake.poop_target} bowel movements`,
  ];
  if (intake.poop_tags.length) {
    lines.push(`Tags: ${intake.poop_tags.join(", ")}`);
  }
  if (text) {
    lines.push(`Notes: ${text}`);
  }
  lines.push(
    intake.poop_observation_photo_path
      ? "Photo: saved with this entry in Body Tracker."
      : "Photo: none"
  );
  return lines.join("\n");
}

export function formatPeeObservationJournalNote(
  intake: Pick<
    DailyIntake,
    | "pee_tags"
    | "pee_count"
    | "pee_target"
    | "pee_observation_note"
    | "pee_observation_photo_path"
  >,
  noteDraft: string
): string {
  const text = noteDraft.trim() || intake.pee_observation_note?.trim() || "";
  const lines: string[] = [
    "Body tracker — urine observation",
    `Logged today: ${intake.pee_count}/${intake.pee_target} urinations`,
  ];
  if (intake.pee_tags.length) {
    lines.push(`Tags: ${intake.pee_tags.join(", ")}`);
  }
  if (text) {
    lines.push(`Notes: ${text}`);
  }
  lines.push(
    intake.pee_observation_photo_path
      ? "Photo: saved with this entry in Body Tracker."
      : "Photo: none"
  );
  return lines.join("\n");
}

async function safeDeleteJournalEntry(id: string): Promise<void> {
  try {
    await deleteJournalEntry(id);
  } catch {
    /* row may already be gone */
  }
}

function patchIntakeCache(
  queryClient: QueryClient,
  intakeQueryKey: readonly unknown[],
  row: DailyIntake
) {
  queryClient.setQueryData<DailyIntake>(intakeQueryKey, row);
}

/**
 * Keeps Pet Journal in sync with Body Tracker elimination observations that use concern tags.
 * Call after relevant daily_intake fields change (debounced from the Body Tracker UI).
 * Patches daily_intake cache when linking/unlinking journal rows (avoids refetch loops).
 */
export async function syncBodyTrackerObservationJournals(
  petId: string,
  intake: DailyIntake,
  poopNoteDraft: string,
  peeNoteDraft: string,
  queryClient: QueryClient,
  intakeQueryKey: readonly unknown[]
): Promise<void> {
  if (!poopNeedsObservationDetail(intake.poop_tags)) {
    if (intake.poop_journal_entry_id) {
      await safeDeleteJournalEntry(intake.poop_journal_entry_id);
      const row = await updateDailyIntake(petId, { poop_journal_entry_id: null });
      patchIntakeCache(queryClient, intakeQueryKey, row);
    }
  } else {
    const note = formatPoopObservationJournalNote(intake, poopNoteDraft);
    if (intake.poop_journal_entry_id) {
      await updateJournalEntry(intake.poop_journal_entry_id, {
        note,
        vet_flagged: true,
        domain: JOURNAL_DOMAIN,
        subtype: JOURNAL_SUBTYPE,
        entry_date: intake.date,
      });
    } else {
      const row = await createJournalEntry({
        pet_id: petId,
        domain: JOURNAL_DOMAIN,
        subtype: JOURNAL_SUBTYPE,
        note,
        vet_flagged: true,
        entry_date: intake.date,
      });
      const updated = await updateDailyIntake(petId, { poop_journal_entry_id: row.id });
      patchIntakeCache(queryClient, intakeQueryKey, updated);
    }
  }

  const latest =
    queryClient.getQueryData<DailyIntake>(intakeQueryKey) ?? intake;

  if (!peeNeedsObservationDetail(latest.pee_tags)) {
    if (latest.pee_journal_entry_id) {
      await safeDeleteJournalEntry(latest.pee_journal_entry_id);
      const row = await updateDailyIntake(petId, { pee_journal_entry_id: null });
      patchIntakeCache(queryClient, intakeQueryKey, row);
    }
  } else {
    const note = formatPeeObservationJournalNote(latest, peeNoteDraft);
    if (latest.pee_journal_entry_id) {
      await updateJournalEntry(latest.pee_journal_entry_id, {
        note,
        vet_flagged: true,
        domain: JOURNAL_DOMAIN,
        subtype: JOURNAL_SUBTYPE,
        entry_date: latest.date,
      });
    } else {
      const row = await createJournalEntry({
        pet_id: petId,
        domain: JOURNAL_DOMAIN,
        subtype: JOURNAL_SUBTYPE,
        note,
        vet_flagged: true,
        entry_date: latest.date,
      });
      const updated = await updateDailyIntake(petId, { pee_journal_entry_id: row.id });
      patchIntakeCache(queryClient, intakeQueryKey, updated);
    }
  }
}
