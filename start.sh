#!/bin/bash

# ========================================
# Get Music From Suno v1.4.0
# ========================================

echo ""
echo "=========================================="
echo "   Get Music From Suno v1.4.0"
echo "=========================================="
echo ""

# ========== Check Node.js ==========
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "        Install from: https://nodejs.org/"
    echo ""
    exit 1
fi
NODE_VER=$(node --version)
echo "[OK] Node.js: $NODE_VER"

# ========== Check npm ==========
if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not installed!"
    echo "        Reinstall Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi
NPM_VER=$(npm --version)
echo "[OK] npm: v$NPM_VER"

# ========== Create done/ folder ==========
if [ ! -d "done" ]; then
    mkdir -p done
    echo "[OK] Created done/ folder"
else
    echo "[OK] done/ folder exists"
fi

# ========== Check .env file ==========
if [ ! -f ".env" ]; then
    echo ""
    echo "[WARN] .env file not found! Creating template..."
    echo ""
    cat > .env << 'EOF'
SUNO_API_KEY=your_api_key_here
SUNO_API_BASE=https://api.sunoapi.org/api/v1
PORT=3000
EOF
    echo "[OK] Template .env created."
    echo "[!!] Edit .env and set your SUNO_API_KEY before running!"
    echo ""
    echo "   nano .env  (or use your preferred editor)"
    echo ""
    exit 1
fi

# ========== Validate API Key ==========
if grep -q "your_api_key_here" .env; then
    echo ""
    echo "[ERROR] API key is not configured!"
    echo "        Edit .env and replace 'your_api_key_here' with your actual key."
    echo "        Get your key at: https://sunoapi.org/api-key"
    echo ""
    exit 1
fi

echo "[OK] .env configured"

# ========== Install dependencies ==========
if [ ! -d "node_modules" ]; then
    echo ""
    echo "[..] Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies!"
        exit 1
    fi
    echo "[OK] Dependencies installed"
else
    npm ls express --depth=0 > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "[..] Missing packages detected, installing..."
        npm install
    fi
    echo "[OK] Dependencies verified"
fi

# ========== Free port 3000 ==========
echo "[..] Freeing port 3000..."
if command -v lsof &> /dev/null; then
    PID=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "[!!] Port 3000 is busy (PID: $PID), killing..."
        kill -9 $PID 2>/dev/null
    fi
elif command -v fuser &> /dev/null; then
    fuser -k 3000/tcp 2>/dev/null
fi
echo "[OK] Port 3000 is free"

# ========== Start Server ==========
echo ""
echo "[>>] Starting server..."
echo "------------------------------------------"
echo ""

# Open browser after delay
(sleep 3 && (
    if command -v xdg-open &> /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open &> /dev/null; then
        open http://localhost:3000
    fi
)) &

# Start server
node server.js

# If server exits unexpectedly
echo ""
echo "[!!] Server stopped."
