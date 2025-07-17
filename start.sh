#!/bin/bash

# 🚀 OSRS Market Tracker - Full Stack Startup Script
# This script starts both the frontend and backend servers

echo "🚀 Starting OSRS Market Tracker..."
echo "=====================================

📊 Frontend: React + Vite (Port 3000)
⚡ Backend: Node.js + Express (Port 3001)
🗄️ Database: MongoDB (Port 27017)

"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Check if server node_modules exists
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
fi

# Function to handle cleanup on exit
cleanup() {
    echo "

🛑 Shutting down servers..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Start both servers
echo "🚀 Starting servers..."
npm run start:dev

# Wait for user input
wait