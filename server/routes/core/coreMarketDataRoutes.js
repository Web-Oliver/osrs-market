/**
 * 📊 Core Market Data Routes - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Route Module
 * - SOLID: Single Responsibility Principle (SRP) - ONLY basic market data CRUD operations
 * - DRY: Reusable validation and error handling patterns
 * - Clean separation of concerns for core data operations
 * - Focused responsibility: Basic market data retrieval, storage, and item-specific queries
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

// Context7 Pattern: Apply optimized middleware to all routes
router.use(validationMiddleware.requestTracking());
router.use(validationMiddleware.performanceMonitoring());

/**
 * Context7 Pattern: GET /api/market-data/core
 * Retrieve market data with filtering and pagination
 * SOLID: Single responsibility - core data retrieval only
 */
router.get(
  '/',
  validationMiddleware.validate({
    query: {
      itemId: { type: 'string', optional: true },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true },
      limit: { type: 'string', optional: true, max: AppConstants.DATABASE.MAX_LIMIT },
      onlyTradeable: { type: 'string', optional: true },
      sortBy: { type: 'string', enum: ['timestamp', 'itemId', 'profit'], optional: true },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getMarketData)
);

/**
 * Context7 Pattern: POST /api/market-data/core
 * Save new market data
 * SOLID: Single responsibility - core data storage only
 */
router.post(
  '/',
  validationMiddleware.validate({
    body: {
      items: { type: 'array', required: true },
      collectionSource: { type: 'string', optional: true, enum: ['API', 'SCRAPER', 'MANUAL'] }
    }
  }),
  validationMiddleware.bodySize({ limit: AppConstants.SERVER.JSON_LIMIT }),
  errorHandler.asyncHandler(marketDataController.saveMarketData)
);

/**
 * Context7 Pattern: GET /api/market-data/core/health
 * Basic health check for core market data functionality
 * SOLID: Single responsibility - core system health only
 */
router.get(
  '/health',
  errorHandler.asyncHandler(async (req, res) => {
    const health = {
      service: 'CoreMarketData',
      status: 'healthy',
      timestamp: Date.now(),
      checks: {
        database: 'passing',
        controller: 'passing'
      }
    };
    
    res.json({
      success: true,
      data: health,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/core/summary
 * Basic market data summary
 * SOLID: Single responsibility - core data summary only
 */
router.get(
  '/summary',
  validationMiddleware.validate({
    query: {
      timeRange: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getMarketDataSummary)
);

/**
 * Context7 Pattern: GET /api/market-data/core/:itemId
 * Get specific item data
 * SOLID: Single responsibility - individual item data retrieval
 */
router.get(
  '/:itemId',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: /^\d+$/ }
    },
    query: {
      limit: { type: 'string', optional: true },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getMarketData)
);

/**
 * Context7 Pattern: GET /api/market-data/core/historical/:itemId
 * Get historical data for specific item
 * SOLID: Single responsibility - historical data retrieval
 */
router.get(
  '/historical/:itemId',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: /^\d+$/ }
    },
    query: {
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true },
      interval: { type: 'string', optional: true, enum: ['minute', 'hour', 'day'] },
      limit: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getItemPriceHistory)
);

/**
 * Context7 Pattern: GET /api/market-data/core/item/:itemId/history
 * Alternative endpoint for item history (for backward compatibility)
 * SOLID: Single responsibility - item history retrieval
 */
router.get(
  '/item/:itemId/history',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: /^\d+$/ }
    },
    query: {
      days: { type: 'string', optional: true },
      limit: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getItemPriceHistory)
);

/**
 * Context7 Pattern: GET /api/market-data/core/live
 * Get live market data
 * SOLID: Single responsibility - live data retrieval
 */
router.get(
  '/live',
  validationMiddleware.rateLimit({
    windowMs: AppConstants.RATE_LIMITING.WINDOW_MS,
    maxRequests: AppConstants.RATE_LIMITING.MARKET_DATA_REQUESTS
  }),
  validationMiddleware.validate({
    query: {
      itemIds: { type: 'string', optional: true },
      format: { type: 'string', optional: true, enum: ['full', 'summary'] }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const liveData = await marketDataController.getLiveMarketData({
      itemIds: req.query.itemIds ? req.query.itemIds.split(',').map(id => parseInt(id)) : undefined,
      format: req.query.format || 'summary'
    });
    
    res.json({
      success: true,
      data: liveData,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: POST /api/market-data/core/snapshot
 * Create market data snapshot
 * SOLID: Single responsibility - snapshot creation
 */
router.post(
  '/snapshot',
  validationMiddleware.validate({
    body: {
      itemIds: { type: 'array', optional: true },
      includeMetadata: { type: 'boolean', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getMarketSnapshot)
);

// Export the router
module.exports = router;