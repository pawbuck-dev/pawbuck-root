# Maestro E2E — family sharing & pet transfer

Optional device E2E for staging. Requires [Maestro CLI](https://maestro.mobile.dev/) and a build installed on simulator/device.

## Setup

1. Create two staging test accounts (owner + recipient).
2. Owner: generate MTCH household code and TRF transfer code; export as env vars.
3. Point the app at staging Supabase/API (same build you use for UAT).

```bash
export MAESTRO_OWNER_EMAIL=owner@staging.example
export MAESTRO_OWNER_PASSWORD='...'
export MAESTRO_RECIPIENT_EMAIL=recipient@staging.example
export MAESTRO_RECIPIENT_PASSWORD='...'
export MAESTRO_HOUSEHOLD_CODE='MTCH-2026-XXXXXX'
export MAESTRO_TRANSFER_CODE='TRF-LUNA-2026-XXXX'
```

## Run

```bash
maestro test .maestro/flows/join-household-mtch.yaml
maestro test .maestro/flows/claim-pet-trf.yaml
```

## CI

`.github/workflows/maestro-family-transfer.yml` runs on `workflow_dispatch` when repository secrets are configured. Adjust tap targets (`testID`s) if login screens differ from production labels.
