/**
 * 🚨 Market Alerts Routes - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Route Module
 * - SOLID: Single Responsibility Principle (SRP) - ONLY alert management operations
 * - DRY: Reusable alert validation and notification patterns
 * - Clean separation of concerns for alert functionality
 * - Focused responsibility: Alert CRUD, notifications, and monitoring
 */

const express = require('express');
const { getControllerFactory } = require('../../factories/ControllerFactory');
const { ValidationMiddleware } = require('../../middleware/ValidationMiddleware');
const { ErrorHandler } = require('../../middleware/ErrorHandler');
const { AppConstants } = require('../../config/AppConstants');

const router = express.Router();

// Context7 Pattern: Use ControllerFactory for proper dependency injection
const controllerFactory = getControllerFactory();
const marketDataController = controllerFactory.createMarketDataController();
const validationMiddleware = new ValidationMiddleware();
const errorHandler = new ErrorHandler();

// Context7 Pattern: Apply alerts-specific middleware
router.use(validationMiddleware.requestTracking());
router.use(validationMiddleware.performanceMonitoring());

// Context7 Pattern: Alert-specific rate limiting (moderate limit)
router.use(validationMiddleware.rateLimit({
  windowMs: AppConstants.RATE_LIMITING.WINDOW_MS,
  maxRequests: Math.floor(AppConstants.RATE_LIMITING.MAX_REQUESTS * 0.75), // 75% of standard limit
  message: 'Alert management rate limit exceeded'
}));

/**
 * Context7 Pattern: GET /api/market-data/alerts
 * Retrieve alerts for a user
 * SOLID: Single responsibility - alert retrieval
 */
