#!/usr/bin/env bash

# Lightweight smoke test for Payload + Cloudflare deployment
# Accepts env vars:
# - CLOUDFLARE_ENV (dev|prod) to resolve default workers.dev host
# - SMOKE_BASE to override base URL

BASE="${SMOKE_BASE:-https://payload-litewkateampl-${CLOUDFLARE_ENV}.spottedx.workers.dev}"
echo "Smoke checking ${BASE}"

ok=1

# 1) REST: /api/docs
code_docs=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/docs?limit=1")
body_docs=$(curl -s "${BASE}/api/docs?limit=1" || true)
echo "${body_docs}" | grep -q '"docs"' && echo "✓ /api/docs content" || { echo "✗ /api/docs content"; ok=0; }
[ "${code_docs}" = "200" ] && echo "✓ /api/docs (${code_docs})" || { echo "✗ /api/docs (${code_docs})"; ok=0; }

# 2) Admin root: /admin (allow redirect)
code_admin=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/admin")
headers_admin=$(curl -s -I "${BASE}/admin" | tr -d "\r")
location_admin=$(echo "${headers_admin}" | grep -i '^location:' | awk '{print $2}')
if [ "${code_admin}" = "200" ]; then
  echo "✓ /admin (${code_admin})"
elif [ "${code_admin}" = "302" ] && [ -n "${location_admin}" ]; then
  echo "✓ /admin redirect (${code_admin} -> ${location_admin})"
else
  echo "✗ /admin (${code_admin})"; ok=0
fi

# 3) Admin login: /admin/login (allow redirect). Check form elements (soft)
code_admin_login=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/admin/login")
headers_admin_login=$(curl -s -I "${BASE}/admin/login" | tr -d "\r")
location_admin_login=$(echo "${headers_admin_login}" | grep -i '^location:' | awk '{print $2}')
body_admin_login=$(curl -s "${BASE}/admin/login" || true)
echo "${body_admin_login}" | grep -qi "payload\|sign in" && echo "✓ /admin/login content" || { echo "✗ /admin/login content"; ok=0; }
# Inputs may be client-hydrated; treat as soft checks
if echo "${body_admin_login}" | grep -qi 'email'; then echo "✓ /admin/login label/email text"; else echo "⚠ /admin/login: brak 'email' w HTML (akceptowalne)"; fi
if echo "${body_admin_login}" | grep -qi 'password'; then echo "✓ /admin/login label/password text"; else echo "⚠ /admin/login: brak 'password' w HTML (akceptowalne)"; fi
if echo "${body_admin_login}" | grep -qi 'sign in'; then echo "✓ /admin/login sign in text"; else echo "⚠ /admin/login: brak 'sign in' (sprawdź UI)"; fi
if [ "${code_admin_login}" = "200" ]; then
  echo "✓ /admin/login (${code_admin_login})"
elif [ "${code_admin_login}" = "302" ] && [ -n "${location_admin_login}" ]; then
  echo "✓ /admin/login redirect (${code_admin_login} -> ${location_admin_login})"
else
  echo "✗ /admin/login (${code_admin_login})"; ok=0
fi

# 4) Admin docs collection: /admin/collections/docs (allow redirect)
code_admin_docs=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/admin/collections/docs")
headers_admin_docs=$(curl -s -I "${BASE}/admin/collections/docs" | tr -d "\r")
location_admin_docs=$(echo "${headers_admin_docs}" | grep -i '^location:' | awk '{print $2}')
if [ "${code_admin_docs}" = "200" ]; then
  echo "✓ /admin/collections/docs (${code_admin_docs})"
elif [ "${code_admin_docs}" = "302" ] && [ -n "${location_admin_docs}" ]; then
  echo "✓ /admin/collections/docs redirect (${code_admin_docs} -> ${location_admin_docs})"
else
  echo "✗ /admin/collections/docs (${code_admin_docs})"; ok=0
fi

# 5) Auth state: /api/users/me (allow 200 or 401)
code_users_me=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/users/me")
body_users_me=$(curl -s "${BASE}/api/users/me" || true)
if [ "${code_users_me}" = "200" ]; then
  echo "${body_users_me}" | grep -q '"user"' && echo "✓ /api/users/me user" || { echo "✗ /api/users/me missing user"; ok=0; }
  echo "✓ /api/users/me (${code_users_me})"
elif [ "${code_users_me}" = "401" ]; then
  echo "${body_users_me}" | grep -q '"errors"' && echo "✓ /api/users/me unauthorized" || { echo "✗ /api/users/me missing errors"; ok=0; }
  echo "✓ /api/users/me (${code_users_me})"
else
  echo "✗ /api/users/me (${code_users_me})"; ok=0
fi

# 6) GraphQL: real query to Docs
resp_graphql=$(curl -s -H "content-type: application/json" --data-binary '{"query":"query { Docs(limit: 1) { docs { id } } }"}' "${BASE}/api/graphql")
code_graphql=$(curl -s -o /dev/null -w "%{http_code}" -H "content-type: application/json" --data-binary '{"query":"query { Docs(limit: 1) { docs { id } } }"}' "${BASE}/api/graphql")
if echo "${resp_graphql}" | grep -q '"data"' && echo "${resp_graphql}" | grep -q '"Docs"' && [ "${code_graphql}" = "200" ]; then
  echo "✓ /api/graphql query Docs (${code_graphql})"
else
  echo "✗ /api/graphql query Docs (${code_graphql})"; ok=0
fi

# 7) GraphQL Playground (200 or 404 acceptable)
code_graphql_pg=$(curl -s -o /dev/null -w "%{http_code}" "${BASE}/api/graphql-playground")
if [ "${code_graphql_pg}" = "200" ] || [ "${code_graphql_pg}" = "404" ]; then
  echo "✓ /api/graphql-playground (${code_graphql_pg})"
else
  echo "✗ /api/graphql-playground (${code_graphql_pg})"; ok=0
fi

# Final result
if [ "${ok}" = "1" ]; then
  echo OK
else
  echo "Smoke failed"; exit 1
fi