#!/bin/bash
# validate-mobile-m1.sh
# Validation Mobile M1 : seed + login + route-du-jour
# Usage : curl -fsSL <url> | bash

set -e

BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"

echo "════════════════════════════════════════"
echo "  VALIDATION MOBILE M1"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════"
echo ""

# ── 1. PM2 status ─────────────────────────────
echo "── 1. PM2 STATUS ──"
sudo -u azureuser PM2_HOME=/home/azureuser/.pm2 pm2 list
echo ""

# ── 2. Seed mobile-test ───────────────────────
echo "── 2. SEED MOBILE-TEST ──"
cd "$BACKEND_DIR"
MOBILE_ONLY=true node src/utils/seed.js
echo ""

# ── 3. Login ──────────────────────────────────
echo "── 3. CURL LOGIN ──"
LOGIN_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-test@dispatchtaxi.local","mot_de_passe":"MobileTest2026!"}')

echo "$LOGIN_RESP" | jq '{token: .token[:50], chauffeur: .chauffeur}'

TOKEN=$(echo "$LOGIN_RESP" | jq -r .token)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "ERREUR: token non reçu"
  echo "$LOGIN_RESP"
  exit 1
fi
echo "✓ Token reçu"
echo ""

# ── 4. Route du jour ──────────────────────────
echo "── 4. CURL ROUTE-DU-JOUR ──"
curl -s "$API/routes/me/route-du-jour" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{
      nom,
      statut,
      date_planifiee,
      nb_stops: (.stops | length),
      stops: (.stops | map({ordre, adresse, statut}))
    }'

echo ""
echo "════════════════════════════════════════"
echo "  VALIDATION TERMINÉE"
echo "════════════════════════════════════════"
