#!/bin/bash
# 08-seed-local-date.sh — seed la route en date locale Toronto (frontend affiche heure locale)

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"
BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"

LOCAL_DATE=$(TZ="America/Toronto" date '+%Y-%m-%d')
echo "── Date UTC    : $(date -u '+%Y-%m-%d %H:%M') ──"
echo "── Date locale : $LOCAL_DATE (America/Toronto) ──"

echo ""
echo "── DÉPLOIEMENT SEED.JS ──"
cp "$REPO_DIR/backend/src/utils/seed.js" "$BACKEND_DIR/src/utils/seed.js"
echo "✓ seed.js à jour (supporte SEED_DATE)"

echo ""
echo "── SEED AVEC DATE $LOCAL_DATE ──"
cd "$BACKEND_DIR"
MOBILE_ONLY=true SEED_DATE="$LOCAL_DATE" node src/utils/seed.js

echo ""
echo "── VÉRIF curl /api/routes?date=$LOCAL_DATE ──"
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-test@dispatchtaxi.local","mot_de_passe":"MobileTest2026!"}' \
  | jq -r .token)

curl -s "$API/routes?date=$LOCAL_DATE" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.[0] | {nom, statut, date_planifiee, nb_stops: (.stops|length)}'

echo ""
echo "✓ DONE — Rafraîchis le portail"
