#!/bin/bash
# 06-update-agent.sh — met à jour /usr/local/bin/vm-agent et redémarre

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"

cp "$REPO_DIR/scripts/vm-agent.sh" /usr/local/bin/vm-agent
chmod +x /usr/local/bin/vm-agent
echo "✓ vm-agent binary mis à jour"

systemctl restart vm-agent
echo "✓ vm-agent service redémarré"
systemctl status vm-agent --no-pager | head -8
