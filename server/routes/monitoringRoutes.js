/**
 * 📊 Monitoring Routes - Context7 Optimized
 *
 * Context7 Pattern: Express Router with Modern Patterns
 * - Layered architecture with proper separation
 * - Middleware integration for validation and security
 * - Consistent error handling and response formatting
 * - Performance monitoring and logging
 */

const express = require('express');
const { MonitoringController } = require('../controllers/MonitoringController');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');
const { validateRequest } = require('../validators/MonitoringValidator');

const router = express.Router();

// Context7 Pattern: Initialize dependencies
const monitoringController = new MonitoringController();
const requestMiddleware = new RequestMiddleware();
const errorMiddleware = new ErrorMiddleware();

// Context7 Pattern: Apply middleware to all routes
router.use(requestMiddleware.performanceMonitoring());
router.use(requestMiddleware.requestTracking());

/**
 * Context7 Pattern: GET /api/live-monitoring
 * Retrieve live monitoring data with optional limit
 */
router.get(
  '/live-monitoring',
  requestMiddleware.validateRequest({
    query: {
      limit: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.getLiveData)
);

/**
 * Context7 Pattern: POST /api/live-monitoring
 * Save new live monitoring data
 */
router.post(
  '/live-monitoring',
  requestMiddleware.requestSizeLimit({ limit: '1mb' }),
  requestMiddleware.validateRequest({
    body: {
      timestamp: { type: 'number', required: true },
      apiRequests: { type: 'number', required: true, min: 0 },
      successRate: { type: 'number', required: true, min: 0, max: 100 },
      itemsProcessed: { type: 'number', required: true, min: 0 },
      profit: { type: 'number', required: true },
      memoryUsage: { type: 'number', required: true, min: 0 },
      responseTime: { type: 'number', required: true, min: 0 },
      rateLimitStatus: {
        type: 'string',
        required: true,
        enum: ['HEALTHY', 'THROTTLED', 'COOLDOWN', 'OVERLOADED']
      },
      itemSelectionEfficiency: { type: 'number', required: true, min: 0, max: 100 },
      dataQuality: { type: 'number', required: true, min: 0, max: 100 }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.saveLiveData)
);

/**
 * Context7 Pattern: GET /api/live-monitoring/stream
 * Server-Sent Events for real-time monitoring data
 */
router.get(
  '/live-monitoring/stream',
  errorMiddleware.handleAsyncError(monitoringController.getStreamData)
);

/**
 * Context7 Pattern: GET /api/live-activity
 * Retrieve live activity data (alias for live-monitoring for frontend compatibility)
 */
router.get(
  '/live-activity',
  requestMiddleware.validateRequest({
    query: {
      limit: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.getLiveData)
);

/**
 * Context7 Pattern: GET /api/aggregated-stats
 * Retrieve aggregated statistics with optional time range
 */
router.get(
  '/aggregated-stats',
  requestMiddleware.validateRequest({
    query: {
      timeRange: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.getAggregatedStats)
);

/**
 * Context7 Pattern: GET /api/system-status
 * Retrieve comprehensive system status
 */
router.get(
  '/system-status',
  errorMiddleware.handleAsyncError(monitoringController.getSystemStatus)
);

/**
 * Context7 Pattern: GET /api/efficiency-metrics
 * Retrieve efficiency metrics and performance indicators
 */
router.get(
  '/efficiency-metrics',
  errorMiddleware.handleAsyncError(monitoringController.getEfficiencyMetrics)
);

/**
 * Context7 Pattern: GET /api/health
 * Health check endpoint for monitoring services
 */
router.get(
  '/health',
  errorMiddleware.handleAsyncError(monitoringController.getHealthStatus)
);

/**
 * Context7 Pattern: POST /api/cleanup
 * Perform database cleanup operations
 */
router.post(
  '/cleanup',
  requestMiddleware.validateRequest({
    body: {
      maxAge: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.performCleanup)
);

/**
 * Context7 Pattern: GET /api/monitoring/dashboard
 * Get dashboard data with combined metrics
 */
router.get(
  '/dashboard',
  errorMiddleware.handleAsyncError(monitoringController.getDashboardData)
);

/**
 * Context7 Pattern: GET /api/monitoring/alerts
 * Get current system alerts and warnings
 */
router.get(
  '/alerts',
  errorMiddleware.handleAsyncError(monitoringController.getAlerts)
);

/**
 * Context7 Pattern: POST /api/monitoring/alerts/acknowledge
 * Acknowledge system alerts
 */
router.post(
  '/alerts/acknowledge',
  requestMiddleware.validateRequest({
    body: {
      alertId: { type: 'string', required: true },
      acknowledgedBy: { type: 'string', required: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.acknowledgeAlert)
);

/**
 * Context7 Pattern: GET /api/monitoring/metrics/export
 * Export monitoring metrics in various formats
 */
router.get(
  '/metrics/export',
  requestMiddleware.validateRequest({
    query: {
      format: { type: 'string', enum: ['json', 'csv', 'prometheus'], optional: true },
      timeRange: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.exportMetrics)
);

/**
 * Context7 Pattern: GET /api/monitoring/performance
 * Get detailed performance metrics
 */
router.get(
  '/performance',
  requestMiddleware.validateRequest({
    query: {
      metric: { type: 'string', enum: ['cpu', 'memory', 'database', 'api'], optional: true },
      timeRange: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.getPerformanceMetrics)
);

/**
 * Context7 Pattern: POST /api/monitoring/test
 * Test monitoring system functionality
 */
router.post(
  '/test',
  requestMiddleware.validateRequest({
    body: {
      testType: { type: 'string', enum: ['database', 'cache', 'external'], required: true },
      parameters: { type: 'object', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(monitoringController.runTest)
);

/**
 * Context7 Pattern: Error handling middleware
 */
router.use(errorMiddleware.handleError);

/**
 * Context7 Pattern: 404 handler for monitoring routes
 */
router.use(errorMiddleware.handleNotFound);

module.exports = router;
