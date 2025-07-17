/**
 * 🚀 Routes Index - Context7 Optimized
 * 
 * Context7 Pattern: Centralized Route Management
 * - Modular route organization
 * - Consistent middleware application
 * - API versioning support
 * - Performance monitoring
 */

const express = require('express');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

const router = express.Router();

// Context7 Pattern: Initialize dependencies
const requestMiddleware = new RequestMiddleware();
const errorMiddleware = new ErrorMiddleware();
const logger = new Logger('RouteIndex');

// Context7 Pattern: Import route modules
const monitoringRoutes = require('./monitoringRoutes');
const marketDataRoutes = require('./marketDataRoutes');
const aiTradingRoutes = require('./aiTradingRoutes');
const autoTrainingRoutes = require('./autoTrainingRoutes');
const itemMappingRoutes = require('./itemMappingRoutes');
const osrsScraperRoutes = require('./osrsScraperRoutes');

// Context7 Pattern: Apply global middleware
router.use(requestMiddleware.cors());
router.use(requestMiddleware.securityHeaders());
router.use(requestMiddleware.sanitizeRequest());
router.use(requestMiddleware.apiVersioning());

/**
 * Context7 Pattern: API Root endpoint
 */
router.get('/', (req, res) => {
  const apiInfo = {
    name: 'OSRS Market Tracker API',
    version: '1.0.0',
    description: 'Context7 optimized API for OSRS market data tracking and monitoring',
    architecture: 'Layered Context7 Architecture',
    features: [
      'Real-time market data tracking',
      'Live monitoring with Server-Sent Events',
      'Advanced analytics and insights',
      'Intelligent item selection',
      'Performance monitoring',
      'Robust error handling',
      'AI-powered trading system',
      'Neural network-based predictions',
      'Adaptive learning algorithms',
      'Technical analysis integration',
      'Automated training orchestration',
      'Smart item selection algorithms'
    ],
    endpoints: {
      monitoring: {
        baseUrl: '/api',
        routes: [
          'GET /live-monitoring - Get live monitoring data',
          'POST /live-monitoring - Save monitoring data',
          'GET /live-monitoring/stream - Real-time monitoring stream',
          'GET /aggregated-stats - Get aggregated statistics',
          'GET /system-status - Get system status',
          'GET /efficiency-metrics - Get efficiency metrics',
          'GET /health - Health check',
          'POST /cleanup - Perform data cleanup'
        ]
      },
      marketData: {
        baseUrl: '/api/market-data',
        routes: [
          'GET / - Get market data with filtering',
          'POST / - Save market data',
          'GET /summary - Get market data summary',
          'GET /item/:itemId/history - Get item price history',
          'GET /top-items - Get top traded items',
          'GET /search - Search items by name',
          'GET /analytics - Get market analytics',
          'GET /recommendations - Get trading recommendations',
          'GET /export - Export market data'
        ]
      },
      aiTrading: {
        baseUrl: '/api/ai-trading',
        routes: [
          'GET / - API documentation',
          'POST /sessions - Start AI trading session',
          'GET /sessions - Get active sessions',
          'GET /system-status - Get system status',
          'DELETE /sessions/:id - Stop trading session',
          'POST /sessions/:id/pause - Pause session',
          'POST /sessions/:id/resume - Resume session',
          'POST /sessions/:id/process-market-data - Process market data',
          'GET /sessions/:id/progress - Get training progress',
          'GET /sessions/:id/analytics - Get performance analytics',
          'POST /sessions/:id/save-model - Save AI model',
          'POST /sessions/:id/load-model - Load AI model',
          'GET /sessions/:id/export - Export training data',
          'POST /signals - Generate trading signals'
        ]
      },
      autoTraining: {
        baseUrl: '/api/auto-training',
        routes: [
          'POST /start - Start auto training service',
          'POST /stop - Stop auto training service',
          'GET /status - Get auto training status',
          'PUT /config - Update auto training configuration',
          'POST /trigger - Manually trigger training cycle',
          'GET /report - Export full training report',
          'POST /model/save - Save AI model',
          'POST /model/load - Load AI model',
          'GET /data/historical - Get historical data',
          'GET /data/timeseries/:itemId - Get item timeseries',
          'GET /services - Get all active training services',
          'GET /health - Get system health'
        ]
      },
      itemMapping: {
        baseUrl: '/api/items',
        routes: [
          'POST /import - Import all item mappings (one-time)',
          'GET /health - Health check',
          'GET /sync/status - Get synchronization status',
          'GET /search - Search items by name',
          'GET /high-value - Get high-value items',
          'GET /category/:category - Get items by category',
          'GET / - Get items with pagination',
          'GET /:itemId - Get single item by ID',
          'POST / - Create new item (admin)',
          'PUT /:itemId - Update item (admin)',
          'DELETE /:itemId - Delete item (admin)'
        ]
      },
      osrsScraper: {
        baseUrl: '/api/osrs-scraper',
        routes: [
          'POST /import/start - Start comprehensive OSRS data import',
          'GET /status - Get current scraping operation status', 
          'GET /data/latest - Get latest scraped market data',
          'GET /patterns - Get detected market patterns and anomalies',
          'GET /search - Search for specific item data',
          'GET /health - Get scraper service health status',
          'GET / - API documentation and endpoints'
        ]
      }
    },
    rateLimits: {
      general: '120 requests per minute',
      dataIngestion: '30 requests per minute',
      export: '10 requests per hour',
      streaming: '10 connections per minute'
    },
    authentication: 'None required (public API)',
    dataFormats: ['JSON', 'CSV', 'Excel'],
    realTimeFeatures: ['Server-Sent Events', 'WebSocket fallback'],
    caching: 'Redis-compatible in-memory caching',
    monitoring: 'Comprehensive performance and error monitoring'
  };

  return ApiResponse.success(res, apiInfo, 'OSRS Market Tracker API - Context7 Optimized');
});

