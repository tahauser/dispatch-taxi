#!/bin/bash
# vm-agent.sh — GitHub-based command channel daemon
# Polls vm-channel/input/ for .sh scripts, executes them,
# pushes output to vm-channel/output/, removes the input file.

REPO_DIR="${VM_AGENT_REPO_DIR:-/home/azureuser/vm-channel-repo}"
BRANCH="${VM_AGENT_BRANCH:-main}"
INPUT_DIR="$REPO_DIR/vm-channel/input"
OUTPUT_DIR="$REPO_DIR/vm-channel/output"
LOG_FILE="/var/log/vm-agent.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

export GIT_TERMINAL_PROMPT=0

log "VM Agent started — repo=$REPO_DIR branch=$BRANCH"

while true; do
    cd "$REPO_DIR"

    # ── 1. Fetch silencieux ──────────────────────────────────────────
    if ! git fetch origin "$BRANCH" -q 2>>"$LOG_FILE"; then
        log "Fetch failed, retrying in 15s"
        sleep 15
        continue
    fi

    # ── 2. Sync uniquement si aucun commit local en attente ──────────
    AHEAD=$(git rev-list "origin/$BRANCH..HEAD" --count 2>/dev/null || echo 0)
    if [ "$AHEAD" -eq 0 ]; then
        LOCAL=$(git rev-parse HEAD 2>/dev/null)
        REMOTE=$(git rev-parse "origin/$BRANCH" 2>/dev/null)
        if [ "$LOCAL" != "$REMOTE" ]; then
            git reset --hard "origin/$BRANCH" 2>>"$LOG_FILE"
            log "Synced to origin/$BRANCH"
        fi
    fi

    # ── 3. Traiter les scripts dans input/ ──────────────────────────
    processed=false

    for script in "$INPUT_DIR"/*.sh; do
        [ -f "$script" ] || continue
        processed=true

        name=$(basename "$script")
        ts=$(date '+%Y%m%d-%H%M%S')
        out="$OUTPUT_DIR/${name%.sh}-${ts}.txt"

        log "▶ Executing: $name"

        {
            echo "=== VM-AGENT OUTPUT ==="
            echo "Script : $name"
            echo "Date   : $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Branch : $BRANCH"
            echo "========================"
            bash "$script" 2>&1
            echo "Exit: $?"
            echo "========================"
        } > "$out"

        log "✓ Done: $name → $(basename "$out")"
        rm -f "$script"
    done

    # ── 4. Commit + push avec retry (rebase si divergé) ─────────────
    if $processed; then
        git add -A
        git commit -m "vm-agent: output $(date '+%Y%m%d-%H%M%S')" 2>>"$LOG_FILE" || true
    fi

    AHEAD=$(git rev-list "origin/$BRANCH..HEAD" --count 2>/dev/null || echo 0)
    if [ "$AHEAD" -gt 0 ]; then
        for attempt in 1 2 3; do
            if git push origin "$BRANCH" 2>>"$LOG_FILE"; then
                log "$AHEAD commit(s) pushed to GitHub"
                break
            fi
            log "Push failed (attempt $attempt) — fetching and rebasing..."
            git fetch origin "$BRANCH" -q 2>>"$LOG_FILE"
            git rebase "origin/$BRANCH" 2>>"$LOG_FILE" \
                || { git rebase --abort 2>/dev/null; log "Rebase aborted"; break; }
            sleep $((attempt * 3))
        done
    fi

    sleep 5
done
