#!/usr/bin/env bash
# Smoke-test Milo journal chat against PawBuck.API (same contract as the consumer app).
# Prefer staging first; use a Supabase access_token for a user who owns the pet.
#
# Usage:
#   export PAWBUCK_ACCESS_TOKEN="<supabase_jwt>"
#   export PET_ID="<uuid>"
#   export PAWBUCK_API_URL="https://api.pawbuck.com"   # optional; default below
#   ./scripts/milo-journal-chat-smoke.sh
#
# Obtain TOKEN: sign in via the app or Supabase dashboard; use the session access_token.
# Expect 402 if premium is required for milo_chat in that environment.

set -euo pipefail

API_URL="${PAWBUCK_API_URL:-https://api.pawbuck.com}"
BASE="${API_URL%/}"

: "${PAWBUCK_ACCESS_TOKEN:?Set PAWBUCK_ACCESS_TOKEN (Supabase access JWT)}"
: "${PET_ID:?Set PET_ID (pet uuid owned by that user)}"

curl -sS -X POST "${BASE}/api/milo/chat" \
  -H "Authorization: Bearer ${PAWBUCK_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "message": "How was your day?",
  "journalMode": true,
  "pet": {
    "id": "${PET_ID}",
    "name": "SmokePet",
    "animal_type": "dog",
    "breed": "",
    "date_of_birth": "2020-01-01",
    "sex": "unknown",
    "weight_value": 10,
    "weight_unit": "kg"
  },
  "history": []
}
EOF

echo