/**
 * Context7 Pattern: API Status endpoint
 */
router.get('/status', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Quick health checks
    const status = {
      api: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      cpu: process.cpuUsage(),
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        mongodb: 'checking',
        cache: 'operational',
        logging: 'operational'
      }
    };

    return ApiResponse.success(res, status, 'API Status Check');
  } catch (error) {
    logger.error('Status check failed', error);
    return ApiResponse.error(res, 'Status check failed', error.message, 500);
  }
});

/**
 * Context7 Pattern: API Documentation endpoint
 */
router.get('/docs', (req, res) => {
  const documentation = {
    title: 'OSRS Market Tracker API Documentation',
    version: '1.0.0',
    description: 'Comprehensive API documentation for the Context7 optimized OSRS Market Tracker',
    baseUrl: req.protocol + '://' + req.get('host') + '/api',
    authentication: {
      type: 'None',
      description: 'This is a public API, no authentication required'
    },
    rateLimiting: {
      description: 'Rate limiting is applied per IP address',
      limits: {
        general: '120 requests per minute',
        dataIngestion: '30 requests per minute',
        export: '10 requests per hour',
        streaming: '10 connections per minute'
      },
      headers: {
        'X-RateLimit-Limit': 'Maximum requests allowed',
        'X-RateLimit-Remaining': 'Remaining requests in current window',
        'X-RateLimit-Reset': 'Reset time for rate limit window'
      }
    },
    errorHandling: {
      format: 'Standardized JSON error responses',
      structure: {
        success: false,
        error: {
          type: 'ERROR_TYPE',
          message: 'Human readable error message',
          details: 'Additional error details (dev only)'
        },
        meta: {
          timestamp: 'ISO timestamp',
          requestId: 'Unique request identifier'
        }
      }
    },
    dataFormats: {
      input: ['JSON'],
      output: ['JSON', 'CSV', 'Excel', 'Server-Sent Events']
    },
    endpoints: '/api/ - See root endpoint for detailed endpoint list'
  };

  return ApiResponse.success(res, documentation, 'API Documentation');
});

/**
 * Context7 Pattern: API Metrics endpoint
 */
router.get('/metrics', requestMiddleware.rateLimit({ windowMs: 60000, max: 30 }), (req, res) => {
  const metrics = {
    requests: {
      total: 'Not implemented - would track total requests',
      perMinute: 'Not implemented - would track requests per minute',
      byEndpoint: 'Not implemented - would track requests by endpoint'
    },
    performance: {
      averageResponseTime: 'Not implemented - would track average response time',
      slowestEndpoints: 'Not implemented - would track slowest endpoints'
    },
    errors: {
      total: 'Not implemented - would track total errors',
      byType: 'Not implemented - would track errors by type'
    },
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };

  return ApiResponse.success(res, metrics, 'API Metrics');
});

/**
 * Context7 Pattern: Mount route modules
 */
router.use('/', monitoringRoutes);
router.use('/market-data', marketDataRoutes);
router.use('/ai-trading', aiTradingRoutes);
router.use('/auto-training', autoTrainingRoutes);
router.use('/items', itemMappingRoutes);
router.use('/osrs-scraper', osrsScraperRoutes);

/**
 * Context7 Pattern: Health check endpoint (simplified)
 */
router.get('/ping', (req, res) => {
  return ApiResponse.success(res, { 
    message: 'pong',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, 'Health Check');
});

/**
 * Context7 Pattern: API Version endpoint
 */
router.get('/version', (req, res) => {
  return ApiResponse.success(res, {
    version: '1.0.0',
    apiVersion: 'v1',
    build: process.env.BUILD_NUMBER || 'development',
    commit: process.env.GIT_COMMIT || 'unknown',
    deployedAt: process.env.DEPLOY_TIME || new Date().toISOString()
  }, 'API Version Information');
});

/**
 * Context7 Pattern: Request info endpoint (debugging)
 */
router.get('/request-info', (req, res) => {
  const requestInfo = {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query,
    params: req.params,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    requestId: req.id
  };

  return ApiResponse.success(res, requestInfo, 'Request Information');
});

/**
 * Context7 Pattern: Environment info endpoint
 */
router.get('/environment', (req, res) => {
  const environment = {
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    environment: process.env.NODE_ENV || 'development',
    timezone: process.env.TZ || 'UTC',
    uptime: process.uptime(),
    processId: process.pid,
    workingDirectory: process.cwd()
  };

  return ApiResponse.success(res, environment, 'Environment Information');
});

module.exports = router;