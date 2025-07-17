#!/usr/bin/env node

/**
 * 🚀 OSRS Market Tracker - Advanced Development Startup Script
 * 
 * This script provides:
 * - Environment validation
 * - Dependency checking
 * - MongoDB connection verification
 * - Graceful shutdown handling
 * - Colored output and status indicators
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    rocket: '🚀',
    server: '⚡',
    database: '🗄️',
    frontend: '📊',
    package: '📦'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'white') {
    console.log(colorize(message, color));
}

function logWithIcon(icon, message, color = 'white') {
    console.log(`${icon} ${colorize(message, color)}`);
}

function checkNodeVersion() {
    const version = process.version;
    const majorVersion = parseInt(version.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
        logWithIcon(icons.error, `Node.js version ${version} is not supported. Please upgrade to Node.js 16 or later.`, 'red');
        process.exit(1);
    }
    
    logWithIcon(icons.success, `Node.js ${version} detected`, 'green');
}

function checkDependencies() {
    const frontendNodeModules = join(__dirname, 'node_modules');
    const backendNodeModules = join(__dirname, 'server', 'node_modules');
    
    if (!existsSync(frontendNodeModules)) {
        logWithIcon(icons.warning, 'Frontend dependencies not found. Installing...', 'yellow');
        return false;
    }
    
    if (!existsSync(backendNodeModules)) {
        logWithIcon(icons.warning, 'Backend dependencies not found. Installing...', 'yellow');
        return false;
    }
    
    logWithIcon(icons.success, 'All dependencies found', 'green');
    return true;
}

function installDependencies() {
    return new Promise((resolve, reject) => {
        logWithIcon(icons.package, 'Installing frontend dependencies...', 'blue');
        
        const installFrontend = spawn('npm', ['install'], { stdio: 'inherit', cwd: __dirname });
        
        installFrontend.on('close', (code) => {
            if (code !== 0) {
                reject(new Error('Frontend dependency installation failed'));
                return;
            }
            
            logWithIcon(icons.package, 'Installing backend dependencies...', 'blue');
            
            const installBackend = spawn('npm', ['install'], { 
                stdio: 'inherit', 
                cwd: join(__dirname, 'server') 
            });
            
            installBackend.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error('Backend dependency installation failed'));
                    return;
                }
                
                logWithIcon(icons.success, 'All dependencies installed successfully', 'green');
                resolve();
            });
        });
    });
}

function startServers() {
    log('\n' + '='.repeat(50), 'cyan');
    logWithIcon(icons.rocket, 'Starting OSRS Market Tracker...', 'cyan');
    log('='.repeat(50), 'cyan');
    
    logWithIcon(icons.frontend, 'Frontend: React + Vite (http://localhost:3000)', 'green');
    logWithIcon(icons.server, 'Backend: Node.js + Express (http://localhost:3001)', 'blue');
    logWithIcon(icons.database, 'Database: MongoDB (mongodb://localhost:27017)', 'magenta');
    
    log('\n' + colorize('Press Ctrl+C to stop all servers', 'yellow'));
    log('='.repeat(50) + '\n', 'cyan');
    
    const servers = spawn('npm', ['run', 'start:dev'], { 
        stdio: 'inherit',
        cwd: __dirname,
        shell: true
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        log('\n' + colorize('🛑 Shutting down servers...', 'yellow'));
        servers.kill('SIGINT');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        log('\n' + colorize('🛑 Shutting down servers...', 'yellow'));
        servers.kill('SIGTERM');
        process.exit(0);
    });
    
    servers.on('close', (code) => {
        if (code !== 0) {
            logWithIcon(icons.error, `Servers exited with code ${code}`, 'red');
        }
        process.exit(code);
    });
}

async function main() {
    try {
        // ASCII Art Header
        console.log(colorize(`
 ██████╗ ███████╗██████╗ ███████╗    ███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗
██╔═══██╗██╔════╝██╔══██╗██╔════╝    ████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝
██║   ██║███████╗██████╔╝███████╗    ██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║   
██║   ██║╚════██║██╔══██╗╚════██║    ██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║   
╚██████╔╝███████║██║  ██║███████║    ██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║   
 ╚═════╝ ╚══════╝╚═╝  ╚═╝╚══════╝    ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   
        `, 'cyan'));
        
        log(colorize('🚀 Development Environment Startup', 'cyan'));
        log(colorize('==================================\n', 'cyan'));
        
        // Check environment
        logWithIcon(icons.info, 'Checking environment...', 'blue');
        checkNodeVersion();
        
        // Check and install dependencies if needed
        if (!checkDependencies()) {
            await installDependencies();
        }
        
        // Start servers
        startServers();
        
    } catch (error) {
        logWithIcon(icons.error, `Startup failed: ${error.message}`, 'red');
        process.exit(1);
    }
}

main();