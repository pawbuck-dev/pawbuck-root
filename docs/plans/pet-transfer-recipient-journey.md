# Pet transfer — recipient journey spec

**Status:** Active implementation reference  
**Related:** [family-sharing-recipient-journeys.md](./family-sharing-recipient-journeys.md), [TESTING_PET_TRANSFER.md](../TESTING_PET_TRANSFER.md)

## Persona — Transfer recipient (new owner)

| Step | User action | Expected outcome |
|------|-------------|------------------|
| T1 | Welcome / Home empty / Profile → **Claim a Pet** | Opens `/transfer-pet` (not `/(home)/transfer-pet`) |
| T2 | Enters TRF code (or opens `Pawbuck://transfer-pet?transferCode=`) | Step 1 validates via `preview_pet_transfer` RPC |
| T3 | Signs in if prompted on step 2 | Returns to step 2 with `transferCode` |
| T4 | Accepts transfer | `accept_pet_transfer` RPC; pet on Home |
| T5 | Push notification (optional) | Deep link to `/transfer-pet/step2` |

## Persona — Sender (current owner)

| Step | User action | Expected outcome |
|------|-------------|------------------|
| S1 | Profile → **Transfer Ownership** | `/(home)/transfer-pet` wizard |
| S2 | Generates TRF code | Row in `pet_transfers`; share code |
| S3 | Cancel / expiry | Recipient preview/accept fails |

## Deep-link param contract

| Param | Flow |
|-------|------|
| `transferCode` | TRF code on `/transfer-pet` or resume to `/transfer-pet/step2` |
| `returnTo` | After auth, e.g. `/transfer-pet/step2` |

## Server truth

- **Step 1 verify:** `preview_pet_transfer(p_code)` — SECURITY DEFINER (recipient must not rely on direct `pet_transfers` + `pets` SELECT; RLS blocks pet embed for non-owners).
- **Accept:** `accept_pet_transfer(p_code, p_pet_parent_display_name)`.
- **Decline:** `decline_pet_transfer(p_code)`.

## Entry points (discoverability)

| Surface | Route |
|---------|--------|
| Welcome | Claim a transferred pet → `/transfer-pet` |
| Home empty | Claim a Transferred Pet → `/transfer-pet` |
| Profile | Claim a Pet → `/transfer-pet` |
| Profile | Transfer Ownership → `/(home)/transfer-pet` (sender) |
| Push | `/transfer-pet/step2?transferCode=` |

## Known gaps (manual UAT)

- No email magic-link accept path (code entry only; unlike family email invites).
- `TransferOwnershipModal` on home (QR stub) is separate from Profile sender wizard.
- QR scan removed from step 1 until scanner ships.

## Definition of done

- [ ] Recipient can reach claim flow without typing a URL
- [ ] Step 1 verify works for non-owner account (preview RPC)
- [ ] Auth resume returns to step 2 with code
- [ ] Accept moves ownership; pet on Home
