# Family sharing — test coverage map

Automated tests live under `apps/consumer-app/__tests__/services/householdInvites.service.test.ts`, `petFamilyInvites.service.test.ts`, and navigation tests in `__tests__/navigation/familyTransferEntryPoints.test.ts`.

Database RPC behavior (`accept_household_invite_code`, `revoke_household_member_access`, `process_pet_family_invite_token`) is enforced in `supabase/migrations/*`.

Journey spec: [family-sharing-recipient-journeys.md](plans/family-sharing-recipient-journeys.md)

## Automated (Jest)

| Area | File | What is covered |
|------|------|-----------------|
| MTCH accept RPC | `householdInvites.service.test.ts` | create/verify/deactivate/list + RPC error codes (Jest) |
| MTCH accept RPC | `tools/family-access-integration/.../householdInvite.rpc.test.ts` | live `accept_household_invite_code` |
| Shared Today | `dailyIntake.test.ts`, `usePetHealthWrite.test.ts` | pet-level intake service + write roles (Jest) |
| Shared Today | `sharedDailyCare.rpc.test.ts` | `daily_intake` household read/write (integration) |
| Email invite | `petFamilyInvites.service.test.ts` | Edge invoke + token accept errors |
| Entry points | `familyTransferEntryPoints.test.ts` | Welcome, profile hrefs, auth resume params |
| Launch | `index.test.tsx` | Join/Claim CTAs on welcome |
| Wizards (RTL) | `join-household-wizard.test.tsx` | Step 1 verify → step 2 join |
| Owner services | `householdInvites.service.test.ts` | create/verify/deactivate/list + all RPC error codes |

**Not automated today:** QR scan (stub), Mailgun delivery, Maestro (optional staging).

## Supabase RPC integration

Local: `supabase start` then `pnpm run family-access:integration`  
CI: `.github/workflows/family-access-integration.yml`

## Manual E2E checklist (two accounts recommended)

### Owner (sender)

1. **Family plan gate** — Free account: creating household MTCH or email invite should prompt Family plan (`family_access_invite`). Individual account: also blocked. Family account: succeeds.
2. **Email invite** — Profile → Manage Access → pick pet → email + role → send.
3. **MTCH code** — Share household code instead → generate MTCH → copy/QR.
4. **Member list** — Joined member appears; remove member → grantee loses pet access.

### Recipient (family member)

1. **Discoverability** — Welcome or Home empty → Join with invite code; Profile → Join Household.
2. **MTCH flow** — Enter code → sign in if needed → success → shared pets on Home.
3. **Email flow** — Open `/accept-invite?token=…` → sign in with matching email → pet on Home.
4. **Wrong email** — Signed in as different user → `email_mismatch` message.
5. **Self-join** — Own MTCH code → error.

### Shared daily care (Today)

1. **Owner** logs meals/water/output on Home → rings show non-zero counts.
2. **Family member** opens the same pet on Home → sees **identical** ring values (not a separate empty log).
3. **Contributor** can bump rings; **view only** sees rings but cannot edit (view-only message).
4. **Walk streak** — walks by any household member count toward the pet’s streak and daily distance goal.

### Plan gates (client + RLS)

| Plan | Invite / share | Accept transfer (2nd pet) |
|------|----------------|---------------------------|
| Free | Blocked at invite | Blocked if already owns 1 pet |
| Individual | Blocked at invite | Blocked if already owns 1 pet |
| Family | Succeeds | Succeeds |

**Known limitation:** QR scan for household invite remains a stub — use manual code entry.

### SQL verification (after MTCH accept)

```sql
-- Replace UUIDs
SELECT g.*
FROM pet_family_grants g
JOIN pets p ON p.id = g.pet_id
WHERE g.grantee_id = '<recipient_user_id>'
  AND p.user_id = '<owner_user_id>';
```

Expect one grant row per owner pet with role `admin`.

## Device UAT checklist

Run on two physical devices or simulators with separate accounts.

1. Cold install → Sign up → Home empty → **Join with Invite Code** → MTCH accept → pets on Home.
2. Owner sends **email invite** → recipient opens link → sign in with matching email → pet on Home.
3. Email invite with **wrong account** → clear error on `/accept-invite`.
4. Profile → **Claim a Pet** → TRF accept → pet owned by recipient.
5. Profile → **Transfer Ownership** → generate TRF (sender unchanged).
6. Owner removes household member → grantee loses shared pets.
7. Premium gates on invite create (if enabled for test accounts).

## Commands

```bash
cd apps/consumer-app
pnpm test __tests__/services/householdInvites.service.test.ts
pnpm test __tests__/navigation/familyTransferEntryPoints.test.tsx
```
