@echo off
title Get Music - AI Music Generator

echo.
echo  ==========================================
echo        Get Music - AI Music Generator
echo              Version 1.1.0
echo  ==========================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo         Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Change to script directory
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
    echo.
)

:: Create done folder if missing
if not exist "done" (
    mkdir "done"
    echo [OK] Created done/ folder for saved tracks.
)

:: Kill any process on port 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo [INFO] Killing existing process on port 3000 (PID: %%a)
    taskkill /PID %%a /F >nul 2>&1
)

echo [INFO] Starting server...
echo.

:: Start server in background
start "" /b node server.js

:: Wait for server to be ready
echo [INFO] Waiting for server to start...
set RETRIES=0
:wait_loop
if %RETRIES% geq 15 (
    echo [ERROR] Server did not start in time.
    pause
    exit /b 1
)
timeout /t 1 /nobreak >nul

:: Try connecting to the server
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    goto server_ready
)
set /a RETRIES+=1
goto wait_loop

:server_ready
:: Small extra delay to ensure full initialization
timeout /t 1 /nobreak >nul

echo.
echo [OK] Server is running at http://localhost:3000
echo [OK] Tracks will be saved to: %~dp0done\
echo.
echo [INFO] Opening browser...

:: Open default browser
start "" "http://localhost:3000"

echo.
echo  ==========================================
echo   Server is running. Press Ctrl+C to stop.
echo   Tracks are saved to the "done" folder.
echo  ==========================================
echo.

:: Kill the background node and re-run in foreground so Ctrl+C works
taskkill /f /im "node.exe" >nul 2>&1
timeout /t 1 /nobreak >nul
node server.js
