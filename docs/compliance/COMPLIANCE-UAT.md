# Compliance UAT runbook

Manual staging/production verification for account deletion, data export, retention, and pricing v1.5 enforcement. **Not legal sign-off** — counsel items tracked in [COMPLIANCE-BACKLOG.md](../COMPLIANCE-BACKLOG.md).

## Prerequisites

- Supabase CLI linked to staging (or production with change window)
- ECS API deployed with compliance workers enabled
- Edge Functions deploy access
- Two test accounts: one populated with pets/health/walks, one admin/support

## 1. Migrations applied

```bash
cd supabase && supabase db push
# or apply pending migrations in Dashboard SQL editor
```

**Pass:** Run [`scripts/compliance/verify-rpcs.sql`](../../scripts/compliance/verify-rpcs.sql) — functions `erase_user_data`, `schedule_account_deletion`, `cancel_scheduled_account_deletion`, `get_user_document_count`, pricing v1.5 tables exist.

## 2. Edge `delete-account` deployed

```bash
supabase functions deploy delete-account
```

**Pass:**

- `POST` schedule returns `purge_after` (~7 days)
- `POST` cancel clears scheduled deletion
- User can **sign in during grace** and cancel from Profile (no auth ban)

## 3. ECS environment

Verify task definition (see [AWS.md](../AWS.md)):

| Variable | Required |
|----------|----------|
| `Supabase__ConnectionString` | Yes |
| `Supabase__ServiceRoleKey` | Yes |
| `Subscription__EnforceMiloConversationCap` | `true` |
| `Subscription__EnforceAiJournalCap` | `true` |
| Mailgun / export bucket vars | For export email |

**Pass:** `GET https://api.pawbuck.com/api/health` → `supabaseServiceRoleConfigured: true`

## 4. Account deletion (grace + purge)

1. Sign in on consumer app → Profile → Delete account → confirm.
2. Verify `account_deletion_requests` row with future `purge_after`.
3. Sign out and sign in again — **must succeed**; Profile shows cancel deletion.
4. (Staging) Backdate `purge_after` or wait grace period.
5. Confirm `AccountPurgeWorker` runs; user rows gone from inventoried tables; `account_deletion_log` entry.

**Pass:** Zero residual PII for test user; audit log records purge.

## 5. Data export

1. Profile → Download my data (or `POST /api/privacy/export` with user JWT).
2. Wait for email; open signed link within TTL.
3. Validate JSON bundle sections (pets, health, preferences).

**Pass:** Export completes; link expires per policy.

## 6. Retention smoke

1. Admin → Command center → Retention jobs panel shows recent runs.
2. (Optional) Insert old walk with `points`; after worker cycle, `points` nulled and `points_pruned_at` set.

**Pass:** `retention_job_runs` rows with `succeeded` status.

## 7. Monetization caps (staging)

With local or staging Supabase:

```bash
pnpm run subscription-limits:integration
```

Manual spot-check: Free user blocked at 2nd pet, 11th document, Milo/journal caps via app.

## Legal / store (non-code)

- [ ] Counsel TTL sign-off on retention windows
- [ ] Published privacy policy lists [SUBPROCESSORS.md](SUBPROCESSORS.md)
- [ ] App Store / Play data forms updated per [STORE-DATA-DISCLOSURES.md](STORE-DATA-DISCLOSURES.md)

## Rollback notes

- Migrations are additive; rollback requires forward-fix migration.
- Disable workers via `AccountPurge__Enabled=false`, `PrivacyExport__Enabled=false`, `Retention__Enabled=false` in ECS if needed.
