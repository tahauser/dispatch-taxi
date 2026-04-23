#!/bin/bash
# 09-diag-portal.sh — trouve quel endpoint le portail appelle

BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"
DATE="2026-04-22"

TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-test@dispatchtaxi.local","mot_de_passe":"MobileTest2026!"}' \
  | jq -r .token)

echo "── ROUTES EN DB ──"
cd "$BACKEND_DIR"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  SELECT r.id, r.nom, r.date_planifiee, r.date_planifiee::date as date_only,
         r.statut, c.email, COUNT(s.id) as stops
  FROM routes r
  JOIN chauffeurs c ON c.id = r.chauffeur_id
  LEFT JOIN stops s ON s.route_id = r.id
  WHERE c.email = 'mobile-test@dispatchtaxi.local'
  GROUP BY r.id, c.email
  ORDER BY r.date_planifiee DESC LIMIT 3
\`).then(r=>{console.log(JSON.stringify(r.rows,null,2));pool.end()})
.catch(e=>{console.error(e.message);pool.end()})
"

echo ""
echo "── GET /api/routes?date=$DATE ──"
curl -s "$API/routes?date=$DATE" -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "── GET /api/routes (sans date) ──"
curl -s "$API/routes" -H "Authorization: Bearer $TOKEN" | jq '.[0:2]'

echo ""
echo "── GET /api/routes/me/route-du-jour ──"
curl -s "$API/routes/me/route-du-jour" -H "Authorization: Bearer $TOKEN" | jq '{nom,statut,date_planifiee}'

echo ""
echo "── NGINX CONFIG ──"
cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/conf.d/*.conf 2>/dev/null || echo "nginx config introuvable"

echo ""
echo "── PM2 APPS ET PORTS ──"
sudo -u azureuser PM2_HOME=/home/azureuser/.pm2 pm2 list
sudo -u azureuser PM2_HOME=/home/azureuser/.pm2 pm2 show dispatch-api 2>/dev/null | grep -E "port|script|cwd"
sudo -u azureuser PM2_HOME=/home/azureuser/.pm2 pm2 show factures 2>/dev/null | grep -E "port|script|cwd"
