#!/bin/bash
# seed-portal.sh
# Usage depuis Azure Cloud Shell (bash) : bash seed-portal.sh

az vm run-command invoke \
  --resource-group rg-betashop-prod \
  --name vm-betashop \
  --command-id RunShellScript \
  --scripts '
    cd /home/azureuser/vm-channel-repo
    git fetch origin claude/mobile-scaffold-auth-route
    git reset --hard origin/claude/mobile-scaffold-auth-route
    cp backend/src/utils/seed.js /home/azureuser/apps/dispatch-backend/src/utils/seed.js
    cp scripts/vm-agent.sh /usr/local/bin/vm-agent
    chmod +x /usr/local/bin/vm-agent
    LOCAL=$(TZ="America/Toronto" date +%Y-%m-%d)
    cd /home/azureuser/apps/dispatch-backend
    MOBILE_ONLY=true SEED_DATE="$LOCAL" node src/utils/seed.js
    systemctl restart vm-agent
    echo "DONE - Route seedee pour $LOCAL"
  '
