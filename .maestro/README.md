# Maestro device E2E — foundational flows

Device-level UI automation for login, pet addition, messages, family sharing, and pet transfer. **Milo AI is intentionally out of scope** (manual UAT).

## Prerequisites

1. [Maestro CLI](https://maestro.mobile.dev/) installed
2. Consumer app build on simulator/device (`com.pawbuck.app`)
3. Staging or local Supabase + API (same env as the installed build)
4. For join/transfer/invite flows: run the seed script first

## Seed test data (local Supabase)

```bash
supabase start   # if using local stack
pnpm run maestro:seed
set -a && source .maestro/.env.local && set +a
```

This creates:

| Account | Role |
|---------|------|
| `maestro-owner@…` | Family plan, 1 pet, MTCH + TRF + email invite |
| `maestro-recipient@…` | Join household / claim transfer / accept invite |
| `maestro-empty@…` | No pets — for add-pet flows |

Each seed run also sets `MAESTRO_PET_NAME` and a unique `MAESTRO_PET_EMAIL_LOCAL` for full onboarding E2E.

## Run flows

```bash
# Login
maestro test .maestro/flows/login-email.yaml

# Family sharing (MTCH)
maestro test .maestro/flows/join-household-mtch.yaml

# Pet transfer (TRF)
maestro test .maestro/flows/claim-pet-trf.yaml

# Email invite deep link
maestro test .maestro/flows/accept-email-invite.yaml

# Messages inbox
maestro test .maestro/flows/messages-inbox-smoke.yaml

# Pet addition (onboarding start — step 2 only)
maestro test .maestro/flows/add-first-pet-start.yaml

# Pet addition (full onboarding steps 1–9 + save)
maestro test .maestro/flows/add-first-pet-complete.yaml

# All foundational flows
maestro test .maestro/flows/
```

## testID anchors

Stable selectors live in the app for Maestro:

| testID | Screen |
|--------|--------|
| `welcome-sign-in` | Welcome |
| `email-input` / `password-input` | Login & signup |
| `login-submit` / `signup-submit` | Auth |
| `invite-code-input` / `verify-invite-code` | Join household step 1 |
| `join-household-submit` | Join step 2 |
| `transfer-code-input` / `verify-transfer-code` | Transfer step 1 |
| `accept-transfer-submit` | Transfer step 2 |
| `bottom-nav-messages` | Tab bar |
| `messages-new-compose` | Messages |
| `home-add-first-pet` | Empty home |
| `onboarding-continue` | Onboarding steps (Continue) |
| `onboarding-country-picker` / `country-search-input` | Step 2 country |
| `onboarding-pet-type-dog` / `onboarding-pet-type-cat` | Step 3 |
| `onboarding-breed-picker` / `onboarding-breed-*` | Step 4 |
| `onboarding-pet-name-input` | Step 5 |
| `onboarding-pet-email-input` | Step 5b |
| `onboarding-gender-male` / `onboarding-gender-female` | Step 6 |
| `onboarding-skip-dob` / `onboarding-skip-weight` | Steps 7–8 |
| `onboarding-skip-identification` | Step 9 |
| `onboarding-save-pet` | Review screen |

Subflows: `.maestro/subflows/login-email.yaml`, `auth-resume-sign-in.yaml`, `onboarding-complete-pet.yaml`

## CI

`.github/workflows/maestro-foundational.yml` — manual `workflow_dispatch` on macOS with repository secrets matching seed output.

## Related docs

- [`docs/TESTING_FAMILY_SHARING.md`](../docs/TESTING_FAMILY_SHARING.md)
- [`docs/TESTING_PET_TRANSFER.md`](../docs/TESTING_PET_TRANSFER.md)
- [`docs/TESTING.md`](../docs/TESTING.md)
