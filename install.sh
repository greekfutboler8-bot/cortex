#!/bin/bash

# ─────────────────────────────────────────────
# CORTEX INSTALLER
# Runs on a fresh Mac Mini to set up everything
# Usage: bash install.sh
#    or: TAILSCALE_KEY="tskey-auth-xxx" bash install.sh
# ─────────────────────────────────────────────

set -e

GITHUB_TOKEN="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"
GITHUB_REPO="https://greekfutboler8-bot:${GITHUB_TOKEN}@github.com/greekfutboler8-bot/cortex.git"
CORTEX_DIR="$HOME/cortex"
VAULT_DIR="$HOME/CortexVault"
LOG_DIR="$HOME/cortex/logs"
TAILSCALE_KEY="${TAILSCALE_KEY:-tskey-auth-kpU7MUYa4c11CNTRL-wvn8Qvb19oFY5Wu9k6xUnFkqFJrbfUp2}"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║         CORTEX INSTALLER             ║"
echo "║    AI Business Advisory System       ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  This will take 20-40 minutes depending on WiFi."
echo "  Do not close this window."
echo ""

# ── Step 1 — Xcode CLI Tools ───────────────
echo "[ 1/10 ] Checking Xcode Command Line Tools..."
if ! xcode-select -p &> /dev/null; then
    echo "         Installing Xcode Command Line Tools..."
    echo "         A popup will appear — click Install and wait for it to finish."
    xcode-select --install
    echo "         Waiting for Xcode tools to finish installing..."
    until xcode-select -p &> /dev/null; do
        sleep 10
    done
    echo "         Xcode tools installed."
else
    echo "         Already installed. Skipping."
fi

# ── Step 2 — Homebrew ──────────────────────
echo "[ 2/10 ] Installing Homebrew..."
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Always ensure brew is in PATH
eval "$(/opt/homebrew/bin/brew shellenv zsh)"

# Persist brew PATH for future terminal sessions
if ! grep -q "brew shellenv" "$HOME/.zprofile" 2>/dev/null; then
    echo >> "$HOME/.zprofile"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv zsh)"' >> "$HOME/.zprofile"
    echo "         Brew PATH saved to .zprofile"
fi

# ── Step 3 — Core dependencies ─────────────
echo "[ 3/10 ] Installing Python, Node, Git, Ollama..."
brew install python node git ollama

# ── Step 4 — Start Ollama + pull model ─────
echo "[ 4/10 ] Starting Ollama and downloading AI model..."
echo "         This may take 20-30 minutes on first run depending on WiFi."
brew services start ollama
echo "         Waiting for Ollama to start..."
sleep 10
until ollama list &> /dev/null; do
    echo "         Still waiting for Ollama..."
    sleep 5
done
ollama pull llama3.2

# ── Step 5 — Clone Cortex from GitHub ──────
echo "[ 5/10 ] Downloading Cortex..."
if [ -d "$CORTEX_DIR" ]; then
    echo "         Cortex already exists. Pulling latest..."
    cd "$CORTEX_DIR" && git pull origin main
else
    git clone "$GITHUB_REPO" "$CORTEX_DIR"
fi

# ── Step 6 — Python environment ────────────
echo "[ 6/10 ] Setting up Python environment..."
cd "$CORTEX_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# ── Step 7 — Build frontend ─────────────────
echo "[ 7/10 ] Building dashboard..."
cd "$CORTEX_DIR/frontend"
npm install --legacy-peer-deps
npm run build

# ── Step 8 — Set up vault ───────────────────
echo "[ 8/10 ] Setting up Business Brain vault..."
if [ ! -d "$VAULT_DIR" ]; then
    cp -r "$CORTEX_DIR/vault-template" "$VAULT_DIR"
    echo "         Vault created at $VAULT_DIR"
else
    echo "         Vault already exists. Skipping."
fi
mkdir -p "$LOG_DIR"

# ── Step 9 — Register services ─────────────
echo "[ 9/10 ] Registering background services..."
LAUNCH_DIR="$HOME/Library/LaunchAgents"

cp "$CORTEX_DIR/launchd/com.cortex.backend.plist" "$LAUNCH_DIR/"
cp "$CORTEX_DIR/launchd/com.cortex.nightly.plist" "$LAUNCH_DIR/"
cp "$CORTEX_DIR/launchd/com.cortex.updater.plist" "$LAUNCH_DIR/"

launchctl load "$LAUNCH_DIR/com.cortex.backend.plist" 2>/dev/null || true
launchctl load "$LAUNCH_DIR/com.cortex.nightly.plist" 2>/dev/null || true
launchctl load "$LAUNCH_DIR/com.cortex.updater.plist" 2>/dev/null || true

# ── Step 10 — SSH + Tailscale ──────────────
echo "[ 10/10 ] Enabling remote support (SSH + Tailscale)..."

# Enable SSH via launchctl (works on macOS Sequoia without Full Disk Access)
echo "          Enabling SSH..."
sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist 2>/dev/null || \
sudo launchctl enable system/com.openssh.sshd 2>/dev/null || \
echo "          Note: Enable SSH manually via System Settings → General → Sharing → Remote Login"

# Install and start Tailscale
if ! command -v tailscale &> /dev/null; then
    brew install tailscale
fi

brew services start tailscale 2>/dev/null || true
sleep 3

# Start tailscaled if not running
if ! pgrep -x tailscaled > /dev/null; then
    sudo /opt/homebrew/opt/tailscale/bin/tailscaled --tun=userspace-networking > /dev/null 2>&1 &
    sleep 5
fi

echo "          Connecting to Cortex support network..."
tailscale up --authkey="$TAILSCALE_KEY" --hostname="cortex-$(hostname -s)" 2>/dev/null || \
echo "          Tailscale: run 'tailscale up' manually if this failed."

TAILSCALE_IP=$(tailscale ip 2>/dev/null || echo "run: tailscale ip")

# ── Create config.py ───────────────────────
echo "Creating config file..."
cat > "$CORTEX_DIR/config.py" << 'CONFIGEOF'
# Cortex local configuration
# This file is never pushed to GitHub (.gitignore protects it)

QUICKBOOKS_CLIENT_ID = "ABHAKBtdjQQvBeFvL9FjKFylLoYDL9eEMoOy65WQFWEAxb1e08"
QUICKBOOKS_CLIENT_SECRET = "V3JkCSv6hsr1pgJZlIP2ovWsQIvDTYE4CnChC1Um"
QUICKBOOKS_REDIRECT_URI = "http://localhost:8000/quickbooks/callback"

VAULT_PATH = "/Users/g/CortexVault"
OLLAMA_MODEL = "llama3.2"
CONFIGEOF

# ── Done ────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║         CORTEX IS INSTALLED          ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Dashboard:    http://127.0.0.1:8000"
echo "  Tailscale IP: $TAILSCALE_IP"
echo ""
echo "  ─────────────────────────────────────"
echo "  Next step: Run the setup wizard"
echo "  This connects your business tools"
echo "  and enters your business details."
echo "  ─────────────────────────────────────"
echo ""

# Run setup wizard
cd "$CORTEX_DIR"
source venv/bin/activate
python3 setup/wizard.py
