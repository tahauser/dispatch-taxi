#!/bin/bash
# setup-vm-agent.sh — One-time VM agent bootstrap
# Usage: curl -fsSL <url> | bash -s -- <GITHUB_TOKEN> [BRANCH]
# Example: ... | bash -s -- ghp_xxxx claude/mobile-scaffold-auth-route

set -e

TOKEN="$1"
BRANCH="${2:-main}"
REPO="tahauser/dispatch-taxi"
REPO_DIR="/home/azureuser/vm-channel-repo"

if [ -z "$TOKEN" ]; then
    echo "ERROR: GitHub token required"
    echo "Usage: setup-vm-agent.sh <GITHUB_TOKEN> [BRANCH]"
    exit 1
fi

echo "════════════════════════════════════════"
echo "  VM AGENT SETUP"
echo "  Repo : $REPO"
echo "  Branch : $BRANCH"
echo "  Dir  : $REPO_DIR"
echo "════════════════════════════════════════"

# ── 1. Clone or update repo ───────────────
if [ -d "$REPO_DIR/.git" ]; then
    echo "── Updating existing clone ──"
    cd "$REPO_DIR"
    git remote set-url origin "https://${TOKEN}@github.com/${REPO}.git"
    git fetch origin
    git checkout "$BRANCH"
    git pull --rebase origin "$BRANCH"
else
    echo "── Cloning repo ──"
    git clone "https://${TOKEN}@github.com/${REPO}.git" "$REPO_DIR" --branch "$BRANCH"
    cd "$REPO_DIR"
fi

git config user.email "vm-agent@dispatchtaxi.local"
git config user.name "VM Agent"
echo "✓ Repo ready"

# ── 2. Install agent script ───────────────
cp "$REPO_DIR/scripts/vm-agent.sh" /usr/local/bin/vm-agent
chmod +x /usr/local/bin/vm-agent
echo "✓ vm-agent installed to /usr/local/bin"

# ── 3. Create systemd service ─────────────
cat > /etc/systemd/system/vm-agent.service <<EOF
[Unit]
Description=VM GitHub Command Agent
After=network.target

[Service]
Type=simple
User=root
Environment=VM_AGENT_REPO_DIR=$REPO_DIR
Environment=VM_AGENT_BRANCH=$BRANCH
ExecStart=/usr/local/bin/vm-agent
Restart=always
RestartSec=10
StandardOutput=append:/var/log/vm-agent.log
StandardError=append:/var/log/vm-agent.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vm-agent
systemctl restart vm-agent

echo "✓ vm-agent service started"
echo ""
systemctl status vm-agent --no-pager
echo ""
echo "════════════════════════════════════════"
echo "  SETUP TERMINÉ"
echo "  Logs : journalctl -u vm-agent -f"
echo "         tail -f /var/log/vm-agent.log"
echo "════════════════════════════════════════"
