#!/bin/bash

# ─────────────────────────────────────────────
# CORTEX INSTALLER
# Runs on a fresh Mac to set up everything
# Usage: curl -fsSL https://raw.githubusercontent.com/greekfutboler8-bot/cortex/main/install.sh | bash
#    or: TAILSCALE_KEY="tskey-auth-xxx" bash <(curl -fsSL https://raw.githubusercontent.com/greekfutboler8-bot/cortex/main/install.sh)
# ─────────────────────────────────────────────

set -e

GITHUB_REPO="https://github.com/greekfutboler8-bot/cortex.git"
CORTEX_DIR="$HOME/cortex"
VAULT_DIR="$HOME/CortexVault"
LOG_DIR="$HOME/cortex/logs"
LAUNCH_DIR="$HOME/Library/LaunchAgents"
TAILSCALE_KEY="${TAILSCALE_KEY:-}"

# Prompt for Tailscale key if not already provided
if [ -z "$TAILSCALE_KEY" ]; then
    echo "  Enter your Tailscale auth key for remote support."
    echo "  Get one at: https://login.tailscale.com/admin/settings/keys"
    echo "  (Press Enter to skip — you can connect manually later)"
    read -r -p "  Tailscale key: " TAILSCALE_KEY
fi
VENV_PYTHON="$HOME/cortex/venv/bin/python"

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
    until xcode-select -p &> /dev/null; do
        sleep 10
    done
    echo "         Xcode tools installed."
else
    echo "         Already installed. Skipping."
fi

# ── Step 2 — Homebrew ──────────────────────
echo "[ 2/10 ] Installing Homebrew..."
if ! /opt/homebrew/bin/brew --version &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

eval "$(/opt/homebrew/bin/brew shellenv zsh)"

if ! grep -q "brew shellenv" "$HOME/.zprofile" 2>/dev/null; then
    echo >> "$HOME/.zprofile"
    echo 'eval "$(/opt/homebrew/bin/brew shellenv zsh)"' >> "$HOME/.zprofile"
fi
echo "         Homebrew ready."

# ── Step 3 — Core dependencies ─────────────
echo "[ 3/10 ] Installing Python, Node, Git, Ollama..."
brew install python node git ollama

# ── Step 4 — Ollama + model ─────────────────
echo "[ 4/10 ] Starting Ollama and downloading AI model..."
echo "         This may take 20-30 minutes depending on WiFi."
brew services start ollama
sleep 10
until ollama list &> /dev/null; do
    echo "         Waiting for Ollama to start..."
    sleep 5
done
ollama pull llama3.2
echo "         Model ready."

# ── Step 5 — Clone Cortex ───────────────────
echo "[ 5/10 ] Downloading Cortex..."
if [ -d "$CORTEX_DIR" ]; then
    echo "         Already exists. Pulling latest..."
    cd "$CORTEX_DIR" && git pull origin main
else
    git clone "$GITHUB_REPO" "$CORTEX_DIR"
fi

# ── Step 6 — Python environment ─────────────
echo "[ 6/10 ] Setting up Python environment..."
cd "$CORTEX_DIR"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
echo "         Python environment ready."

# ── Step 7 — Build frontend ──────────────────
echo "[ 7/10 ] Building dashboard..."
cd "$CORTEX_DIR/frontend"
npm install --legacy-peer-deps
npm run build
echo "         Dashboard built."

# ── Step 8 — Vault ───────────────────────────
echo "[ 8/10 ] Setting up Business Brain vault..."
mkdir -p "$LOG_DIR"
if [ ! -d "$VAULT_DIR" ]; then
    cp -r "$CORTEX_DIR/vault-template" "$VAULT_DIR"
    echo "         Vault created at $VAULT_DIR"
else
    echo "         Vault already exists. Skipping."
fi

# ── Step 9 — Services ────────────────────────
echo "[ 9/10 ] Registering background services..."
mkdir -p "$LAUNCH_DIR"

