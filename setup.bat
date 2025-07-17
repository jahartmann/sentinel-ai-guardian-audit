@echo off
echo Setting up SecureAI Appliance...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js 20+ first.
    echo Visit: https://nodejs.org
    pause
    exit /b 1
)

echo Node.js found

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)

echo Dependencies installed successfully

REM Check if Ollama is available (optional)
where ollama >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Ollama found - KI features will be available
    echo Make sure Ollama is running: ollama serve
) else (
    echo Ollama not found - KI features will be disabled
    echo Install Ollama for AI-powered analysis: https://ollama.ai
)

echo.
echo Setup completed successfully!
echo.

REM Create start script
echo @echo off > start.bat
echo echo Starting SecureAI Appliance... >> start.bat
echo for /f "tokens=2 delims=:" %%%%a in ^('ipconfig ^| findstr /i "ipv4"'^) do set SERVER_IP=%%%%a >> start.bat
echo set SERVER_IP=%%SERVER_IP: =%% >> start.bat
echo echo Application will be available at: >> start.bat
echo echo    - Local: http://localhost:8080 >> start.bat
echo echo    - Network: http://%%SERVER_IP%%:8080 >> start.bat
echo echo Press Ctrl+C to stop >> start.bat
echo call npm run dev >> start.bat

echo Next steps:
echo    1. Start the application: start.bat
echo    2. Open http://localhost:8080 or http://[SERVER-IP]:8080 in your browser
echo    3. Configure Ollama in Settings (if available)
echo    4. Add your first server
echo.
echo Documentation: See README.md for detailed instructions
echo.
pause