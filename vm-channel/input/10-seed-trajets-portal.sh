#!/bin/bash
# 10-seed-trajets-portal.sh — seed trajet+affectation pour le portail web

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"
BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"

LOCAL=$(TZ="America/Toronto" date +%Y-%m-%d)
echo "── Date locale : $LOCAL (America/Toronto) ──"

# Sync repo + déploiement seed.js
cd "$REPO_DIR"
git fetch origin claude/mobile-scaffold-auth-route -q
git reset --hard origin/claude/mobile-scaffold-auth-route
cp backend/src/utils/seed.js "$BACKEND_DIR/src/utils/seed.js"
echo "✓ seed.js déployé"

# Seed
cd "$BACKEND_DIR"
MOBILE_ONLY=true SEED_DATE="$LOCAL" node src/utils/seed.js

# Login
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-test@dispatchtaxi.local","mot_de_passe":"MobileTest2026!"}' \
  | jq -r .token)

echo ""
echo "── GET /api/routes?date=$LOCAL (app mobile) ──"
curl -s "$API/routes?date=$LOCAL" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0] | {nom, statut, date_planifiee, nb_stops: (.stops|length)}'

echo ""
echo "── GET /api/trajets?date=$LOCAL (portail web) ──"
curl -s "$API/trajets?date=$LOCAL" \
  -H "Authorization: Bearer $TOKEN" | jq '.[0]'

echo ""
echo "DONE $LOCAL"
