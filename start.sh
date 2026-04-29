#!/usr/bin/env bash
# Get Music From Suno — Start Script (Linux / macOS)
# Version: 1.2.1

set -e

echo ""
echo "  =========================================="
echo "   Get Music From Suno - AI Music Generator"
echo "             Version 1.2.1"
echo "  =========================================="
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "        Install from: https://nodejs.org/"
    echo "        Or use: brew install node (macOS) / sudo apt install nodejs (Ubuntu)"
    exit 1
fi

echo "[OK] Node.js $(node -v) found."

# Create done folder if missing
if [ ! -d "done" ]; then
    mkdir -p "done"
    echo "[OK] Created done/ folder for saved tracks."
fi

# Check .env file exists
if [ ! -f ".env" ]; then
    echo "[ERROR] .env file not found!"
    echo ""
    echo "        Please create a .env file with the following content:"
    echo ""
    echo "        SUNO_API_KEY=your_api_key_here"
    echo "        SUNO_API_BASE=https://api.sunoapi.org/api/v1"
    echo "        PORT=3000"
    echo ""
    echo "        Creating a template .env file for you..."
    cat > .env << 'EOF'
SUNO_API_KEY=your_api_key_here
SUNO_API_BASE=https://api.sunoapi.org/api/v1
PORT=3000
EOF
    echo "[OK] Template .env file created. Please edit it with your API key."
    echo ""
    exit 1
fi

# Check if SUNO_API_KEY is set in .env
if ! grep -q "SUNO_API_KEY=" .env; then
    echo "[ERROR] SUNO_API_KEY not found in .env file."
    echo "        Add: SUNO_API_KEY=your_api_key_here"
    exit 1
fi

# Check if API key is still the placeholder
if grep -q "SUNO_API_KEY=your_api_key_here" .env; then
    echo "[ERROR] SUNO_API_KEY is still set to the placeholder value."
    echo "        Please edit .env and add your real API key."
    exit 1
fi

# Check if SUNO_API_BASE is set
if ! grep -q "SUNO_API_BASE=" .env; then
    echo "[WARN] SUNO_API_BASE not found in .env, will use default."
fi

# Check if PORT is set
if ! grep -q "PORT=" .env; then
    echo "[WARN] PORT not found in .env, will use default 3000."
fi

echo "[OK] Configuration verified."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    npm install
    echo "[OK] Dependencies installed."
    echo ""
fi

# Read PORT from .env (default 3000)
PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d'=' -f2 || echo "3000")
PORT=${PORT:-3000}

# Kill any process on the port
if lsof -Pi :"$PORT" -sTCP:LISTEN -t &> /dev/null; then
    echo "[INFO] Killing existing process on port $PORT"
    kill $(lsof -Pi :"$PORT" -sTCP:LISTEN -t) 2>/dev/null || true
    sleep 1
fi

echo "[INFO] Starting server..."
echo ""

# Start server in background
node server.js &
SERVER_PID=$!

# Wait for server to be ready
echo "[INFO] Waiting for server to start..."
RETRIES=0
while [ $RETRIES -lt 15 ]; do
    sleep 1
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -q "200"; then
        break
    fi
    RETRIES=$((RETRIES + 1))
done

if [ $RETRIES -ge 15 ]; then
    echo "[ERROR] Server did not start in time."
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

sleep 1

echo ""
echo "[OK] Server is running at http://localhost:$PORT"
echo "[OK] Tracks will be saved to: $(pwd)/done/"
echo ""
echo "[INFO] Opening browser..."

# Open default browser (macOS / Linux)
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT" &
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT"
fi

echo ""
echo "  =========================================="
echo "   Server is running. Press Ctrl+C to stop."
echo "   Tracks are saved to the \"done\" folder."
echo "  =========================================="
echo ""

# Trap Ctrl+C to clean up
cleanup() {
    echo ""
    echo "[INFO] Shutting down server..."
    kill $SERVER_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Wait for server process
wait $SERVER_PID
