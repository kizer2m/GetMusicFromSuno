@echo off
chcp 65001 >nul
title Get Music From Suno v1.3.0

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   🎵 Get Music From Suno v1.3.0      ║
echo  ╚═══════════════════════════════════════╝
echo.

:: ========== Check Node.js ==========
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ Node.js is not installed!
    echo     Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  ✅ Node.js: %NODE_VER%

:: ========== Check npm ==========
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  ❌ npm is not installed!
    echo     Reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo  ✅ npm: v%NPM_VER%

:: ========== Create done/ folder ==========
if not exist "done" (
    mkdir done
    echo  📁 Created done/ folder
) else (
    echo  📁 done/ folder exists
)

:: ========== Check .env file ==========
if not exist ".env" (
    echo.
    echo  ⚠️  .env file not found! Creating template...
    echo.
    (
        echo SUNO_API_KEY=your_api_key_here
        echo SUNO_API_BASE=https://api.sunoapi.org/api/v1
        echo PORT=3000
    ) > .env
    echo  📝 Template .env created.
    echo  ❗ Edit .env and set your SUNO_API_KEY before running!
    echo.
    notepad .env
    pause
    exit /b 1
)

:: ========== Validate API Key ==========
findstr /C:"your_api_key_here" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo  ❌ API key is not configured!
    echo     Edit .env and replace 'your_api_key_here' with your actual key.
    echo     Get your key at: https://sunoapi.org/api-key
    echo.
    notepad .env
    pause
    exit /b 1
)

echo  ✅ .env configured

:: ========== Install dependencies ==========
if not exist "node_modules" (
    echo.
    echo  📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo  ❌ Failed to install dependencies!
        pause
        exit /b 1
    )
    echo  ✅ Dependencies installed
) else (
    echo  ✅ Dependencies installed
)

:: ========== Check package.json dependencies ==========
echo  🔍 Verifying packages...
call npm ls express --depth=0 >nul 2>&1
if %errorlevel% neq 0 (
    echo  📦 Missing packages detected, installing...
    npm install
)
echo  ✅ All packages verified

:: ========== Start Server ==========
echo.
echo  🚀 Starting server...
echo  ─────────────────────────────────────────
echo.

:: Start server and wait, then open browser
start /b node server.js

:: Wait for server to be ready
timeout /t 3 /nobreak >nul

:: Open browser
start http://localhost:3000

:: Keep window open
node server.js