# Backend plist — generated dynamically with correct username
cat > "$LAUNCH_DIR/com.cortex.backend.plist" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cortex.backend</string>
    <key>ProgramArguments</key>
    <array>
        <string>${VENV_PYTHON}</string>
        <string>-m</string>
        <string>uvicorn</string>
        <string>backend.main:app</string>
        <string>--port</string>
        <string>8000</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${CORTEX_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>HOME</key>
        <string>${HOME}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/backend.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/backend-error.log</string>
</dict>
</plist>
PLISTEOF

# Nightly + updater plists — also generated dynamically
cat > "$LAUNCH_DIR/com.cortex.nightly.plist" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cortex.nightly</string>
    <key>ProgramArguments</key>
    <array>
        <string>${VENV_PYTHON}</string>
        <string>${CORTEX_DIR}/backend/digest/nightly.py</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${CORTEX_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
        <key>HOME</key>
        <string>${HOME}</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/nightly.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/nightly-error.log</string>
</dict>
</plist>
PLISTEOF

cat > "$LAUNCH_DIR/com.cortex.updater.plist" << PLISTEOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cortex.updater</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/git</string>
        <string>-C</string>
        <string>${CORTEX_DIR}</string>
        <string>pull</string>
        <string>origin</string>
        <string>main</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>1</integer>
        <key>Minute</key>
        <integer>30</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/updater.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/updater-error.log</string>
</dict>
</plist>
PLISTEOF

launchctl load "$LAUNCH_DIR/com.cortex.backend.plist" 2>/dev/null || true
launchctl load "$LAUNCH_DIR/com.cortex.nightly.plist" 2>/dev/null || true
launchctl load "$LAUNCH_DIR/com.cortex.updater.plist" 2>/dev/null || true
echo "         Services registered."

# ── Step 10 — SSH + Tailscale ────────────────
echo "[ 10/10 ] Enabling remote support..."

# Enable SSH
echo "          Enabling SSH (you may be prompted for your password)..."
sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist 2>/dev/null || \
sudo launchctl enable system/com.openssh.sshd 2>/dev/null || \
echo "          SSH: enable manually via System Settings → General → Sharing → Remote Login"

# Tailscale
if ! command -v tailscale &> /dev/null; then
    brew install tailscale
fi

brew services start tailscale 2>/dev/null || true
sleep 5

if ! pgrep -f tailscaled > /dev/null; then
    sudo /opt/homebrew/opt/tailscale/bin/tailscaled --tun=userspace-networking > /dev/null 2>&1 &
    sleep 5
fi

tailscale up --authkey="$TAILSCALE_KEY" --hostname="cortex-$(hostname -s)" 2>/dev/null || \
echo "          Tailscale: run 'tailscale up' manually if needed."

TAILSCALE_IP=$(tailscale ip 2>/dev/null || echo "run: tailscale ip")

# ── Config file ──────────────────────────────
cat > "$CORTEX_DIR/config.py" << CONFIGEOF
# Cortex local configuration — never pushed to GitHub

QUICKBOOKS_CLIENT_ID = "ABHAKBtdjQQvBeFvL9FjKFylLoYDL9eEMoOy65WQFWEAxb1e08"
QUICKBOOKS_CLIENT_SECRET = "V3JkCSv6hsr1pgJZlIP2ovWsQIvDTYE4CnChC1Um"
QUICKBOOKS_REDIRECT_URI = "http://localhost:8000/api/quickbooks/callback"

VAULT_PATH = "$VAULT_DIR"
OLLAMA_MODEL = "llama3.2"
USDA_API_KEY = "oK/SXE39wQjXsV1LA2Oar7mbwEjw6jkH"
CONFIGEOF

# ── Done ─────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║         CORTEX IS INSTALLED          ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Dashboard:    http://127.0.0.1:8000"
echo "  Tailscale IP: $TAILSCALE_IP"
echo ""
echo "  Starting setup wizard..."
echo "  This will ask for your business details."
echo ""

cd "$CORTEX_DIR"
source venv/bin/activate
python3 setup/wizard.py
