# Notifications strategy 5.4 — implementation audit

## Baseline (pre-change)

| Area | Mechanism | Finding |
|------|-----------|---------|
| Medications | Expo local (`expo-notifications`) | Scheduled per medicine frequency; IDs in AsyncStorage. |
| Vaccinations | Expo local | **Single** reminder: `next_due_date` minus `user_preferences.vaccination_reminder_days` (default 14), fire at **9:00** local. **Not** 30 / 7 / day-of matrix. |
| Insurance / travel | None | No local or Edge scheduler tied to `pet_documents` or insurance copy. In-app **DocumentCard** shows Milo `extracted_json` only. |
| Vet appointments | None | `vet_bookings.start_utc` persisted; **no** T-24h / T-1h push or local reminders in repo. |
| Daily journal | None | No daily journal nudge. |
| Server push | `_shared/notification.ts` + `push_tokens` | Used for pet mail, pet-family activity, transfers, etc. |

## Product note (“PetPlan Gold … already triggers”)

No code path in this repository was found that sends push or local notifications specifically for insurance policy expiry. If that behavior exists elsewhere (marketing automation, manual test, or another service), treat it as external; this implementation adds **explicit** document-expiry reminders without removing other systems.

## Gaps addressed by 5.4 implementation

- Multi-stage vaccine local reminders (30 / 7 / day-of).
- Configurable daily journal prompt (local), default 8 PM.
- Document expiry reminders (insurance + travel certificates) via Edge + idempotency tables.
- Vet appointment reminders (24h and 1h) via Edge + idempotency table.
- Deep links from notification tap for new payload shapes.

## Operations

- Configure Supabase **scheduled invocation** (e.g. every 15–60 minutes) of Edge Function `scheduled-care-reminders` with secret `SCHEDULED_CARE_REMINDERS_SECRET`. See [SUPABASE.md](./SUPABASE.md).

## Compliance

Health-related nudges (vaccines, documents, journal) are **user-configurable** in Profile under **Reminders**; server pushes respect `document_expiry_push_enabled` and `vet_appointment_reminder_push_enabled`. Align copy and retention with [COMPLIANCE-BACKLOG.md](./COMPLIANCE-BACKLOG.md) when product text changes.

## Manual QA checklist

- Profile **Reminders**: toggle journal, change evening hour, confirm local reschedule (device notification list).
- Tap a **vaccination** local notification → opens vaccinations tab.
- Tap **journal_prompt** notification → opens pet journal with correct `petId`.
- Deploy Edge `scheduled-care-reminders`, set secret, run one POST; confirm dedupe tables prevent duplicate pushes on repeat.
- **Vet**: booking with `start_utc` in 23–25h and 50–70m windows (test project) receives at most one push per window.