router.get(
  '/',
  validationMiddleware.validate({
    query: {
      userId: { type: 'string', optional: true },
      type: { type: 'string', optional: true, enum: ['price', 'volume', 'margin', 'prediction', 'custom'] },
      status: { type: 'string', optional: true, enum: ['active', 'paused', 'triggered', 'expired'] },
      limit: { type: 'string', optional: true, max: 100 },
      sortBy: { type: 'string', optional: true, enum: ['created', 'updated', 'priority', 'type'] },
      sortOrder: { type: 'string', optional: true, enum: ['asc', 'desc'] }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getAlerts)
);

/**
 * Context7 Pattern: POST /api/market-data/alerts
 * Create a new alert
 * SOLID: Single responsibility - alert creation
 */
router.post(
  '/',
  validationMiddleware.validate({
    body: {
      itemId: { type: 'number', required: true, min: AppConstants.OSRS.MIN_ITEM_ID, max: AppConstants.OSRS.MAX_ITEM_ID },
      type: { type: 'string', required: true, enum: ['price', 'volume', 'margin', 'prediction', 'custom'] },
      condition: { type: 'string', required: true, enum: ['above', 'below', 'equals', 'change_percent', 'change_absolute'] },
      threshold: { type: 'number', required: true },
      email: { type: 'string', optional: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      webhook: { type: 'string', optional: true },
      userId: { type: 'string', optional: true },
      priority: { type: 'string', optional: true, enum: ['low', 'medium', 'high', 'critical'] },
      description: { type: 'string', optional: true, maxLength: 500 },
      expiresAt: { type: 'string', optional: true }, // ISO timestamp
      cooldownMinutes: { type: 'number', optional: true, min: 1, max: 1440 }, // Max 24 hours
      metadata: { type: 'object', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.createAlert)
);

/**
 * Context7 Pattern: PUT /api/market-data/alerts/:alertId
 * Update an existing alert
 * SOLID: Single responsibility - alert modification
 */
router.put(
  '/:alertId',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    },
    body: {
      type: { type: 'string', optional: true, enum: ['price', 'volume', 'margin', 'prediction', 'custom'] },
      condition: { type: 'string', optional: true, enum: ['above', 'below', 'equals', 'change_percent', 'change_absolute'] },
      threshold: { type: 'number', optional: true },
      email: { type: 'string', optional: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      webhook: { type: 'string', optional: true },
      priority: { type: 'string', optional: true, enum: ['low', 'medium', 'high', 'critical'] },
      description: { type: 'string', optional: true, maxLength: 500 },
      status: { type: 'string', optional: true, enum: ['active', 'paused'] },
      expiresAt: { type: 'string', optional: true },
      cooldownMinutes: { type: 'number', optional: true, min: 1, max: 1440 },
      metadata: { type: 'object', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const updateData = req.body;

    // Add update metadata
    updateData.updatedAt = Date.now();
    updateData.updatedBy = req.body.userId || 'system';

    // Update alert (would integrate with alert service)
    const updatedAlert = {
      id: alertId,
      ...updateData,
      version: Date.now() // Simple versioning
    };

    res.json({
      success: true,
      data: updatedAlert,
      message: 'Alert updated successfully',
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: DELETE /api/market-data/alerts/:alertId
 * Delete an alert
 * SOLID: Single responsibility - alert deletion
 */
router.delete(
  '/:alertId',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    },
    query: {
      userId: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.deleteAlert)
);

/**
 * Context7 Pattern: GET /api/market-data/alerts/:alertId
 * Get specific alert details
 * SOLID: Single responsibility - individual alert retrieval
 */
router.get(
  '/:alertId',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    },
    query: {
      includeHistory: { type: 'string', optional: true },
      includeStats: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const includeHistory = req.query.includeHistory === 'true';
    const includeStats = req.query.includeStats === 'true';

    // Retrieve alert details (would integrate with alert service)
    const alertDetails = {
      id: alertId,
      // Alert data would be fetched here
      status: 'active',
      createdAt: Date.now() - 86400000, // 24 hours ago
      lastTriggered: null,
      triggerCount: 0,
      history: includeHistory ? [] : undefined,
      statistics: includeStats ? {
        triggerFrequency: '0/day',
        accuracy: '0%',
        avgResponseTime: '0ms'
      } : undefined
    };

    res.json({
      success: true,
      data: alertDetails,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: POST /api/market-data/alerts/:alertId/test
 * Test an alert (trigger manually for testing)
 * SOLID: Single responsibility - alert testing
 */
router.post(
  '/:alertId/test',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    },
    body: {
      mockData: { type: 'object', optional: true },
      sendNotification: { type: 'boolean', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { mockData, sendNotification = false } = req.body;

    // Test alert logic (would integrate with alert service)
    const testResult = {
      alertId,
      testTriggered: true,
      conditionMet: true,
      notificationSent: sendNotification,
      testData: mockData || {
        currentValue: 1000,
        threshold: 900,
        condition: 'above'
      },
      testedAt: Date.now(),
      responseTime: Math.random() * 100 // Simulated response time
    };

    res.json({
      success: true,
      data: testResult,
      message: 'Alert test completed successfully',
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: POST /api/market-data/alerts/:alertId/pause
 * Pause an alert
 * SOLID: Single responsibility - alert state management
 */
router.post(
  '/:alertId/pause',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    },
    body: {
      reason: { type: 'string', optional: true, maxLength: 200 },
      duration: { type: 'number', optional: true, min: 1 } // Duration in minutes
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { reason, duration } = req.body;

    // Pause alert (would integrate with alert service)
    const pausedAlert = {
      id: alertId,
      status: 'paused',
      pausedAt: Date.now(),
      pauseReason: reason || 'Manual pause',
      resumeAt: duration ? Date.now() + (duration * 60 * 1000) : null,
      pausedBy: req.body.userId || 'system'
    };

    res.json({
      success: true,
      data: pausedAlert,
      message: 'Alert paused successfully',
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: POST /api/market-data/alerts/:alertId/resume
 * Resume a paused alert
 * SOLID: Single responsibility - alert state management
 */
router.post(
  '/:alertId/resume',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    },
    body: {
      reason: { type: 'string', optional: true, maxLength: 200 }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const { reason } = req.body;

    // Resume alert (would integrate with alert service)
    const resumedAlert = {
      id: alertId,
      status: 'active',
      resumedAt: Date.now(),
      resumeReason: reason || 'Manual resume',
      resumedBy: req.body.userId || 'system'
    };

    res.json({
      success: true,
      data: resumedAlert,
      message: 'Alert resumed successfully',
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/alerts/history
 * Get alert notification history
 * SOLID: Single responsibility - alert history retrieval
 */
router.get(
  '/history',
  validationMiddleware.validate({
    query: {
      alertId: { type: 'string', optional: true },
      userId: { type: 'string', optional: true },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true },
      status: { type: 'string', optional: true, enum: ['sent', 'failed', 'pending'] },
      limit: { type: 'string', optional: true, max: 500 },
      sortBy: { type: 'string', optional: true, enum: ['timestamp', 'alertId', 'status'] },
      sortOrder: { type: 'string', optional: true, enum: ['asc', 'desc'] }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const filters = {
      alertId: req.query.alertId,
      userId: req.query.userId,
      status: req.query.status,
      timeRange: {
        start: req.query.startTime ? parseInt(req.query.startTime) : Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: req.query.endTime ? parseInt(req.query.endTime) : Date.now()
      }
    };

    // Retrieve alert history (would integrate with notification service)
    const alertHistory = {
      notifications: [], // Placeholder for actual history
      totalCount: 0,
      filters,
      pagination: {
        limit: Math.min(parseInt(req.query.limit) || 50, 500),
        sortBy: req.query.sortBy || 'timestamp',
        sortOrder: req.query.sortOrder || 'desc'
      },
      retrievedAt: Date.now()
    };

    res.json({
      success: true,
      data: alertHistory,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/alerts/stats
 * Get alert system statistics
 * SOLID: Single responsibility - alert statistics
 */
router.get(
  '/stats',
  validationMiddleware.validate({
    query: {
      userId: { type: 'string', optional: true },
      timeRange: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const timeRange = parseInt(req.query.timeRange) || (24 * 60 * 60 * 1000); // 24 hours default
    const userId = req.query.userId;

    // Generate alert statistics (would integrate with analytics service)
    const alertStats = {
      overview: {
        totalAlerts: 0,
        activeAlerts: 0,
        pausedAlerts: 0,
        triggeredToday: 0
      },
      performance: {
        avgResponseTime: '0ms',
        successRate: '0%',
        falsePositiveRate: '0%'
      },
      notifications: {
        emailsSent: 0,
        webhooksSent: 0,
        failedNotifications: 0
      },
      trends: {
        alertsCreatedTrend: '0%',
        triggerRateTrend: '0%'
      },
      timeRange: {
        start: Date.now() - timeRange,
        end: Date.now(),
        durationMs: timeRange
      },
      userId: userId || 'all',
      generatedAt: Date.now()
    };

    res.json({
      success: true,
      data: alertStats,
      timestamp: Date.now()
    });
  })
);

// Export the router
module.exports = router;