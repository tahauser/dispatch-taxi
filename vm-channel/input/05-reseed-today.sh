#!/bin/bash
# 05-reseed-today.sh — re-seed route pour la date du jour

set -e

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"
BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"

echo "── Date VM : $(date '+%Y-%m-%d %H:%M:%S %Z') ──"

echo ""
echo "── 1. DÉPLOIEMENT SEED.JS ──"
cp "$REPO_DIR/backend/src/utils/seed.js" "$BACKEND_DIR/src/utils/seed.js"
echo "✓ seed.js à jour"

echo ""
echo "── 2. SEED MOBILE-TEST (date du jour) ──"
cd "$BACKEND_DIR"
MOBILE_ONLY=true node src/utils/seed.js

echo ""
echo "── 3. VÉRIFICATION ROUTE EN DB ──"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  SELECT r.nom, r.date_planifiee, r.statut, COUNT(s.id) as nb_stops
  FROM routes r
  JOIN chauffeurs c ON c.id = r.chauffeur_id
  LEFT JOIN stops s ON s.route_id = r.id
  WHERE c.email = 'mobile-test@dispatchtaxi.local'
  GROUP BY r.id
  ORDER BY r.date_planifiee DESC
  LIMIT 3
\`).then(res => {
  console.log(JSON.stringify(res.rows, null, 2));
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
"

echo ""
echo "── 4. CURL ROUTE-DU-JOUR ──"
LOGIN_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-test@dispatchtaxi.local","mot_de_passe":"MobileTest2026!"}')
TOKEN=$(echo "$LOGIN_RESP" | jq -r .token)

curl -s "$API/routes/me/route-du-jour" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '{nom, statut, date_planifiee, nb_stops: (.stops|length)}'

echo ""
echo "✓ DONE"
