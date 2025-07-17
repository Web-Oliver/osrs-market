@echo off
REM 🚀 OSRS Market Tracker - Full Stack Startup Script (Windows)
REM This script starts both the frontend and backend servers

echo 🚀 Starting OSRS Market Tracker...
echo =====================================
echo.
echo 📊 Frontend: React + Vite (Port 3000)
echo ⚡ Backend: Node.js + Express (Port 3001)  
echo 🗄️ Database: MongoDB (Port 27017)
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing frontend dependencies...
    npm install
)

REM Check if server node_modules exists
if not exist "server\node_modules" (
    echo 📦 Installing backend dependencies...
    cd server && npm install && cd ..
)

REM Start both servers
echo 🚀 Starting servers...
npm run start:dev

REM Keep the window open if there's an error
if errorlevel 1 (
    echo.
    echo ❌ An error occurred while starting the servers
    pause
)