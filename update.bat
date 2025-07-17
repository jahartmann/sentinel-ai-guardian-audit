@echo off
echo 🔄 SecureAI Appliance - Update System
echo ==================================

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Git ist nicht installiert. Bitte installieren Sie Git zuerst.
    echo Visit: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Dies ist kein Git Repository. Bitte verwenden Sie 'git clone' um das Repository zu klonen.
    pause
    exit /b 1
)

echo 📡 Checking for updates...

REM Fetch latest changes
git fetch origin

REM Get local and remote commit hashes
for /f "tokens=*" %%i in ('git rev-parse HEAD') do set LOCAL=%%i
for /f "tokens=*" %%i in ('git rev-parse origin/main 2^>nul ^|^| git rev-parse origin/master 2^>nul') do set REMOTE=%%i

if "%LOCAL%"=="%REMOTE%" (
    echo ✅ Sie verwenden bereits die neueste Version!
    pause
    exit /b 0
)

echo 🔄 Updates verfügbar! Lade herunter...

REM Stop the application if it's running
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo 🛑 Stoppe laufende Anwendung...
    taskkill /F /IM node.exe >nul 2>nul
    timeout /t 2 >nul
)

REM Pull latest changes
git pull origin main || git pull origin master

if %ERRORLEVEL% neq 0 (
    echo ❌ Update fehlgeschlagen. Prüfen Sie manuell auf Konflikte.
    pause
    exit /b 1
)

echo 📦 Installiere Dependencies...
call npm install

if %ERRORLEVEL% neq 0 (
    echo ❌ Installation der Dependencies fehlgeschlagen.
    pause
    exit /b 1
)

echo.
echo ✅ Update erfolgreich abgeschlossen!
echo 🚀 Starten Sie die Anwendung mit: start.bat
echo.
echo 📋 Recent Changes:
git log --oneline -5 HEAD
echo.
pause