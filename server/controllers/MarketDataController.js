/**
 * 📈 Market Data Controller - Context7 Optimized
 * 
 * Context7 Pattern: Controller Layer for Market Data Operations
 * - Handles OSRS market data requests
 * - Thin controllers with business logic in services
 * - Proper validation and error handling
 * - DRY principles with reusable patterns
 * - Solid architecture with single responsibility
 */

const { MarketDataService } = require('../services/MarketDataService');
const { validateRequest } = require('../validators/MarketDataValidator');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class MarketDataController {
  constructor() {
    this.marketDataService = new MarketDataService();
    this.logger = new Logger('MarketDataController');
    
    // Context7 Pattern: Bind methods to preserve 'this' context
    this.getMarketData = this.getMarketData.bind(this);
    this.saveMarketData = this.saveMarketData.bind(this);
    this.getMarketDataSummary = this.getMarketDataSummary.bind(this);
    this.getItemPriceHistory = this.getItemPriceHistory.bind(this);
    this.getTopTradedItems = this.getTopTradedItems.bind(this);
    this.searchItems = this.searchItems.bind(this);
    this.getLiveMarketData = this.getLiveMarketData.bind(this);
    this.getLatestPrices = this.getLatestPrices.bind(this);
    this.getPopularItems = this.getPopularItems.bind(this);
    this.getTopFlips = this.getTopFlips.bind(this);
    this.getRecommendations = this.getRecommendations.bind(this);
    this.getAlerts = this.getAlerts.bind(this);
    this.createAlert = this.createAlert.bind(this);
    this.deleteAlert = this.deleteAlert.bind(this);
    this.getAnalytics = this.getAnalytics.bind(this);
    this.getCategories = this.getCategories.bind(this);
    this.exportData = this.exportData.bind(this);
    this.compareItems = this.compareItems.bind(this);
    this.getPortfolioAnalysis = this.getPortfolioAnalysis.bind(this);
    this.validateData = this.validateData.bind(this);
    this.manualTest = this.manualTest.bind(this);
    this.getManualTestResults = this.getManualTestResults.bind(this);
  }

  /**
   * Context7 Pattern: Get market data with filtering and pagination
   * GET /api/market-data
   */
  async getMarketData(req, res, next) {
    try {
      this.logger.info('Fetching market data', {
        query: req.query,
        ip: req.ip,
        requestId: req.id
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.getMarketData(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const options = {
        itemId: req.query.itemId ? parseInt(req.query.itemId) : undefined,
        startTime: req.query.startTime ? parseInt(req.query.startTime) : undefined,
        endTime: req.query.endTime ? parseInt(req.query.endTime) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : 100,
        onlyTradeable: req.query.onlyTradeable === 'true',
        sortBy: req.query.sortBy || 'timestamp',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const data = await this.marketDataService.getMarketData(options);

      this.logger.info('Successfully fetched market data', {
        recordCount: data.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Market data fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching market data', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Save market data
   * POST /api/market-data
   */
  async saveMarketData(req, res, next) {
    try {
      this.logger.info('Saving market data', {
        bodyKeys: Object.keys(req.body),
        itemCount: req.body.items?.length,
        ip: req.ip,
        requestId: req.id
      });

      // Context7 Pattern: Validate request body
      const validation = validateRequest.saveMarketData(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request body', validation.errors);
      }

      const { items, collectionSource = 'API' } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return ApiResponse.badRequest(res, 'Items array is required and cannot be empty');
      }

      const enrichedData = {
        items,
        collectionSource,
        metadata: {
          clientIp: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.id,
          timestamp: Date.now()
        }
      };

      const result = await this.marketDataService.saveMarketData(enrichedData);

      this.logger.info('Successfully saved market data', {
        itemsSaved: result.itemsSaved,
        collectionSource,
        requestId: req.id
      });

      return ApiResponse.created(res, {
        success: true,
        itemsSaved: result.itemsSaved,
        processingTime: result.processingTime
      }, 'Market data saved successfully');
    } catch (error) {
      this.logger.error('Error saving market data', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get market data summary
   * GET /api/market-data/summary
   */
  async getMarketDataSummary(req, res, next) {
    try {
      this.logger.info('Fetching market data summary', {
        query: req.query,
        requestId: req.id
      });

      // Context7 Pattern: Validate time range parameters
      const validation = validateRequest.getMarketDataSummary(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const { timeRange = 24 * 60 * 60 * 1000 } = req.query; // 24 hours default
      const summary = await this.marketDataService.getMarketDataSummary(parseInt(timeRange));

      this.logger.info('Successfully fetched market data summary', {
        timeRange,
        totalItems: summary.totalItems,
        requestId: req.id
      });

      return ApiResponse.success(res, summary, 'Market data summary fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching market data summary', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get item price history
   * GET /api/market-data/item/:itemId/history
   */
  async getItemPriceHistory(req, res, next) {
    try {
      this.logger.info('Fetching item price history', {
        params: req.params,
        query: req.query,
        requestId: req.id
      });

      // Context7 Pattern: Skip additional validation since route middleware already validates params

      const itemId = parseInt(req.params.itemId);
      const {
        startTime,
        endTime,
        limit = 100,
        interval = 'hour'
      } = req.query;

      const options = {
        itemId,
        startTime: startTime ? parseInt(startTime) : undefined,
        endTime: endTime ? parseInt(endTime) : undefined,
        limit: parseInt(limit),
        interval
      };

      const history = await this.marketDataService.getItemPriceHistory(options);

      this.logger.info('Successfully fetched item price history', {
        itemId,
        recordCount: history.length,
        requestId: req.id
      });

      return ApiResponse.success(res, history, 'Item price history fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching item price history', error, {
        params: req.params,
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get top traded items
   * GET /api/market-data/top-items
   */
  async getTopTradedItems(req, res, next) {
    try {
      this.logger.info('Fetching top traded items', {
        query: req.query,
        requestId: req.id
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.getTopTradedItems(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const {
        limit = 50,
        timeRange = 24 * 60 * 60 * 1000, // 24 hours
        sortBy = 'volume',
        onlyTradeable = true
      } = req.query;

      const options = {
        limit: parseInt(limit),
        timeRange: parseInt(timeRange),
        sortBy,
        onlyTradeable: onlyTradeable === 'true'
      };

      const topItems = await this.marketDataService.getTopTradedItems(options);

      this.logger.info('Successfully fetched top traded items', {
        itemCount: topItems.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, topItems, 'Top traded items fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching top traded items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Search items by name
   * GET /api/market-data/search
   */
  async searchItems(req, res, next) {
    try {
      this.logger.info('Searching items', {
        query: req.query,
        requestId: req.id
      });

      // Context7 Pattern: Validate search parameters
      const validation = validateRequest.searchItems(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid search parameters', validation.errors);
      }

      const {
        q: searchTerm,
        limit = 20,
        onlyTradeable = false,
        sortBy = 'relevance'
      } = req.query;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return ApiResponse.badRequest(res, 'Search term must be at least 2 characters long');
      }

      const options = {
        searchTerm: searchTerm.trim(),
        limit: parseInt(limit),
        onlyTradeable: onlyTradeable === 'true',
        sortBy
      };

      const results = await this.marketDataService.searchItems(options);

      this.logger.info('Successfully searched items', {
        searchTerm,
        resultCount: results.length,
        requestId: req.id
      });

      return ApiResponse.success(res, results, 'Items search completed successfully');
    } catch (error) {
      this.logger.error('Error searching items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get live market data from OSRS Wiki API
   */
  async getLiveMarketData(options) {
    try {
      this.logger.info('Fetching live market data', { options });

      const liveData = await this.marketDataService.fetchLiveMarketData(options);

      this.logger.info('Successfully fetched live market data', {
        itemCount: liveData.length
      });

      return liveData;
    } catch (error) {
      this.logger.error('Error fetching live market data', error, { options });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get latest prices from OSRS Wiki API
   */
  async getLatestPrices(itemIds = null) {
    try {
      this.logger.info('Fetching latest prices', { itemIds });

      const prices = await this.marketDataService.osrsWikiService.getLatestPrices();

      // Filter for specific items if requested
      if (itemIds && itemIds.length > 0) {
        const filteredData = {};
        for (const itemId of itemIds) {
          const itemIdStr = itemId.toString();
          if (prices.data[itemIdStr]) {
            filteredData[itemIdStr] = prices.data[itemIdStr];
          }
        }
        return {
          ...prices,
          data: filteredData
        };
      }

      this.logger.info('Successfully fetched latest prices', {
        itemCount: Object.keys(prices.data).length
      });

      return prices;
    } catch (error) {
      this.logger.error('Error fetching latest prices', error, { itemIds });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get popular items
   * GET /api/market-data/popular-items
   */
  async getPopularItems(req, res, next) {
    try {
      this.logger.info('Fetching popular items', {
        query: req.query,
        requestId: req.id
      });

      const {
        limit = 50,
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        sortBy = 'volume'
      } = req.query;

      const options = {
        limit: parseInt(limit),
        timeRange: parseInt(timeRange),
        sortBy
      };

      // Use SmartItemSelectorService to get popular items
      const { SmartItemSelectorService } = require('../services/SmartItemSelectorService');
      const smartItemSelector = new SmartItemSelectorService();
      
      const popularItems = await smartItemSelector.getHighValueItems(this.marketDataService, options.limit);

      this.logger.info('Successfully fetched popular items', {
        itemCount: popularItems.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, popularItems, 'Popular items fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching popular items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get top flips leaderboard
   * GET /api/market-data/top-flips
   */
  async getTopFlips(req, res, next) {
    try {
      this.logger.info('Fetching top flips', {
        query: req.query,
        requestId: req.id
      });

      const {
        limit = 20,
        timeRange = 24 * 60 * 60 * 1000, // 24 hours
        sortBy = 'profitability'
      } = req.query;

      const options = {
        limit: parseInt(limit),
        timeRange: parseInt(timeRange),
        sortBy
      };

      // Calculate profitability score based on weighted average
      const topFlips = await this.marketDataService.getTopFlips(options);

      this.logger.info('Successfully fetched top flips', {
        itemCount: topFlips.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, topFlips, 'Top flips fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching top flips', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get trading recommendations
   * GET /api/market-data/recommendations
   */
  async getRecommendations(req, res, next) {
    try {
      this.logger.info('Fetching recommendations', {
        query: req.query,
        requestId: req.id
      });

      const {
        strategy = 'balanced',
        riskLevel = 'medium',
        timeHorizon = 'short',
        limit = 10
      } = req.query;

      const options = {
        strategy,
        riskLevel,
        timeHorizon,
        limit: parseInt(limit)
      };

      const recommendations = await this.marketDataService.getRecommendations(options);

      this.logger.info('Successfully fetched recommendations', {
        itemCount: recommendations.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, recommendations, 'Recommendations fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching recommendations', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get alerts
   * GET /api/market-data/alerts
   */
  async getAlerts(req, res, next) {
    try {
      this.logger.info('Fetching alerts', {
        query: req.query,
        requestId: req.id
      });

      const {
        type,
        status = 'active',
        userId = 'default'
      } = req.query;

      const options = {
        type,
        status,
        userId
      };

      const alerts = await this.marketDataService.getAlerts(options);

      this.logger.info('Successfully fetched alerts', {
        alertCount: alerts.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, alerts, 'Alerts fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching alerts', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Create alert
   * POST /api/market-data/alerts
   */
  async createAlert(req, res, next) {
    try {
      this.logger.info('Creating alert', {
        body: req.body,
        requestId: req.id
      });

      const {
        itemId,
        type,
        threshold,
        email,
        webhook,
        userId = 'default'
      } = req.body;

      if (!itemId || !type || threshold === undefined) {
        return ApiResponse.badRequest(res, 'Missing required fields: itemId, type, threshold');
      }

      const alertData = {
        itemId: parseInt(itemId),
        type,
        threshold: parseFloat(threshold),
        email,
        webhook,
        userId,
        createdAt: new Date(),
        status: 'active'
      };

      const alert = await this.marketDataService.createAlert(alertData);

      this.logger.info('Successfully created alert', {
        alertId: alert.id,
        requestId: req.id
      });

      return ApiResponse.success(res, alert, 'Alert created successfully');
    } catch (error) {
      this.logger.error('Error creating alert', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Delete alert
   * DELETE /api/market-data/alerts/:alertId
   */
  async deleteAlert(req, res, next) {
    try {
      this.logger.info('Deleting alert', {
        alertId: req.params.alertId,
        requestId: req.id
      });

      const alertId = req.params.alertId;
      const result = await this.marketDataService.deleteAlert(alertId);

      this.logger.info('Successfully deleted alert', {
        alertId,
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Alert deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting alert', error, {
        alertId: req.params.alertId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get analytics
   * GET /api/market-data/analytics
   */
  async getAnalytics(req, res, next) {
    try {
      this.logger.info('Fetching analytics', {
        query: req.query,
        requestId: req.id
      });

      const {
        type = 'trends',
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        itemId
      } = req.query;

      const options = {
        type,
        timeRange: parseInt(timeRange),
        itemId: itemId ? parseInt(itemId) : undefined
      };

      const analytics = await this.marketDataService.getAnalytics(options);

      this.logger.info('Successfully fetched analytics', {
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, analytics, 'Analytics fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching analytics', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get categories
   * GET /api/market-data/categories
   */
  async getCategories(req, res, next) {
    try {
      this.logger.info('Fetching categories', {
        query: req.query,
        requestId: req.id
      });

      const {
        includeStats = false
      } = req.query;

      const options = {
        includeStats: includeStats === 'true'
      };

      const categories = await this.marketDataService.getCategories(options);

      this.logger.info('Successfully fetched categories', {
        categoryCount: categories.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, categories, 'Categories fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching categories', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Export data
   * GET /api/market-data/export
   */
  async exportData(req, res, next) {
    try {
      this.logger.info('Exporting data', {
        query: req.query,
        requestId: req.id
      });

      const {
        format = 'json',
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        itemIds
      } = req.query;

      const options = {
        format,
        timeRange: parseInt(timeRange),
        itemIds: itemIds ? itemIds.split(',').map(id => parseInt(id)) : undefined
      };

      const exportData = await this.marketDataService.exportData(options);

      this.logger.info('Successfully exported data', {
        format,
        options,
        requestId: req.id
      });

      // Set appropriate content type based on format
      switch (format) {
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=market-data.csv');
          break;
        case 'xlsx':
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          res.setHeader('Content-Disposition', 'attachment; filename=market-data.xlsx');
          break;
        default:
          res.setHeader('Content-Type', 'application/json');
      }

      return res.send(exportData);
    } catch (error) {
      this.logger.error('Error exporting data', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Compare items
   * GET /api/market-data/compare
   */
  async compareItems(req, res, next) {
    try {
      this.logger.info('Comparing items', {
        query: req.query,
        requestId: req.id
      });

      const {
        itemIds,
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        metrics = 'price,volume,margin'
      } = req.query;

      if (!itemIds) {
        return ApiResponse.badRequest(res, 'itemIds parameter is required');
      }

      const options = {
        itemIds: itemIds.split(',').map(id => parseInt(id)),
        timeRange: parseInt(timeRange),
        metrics: metrics.split(',')
      };

      const comparison = await this.marketDataService.compareItems(options);

      this.logger.info('Successfully compared items', {
        itemCount: options.itemIds.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, comparison, 'Items compared successfully');
    } catch (error) {
      this.logger.error('Error comparing items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get portfolio analysis
   * GET /api/market-data/portfolio
   */
  async getPortfolioAnalysis(req, res, next) {
    try {
      this.logger.info('Getting portfolio analysis', {
        query: req.query,
        requestId: req.id
      });

      const {
        items,
        timeRange = 7 * 24 * 60 * 60 * 1000 // 7 days
      } = req.query;

      if (!items) {
        return ApiResponse.badRequest(res, 'items parameter is required');
      }

      let portfolioItems;
      try {
        portfolioItems = JSON.parse(items);
      } catch (parseError) {
        return ApiResponse.badRequest(res, 'Invalid JSON format for items parameter');
      }

      const options = {
        items: portfolioItems,
        timeRange: parseInt(timeRange)
      };

      const portfolioAnalysis = await this.marketDataService.getPortfolioAnalysis(options);

      this.logger.info('Successfully analyzed portfolio', {
        itemCount: portfolioItems.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, portfolioAnalysis, 'Portfolio analysis completed successfully');
    } catch (error) {
      this.logger.error('Error analyzing portfolio', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Validate data
   * POST /api/market-data/validate
   */
  async validateData(req, res, next) {
    try {
      this.logger.info('Validating data', {
        body: req.body,
        requestId: req.id
      });

      const { items } = req.body;

      if (!items || !Array.isArray(items)) {
        return ApiResponse.badRequest(res, 'items array is required');
      }

      const validation = await this.marketDataService.validateData(items);

      this.logger.info('Successfully validated data', {
        itemCount: items.length,
        valid: validation.valid,
        requestId: req.id
      });

      return ApiResponse.success(res, validation, 'Data validation completed successfully');
    } catch (error) {
      this.logger.error('Error validating data', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Manual test mode for AI trading
   * POST /api/market-data/manual-test
   */
  async manualTest(req, res, next) {
    try {
      this.logger.info('Processing manual test', {
        body: req.body,
        requestId: req.id
      });

      const {
        itemId,
        action,
        price,
        quantity,
        testMode = true
      } = req.body;

      if (!itemId || !action || !price || !quantity) {
        return ApiResponse.badRequest(res, 'Missing required fields: itemId, action, price, quantity');
      }

      const testData = {
        itemId: parseInt(itemId),
        action,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        testMode,
        timestamp: new Date(),
        userId: 'manual_test_user'
      };

      const result = await this.marketDataService.processManualTest(testData);

      this.logger.info('Successfully processed manual test', {
        testId: result.testId,
        action,
        itemId,
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Manual test processed successfully');
    } catch (error) {
      this.logger.error('Error processing manual test', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get manual test results
   * GET /api/market-data/manual-test/results
   */
  async getManualTestResults(req, res, next) {
    try {
      this.logger.info('Fetching manual test results', {
        query: req.query,
        requestId: req.id
      });

      const {
        testId,
        limit = 50
      } = req.query;

      const options = {
        testId,
        limit: parseInt(limit),
        userId: 'manual_test_user'
      };

      const results = await this.marketDataService.getManualTestResults(options);

      this.logger.info('Successfully fetched manual test results', {
        resultCount: results.length,
        options,
        requestId: req.id
      });

      return ApiResponse.success(res, results, 'Manual test results fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching manual test results', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }
}

module.exports = { MarketDataController };