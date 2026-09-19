@echo off
rem Start the Alban Zaman Dairy POS (backend + frontend) and open the browser.
rem Double-click this file on Windows.
setlocal
cd /d "%~dp0"
echo Starting backend & frontend (npm run dev)... log: .dev-server.log
start "Alban Zaman Dairy Dev" cmd /c "npm run dev > .dev-server.log 2>&1"

echo Waiting for http://localhost:3000 ...
:waitloop
timeout /t 2 /nobreak >nul
curl -fsS http://localhost:3000 >nul 2>&1
if errorlevel 1 goto waitloop

echo Opening the app in your browser...
start "" http://localhost:3000
echo.
echo No login required - single-owner system.
endlocal