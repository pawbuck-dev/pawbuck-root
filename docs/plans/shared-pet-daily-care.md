# Shared pet daily care (Today + body tracker) — product & implementation plan

**Status:** Active (Phase 1–4 shipped in `20260623120000_shared_pet_daily_care.sql` + consumer app)  
**Owner:** Consumer app + Supabase  
**Related:** [06-family-sharing.md](../pawbuck-product-help/06-family-sharing.md), [family-sharing-recipient-journeys.md](./family-sharing-recipient-journeys.md), [TESTING_FAMILY_SHARING.md](../TESTING_FAMILY_SHARING.md)

## Problem statement

Family sharing grants access to the **same pet**, but **Today** (meals, water, poop, pee) is stored per **logged-in user**, not per **pet**. Household members see empty rings and different targets while the owner sees real data.

This breaks the product promise (“care for Milo together”), confuses co-parents, and produces **clinically misleading** intake/output when one caregiver thinks nothing was logged.

**Walk distance and walk streak are already pet-scoped** (`walk_sessions` filtered by `pet_id`; streak computed from all sessions for that pet). The gap is **daily intake/output** (and related body-tracker tables still owner-only in RLS).

## Product decision (locked)

| Data | Scope | Rationale |
|------|--------|-----------|
| Today rings (food, water, poop, pee) | **Per pet, per calendar day** | Vet and owner ask “how is *the pet* doing today?” |
| Daily targets (meals/day, cups water) | **Pet settings** (`pets.intake_*`) | One care plan per animal |
| Walk distance + daily goal | **Per pet** (already) | Any household member can walk the same dog |
| Walk streak | **Per pet** (already in code; reinforce in copy) | Pet health habit, not personal fitness |
| Who tapped the ring | **Audit optional** (`last_updated_by`) | Support/debug; not shown in v1 UI |
| Milo usage, subscription, notifications | **Per user** | Account-level |

## Role matrix (align with `pet_family_grants`)

Uses existing helpers: `get_user_pet_role`, `user_can_access_pet`, `user_can_write_pet_health`.

| Role | View Today / body tracker | Log meals, water, output | Edit intake targets on pet |
|------|---------------------------|--------------------------|----------------------------|
| Owner | Yes | Yes | Yes |
| Admin | Yes | Yes | Yes |
| Contributor | Yes | Yes | No (owner/admin only) |
| View only | Yes | No (rings disabled / toast) | No |

**Write path:** `user_can_write_pet_health(pet_id)` (owner, admin, contributor).  
**Read path:** `user_can_access_pet(pet_id)` (any grant).

## User-visible outcomes (definition of done)

- [ ] Owner logs 3 meals on account A → family member on account B opens same pet → sees **3/4** (same targets).
- [ ] Contributor can bump rings; view-only sees data but cannot edit.
- [ ] Summary line (“4 bathroom breaks logged…”) matches for all household viewers.
- [ ] No duplicate empty row created per family member on first open.
- [ ] Pet transfer and account erasure still clean up rows correctly.
- [ ] Milo product help states Today is **shared for the pet** when family access is active.

## Technical approach

### Phase 1 — `daily_intake` → pet-level (P0)

**Schema (additive migration under `supabase/migrations/`):**

1. **Backfill / merge** existing rows before constraint change:
   - For each `(pet_id, date)` with multiple `user_id` rows:
     - **Canonical row:** owner’s `user_id` if present (`pets.user_id`).
     - Else: row with highest `(food_intake + water_intake + poop_count + pee_count)`.
   - Merge counts onto canonical row (do **not** sum across users — avoids double-counting duplicate logs).
   - Targets: canonical row’s targets, else `pets.intake_*` / schema defaults.
   - Delete non-canonical rows for that `(pet_id, date)`.
2. Rename semantics: `user_id` → keep column as **`last_updated_by`** (nullable after merge for legacy rows optional).
3. Replace unique constraint: `(pet_id, user_id, date)` → **`(pet_id, date)`**.
4. **RLS** (replace owner-only policies):
   - `SELECT`: `user_can_access_pet(pet_id)`
   - `INSERT` / `UPDATE`: `user_can_write_pet_health(pet_id)` AND `last_updated_by = auth.uid()` on write
   - `DELETE`: owner/admin only (or disallow client delete; prefer soft via pet cascade)
5. Comment on table: *One row per pet per day; shared by household.*

**App (`apps/consumer-app/services/dailyIntake.ts`):**

- `getDailyIntake(petId)`: query by `pet_id` + `date` only (remove `user_id` filter).
- `updateDailyIntake`: upsert on `(pet_id, date)`; set `last_updated_by` to current user.
- `listDailyIntakeHistory`: already `pet_id`-scoped; verify RLS allows family read.
- Initialize new rows with targets from `resolveIntakePrefs(petRow)` once per pet-day (not per viewer).

**UI:**

