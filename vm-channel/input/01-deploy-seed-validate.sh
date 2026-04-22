#!/bin/bash
# 01-deploy-seed-validate.sh
# Déploie le seed.js depuis le repo cloné et valide Mobile M1

set -e

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"
BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"

echo "── 1. DÉPLOIEMENT SEED.JS ──"
cp "$REPO_DIR/backend/src/utils/seed.js" "$BACKEND_DIR/src/utils/seed.js"
echo "✓ seed.js mis à jour"

echo ""
echo "── 2. PM2 STATUS ──"
sudo -u azureuser PM2_HOME=/home/azureuser/.pm2 pm2 list

echo ""
echo "── 3. SEED MOBILE-TEST ──"
cd "$BACKEND_DIR"
MOBILE_ONLY=true node src/utils/seed.js

echo ""
echo "── 4. LOGIN ──"
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
echo "── 5. ROUTE DU JOUR ──"
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
echo "✓ VALIDATION MOBILE M1 TERMINÉE"
