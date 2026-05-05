#!/bin/bash

# ─────────────────────────────────────────────
# CORTEX INSTALLER
# Runs on a fresh Mac Mini to set up everything
# ─────────────────────────────────────────────

set -e

GITHUB_TOKEN="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"
GITHUB_REPO="https://greekfutboler8-bot:${GITHUB_TOKEN}@github.com/greekfutboler8-bot/cortex.git"
CORTEX_DIR="$HOME/cortex"
VAULT_DIR="$HOME/CortexVault"
LOG_DIR="$HOME/cortex/logs"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║         CORTEX INSTALLER             ║"
echo "║    AI Business Advisory System       ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Step 1 — Homebrew ──────────────────────
echo "[ 1/10 ] Installing Homebrew..."
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo >> "$HOME/.zprofile"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv zsh)"' >> "$HOME/.zprofile"
    eval "$(/opt/homebrew/bin/brew shellenv zsh)"
else
    echo "         Homebrew already installed. Skipping."
fi

# ── Step 2 — Core dependencies ─────────────
echo "[ 2/10 ] Installing Python, Node, Git, Ollama..."
brew install python node git ollama

# ── Step 3 — Start Ollama + pull model ─────
echo "[ 3/10 ] Starting Ollama and downloading AI model..."
echo "         This may take 15-20 minutes on first run."
brew services start ollama
sleep 5
ollama pull llama3.2

# ── Step 4 — Clone Cortex from GitHub ──────
echo "[ 4/10 ] Downloading Cortex..."
if [ -d "$CORTEX_DIR" ]; then
    echo "         Cortex already exists. Pulling latest..."
    cd "$CORTEX_DIR" && git pull origin main
else
    git clone "$GITHUB_REPO" "$CORTEX_DIR"
fi

# ── Step 5 — Python environment ────────────
echo "[ 5/10 ] Setting up Python environment..."
cd "$CORTEX_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# ── Step 6 — Build frontend ─────────────────
echo "[ 6/10 ] Building dashboard..."
cd "$CORTEX_DIR/frontend"
npm install --legacy-peer-deps
npm run build

# ── Step 7 — Set up vault ───────────────────
echo "[ 7/10 ] Setting up Business Brain vault..."
if [ ! -d "$VAULT_DIR" ]; then
    cp -r "$CORTEX_DIR/vault-template" "$VAULT_DIR"
    echo "         Vault created at $VAULT_DIR"
else
    echo "         Vault already exists. Skipping."
fi

mkdir -p "$LOG_DIR"

# ── Step 8 — Register services ─────────────
echo "[ 8/10 ] Registering background services..."
LAUNCH_DIR="$HOME/Library/LaunchAgents"

cp "$CORTEX_DIR/launchd/com.cortex.backend.plist" "$LAUNCH_DIR/"
cp "$CORTEX_DIR/launchd/com.cortex.nightly.plist" "$LAUNCH_DIR/"
cp "$CORTEX_DIR/launchd/com.cortex.updater.plist"  "$LAUNCH_DIR/"

launchctl load "$LAUNCH_DIR/com.cortex.backend.plist"
launchctl load "$LAUNCH_DIR/com.cortex.nightly.plist"
launchctl load "$LAUNCH_DIR/com.cortex.updater.plist"

# ── Step 9 — Enable SSH (Remote Login) ─────
echo "[ 9/10 ] Enabling SSH for remote support..."
sudo systemsetup -setremotelogin on
echo "         SSH enabled. You can now remote in via Tailscale."

# ── Step 10 — Install Tailscale ────────────
echo "[ 10/10 ] Installing Tailscale for remote support..."
if ! command -v tailscale &> /dev/null; then
    brew install tailscale
    brew services start tailscale
    sleep 3
    sudo tailscaled &
    sleep 2
else
    echo "          Tailscale already installed. Skipping."
fi

echo ""
echo "  Starting Tailscale — a link will appear below."
echo "  Open it in Safari to connect this Mac to your network."
echo ""
tailscale up --authkey="" 2>/dev/null || tailscale up
echo ""

# ── Done ────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║         CORTEX IS INSTALLED          ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Dashboard:  http://127.0.0.1:8000"
echo "  Tailscale:  $(tailscale ip 2>/dev/null || echo 'run: tailscale ip')"
echo ""
echo "  Next step: run the setup wizard."
echo "  python3 $CORTEX_DIR/setup/wizard.py"
echo ""
