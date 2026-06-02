# Family sharing & pet transfer — recipient journey spec

**Status:** Active implementation reference  
**Related:** [family_transfer_journeys plan](../../.cursor/plans/family_transfer_journeys_5baf0074.plan.md), [TESTING_FAMILY_SHARING.md](../TESTING_FAMILY_SHARING.md), [TESTING_PET_TRANSFER.md](../TESTING_PET_TRANSFER.md)

## Personas & acceptance criteria

### Persona A — Family member (email invite)

| Step | User action | Expected outcome |
|------|-------------|------------------|
| A1 | Opens email link `/accept-invite?token=…` | App shows accept screen (or auth prompt) |
| A2 | Signs up / signs in with **matching email** | Invite processed; pet visible on Home |
| A3 | Wrong account signed in | Clear `email_mismatch` error |
| A4 | Opens Home / Profile without link | Can discover join paths; optional pending-invite banner |

**Success:** Pet appears on Home with role from invite (`view_only`, `contributor`, or `admin`).

### Persona B — Family member (MTCH household code)

| Step | User action | Expected outcome |
|------|-------------|------------------|
| B1 | Welcome / Home empty / Profile → Join household | `/join-household` wizard |
| B2 | Enters MTCH code, signs in if needed | `accept_household_invite_code` RPC |
| B3 | Completes step 3 | All owner pets granted **`admin`** in `pet_family_grants` |

**Success:** Shared pets visible on Home without creating a new pet profile.

### Persona C — Transfer recipient (TRF code)

| Step | User action | Expected outcome |
|------|-------------|------------------|
| C1 | Welcome / Home empty / Profile → Claim a Pet | `/transfer-pet` (recipient), **not** `/(home)/transfer-pet` |
| C2 | Enters TRF code, signs in if needed | Preview → accept via `accept_pet_transfer` |
| C3 | Success step 3 | Pet owned by recipient; on Home |

**Success:** Ownership moved; sender no longer owns pet.

## Entry points (discoverability)

| Surface | Family (MTCH) | Family (email) | Transfer claim |
|---------|---------------|----------------|----------------|
| Initial welcome | Join with invite code | — (link only) | Claim a transferred pet |
| Home empty state | Join with invite code | — | Claim a transferred pet |
| Profile menu | Join household | — | Claim a Pet → `/transfer-pet` |

Sender flows (unchanged): Profile → Manage Access / Transfer Ownership → `/(home)/family-access` / `/(home)/transfer-pet`.

## Deep-link param contract

Used by `login`, `signup`, `post-auth-confirm`, and invite/transfer wizards.

| Param | Flow | Resume target |
|-------|------|---------------|
| `returnTo` | Path after auth | e.g. `/join-household/step2`, `/transfer-pet/step2`, `/accept-invite` |
| `inviteCode` | MTCH household | Passed to join step 2 |
| `transferCode` | TRF ownership | Passed to transfer step 2 |
| `inviteToken` | Email family invite | Passed to accept-invite screen |
| `token` | Email link query | Alias read on accept-invite screen |

**Rule:** If `returnTo` is set and any of `transferCode`, `inviteCode`, or `inviteToken` is present, auth success must `router.replace` to `returnTo` with the corresponding param(s).

## Server truth

- Pet visibility: `get_user_pet_role(pet_id)` → owner or row in `pet_family_grants`.
- MTCH accept: `accept_household_invite_code(p_code)` — marks invite used, inserts `household_members`, upserts `pet_family_grants` (admin) for all non-deleted owner pets.
- Email accept: `process_pet_family_invite_token(p_token)` — per-pet grant with invited role.
- Transfer accept: `accept_pet_transfer(p_code, p_pet_parent_display_name)`.

## Default MTCH grant role

`admin` on all non-deleted pets owned by invite creator — matches one-time backfill in `20260502100000_pet_family_grants_phase1.sql`.

## Definition of done

- [ ] New user can reach join/claim/accept without typing a URL
- [ ] MTCH accept creates grants; pets on Home
- [ ] Email token accept via `/accept-invite`
- [ ] Profile Claim → `/transfer-pet`
- [ ] Journey tests (P0) green; TESTING_* docs match app
- [ ] Two-account manual UAT passes
