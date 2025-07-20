/**
 * 📈 Market Analytics Routes - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Route Module
 * - SOLID: Single Responsibility Principle (SRP) - ONLY analytics and insights
 * - DRY: Reusable analytics validation patterns
 * - Clean separation of concerns for analytical operations
 * - Focused responsibility: Market analysis, recommendations, trends, and insights
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

// Context7 Pattern: Apply analytics-specific middleware
router.use(validationMiddleware.requestTracking());
router.use(validationMiddleware.performanceMonitoring());

// Context7 Pattern: Analytics-specific rate limiting
router.use(validationMiddleware.rateLimit({
  windowMs: AppConstants.RATE_LIMITING.WINDOW_MS,
  maxRequests: AppConstants.RATE_LIMITING.MARKET_DATA_REQUESTS / 2, // Lower limit for analytics
  message: 'Analytics rate limit exceeded'
}));

/**
 * Context7 Pattern: GET /api/market-data/analytics/top-items
 * Get top performing items based on various metrics
 * SOLID: Single responsibility - item performance analysis
 */
router.get(
  '/top-items',
  validationMiddleware.validate({
    query: {
      metric: { type: 'string', optional: true, enum: ['volume', 'profit', 'margin', 'activity'] },
      timeRange: { type: 'string', optional: true },
      limit: { type: 'string', optional: true, max: 100 },
      category: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getTopTradedItems)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/popular-items
 * Get popular items using smart selection algorithms
 * SOLID: Single responsibility - popularity analysis
 */
router.get(
  '/popular-items',
  validationMiddleware.validate({
    query: {
      limit: { type: 'string', optional: true, max: 100 },
      timeRange: { type: 'string', optional: true },
      sortBy: { type: 'string', optional: true, enum: ['volume', 'popularity', 'recent_activity'] }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getPopularItems)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/top-flips
 * Get top flipping opportunities based on profit margins
 * SOLID: Single responsibility - flipping opportunity analysis
 */
router.get(
  '/top-flips',
  validationMiddleware.validate({
    query: {
      minMargin: { type: 'string', optional: true },
      maxRisk: { type: 'string', optional: true, enum: ['low', 'medium', 'high'] },
      timeRange: { type: 'string', optional: true },
      limit: { type: 'string', optional: true, max: 50 }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getTopFlips)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/analytics
 * Comprehensive market analytics
 * SOLID: Single responsibility - market trend analysis
 */
router.get(
  '/analytics',
  validationMiddleware.validate({
    query: {
      type: { type: 'string', optional: true, enum: ['trends', 'volume', 'profitability', 'volatility'] },
      itemId: { type: 'string', optional: true },
      timeRange: { type: 'string', optional: true },
      granularity: { type: 'string', optional: true, enum: ['hour', 'day', 'week'] }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getAnalytics)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/recommendations
 * Get AI-powered trading recommendations
 * SOLID: Single responsibility - recommendation generation
 */
router.get(
  '/recommendations',
  validationMiddleware.validate({
    query: {
      strategy: { type: 'string', optional: true, enum: ['conservative', 'balanced', 'aggressive'] },
      budget: { type: 'string', optional: true },
      riskTolerance: { type: 'string', optional: true, enum: ['low', 'medium', 'high'] },
      timeHorizon: { type: 'string', optional: true, enum: ['short', 'medium', 'long'] }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getRecommendations)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/categories
 * Get market analytics by item categories
 * SOLID: Single responsibility - category-based analysis
 */
router.get(
  '/categories',
  validationMiddleware.validate({
    query: {
      includeStats: { type: 'string', optional: true },
      timeRange: { type: 'string', optional: true },
      sortBy: { type: 'string', optional: true, enum: ['volume', 'profitability', 'activity'] }
    }
  }),
  errorHandler.asyncHandler(marketDataController.getCategories)
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/compare
 * Compare multiple items or time periods
 * SOLID: Single responsibility - comparative analysis
 */
router.get(
  '/compare',
  validationMiddleware.validate({
    query: {
      itemIds: { type: 'string', required: true }, // Comma-separated list
      metrics: { type: 'string', optional: true }, // Comma-separated list
      timeRange: { type: 'string', optional: true },
      normalize: { type: 'string', optional: true } // Boolean as string
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const itemIds = req.query.itemIds.split(',').map(id => parseInt(id.trim()));
    const metrics = req.query.metrics ? req.query.metrics.split(',') : ['price', 'volume', 'margin'];
    
    if (itemIds.length < 2) {
      return res.status(AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'At least 2 items required for comparison',
        code: AppConstants.ERRORS.CATEGORIES.VALIDATION
      });
    }
    
    if (itemIds.length > 10) {
      return res.status(AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Maximum 10 items can be compared at once',
        code: AppConstants.ERRORS.CATEGORIES.VALIDATION
      });
    }
    
    // Implementation would call a comparison service
    const comparisonData = {
      items: itemIds,
      metrics,
      timeRange: req.query.timeRange || '24h',
      comparison: {
        // Placeholder for actual comparison logic
        summary: 'Comparison analysis completed',
        trends: {},
        recommendations: []
      },
      generatedAt: Date.now()
    };
    
    res.json({
      success: true,
      data: comparisonData,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/analytics/portfolio
 * Portfolio performance analysis
 * SOLID: Single responsibility - portfolio analysis
 */
router.get(
  '/portfolio',
  validationMiddleware.validate({
    query: {
      items: { type: 'string', optional: true }, // JSON string or comma-separated
      timeRange: { type: 'string', optional: true },
      includeProjections: { type: 'string', optional: true },
      riskAnalysis: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    // Portfolio analysis logic would be implemented here
    const portfolioAnalysis = {
      overview: {
        totalValue: 0,
        totalProfit: 0,
        profitPercentage: 0,
        riskScore: 'medium'
      },
      performance: {
        timeRange: req.query.timeRange || '7d',
        trends: {},
        projections: req.query.includeProjections === 'true' ? {} : null
      },
      recommendations: [],
      generatedAt: Date.now()
    };
    
    res.json({
      success: true,
      data: portfolioAnalysis,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: POST /api/market-data/analytics/analyze
 * Perform custom analysis on provided data
 * SOLID: Single responsibility - custom analysis processing
 */
router.post(
  '/analyze',
  validationMiddleware.validate({
    body: {
      analysisType: { type: 'string', required: true, enum: ['trend', 'pattern', 'anomaly', 'forecast'] },
      data: { type: 'object', required: true },
      parameters: { type: 'object', optional: true }
    }
  }),
  validationMiddleware.bodySize({ limit: AppConstants.EXPORT.MAX_EXPORT_SIZE }),
  errorHandler.asyncHandler(async (req, res) => {
    const { analysisType, data, parameters = {} } = req.body;
    
    // Custom analysis logic would be implemented here
    const analysisResult = {
      analysisType,
      result: {
        summary: `${analysisType} analysis completed`,
        findings: [],
        confidence: 0.85,
        recommendations: []
      },
      parameters,
      processedAt: Date.now(),
      processingTime: Math.random() * 1000 // Placeholder
    };
    
    res.json({
      success: true,
      data: analysisResult,
      timestamp: Date.now()
    });
  })
);

// Export the router
module.exports = router;