# Compliance & privacy backlog (engineering)

**Not legal advice.** Use with counsel for each market (US state laws, GDPR / UK GDPR, App Store, Google Play).

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

## User rights (product + engineering)

- **Account deletion** — Consumer invokes Edge Function `delete-account` via [`invokeDeleteAccount`](../apps/consumer-app/services/accountDeletion.ts). Verify end-to-end in staging; document any retention exceptions (backups, logs).
- **Data export** — Define JSON export scope (pets, messages, bookings) and automate or document manual process per jurisdiction.
- **Consent & transparency** — Privacy policy URL in app; in-app disclosure for AI, location, and email ingestion; update **App Privacy** / **Data safety** forms when data practices change.

## Retention (defaults to decide)

- Raw OCR payloads / email bodies — align TTL with product need and DPA.
- `walk_sessions.points` — minimize or aggregate if not required long term.
- Analytics events — see `analytics_events` migration; set retention job.

## Store-specific reminders

- **Apple** — Account deletion in app; accurate privacy nutrition labels; justify background location if introduced.
- **Google Play** — Data safety form; account deletion parity.
- **Country rollout** — Terms, payment rules, and marketplace regulations (VAT, consumer rights, worker classification) before Rover-style transactions.

## Verification checklist

- [ ] Staging test: sign up → delete account → confirm auth + app data removed per policy.
- [ ] List all third-party subprocessors in privacy policy.
- [ ] DPIA / ROPA template for EU/UK if processing health-related data at scale.
