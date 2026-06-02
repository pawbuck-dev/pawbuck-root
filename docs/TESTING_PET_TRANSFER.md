# Pet transfer — test coverage map

Automated tests live under `apps/consumer-app/__tests__/services/petTransfers*.test.ts`.  
Database RPC behavior (`accept_pet_transfer`, `decline_pet_transfer`, `preview_pet_transfer`) is enforced in `supabase/migrations/*pet_transfer*`.

Journey spec: [pet-transfer-recipient-journey.md](plans/pet-transfer-recipient-journey.md)

**Important:** Step 1 code verification uses `preview_pet_transfer` RPC (not direct `pet_transfers` SELECT). Recipients are not pet owners until accept; client table reads can fail RLS on the `pets` embed.

## Automated (Jest)

| Area | File | What is covered |
|------|------|-----------------|
| Preview RPC | `petTransfers.preview.test.ts` | Code trim/uppercase, payload parsing, null/error paths |
| Service layer | `petTransfers.service.test.ts` | Create, verify, decline, accept RPC calls, cancel, prep snapshot, history |
| Feature gates | `featureGates.test.ts` | `pet_transfer_create` / `pet_transfer_accept` keys |

**Not automated today:** UI screens (`transfer-pet.tsx`, `transfer-pet/step2.tsx`), QR scan (stub), Edge `pet-transfer-notify`, full two-account E2E.

## Manual E2E checklist (two accounts recommended)

### Sender (current owner)

1. **Premium gate** — Free account: starting transfer should prompt Premium (`pet_transfer_create`).
2. **Start transfer** — Profile → Transfer Ownership → pick pet → reason → verify prep (weight, meds, last vet).
3. **Journal controls** — Highlight up to 5 entries; exclude non–vet-flagged entries; same entry cannot be both.
4. **Generate code** — Code format `TRF-XXXX-YYYY-####`; copy/share; QR renders; expiry shows ~14 days.
5. **Duplicate guard** — Second active code for same pet should error until first is cancelled or expires.
6. **Cancel** — Cancel active code; recipient preview/accept should fail afterward.

### Recipient (new owner)

1. **Claim flow** — Welcome / Home empty state / Profile → **Claim a Pet** → `/transfer-pet` → enter code (case-insensitive).
2. **Invalid code** — Wrong, expired, or used code → clear error on step 1 or 2.
3. **Auth** — Logged out on step 2 → sign-in/sign-up prompt with return to step 2.
4. **Premium gate** — Free account: accept should prompt Premium (`pet_transfer_accept`).
5. **Preview** — Pet name, breed, photo, record counts, highlighted journal snippets.
6. **Decline** — Decline → code inactive; sender can create a new code.
7. **Accept** — Parent display name → success step 3 → pet appears in pet list with records.
8. **Self-transfer** — Same account as sender accepting own code → server error (cannot transfer to yourself).

### After accept

1. **Sender** — Pet removed from their list (or no longer editable as owner).
2. **Recipient** — Health records, journal (minus excluded), medications, documents visible.
3. **Transfer history** — Prior owner label respects “show my name” toggle.
4. **Family access** — Old family shares cleared; recipient re-invites if needed.
5. **Notifications** — Email/push for created/accepted/declined (if Edge notify configured).

### Edge cases

| Case | Expected |
|------|----------|
| Expired code | Invalid / expired message |
| Declined code | Cannot accept; new code required |
| Deleted pet | Preview/accept fails |
| Vet-flagged journal in exclude list | Blocked at create or RPC |
| Milo / billing / family data | Listed in “excludes” on sender UI; not copied |

## Commands

```bash
cd apps/consumer-app
pnpm test __tests__/services/petTransfers.preview.test.ts
pnpm test __tests__/services/petTransfers.service.test.ts
```
