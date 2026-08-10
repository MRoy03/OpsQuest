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

:: Build agent.exe
echo.
echo Building agent.exe ...
mkdir dist 2>nul
npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

:: Build screencap.exe (required for screen-capture commands)
echo.
echo Building screencap.exe ...
cd screencap
npm install >nul 2>&1
npm run build
if errorlevel 1 (
    echo WARNING: screencap build failed - screen capture commands will not work
) else (
    echo Copying screencap.exe to dist\ ...
    copy /Y dist\screencap.exe ..\dist\screencap.exe >nul
    echo Screencap ready.
)
cd ..

echo.
echo ============================================
echo  BUILD COMPLETE
echo  Outputs:
echo    agent\dist\agent.exe
echo    agent\dist\screencap.exe  (screen capture)
echo.
echo  NEXT STEPS:
echo  1. Copy dist\agent.exe + dist\screencap.exe to your server
echo  2. Copy config.example.json -> config.json
echo  3. Fill in your Supabase URL + anon key
echo  4. Add your camera IPs to the cameras array
echo  5. Right-click agent.exe -> Run as Administrator
echo ============================================
pause