- `TodayHabitPanel`, `BodyTrackerSection`, `home.tsx`: no query-key change needed (`["daily_intake", petId]`).
- View-only: disable ring `onPress` / `onLongPress` when `get_user_pet_role` is `view_only` (client guard + RLS).

**Tests:**

- Unit: `dailyIntake` service with mocked supabase (owner vs grantee same row).
- Integration: extend `tools/family-access-integration` or consumer test — owner logs, grantee reads same counts.
- Migration smoke SQL in migration comment block.

### Phase 2 — Body tracker parity (P1)

**`pet_weight_logs`:** RLS still owner-only. Widen to match health tables:

- `SELECT`: `user_can_access_pet(pet_id)`
- `INSERT`: `user_can_write_pet_health(pet_id)` + `user_id = auth.uid()` (who weighed)
- Weight history is pet-level visibility; `user_id` remains “who logged” not “whose private log”.

**`pets.target_weight_*`:** edits already gated by owner/admin on `pets` UPDATE policy.

### Phase 3 — Walk streak clarity (P1, mostly docs + QA)

**No schema change required.** `computeWalkingStreakFromSessions` already aggregates all `walk_sessions` for `pet_id`.

- Audit UI copy: “{n}-day streak **with {petName}**” (already in `PawthonStreakBanner`).
- Confirm weekly challenge / share card use pet streak, not user streak.
- Family integration test: member A walks → streak visible to member B for same pet.

### Phase 4 — Optional enhancements (P2)

- **Activity feed:** emit `daily_intake` updates to `pet_activity_events` (pattern from `pet_family_grants` triggers).
- **Attribution chip:** “Updated by {name}” on Today card (read `last_updated_by` + profile).
- **Realtime:** Supabase channel on `daily_intake` for live ring updates across devices.
- **Export / privacy:** include shared daily care in owner export; erasure deletes by `pet_id` (already in retention migrations).

## Out of scope

- Per-user “I walked today” leaderboard (weekly challenge stays pet-parent / country cohort).
- Merging **journal streak** or **Milo conversation** counts across users.
- Retroactive reconciliation if two members logged **different** meals for the same slot (v1: last write wins on ring taps; household coordination is a product education problem).

## Migration & rollout

| Step | Action |
|------|--------|
| 1 | Ship migration on staging; run verification queries (row counts, no duplicate `(pet_id, date)`). |
| 2 | Deploy API/Edge only if any server readers exist (consumer is direct Supabase). |
| 3 | Ship app build that uses pet-level queries (backward compatible if migration runs first). |
| 4 | Update `docs/pawbuck-product-help/06-family-sharing.md` + `INVENTORY.md`; re-seed Milo RAG. |
| 5 | UAT with two accounts + [TESTING_FAMILY_SHARING.md](../TESTING_FAMILY_SHARING.md) checklist addendum. |

**Ordering:** Migration **before** or **same release** as app — never app-only (old app would create per-user rows again until updated).

**Rollback:** Forward-only migration; rollback = new migration restoring per-user model (avoid; staging validation first).

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Merge picks wrong row | Prefer owner row; document rule; spot-check staging pets with multi-user rows |
| View-only user edits via stale app | RLS denies write; show permission toast |
| Double logging after sync | Shared row prevents parallel empty states; educate “one dashboard per pet” |
| `listDailyIntakeHistory` for PDF passport | Confirm family cannot export owner-only PDFs unless product allows |

## Implementation checklist (engineering)

### Database
- [ ] Migration: merge rows, new unique `(pet_id, date)`, RLS via `user_can_access_pet` / `user_can_write_pet_health`
- [ ] `pnpm run supabase:types`
- [ ] Erasure/export paths still delete by `pet_id` (verify `account_deactivation` / `retention` migrations)

### Consumer app
- [ ] `services/dailyIntake.ts` — pet-level get/upsert
- [ ] View-only guard on `TodayHabitPanel` + `BodyTrackerSection`
- [ ] Hook or context: `usePetRole(petId)` if not already available on Home

### Tests & UAT
- [ ] `__tests__/services/dailyIntake.test.ts` (new)
- [ ] Family access integration fixture: shared Today assertion
- [ ] Manual: two simulators, same pet, rings sync

### Docs
- [ ] `06-family-sharing.md` — shared Today behavior
- [ ] `TESTING_FAMILY_SHARING.md` — shared daily care scenario
- [ ] This plan → **Active** when Phase 1 ships

## Success metrics (post-launch)

- Support tickets: “family sees empty Today” → zero
- Family test cohort: % of grantees who log intake within 7 days (engagement)
- No increase in duplicate meal logging complaints (qualitative)

## Estimated effort

| Phase | Effort |
|-------|--------|
| Phase 1 (daily_intake) | 2–3 dev days |
| Phase 2 (weight logs RLS) | 0.5–1 day |
| Phase 3 (walk streak QA/docs) | 0.5 day |
| Phase 4 (optional) | 1–2 days each item |

**Recommended first slice:** Phase 1 only — fixes the reported bug and delivers core product value.
