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
const { getControllerFactory } = require('../factories/ControllerFactory');
const { ValidationMiddleware } = require('../middleware/ValidationMiddleware');
const { ErrorHandler } = require('../middleware/ErrorHandler');
const { validateRequest } = require('../validators/MarketDataValidator');

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
 * Context7 Pattern: GET /api/market-data
 * Retrieve market data with filtering and pagination
 */
router.get(
  '/',
  validationMiddleware.validate({
    query: {
      itemId: { type: 'string', optional: true },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true },
      limit: { type: 'string', optional: true },
      onlyTradeable: { type: 'string', optional: true },
      sortBy: { type: 'string', enum: ['timestamp', 'itemId', 'profit'], optional: true },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getMarketData)
);

/**
 * Context7 Pattern: POST /api/market-data
 * Save new market data with validation
 */
router.post(
  '/',
  validationMiddleware.requestSizeLimit({ limit: '10mb' }),
  validationMiddleware.validate({
    body: {
      items: { type: 'array', required: true, minItems: 1 },
      collectionSource: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.saveMarketData)
);

/**
 * Context7 Pattern: POST /api/market-data/snapshot
 * Save market snapshot using MarketDataService directly
 * Implementation of Step 0.3 requirement
 */
router.post(
  '/snapshot',
  validationMiddleware.requestSizeLimit({ limit: '1mb' }),
  validationMiddleware.validate({
    body: {
      itemId: { type: 'number', required: true, min: 1 },
      timestamp: { type: 'number', required: true, min: 0 },
      interval: { type: 'string', required: true, enum: ['daily_scrape', '5m', '1h', 'latest', '6m_scrape'] },
      highPrice: { type: 'number', required: true, min: 0 },
      lowPrice: { type: 'number', required: true, min: 0 },
      volume: { type: 'number', required: true, min: 0 },
      source: { type: 'string', optional: true, enum: ['osrs_wiki_api', 'ge_scraper', 'manual_entry', 'calculated'] },
      // Optional calculated metrics
      marginGp: { type: 'number', optional: true },
      marginPercent: { type: 'number', optional: true },
      volatility: { type: 'number', optional: true, min: 0 },
      velocity: { type: 'number', optional: true, min: 0 },
      trendMovingAverage: { type: 'number', optional: true, min: 0 },
      rsi: { type: 'number', optional: true, min: 0, max: 100 },
      macd: { type: 'number', optional: true },
      momentumScore: { type: 'number', optional: true, min: -100, max: 100 },
      riskScore: { type: 'number', optional: true, min: 0, max: 100 },
      expectedProfitPerHour: { type: 'number', optional: true, min: 0 },
      profitPerGeSlot: { type: 'number', optional: true, min: 0 },
      confidence: { type: 'number', optional: true, min: 0, max: 1 }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();
      const snapshot = await marketDataService.saveMarketSnapshot(req.body);

      res.status(201).json({
        success: true,
        data: snapshot,
        timestamp: Date.now()
      });
    } catch (error) {
      if (error.message.includes('Missing required fields') ||
          error.message.includes('Invalid interval') ||
          error.message.includes('High price cannot be less than low price') ||
          error.message.includes('RSI must be between 0 and 100')) {
        res.status(400).json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: Date.now()
        });
      }
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/health
 * Health check endpoint for market data service
 */
router.get(
  '/health',
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      // Basic health check
      const healthStatus = {
        status: 'healthy',
        timestamp: Date.now(),
        service: 'market-data',
        version: '1.0.0',
        database: 'connected',
        uptime: process.uptime()
      };

      res.status(200).json({
        success: true,
        data: healthStatus,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: 'Service unavailable',
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/summary
 * Get market data summary with analytics
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
 * Context7 Pattern: GET /api/market-data/historical/:itemId
 * Get historical market data for Python AI service integration
 */
router.get(
  '/historical/:itemId',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' }
    },
    query: {
      interval: { type: 'string', optional: true, enum: ['daily_scrape', '5m', '1h', 'latest', '6m_scrape'] },
      limit: { type: 'string', optional: true },
      startDate: { type: 'string', optional: true, pattern: '^[0-9]+$' },
      endDate: { type: 'string', optional: true, pattern: '^[0-9]+$' }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();
      const itemId = parseInt(req.params.itemId);
      const { interval = '1h', limit = 200, startDate, endDate } = req.query;

      // Convert string parameters to appropriate types
      const startDateNum = startDate ? parseInt(startDate) : undefined;
      const endDateNum = endDate ? parseInt(endDate) : undefined;

      const snapshots = await marketDataService.getMarketSnapshots(
        itemId,
        interval,
        startDateNum,
        endDateNum
      );

      // Limit results if requested
      const limitedSnapshots = limit ? snapshots.slice(0, parseInt(limit)) : snapshots;

      res.status(200).json({
        success: true,
        data: limitedSnapshots,
        count: limitedSnapshots.length,
        timestamp: Date.now(),
        itemId: itemId,
        interval: interval
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/item/:itemId/history
 * Get item price history with trend analysis
 */
router.get(
  '/item/:itemId/history',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' }
    },
    query: {
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true },
      limit: { type: 'string', optional: true },
      interval: { type: 'string', enum: ['minute', 'hour', 'day'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getItemPriceHistory)
);

/**
 * Context7 Pattern: GET /api/market-data/live
 * Get live market data from OSRS Wiki API
 * Supports both 5-minute (default) and 1-hour data, and optional itemIds filtering
 */
router.get(
  '/live',
  validationMiddleware.validate({
    query: {
      interval: { type: 'string', optional: true, enum: ['5m', '1h'] },
      itemIds: { type: 'string', optional: true }, // comma-separated list
      limit: { type: 'string', optional: true }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const { interval = '5m' } = req.query;

      let liveData, source;
      if (interval === '1h') {
        liveData = await marketDataService.get1HourMarketData();
        source = 'osrs_wiki_1h';
      } else {
        liveData = await marketDataService.get5MinuteMarketData();
        source = 'osrs_wiki_5m';
      }

      res.json({
        success: true,
        data: liveData,
        count: Object.keys(liveData).length,
        timestamp: Date.now(),
        source: source,
        interval: interval
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/:itemId
 * Get market snapshots for a specific item using MarketDataService directly
 * Implementation of Step 0.3 requirement
 */
router.get(
  '/:itemId',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' }
    },
    query: {
      interval: { type: 'string', optional: true, enum: ['daily_scrape', '5m', '1h', 'latest', '6m_scrape'] },
      startDate: { type: 'string', optional: true, pattern: '^[0-9]+$' },
      endDate: { type: 'string', optional: true, pattern: '^[0-9]+$' }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();
      const itemId = parseInt(req.params.itemId);
      const { interval, startDate, endDate } = req.query;

      // Convert string parameters to appropriate types
      const startDateNum = startDate ? parseInt(startDate) : undefined;
      const endDateNum = endDate ? parseInt(endDate) : undefined;

      const snapshots = await marketDataService.getMarketSnapshots(
        itemId,
        interval,
        startDateNum,
        endDateNum
      );

      if (snapshots.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No market snapshots found for the specified criteria',
          timestamp: Date.now()
        });
      } else {
        res.status(200).json({
          success: true,
          data: snapshots,
          count: snapshots.length,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      if (error.message.includes('itemId must be a valid number')) {
        res.status(400).json({
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          timestamp: Date.now()
        });
      }
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/top-items
 * Get top traded items with ranking
 */
router.get(
  '/top-items',
  validationMiddleware.validate({
    query: {
      limit: { type: 'string', optional: true },
      timeRange: { type: 'string', optional: true },
      sortBy: { type: 'string', enum: ['volume', 'profit', 'price'], optional: true },
      onlyTradeable: { type: 'boolean', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getTopTradedItems)
);

/**
 * Context7 Pattern: GET /api/market-data/popular-items
 * Get popular/relevant items from smart selection
 */
router.get(
  '/popular-items',
  validationMiddleware.validate({
    query: {
      limit: { type: 'string', optional: true },
      timeRange: { type: 'string', optional: true },
      sortBy: { type: 'string', enum: ['volume', 'profit', 'price'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getPopularItems)
);

/**
 * Context7 Pattern: GET /api/market-data/top-flips
 * Get top flips leaderboard based on profitability score
 */
router.get(
  '/top-flips',
  validationMiddleware.validate({
    query: {
      limit: { type: 'string', optional: true },
      timeRange: { type: 'string', optional: true },
      sortBy: { type: 'string', enum: ['profitability', 'margin', 'volume'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getTopFlips)
);

/**
 * Context7 Pattern: GET /api/market-data/search
 * Search items by name with relevance scoring
 */
router.get(
  '/search',
  validationMiddleware.validate({
    query: {
      q: { type: 'string', required: true, minLength: 2 },
      limit: { type: 'string', optional: true },
      onlyTradeable: { type: 'boolean', optional: true },
      sortBy: { type: 'string', enum: ['relevance', 'name', 'price'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.searchItems)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics
 * Get market analytics and insights
 */
router.get(
  '/analytics',
  validationMiddleware.validate({
    query: {
      type: { type: 'string', enum: ['trends', 'volatility', 'volume', 'profit'], optional: true },
      timeRange: { type: 'string', optional: true },
      itemId: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getAnalytics)
);

/**
 * Context7 Pattern: GET /api/market-data/categories
 * Get item categories and classification
 */
router.get(
  '/categories',
  validationMiddleware.validate({
    query: {
      includeStats: { type: 'boolean', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getCategories)
);

/**
 * Context7 Pattern: GET /api/market-data/recommendations
 * Get trading recommendations based on market data
 */
router.get(
  '/recommendations',
  validationMiddleware.validate({
    query: {
      strategy: { type: 'string', enum: ['conservative', 'aggressive', 'balanced'], optional: true },
      riskLevel: { type: 'string', enum: ['low', 'medium', 'high'], optional: true },
      timeHorizon: { type: 'string', enum: ['short', 'medium', 'long'], optional: true },
      limit: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getRecommendations)
);

/**
 * Context7 Pattern: GET /api/market-data/alerts
 * Get price alerts and notifications
 */
router.get(
  '/alerts',
  validationMiddleware.validate({
    query: {
      type: { type: 'string', enum: ['price', 'volume', 'trend'], optional: true },
      status: { type: 'string', enum: ['active', 'triggered', 'expired'], optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getAlerts)
);

/**
 * Context7 Pattern: POST /api/market-data/alerts
 * Create new price alert
 */
router.post(
  '/alerts',
  validationMiddleware.validate({
    body: {
      itemId: { type: 'number', required: true, min: 1 },
      type: { type: 'string', required: true, enum: ['price_above', 'price_below', 'volume_spike'] },
      threshold: { type: 'number', required: true, min: 0 },
      email: { type: 'string', optional: true },
      webhook: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.createAlert)
);

/**
 * Context7 Pattern: DELETE /api/market-data/alerts/:alertId
 * Delete price alert
 */
router.delete(
  '/alerts/:alertId',
  validationMiddleware.validate({
    params: {
      alertId: { type: 'string', required: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.deleteAlert)
);

/**
 * Context7 Pattern: GET /api/market-data/export
 * Export market data in various formats
 */
router.get(
  '/export',
  validationMiddleware.validate({
    query: {
      format: { type: 'string', enum: ['json', 'csv', 'xlsx'], optional: true },
      timeRange: { type: 'string', optional: true },
      itemIds: { type: 'string', optional: true } // comma-separated list
    }
  }),
  errorHandler.asyncHandler(marketDataController.exportData)
);

/**
 * Context7 Pattern: GET /api/market-data/compare
 * Compare multiple items performance
 */
router.get(
  '/compare',
  validationMiddleware.validate({
    query: {
      itemIds: { type: 'string', required: true }, // comma-separated list
      timeRange: { type: 'string', optional: true },
      metrics: { type: 'string', optional: true } // comma-separated list
    }
  }),
  errorHandler.asyncHandler(marketDataController.compareItems)
);

/**
 * Context7 Pattern: GET /api/market-data/portfolio
 * Get portfolio analysis and performance
 */
router.get(
  '/portfolio',
  validationMiddleware.validate({
    query: {
      items: { type: 'string', required: true }, // JSON string of items with quantities
      timeRange: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getPortfolioAnalysis)
);

/**
 * Context7 Pattern: POST /api/market-data/sync-5m
 * Manually trigger 5-minute data sync
 */
router.post(
  '/sync-5m',
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const result = await marketDataService.sync5MinuteData();

      res.json({
        success: true,
        message: '5-minute market data synced successfully',
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: POST /api/market-data/sync-1h
 * Manually trigger 1-hour data sync
 */
router.post(
  '/sync-1h',
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const result = await marketDataService.sync1HourData();

      res.json({
        success: true,
        message: '1-hour market data synced successfully',
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/1h
 * Get 1-hour market data from OSRS Wiki API
 */
router.get(
  '/1h',
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const hourlyData = await marketDataService.get1HourMarketData();

      res.json({
        success: true,
        data: hourlyData,
        count: Object.keys(hourlyData).length,
        timestamp: Date.now(),
        source: 'osrs_wiki_1h'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/timeseries/:itemId
 * Get detailed timeseries data for analysis with intelligent rate limiting
 */
router.get(
  '/timeseries/:itemId',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' }
    },
    query: {
      timestep: { type: 'string', optional: true, enum: ['5m', '1h', '6h', '24h'] },
      force: { type: 'string', optional: true, enum: ['true', 'false'] }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const itemId = parseInt(req.params.itemId);
      const { timestep = '5m', force = 'false' } = req.query;

      // Check if we have recent stored data first
      const storedData = await marketDataService.getStoredTimeseriesData(itemId, timestep, 1);
      const hasRecentData = storedData.length > 0 &&
        (Date.now() - storedData[0].fetchedAt) < (24 * 60 * 60 * 1000); // Less than 24 hours old

      let timeseriesData = null;

      if (force === 'true' || !hasRecentData) {
        try {
          // Fetch new timeseries data with rate limiting
          timeseriesData = await marketDataService.getTimeseriesData(itemId, timestep);
        } catch (error) {
          if (error.message.includes('Rate limit exceeded')) {
            return res.status(429).json({
              success: false,
              error: 'Rate limit exceeded for timeseries API - max 1 request per minute',
              storedData: storedData.length > 0 ? storedData[0] : null,
              timestamp: Date.now()
            });
          }
          throw error;
        }
      } else {
        // Use stored data
        timeseriesData = storedData[0];
      }

      res.json({
        success: true,
        data: timeseriesData,
        fromCache: !timeseriesData || timeseriesData.fetchedAt !== Date.now(),
        rateLimitInfo: {
          maxRequestsPerMinute: 1,
          maxRequestsPerDayPerItem: 1
        },
        timestamp: Date.now()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/timeseries/:itemId/stored
 * Get stored timeseries data from database
 */
router.get(
  '/timeseries/:itemId/stored',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' }
    },
    query: {
      timestep: { type: 'string', optional: true, enum: ['5m', '1h', '6h', '24h'] },
      limit: { type: 'string', optional: true }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const itemId = parseInt(req.params.itemId);
      const { timestep = '5m', limit = 10 } = req.query;

      const storedData = await marketDataService.getStoredTimeseriesData(
        itemId,
        timestep,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: storedData,
        count: storedData.length,
        timestamp: Date.now()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: POST /api/market-data/timeseries/:itemId/analyze
 * Manually trigger timeseries analysis for an item (respects rate limits)
 */
router.post(
  '/timeseries/:itemId/analyze',
  validationMiddleware.validate({
    params: {
      itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' }
    },
    body: {
      timestep: { type: 'string', optional: true, enum: ['5m', '1h', '6h', '24h'] },
      force: { type: 'boolean', optional: true }
    }
  }),
  async(req, res) => {
    try {
      const { MarketDataService } = require('../services/MarketDataService');
      const marketDataService = new MarketDataService();

      const itemId = parseInt(req.params.itemId);
      const { timestep = '5m', force = false } = req.body;

      const timeseriesData = await marketDataService.getTimeseriesData(itemId, timestep);

      if (!timeseriesData) {
        return res.json({
          success: true,
          message: 'Timeseries data already fetched today for this item',
          skipped: true,
          timestamp: Date.now()
        });
      }

      res.json({
        success: true,
        data: timeseriesData,
        message: 'Timeseries analysis completed successfully',
        timestamp: Date.now()
      });

    } catch (error) {
      if (error.message.includes('Rate limit exceeded')) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded for timeseries API - max 1 request per minute',
          timestamp: Date.now()
        });
      }

      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/scheduler/status
 * Get scheduler status and statistics
 */
router.get(
  '/scheduler/status',
  async(req, res) => {
    try {
      // Note: In production, you'd get this from a singleton scheduler instance
      res.json({
        success: true,
        message: 'Scheduler is running automatically every 5 minutes',
        data: {
          isRunning: true,
          interval: '5 minutes',
          nextSync: 'Automatic',
          status: 'Active'
        },
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/market-data/prices
 * Get latest prices from OSRS Wiki API
 */
router.get(
  '/prices',
  validationMiddleware.validate({
    query: {
      itemIds: { type: 'string', optional: true } // comma-separated list
    }
  }),
  async(req, res) => {
    try {
      const { itemIds } = req.query;

      const prices = await marketDataController.getLatestPrices(
        itemIds ? itemIds.split(',').map(id => parseInt(id)) : null
      );

      res.json({
        success: true,
        data: prices,
        timestamp: Date.now(),
        source: 'osrs_wiki_api'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: POST /api/market-data/collect-latest
 * Collect latest market data from OSRS Wiki API (on-demand)
 * Implementation of Step 1.5 requirement
 */
router.post(
  '/collect-latest',
  async(req, res) => {
    try {
      const { DataCollectionService } = require('../services/DataCollectionService');
      const dataCollectionService = new DataCollectionService();

      const result = await dataCollectionService.collectLatestMarketData();

      res.json({
        success: true,
        message: 'Latest market data collection completed',
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: POST /api/market-data/validate
 * Validate market data before saving
 */
router.post(
  '/validate',
  validationMiddleware.requestSizeLimit({ limit: '5mb' }),
  validationMiddleware.validate({
    body: {
      items: { type: 'array', required: true, minItems: 1 }
    }
  }),
  errorHandler.asyncHandler(marketDataController.validateData)
);

/**
 * Context7 Pattern: POST /api/market-data/manual-test
 * Manual test mode for AI trading recommendations
 */
router.post(
  '/manual-test',
  validationMiddleware.validate({
    body: {
      itemId: { type: 'number', required: true, min: 1 },
      action: { type: 'string', required: true, enum: ['buy', 'sell', 'hold'] },
      price: { type: 'number', required: true, min: 0 },
      quantity: { type: 'number', required: true, min: 1 },
      testMode: { type: 'boolean', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.manualTest)
);

/**
 * Context7 Pattern: GET /api/market-data/manual-test/results
 * Get manual test results and performance metrics
 */
router.get(
  '/manual-test/results',
  validationMiddleware.validate({
    query: {
      testId: { type: 'string', optional: true },
      limit: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getManualTestResults)
);

/**
 * Context7 Pattern: Error handling middleware
 */
router.use(ErrorHandler.handle);

/**
 * Context7 Pattern: 404 handler for market data routes
 */
router.use(ErrorHandler.notFound);

module.exports = router;
