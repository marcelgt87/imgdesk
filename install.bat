@echo off
echo Installing ImageDesk Native Desktop Application...

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo Installing dependencies...
npm install

echo.
echo Installation complete!
echo.
echo To run the application:
echo   npm start
echo.
echo To build for Windows:
echo   npm run build-win
echo.
echo To build for Linux:
echo   npm run build-linux
echo.
echo To build for macOS:
echo   npm run build-mac
echo.
pause