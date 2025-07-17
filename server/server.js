/**
 * 🚀 OSRS Market Tracker Server - Context7 Optimized
 * 
 * Context7 Pattern: Modern Express.js Application Architecture
 * - Layered architecture with proper separation of concerns
 * - Centralized error handling and logging
 * - Comprehensive middleware stack
 * - Performance monitoring and optimization
 * - Graceful shutdown and resource management
 */

const express = require('express');
const path = require('path');
const { Logger } = require('./utils/Logger');
const { ApiResponse } = require('./utils/ApiResponse');
const { RequestMiddleware } = require('./middleware/RequestMiddleware');
const { ErrorMiddleware } = require('./middleware/ErrorMiddleware');
const apiRoutes = require('./routes/index');

// Context7 Pattern: Initialize application
const app = express();
const PORT = process.env.PORT || 3001;
const logger = new Logger('Server');

// Context7 Pattern: Initialize middleware
const requestMiddleware = new RequestMiddleware();
const errorMiddleware = new ErrorMiddleware();

// Context7 Pattern: Application configuration
const config = {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
  mongodb: {
    connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
    databaseName: process.env.MONGODB_DATABASE || 'osrs_market_tracker'
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  },
  security: {
    trustProxy: process.env.TRUST_PROXY === 'true',
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // requests per window
    }
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

/**
 * Context7 Pattern: Application Setup
 */
async function setupApplication() {
  try {
    logger.info('Starting Context7 optimized OSRS Market Tracker server', {
      environment: config.environment,
      port: config.port,
      nodeVersion: process.version
    });

    // Context7 Pattern: Trust proxy configuration
    if (config.security.trustProxy) {
      app.set('trust proxy', 1);
    }

    // Context7 Pattern: Global middleware stack
    app.use(requestMiddleware.cors(config.cors));
    app.use(requestMiddleware.securityHeaders());
    app.use(requestMiddleware.requestTracking());
    app.use(requestMiddleware.performanceMonitoring());
    app.use(requestMiddleware.rateLimit(config.security.rateLimiting));
    
    // Context7 Pattern: Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Context7 Pattern: Request sanitization
    app.use(requestMiddleware.sanitizeRequest());
    
    // Context7 Pattern: Static file serving
    app.use(express.static(path.join(__dirname, '../dist'), {
      maxAge: config.environment === 'production' ? '1d' : '0',
      etag: true,
      lastModified: true
    }));

    // Context7 Pattern: API routes
    app.use('/api', apiRoutes);

    // Context7 Pattern: React app serving for SPA
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return errorMiddleware.handleNotFound(req, res);
      }
      
      res.sendFile(path.join(__dirname, '../dist/index.html'));
    });

    // Context7 Pattern: Error handling middleware
    app.use(errorMiddleware.handleError);

    logger.info('Application setup completed successfully');
    return app;
  } catch (error) {
    logger.error('Failed to setup application', error);
    throw error;
  }
}

/**
 * Context7 Pattern: Server startup
 */
async function startServer() {
  try {
    const app = await setupApplication();
    
    const server = app.listen(config.port, () => {
      logger.startup('OSRS Market Tracker', '1.0.0', config.port, {
        environment: config.environment,
        mongodb: config.mongodb.connectionString,
        cors: config.cors.origin
      });
      
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📊 Dashboard: http://localhost:${config.port}`);
      console.log(`🔗 API: http://localhost:${config.port}/api`);
      console.log(`✅ Context7 optimizations active:`);
      console.log(`   - Layered architecture with proper separation`);
      console.log(`   - Centralized error handling and logging`);
      console.log(`   - Performance monitoring and optimization`);
      console.log(`   - Request validation and sanitization`);
      console.log(`   - Rate limiting and security headers`);
      console.log(`   - Graceful shutdown handling`);
    });

    // Context7 Pattern: Server error handling
    server.on('error', (error) => {
      logger.error('Server error', error);
      
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
        process.exit(1);
      }
    });

    // Context7 Pattern: Graceful shutdown setup
    setupGracefulShutdown(server);
    
    return server;
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

/**
 * Context7 Pattern: Graceful shutdown handling
 */
function setupGracefulShutdown(server) {
  const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close database connections and cleanup resources
        await performCleanup();
        
        logger.shutdown('OSRS Market Tracker', 'Graceful shutdown', {
          signal,
          uptime: process.uptime()
        });
        
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', error);
        process.exit(1);
      }
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forcing shutdown after 30 seconds');
      process.exit(1);
    }, 30000);
  };
  
  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

/**
 * Context7 Pattern: Application cleanup
 */
async function performCleanup() {
  logger.info('Performing application cleanup');
  
  try {
    // Cleanup operations would go here
    // For example: close database connections, clear caches, etc.
    logger.info('Application cleanup completed');
  } catch (error) {
    logger.error('Error during cleanup', error);
    throw error;
  }
}

/**
 * Context7 Pattern: Process error handling
 */
function setupProcessErrorHandling() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal('Uncaught Exception', error);
    
    // Perform emergency cleanup
    performCleanup()
      .finally(() => {
        process.exit(1);
      });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal('Unhandled Rejection', reason, {
      promise: promise.toString()
    });
    
    // Perform emergency cleanup
    performCleanup()
      .finally(() => {
        process.exit(1);
      });
  });

  // Handle warning events
  process.on('warning', (warning) => {
    logger.warn('Process warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack
    });
  });
}

/**
 * Context7 Pattern: Health monitoring
 */
function setupHealthMonitoring() {
  // Memory usage monitoring
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const memoryUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    if (memoryUsedMB > 500) { // 500MB threshold
      logger.warn('High memory usage detected', {
        memoryUsedMB,
        memoryUsage
      });
    }
  }, 60000); // Check every minute
  
  // CPU usage monitoring
  let previousCpuUsage = process.cpuUsage();
  setInterval(() => {
    const currentCpuUsage = process.cpuUsage(previousCpuUsage);
    const cpuPercent = (currentCpuUsage.user + currentCpuUsage.system) / 1000000; // Convert to seconds
    
    if (cpuPercent > 80) { // 80% threshold
      logger.warn('High CPU usage detected', {
        cpuPercent,
        cpuUsage: currentCpuUsage
      });
    }
    
    previousCpuUsage = process.cpuUsage();
  }, 30000); // Check every 30 seconds
}

/**
 * Context7 Pattern: Application initialization
 */
async function initialize() {
  try {
    logger.info('Initializing Context7 optimized OSRS Market Tracker');
    
    // Setup error handling
    setupProcessErrorHandling();
    
    // Setup health monitoring
    setupHealthMonitoring();
    
    // Start the server
    await startServer();
    
    logger.info('OSRS Market Tracker initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', error);
    process.exit(1);
  }
}

// Context7 Pattern: Start the application
if (require.main === module) {
  initialize().catch((error) => {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  });
}

module.exports = {
  app: setupApplication,
  config,
  startServer,
  initialize
};