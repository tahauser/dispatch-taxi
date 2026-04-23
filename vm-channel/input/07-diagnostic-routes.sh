#!/bin/bash
# 07-diagnostic-routes.sh — diagnostique les routes en DB pour mobile-test

BACKEND_DIR="/home/azureuser/apps/dispatch-backend"
API="http://localhost:3001/api"

echo "── DATES ──"
echo "VM date UTC    : $(date -u '+%Y-%m-%d %H:%M:%S')"
echo "VM CURRENT_DATE: $(node -e "const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT CURRENT_DATE, NOW()').then(r=>{console.log(JSON.stringify(r.rows[0]));p.end()})")"

echo ""
echo "── ROUTES EN DB POUR mobile-test ──"
cd "$BACKEND_DIR"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\`
  SELECT r.id, r.nom, r.date_planifiee, r.statut,
         r.date_planifiee::date AS date_only,
         CURRENT_DATE AS server_today,
         (r.date_planifiee::date = CURRENT_DATE) AS est_aujourdhui,
         COUNT(s.id) AS nb_stops
  FROM routes r
  JOIN chauffeurs c ON c.id = r.chauffeur_id
  LEFT JOIN stops s ON s.route_id = r.id
  WHERE c.email = 'mobile-test@dispatchtaxi.local'
  GROUP BY r.id
  ORDER BY r.date_planifiee DESC
  LIMIT 5
\`).then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
.catch(e => { console.error(e.message); pool.end(); });
"

echo ""
echo "── APPEL API route-du-jour ──"
TOKEN=\$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile-test@dispatchtaxi.local","mot_de_passe":"MobileTest2026!"}' \
  | jq -r .token)

curl -s "$API/routes/me/route-du-jour" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo ""
echo "── TIMEZONE POSTGRESQL ──"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT current_setting('TIMEZONE') as tz, NOW() as now, CURRENT_DATE as today\")
  .then(r => { console.log(JSON.stringify(r.rows[0], null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
"
