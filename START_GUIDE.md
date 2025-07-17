# 🚀 OSRS Market Tracker - Startup Guide

This guide provides multiple ways to start both the frontend and backend servers for the OSRS Market Tracker application.

## Quick Start Methods

### Method 1: NPM Scripts (Recommended)

The easiest way to start both servers:

```bash
# Install dependencies (if needed)
npm install
cd server && npm install && cd ..

# Start both frontend and backend with colored output
npm run start:dev

# Or basic start without colors
npm run start
```

### Method 2: Shell Script (Unix/Linux/macOS)

```bash
# Make executable (first time only)
chmod +x start.sh

# Run the script
./start.sh
```

### Method 3: Batch Script (Windows)

```cmd
# Double-click or run from command prompt
start.bat
```

### Method 4: Advanced Node.js Script

```bash
# Make executable (first time only)
chmod +x dev-start.js

# Run the advanced startup script
./dev-start.js
```

## What Gets Started

When you run any of the startup methods, the following services will be launched:

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend** | 3000 | http://localhost:3000 | React + Vite development server |
| **Backend** | 3001 | http://localhost:3001 | Node.js + Express API server |
| **Database** | 27017 | mongodb://localhost:27017 | MongoDB (must be running separately) |

## Prerequisites

### Required Software
- **Node.js** (v16 or later)
- **npm** (comes with Node.js)
- **MongoDB** (v4.4 or later)

### Optional (for development)
- **MongoDB Compass** (GUI for MongoDB)
- **Postman** (API testing)

## Environment Setup

### 1. Install Node.js
```bash
# Check if Node.js is installed
node --version
npm --version

# If not installed, download from https://nodejs.org/
```

### 2. Install MongoDB
```bash
# macOS with Homebrew
brew install mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### 3. Clone and Setup Project
```bash
# Clone the repository
git clone <repository-url>
cd osrs-market

# Install dependencies
npm install
cd server && npm install && cd ..
```

## Available Scripts

### Frontend Scripts
- `npm run dev` - Start frontend development server only
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint on frontend code
- `npm run preview` - Preview production build

### Backend Scripts
- `npm run server` - Start backend server only
- `cd server && npm run dev` - Start backend in development mode
- `cd server && npm start` - Start backend in production mode

### Full Stack Scripts
- `npm run start` - Start both servers (basic)
- `npm run start:dev` - Start both servers with colored output
- `npm run client` - Start frontend only (alias for dev)

## Development Workflow

1. **First Time Setup**
   ```bash
   ./start.sh  # This will install dependencies automatically
   ```

2. **Daily Development**
   ```bash
   npm run start:dev
   ```

3. **Individual Server Development**
   ```bash
   # Frontend only
   npm run dev
   
   # Backend only
   npm run server
   ```

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill processes on ports 3000 and 3001
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

**MongoDB Connection Failed**
```bash
# Check if MongoDB is running
sudo systemctl status mongod  # Linux
brew services list | grep mongodb  # macOS

# Start MongoDB if not running
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

**Dependencies Not Found**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# Do the same for backend
cd server
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables

Create a `.env` file in the root directory:
```env
# Frontend
VITE_API_URL=http://localhost:3001

# Backend (create server/.env)
PORT=3001
MONGODB_URI=mongodb://localhost:27017/osrs_market
NODE_ENV=development
```

## Production Deployment

### Build for Production
```bash
# Build frontend
npm run build

# The built files will be in the 'dist' directory
# Serve them using the backend server or a static file server
```

### Start in Production Mode
```bash
# Start backend in production mode
cd server && npm start

# The backend will serve the built frontend files
```

## IDE Integration

### VS Code
Recommended extensions:
- ES7+ React/Redux/React-Native snippets
- TypeScript Hero
- MongoDB for VS Code
- Thunder Client (API testing)

### Launch Configuration
Add to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Full Stack",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dev-start.js",
      "console": "integratedTerminal"
    }
  ]
}
```

## Docker Support (Optional)

If you prefer Docker, create these files:

### docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - backend
      
  backend:
    build: ./server
    ports:
      - "3001:3001"
    depends_on:
      - mongodb
      
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
```

Start with Docker:
```bash
docker-compose up
```

## Support

If you encounter any issues:
1. Check this guide first
2. Look at the console output for error messages
3. Verify MongoDB is running
4. Check that ports 3000 and 3001 are available
5. Ensure all dependencies are installed

For development questions, check the main project README.md file.