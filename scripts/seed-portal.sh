#!/bin/bash
# seed-portal.sh
# Usage depuis Azure Cloud Shell (bash) : bash ~/s.sh

az vm run-command invoke \
  --resource-group rg-betashop-prod \
  --name vm-betashop \
  --command-id RunShellScript \
  --scripts '
    # ── Sync repo ──
    cd /home/azureuser/vm-channel-repo
    git fetch origin claude/mobile-scaffold-auth-route -q
    git reset --hard origin/claude/mobile-scaffold-auth-route
    cp backend/src/utils/seed.js /home/azureuser/apps/dispatch-backend/src/utils/seed.js
    cp scripts/vm-agent.sh /usr/local/bin/vm-agent && chmod +x /usr/local/bin/vm-agent

    # ── Seed avec date locale Toronto ──
    LOCAL=$(TZ="America/Toronto" date +%Y-%m-%d)
    cd /home/azureuser/apps/dispatch-backend
    MOBILE_ONLY=true SEED_DATE="$LOCAL" node src/utils/seed.js

    # ── Diagnostic API ──
    echo ""
    echo "── TEST API /routes?date=$LOCAL ──"
    TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"mobile-test@dispatchtaxi.local\",\"mot_de_passe\":\"MobileTest2026!\"}" \
      | jq -r .token)
    curl -s "http://localhost:3001/api/routes?date=$LOCAL" \
      -H "Authorization: Bearer $TOKEN" | jq "length, .[0].nom // \"VIDE\""

    # ── Nginx config ──
    echo ""
    echo "── NGINX ──"
    grep -r "proxy_pass\|server_name\|listen" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | head -20

    # ── Port du frontend ──
    echo ""
    echo "── PORTS PM2 ──"
    sudo -u azureuser PM2_HOME=/home/azureuser/.pm2 pm2 list --no-color | grep -E "name|factures|dispatch"

    systemctl restart vm-agent
    echo ""
    echo "DONE $LOCAL"
  '
