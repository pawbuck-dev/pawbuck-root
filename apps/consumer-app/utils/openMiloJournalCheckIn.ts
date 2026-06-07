import type { JournalDomain } from "@/constants/petJournal";
import type { Router } from "expo-router";

/** Auto-sent on Milo journal screen when opened from home “Check in with Milo”. */
export const MILO_JOURNAL_CHECK_IN_START_MESSAGE =
  "I'd like to log a health check-in for today";

type OpenMiloJournalCheckInOptions = {
  journalDomain?: JournalDomain;
};

export function openMiloJournalCheckIn(
  router: Router,
  petId: string,
  options?: OpenMiloJournalCheckInOptions
): void {
  router.push({
    pathname: "/(home)/milo",
    params: {
      pet: petId,
      journalStart: "1",
      ...(options?.journalDomain ? { journalDomain: options.journalDomain } : {}),
    },
  } as any);
}
