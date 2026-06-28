# Compliance & privacy backlog (engineering)

**Not legal advice.** Use with counsel for each market (US state laws, GDPR / UK GDPR, App Store, Google Play).

**Canonical compliance docs:** [`docs/compliance/`](compliance/)

## Data map (high level)

| Category | Examples in PawBuck | Typical processors |
|----------|---------------------|--------------------|
| Account | Email, OAuth ids, Supabase `auth.users` | Supabase |
| Pet health | Pets, meds, labs, vaccinations, clinical exams | Supabase, OCR Edge Functions |
| Messaging | Threads, Mailgun-related flows | Supabase, Mailgun |
| Location | Pawthon `walk_sessions` (GPS samples optional in `points`) | Device OS, Supabase |
| AI / Milo | Queries, embeddings, FAQ chunks | Google Gemini, Supabase |
| Scheduling | Booking metadata, `vet_bookings` | PawBuck.API, Vetstoria/EazyVet (when enabled) |
| Marketplace (future) | Provider profiles, service bookings | Supabase |

Full table-level inventory: [DATA-INVENTORY.md](compliance/DATA-INVENTORY.md) (CI drift guard in `DataInventoryDriftTests`).

## User rights (product + engineering)

- **Account deletion** — 7-day grace via Edge `delete-account` → `schedule_account_deletion`; hard purge via `AccountPurgeWorker` + `erase_user_data` RPC. Consumer: Profile → Delete account; cancel during grace. Web: [WEB-ACCOUNT-DELETION.md](compliance/WEB-ACCOUNT-DELETION.md).
- **Data export** — `POST /api/privacy/export` + `DataExportWorker`; Profile → Download my data; emailed signed link (7d).
- **Consent & transparency** — Privacy policy URL in app; store forms: [STORE-DATA-DISCLOSURES.md](compliance/STORE-DATA-DISCLOSURES.md).

## Retention (implemented defaults — confirm with counsel)

| Dataset | Default | Worker |
|---------|---------|--------|
| `walk_sessions.points` | 90 days → null | `RetentionWorker` |
| `processed_emails` | 180 days | `RetentionWorker` |
| `milo_journal_chat_turns` | 12 months | `RetentionWorker` |
| `analytics_events` | 14 months | `RetentionWorker` |
| Export files | 7 days | `RetentionWorker` + `data_export_requests.expires_at` |
| `account_deletion_log` | 24 months | `RetentionWorker` |

Admin observability: Command center → Retention jobs panel (`/api/support/retention/runs`).

## Store-specific reminders

- **Apple** — Account deletion in app; [STORE-DATA-DISCLOSURES.md](compliance/STORE-DATA-DISCLOSURES.md).
- **Google Play** — Data safety form; web deletion path documented.
- **Country rollout** — Terms, payment rules, and marketplace regulations before Rover-style transactions.

## Verification checklist

- [x] Engineering: `erase_user_data` RPC + purge worker + inventory CI guard
- [x] Engineering: async export API + worker + consumer UX
- [x] Engineering: retention jobs + admin panel
- [x] Docs: DPIA draft, RoPA template, subprocessors, store mapping
- [ ] Staging UAT: run [COMPLIANCE-UAT.md](compliance/COMPLIANCE-UAT.md) (sections 4–6) + [`scripts/compliance/verify-rpcs.sql`](../scripts/compliance/verify-rpcs.sql)
- [x] Engineering: production Gemini on **paid API tier** (Tier 1 · Prepay; verified 2026-06-28) — see [GEMINI-DATA-USE.md](compliance/GEMINI-DATA-USE.md)
- [ ] Confirm ECS + Supabase Edge use the **same paid** `GOOGLE_GEMINI_API_KEY` (not a dev free-tier key)
- [ ] Counsel sign-off: retention windows, Gemini DPA, DPIA/ROPA
- [ ] List all third-party subprocessors in **published** privacy policy
