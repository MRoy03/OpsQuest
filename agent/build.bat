@echo off
echo ============================================
echo  OpsQuest Agent Builder
echo ============================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

:: Install deps
echo Installing dependencies...
npm install
if errorlevel 1 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

:: Build
echo.
echo Building agent.exe ...
mkdir dist 2>nul
npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo  BUILD COMPLETE
echo  Output: agent\dist\agent.exe
echo.
echo  NEXT STEPS:
echo  1. Copy dist\agent.exe to your server
echo  2. Copy config.example.json -> config.json
echo  3. Fill in your Supabase URL + anon key
echo  4. Add your camera IPs to the cameras array
echo  5. Right-click agent.exe -> Run as Administrator
echo ============================================
pause
