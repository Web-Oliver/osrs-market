/**
 * 📈 Market Data Routes - Context7 Optimized
 * 
 * Context7 Pattern: Express Router with Modern Patterns
 * - Layered architecture with proper separation
 * - Middleware integration for validation and security
 * - Consistent error handling and response formatting
 * - Performance monitoring and logging
 */

const express = require('express');
const { MarketDataController } = require('../controllers/MarketDataController');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');
const { validateRequest } = require('../validators/MarketDataValidator');

const router = express.Router();

// Context7 Pattern: Initialize dependencies
const marketDataController = new MarketDataController();
const requestMiddleware = new RequestMiddleware();
const errorMiddleware = new ErrorMiddleware();

// Context7 Pattern: Apply middleware to all routes
router.use(requestMiddleware.performanceMonitoring());
router.use(requestMiddleware.requestTracking());

/**
 * Context7 Pattern: GET /api/market-data
 * Retrieve market data with filtering and pagination
 */
router.get(
  '/',
  requestMiddleware.validateRequest({
    query: {
      itemId: { type: 'number', min: 1, optional: true },
      startTime: { type: 'number', min: 0, optional: true },
      endTime: { type: 'number', min: 0, optional: true },
      limit: { type: 'number', min: 1, max: 1000, optional: true },
      onlyTradeable: { type: 'boolean', optional: true },
      sortBy: { type: 'string', enum: ['timestamp', 'itemId', 'profit'], optional: true },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 120 }), // 120 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getMarketData)
);

/**
 * Context7 Pattern: POST /api/market-data
 * Save new market data with validation
 */
router.post(
  '/',
  requestMiddleware.requestSizeLimit({ limit: '10mb' }),
  requestMiddleware.validateRequest({
    body: {
      items: { type: 'array', required: true, minItems: 1 },
      collectionSource: { type: 'string', optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 30 }), // 30 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.saveMarketData)
);

/**
 * Context7 Pattern: GET /api/market-data/summary
 * Get market data summary with analytics
 */
router.get(
  '/summary',
  requestMiddleware.validateRequest({
    query: {
      timeRange: { type: 'number', min: 1, optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 60 }), // 60 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getMarketDataSummary)
);

/**
 * Context7 Pattern: GET /api/market-data/item/:itemId/history
 * Get item price history with trend analysis
 */
router.get(
  '/item/:itemId/history',
  requestMiddleware.validateRequest({
    params: {
      itemId: { type: 'number', required: true, min: 1 }
    },
    query: {
      startTime: { type: 'number', min: 0, optional: true },
      endTime: { type: 'number', min: 0, optional: true },
      limit: { type: 'number', min: 1, max: 1000, optional: true },
      interval: { type: 'string', enum: ['minute', 'hour', 'day'], optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 60 }), // 60 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getItemPriceHistory)
);

/**
 * Context7 Pattern: GET /api/market-data/top-items
 * Get top traded items with ranking
 */
router.get(
  '/top-items',
  requestMiddleware.validateRequest({
    query: {
      limit: { type: 'number', min: 1, max: 100, optional: true },
      timeRange: { type: 'number', min: 1, optional: true },
      sortBy: { type: 'string', enum: ['volume', 'profit', 'price'], optional: true },
      onlyTradeable: { type: 'boolean', optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 60 }), // 60 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getTopTradedItems)
);

/**
 * Context7 Pattern: GET /api/market-data/search
 * Search items by name with relevance scoring
 */
router.get(
  '/search',
  requestMiddleware.validateRequest({
    query: {
      q: { type: 'string', required: true, minLength: 2 },
      limit: { type: 'number', min: 1, max: 100, optional: true },
      onlyTradeable: { type: 'boolean', optional: true },
      sortBy: { type: 'string', enum: ['relevance', 'name', 'price'], optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 120 }), // 120 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.searchItems)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics
 * Get market analytics and insights
 */
router.get(
  '/analytics',
  requestMiddleware.validateRequest({
    query: {
      type: { type: 'string', enum: ['trends', 'volatility', 'volume', 'profit'], optional: true },
      timeRange: { type: 'number', min: 1, optional: true },
      itemId: { type: 'number', min: 1, optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 30 }), // 30 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getAnalytics)
);

/**
 * Context7 Pattern: GET /api/market-data/categories
 * Get item categories and classification
 */
router.get(
  '/categories',
  requestMiddleware.validateRequest({
    query: {
      includeStats: { type: 'boolean', optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 60 }), // 60 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getCategories)
);

/**
 * Context7 Pattern: GET /api/market-data/recommendations
 * Get trading recommendations based on market data
 */
router.get(
  '/recommendations',
  requestMiddleware.validateRequest({
    query: {
      strategy: { type: 'string', enum: ['conservative', 'aggressive', 'balanced'], optional: true },
      riskLevel: { type: 'string', enum: ['low', 'medium', 'high'], optional: true },
      timeHorizon: { type: 'string', enum: ['short', 'medium', 'long'], optional: true },
      limit: { type: 'number', min: 1, max: 50, optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 20 }), // 20 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getRecommendations)
);

/**
 * Context7 Pattern: GET /api/market-data/alerts
 * Get price alerts and notifications
 */
router.get(
  '/alerts',
  requestMiddleware.validateRequest({
    query: {
      type: { type: 'string', enum: ['price', 'volume', 'trend'], optional: true },
      status: { type: 'string', enum: ['active', 'triggered', 'expired'], optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 60 }), // 60 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getAlerts)
);

/**
 * Context7 Pattern: POST /api/market-data/alerts
 * Create new price alert
 */
router.post(
  '/alerts',
  requestMiddleware.validateRequest({
    body: {
      itemId: { type: 'number', required: true, min: 1 },
      type: { type: 'string', required: true, enum: ['price_above', 'price_below', 'volume_spike'] },
      threshold: { type: 'number', required: true, min: 0 },
      email: { type: 'string', optional: true },
      webhook: { type: 'string', optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 10 }), // 10 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.createAlert)
);

/**
 * Context7 Pattern: DELETE /api/market-data/alerts/:alertId
 * Delete price alert
 */
router.delete(
  '/alerts/:alertId',
  requestMiddleware.validateRequest({
    params: {
      alertId: { type: 'string', required: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 30 }), // 30 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.deleteAlert)
);

/**
 * Context7 Pattern: GET /api/market-data/export
 * Export market data in various formats
 */
router.get(
  '/export',
  requestMiddleware.validateRequest({
    query: {
      format: { type: 'string', enum: ['json', 'csv', 'xlsx'], optional: true },
      timeRange: { type: 'number', min: 1, optional: true },
      itemIds: { type: 'string', optional: true } // comma-separated list
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 3600000, max: 10 }), // 10 requests per hour
  errorMiddleware.handleAsyncError(marketDataController.exportData)
);

/**
 * Context7 Pattern: GET /api/market-data/compare
 * Compare multiple items performance
 */
router.get(
  '/compare',
  requestMiddleware.validateRequest({
    query: {
      itemIds: { type: 'string', required: true }, // comma-separated list
      timeRange: { type: 'number', min: 1, optional: true },
      metrics: { type: 'string', optional: true } // comma-separated list
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 30 }), // 30 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.compareItems)
);

/**
 * Context7 Pattern: GET /api/market-data/portfolio
 * Get portfolio analysis and performance
 */
router.get(
  '/portfolio',
  requestMiddleware.validateRequest({
    query: {
      items: { type: 'string', required: true }, // JSON string of items with quantities
      timeRange: { type: 'number', min: 1, optional: true }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 30 }), // 30 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.getPortfolioAnalysis)
);

/**
 * Context7 Pattern: POST /api/market-data/validate
 * Validate market data before saving
 */
router.post(
  '/validate',
  requestMiddleware.requestSizeLimit({ limit: '5mb' }),
  requestMiddleware.validateRequest({
    body: {
      items: { type: 'array', required: true, minItems: 1 }
    }
  }),
  requestMiddleware.rateLimit({ windowMs: 60000, max: 60 }), // 60 requests per minute
  errorMiddleware.handleAsyncError(marketDataController.validateData)
);

/**
 * Context7 Pattern: Error handling middleware
 */
router.use(errorMiddleware.handleError);

/**
 * Context7 Pattern: 404 handler for market data routes
 */
router.use(errorMiddleware.handleNotFound);

module.exports = router;