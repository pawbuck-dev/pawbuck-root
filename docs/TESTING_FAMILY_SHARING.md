# Family sharing — test coverage map

Automated tests live under `apps/consumer-app/__tests__/services/householdInvites.service.test.ts`, `petFamilyInvites.service.test.ts`, and navigation tests in `__tests__/navigation/familyTransferEntryPoints.test.ts`.

Database RPC behavior (`accept_household_invite_code`, `revoke_household_member_access`, `process_pet_family_invite_token`) is enforced in `supabase/migrations/*`.

Journey spec: [family-sharing-recipient-journeys.md](plans/family-sharing-recipient-journeys.md)

## Automated (Jest)

| Area | File | What is covered |
|------|------|-----------------|
| MTCH accept RPC | `householdInvites.service.test.ts` | `accept_household_invite_code` call shape, error mapping |
| Email invite | `petFamilyInvites.service.test.ts` | Edge invoke + token accept errors |
| Entry points | `familyTransferEntryPoints.test.ts` | Welcome, profile hrefs, auth resume params |
| Launch | `index.test.tsx` | Join/Claim CTAs on welcome |

**Not automated today:** QR scan (stub), full two-account E2E, Mailgun delivery.

## Manual E2E checklist (two accounts recommended)

### Owner (sender)

1. **Premium gate** — Free account: creating household MTCH or email invite should prompt Premium (`family_access_invite`).
2. **Email invite** — Profile → Manage Access → pick pet → email + role → send.
3. **MTCH code** — Share household code instead → generate MTCH → copy/QR.
4. **Member list** — Joined member appears; remove member → grantee loses pet access.

### Recipient (family member)

1. **Discoverability** — Welcome or Home empty → Join with invite code; Profile → Join Household.
2. **MTCH flow** — Enter code → sign in if needed → success → shared pets on Home.
3. **Email flow** — Open `/accept-invite?token=…` → sign in with matching email → pet on Home.
4. **Wrong email** — Signed in as different user → `email_mismatch` message.
5. **Self-join** — Own MTCH code → error.

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
