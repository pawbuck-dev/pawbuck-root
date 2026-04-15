#!/usr/bin/env bash
# Smoke-test PawBuck.API endpoints that read from Postgres.
#
# Usage:
#   export PAWBUCK_API_BASE="http://pawbuck-api-alb-735389831.us-east-1.elb.amazonaws.com"
#   export ADMIN_SUPPORT_TOKEN="<Supabase session access_token (app_metadata.role=admin)>"
#   ./scripts/test/pawbuck-api-db-smoke.sh
#
# Without ADMIN_SUPPORT_TOKEN, only the public health check runs; DB-backed tests are skipped.
#
set -euo pipefail

BASE="${PAWBUCK_API_BASE:-}"
TOKEN="${ADMIN_SUPPORT_TOKEN:-}"

if [[ -z "$BASE" ]]; then
  echo "Set PAWBUCK_API_BASE (no trailing slash), e.g. your ALB URL." >&2
  exit 1
fi
BASE="${BASE%/}"

pass() { echo "OK  $*"; }
fail() { echo "FAIL $*" >&2; exit 1; }

need_python() {
  if ! command -v python3 >/dev/null 2>&1; then
    fail "python3 is required to validate JSON responses"
  fi
}

curl_json() {
  local url="$1"
  shift
  curl -sS -f "$url" "$@"
}

curl_json_auth() {
  local url="$1"
  curl_json "$url" -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json"
}

echo "=== GET /api/health (no auth) ==="
need_python
body="$(curl -sS -w "\n%{http_code}" "${BASE}/api/health")"
code="${body##*$'\n'}"
body="${body%$'\n'*}"
[[ "$code" == "200" ]] || fail "health HTTP $code body=$body"
python3 -c "import json,sys; d=json.loads(sys.argv[1]); assert d.get('status')=='healthy', d" "$body"
pass "/api/health"

if [[ -z "$TOKEN" ]]; then
  echo ""
  echo "Skip DB tests: set ADMIN_SUPPORT_TOKEN to run /api/support/* checks."
  exit 0
fi

echo "=== GET /api/support/metrics (admin JWT → DB aggregates) ==="
body="$(curl -sS -w "\n%{http_code}" "${BASE}/api/support/metrics" \
  -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json")"
code="${body##*$'\n'}"
body="${body%$'\n'*}"
[[ "$code" == "200" ]] || fail "metrics HTTP $code body=${body:0:200}"
python3 -c "
import json, sys
d = json.loads(sys.argv[1])
for k in ('totalUsers', 'usersWithPets', 'usersWithPetsAndHealthRecords',
 'newUsersLast7Days', 'totalPets', 'dailySignups'):
    assert k in d, f'missing {k}'
for k in ('totalUsers', 'usersWithPets', 'usersWithPetsAndHealthRecords',
          'newUsersLast7Days', 'totalPets'):
    assert isinstance(d[k], int) and d[k] >= 0, (k, d[k])
assert isinstance(d['dailySignups'], list)
for p in d['dailySignups']:
    assert 'date' in p and 'count' in p
    assert isinstance(p['count'], int) and p['count'] >= 0
print('metrics:', d['totalUsers'], 'users,', d['totalPets'], 'pets')
" "$body"
pass "/api/support/metrics"

echo "=== GET /api/support/users/directory (paginated DB read) ==="
body="$(curl -sS -G -w "\n%{http_code}" "${BASE}/api/support/users/directory" \
  -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  --data-urlencode "page=1" --data-urlencode "pageSize=5")"
code="${body##*$'\n'}"
body="${body%$'\n'*}"
[[ "$code" == "200" ]] || fail "directory HTTP $code body=${body:0:200}"
python3 -c "
import json, sys
d = json.loads(sys.argv[1])
for k in ('items', 'totalCount', 'page', 'pageSize'):
    assert k in d, k
assert isinstance(d['items'], list)
assert d['page'] == 1 and d['pageSize'] == 5
assert isinstance(d['totalCount'], int) and d['totalCount'] >= 0
assert len(d['items']) <= 5
print('directory: page', d['page'], 'totalCount', d['totalCount'])
" "$body"
pass "/api/support/users/directory"

echo "=== GET /api/support/users/list?segment=all ==="
body="$(curl -sS -G -w "\n%{http_code}" "${BASE}/api/support/users/list" \
  -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  --data-urlencode "segment=all")"
code="${body##*$'\n'}"
body="${body%$'\n'*}"
[[ "$code" == "200" ]] || fail "users/list HTTP $code body=${body:0:200}"
python3 -c "
import json, sys
rows = json.loads(sys.argv[1])
assert isinstance(rows, list)
assert len(rows) <= 500
for r in rows[:3]:
    assert 'id' in r and 'email' in r
print('users/list segment=all:', len(rows), 'rows')
" "$body"
pass "/api/support/users/list?segment=all"

echo "=== GET /api/support/pets/search?q=ab (DB ILIKE; may return []) ==="
body="$(curl -sS -G -w "\n%{http_code}" "${BASE}/api/support/pets/search" \
  -H "Authorization: Bearer ${TOKEN}" -H "Accept: application/json" \
  --data-urlencode "q=ab")"
code="${body##*$'\n'}"
body="${body%$'\n'*}"
[[ "$code" == "200" ]] || fail "pets/search HTTP $code body=${body:0:200}"
python3 -c "
import json, sys
rows = json.loads(sys.argv[1])
assert isinstance(rows, list)
for r in rows[:5]:
    for k in ('id', 'userId', 'name', 'healthStatus'):
        assert k in r, r
print('pets/search:', len(rows), 'matches')
" "$body"
pass "/api/support/pets/search"

echo ""
echo "All DB smoke checks passed."
