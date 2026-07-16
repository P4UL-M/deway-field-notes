#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env" >&2
  exit 1
fi

set -a
. ./.env
set +a

base_url="http://127.0.0.1:8111"
website_id="b41cf413-05ec-4c4d-94c2-145f0af62a8d"

attempt=0
until curl -fsS "$base_url/api/heartbeat" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 45 ]; then
    echo "Umami did not become ready" >&2
    exit 1
  fi
  sleep 2
done

login() {
  password="$1"
  curl -fsS -X POST "$base_url/api/auth/login" \
    -H 'Content-Type: application/json' \
    --data "$(jq -n --arg password "$password" '{username:"admin", password:$password}')"
}

auth="$(login "$UMAMI_ADMIN_PASSWORD" 2>/dev/null || login umami)"
token="$(printf '%s' "$auth" | jq -r '.token')"
user_id="$(printf '%s' "$auth" | jq -r '.user.id')"

websites="$(curl -fsS "$base_url/api/websites?pageSize=100" -H "Authorization: Bearer $token")"
if ! printf '%s' "$websites" | jq -e --arg id "$website_id" '.data[]? | select(.id == $id)' >/dev/null; then
  curl -fsS -X POST "$base_url/api/websites" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $token" \
    --data "$(jq -n --arg id "$website_id" '{id:$id, name:"Deway Field Notes", domain:"blog.deway.fr"}')" >/dev/null
  echo "✓ Umami website created"
else
  echo "✓ Umami website already configured"
fi

curl -fsS -X POST "$base_url/api/users/$user_id" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
  --data "$(jq -n --arg password "$UMAMI_ADMIN_PASSWORD" '{username:"admin", password:$password, role:"admin"}')" >/dev/null

echo "✓ Umami admin password secured"
echo "✓ Analytics ready on the private Watson endpoint"
