@echo off
title Get Music From Suno v1.4.0

echo.
echo  ==========================================
echo    Get Music From Suno v1.4.0
echo  ==========================================
echo.

:: ========== Check Node.js ==========
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed!
    echo          Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo  [OK] Node.js: %NODE_VER%

:: ========== Check npm ==========
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] npm is not installed!
    echo          Reinstall Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('npm --version') do set NPM_VER=%%v
echo  [OK] npm: v%NPM_VER%

:: ========== Create done/ folder ==========
if not exist "done" (
    mkdir done
    echo  [OK] Created done/ folder
) else (
    echo  [OK] done/ folder exists
)

:: ========== Check .env file ==========
if not exist ".env" (
    echo.
    echo  [WARN] .env file not found! Creating template...
    echo.
    (
        echo SUNO_API_KEY=your_api_key_here
        echo SUNO_API_BASE=https://api.sunoapi.org/api/v1
        echo PORT=3000
    ) > .env
    echo  [OK] Template .env created.
    echo  [!!] Edit .env and set your SUNO_API_KEY before running!
    echo.
    notepad .env
    pause
    exit /b 1
)

:: ========== Validate API Key ==========
findstr /C:"your_api_key_here" .env >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo  [ERROR] API key is not configured!
    echo          Edit .env and replace 'your_api_key_here' with your actual key.
    echo          Get your key at: https://sunoapi.org/api-key
    echo.
    notepad .env
    pause
    exit /b 1
)

echo  [OK] .env configured

:: ========== Install dependencies ==========
if not exist "node_modules" (
    echo.
    echo  [..] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo  [OK] Dependencies installed
) else (
    call npm ls express --depth=0 >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [..] Missing packages detected, installing...
        call npm install
    )
    echo  [OK] Dependencies verified
)

:: ========== Free port 3000 ==========
echo  [..] Freeing port 3000...
taskkill /f /im node.exe >nul 2>&1
echo  [OK] Port 3000 is free

:: ========== Start Server ==========
echo.
echo  [>>] Starting server...
echo  ------------------------------------------
echo.

:: Open browser after 3 seconds (in background)
start /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Run server (keeps window open)
node server.js

:: If server exits unexpectedly, don't close the window
echo.
echo  [!!] Server stopped.
pause
