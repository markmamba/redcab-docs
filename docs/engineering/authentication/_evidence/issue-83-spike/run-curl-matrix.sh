#!/usr/bin/env bash
# Issue #83 — deterministic slice of the policy matrix (no browser).
# Usage: BASE_URL=http://localhost:5173 ./run-curl-matrix.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5173}"
POLICY_ROUTE="routes/policies/tourist-required-policy"
BOOKINGS_ROUTE="routes/tourist/booking-list-page"

echo "# Issue 83 curl matrix — $(date -u +%Y-%m-%dT%H:%MZ)"
echo "BASE_URL=$BASE_URL"
echo

echo "## Guest legacy discover (web-56, outside policy)"
curl -sI "$BASE_URL/account/discover" | sed -n '1,5p'
echo

echo "## Guest document /account/bookings (policy middleware)"
curl -sI "$BASE_URL/account/bookings" | sed -n '1,8p'
echo

echo "## Guest .data enter-area (policy route in _routes)"
ROUTES="${POLICY_ROUTE},${BOOKINGS_ROUTE}"
curl -sI "$BASE_URL/account/bookings.data?_routes=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${ROUTES}'))")" | sed -n '1,10p'
echo

echo "## Guest .data body (SingleFetchRedirect payload)"
curl -s "$BASE_URL/account/bookings.data?_routes=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${POLICY_ROUTE}'))")" | head -c 280
echo
echo
