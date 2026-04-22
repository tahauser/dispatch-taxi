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

log "VM Agent started — repo=$REPO_DIR branch=$BRANCH"

while true; do
    cd "$REPO_DIR"

    # Pull latest from GitHub
    if ! git pull --rebase origin "$BRANCH" -q 2>>"$LOG_FILE"; then
        log "git pull failed, retrying in 15s"
        sleep 15
        continue
    fi

    processed=false

    # Process scripts in input/ (nullglob-safe check)
    for script in "$INPUT_DIR"/*.sh; do
        [ -f "$script" ] || continue
        processed=true

        name=$(basename "$script")
        ts=$(date '+%Y%m%d-%H%M%S')
        out="$OUTPUT_DIR/${name%.sh}-${ts}.txt"

        log "▶ Executing: $name"

        # Run script, capture stdout+stderr
        {
            echo "=== VM-AGENT OUTPUT ==="
            echo "Script : $name"
            echo "Date   : $(date '+%Y-%m-%d %H:%M:%S')"
            echo "Branch : $BRANCH"
            echo "========================"
            bash "$script" 2>&1
            echo "EXIT: $?"
            echo "========================"
        } > "$out"

        log "✓ Done: $name → $(basename "$out")"

        # Remove input script from repo and disk
        rm -f "$script"
        git add -A "$INPUT_DIR"
    done

    if $processed; then
        git add "$OUTPUT_DIR/"
        git commit -m "vm-agent: output $(date '+%Y%m%d-%H%M%S')" 2>>"$LOG_FILE" || true
        if git push origin "$BRANCH" 2>>"$LOG_FILE"; then
            log "Results pushed to GitHub"
        else
            log "Push failed — will retry next cycle"
        fi
    fi

    sleep 5
done
