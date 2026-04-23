#!/bin/bash
# 11-npm-install-mobile.sh — met à jour package-lock.json du dossier mobile

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"

cd "$REPO_DIR"
git fetch origin claude/mobile-scaffold-auth-route -q
git reset --hard origin/claude/mobile-scaffold-auth-route

echo "── Node version ──"
node --version
npm --version

echo ""
echo "── npm install dans mobile/ ──"
cd "$REPO_DIR/mobile"
npm install 2>&1

echo ""
echo "── Vérification package-lock.json ──"
head -5 package-lock.json

echo "DONE"
