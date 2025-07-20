/**
 * 📈 Market Data Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for Market Data Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized error handling and validation
 */

const { BaseController } = require('./BaseController');
const { MarketDataService } = require('../services/MarketDataService');
const { validateRequest } = require('../validators/MarketDataValidator');

class MarketDataController extends BaseController {
  constructor(dependencies = {}) {
    super('MarketDataController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.marketDataService = dependencies.marketDataService || new MarketDataService();
    this.smartItemSelectorService = dependencies.smartItemSelectorService;
  }

  /**
   * Context7 Pattern: Get market data with filtering and pagination
   * GET /api/market-data
   */
  getMarketData = this.createMarketDataGetEndpoint(
    this.marketDataService.getMarketData,
    'fetch market data',
    {
      validator: () => validateRequest.getMarketData(req.query)
    }
  );

  /**
   * Context7 Pattern: Save market data
   * POST /api/market-data
   */
  saveMarketData = this.createPostEndpoint(
    this.marketDataService.saveMarketData,
    {
      operationName: 'save market data',
      validator: () => validateRequest.saveMarketData(req.body),
      parseBody: (req) => {
        const { items, collectionSource = 'API' } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new Error('Items array is required and cannot be empty');
        }

        return {
          items,
          collectionSource,
          metadata: {
            clientIp: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.id,
            timestamp: Date.now()
          }
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get market data summary
   * GET /api/market-data/summary
   */
  getMarketDataSummary = this.createTimeBasedEndpoint(
    this.marketDataService.getMarketDataSummary,
    'fetch market data summary',
    {
      validator: () => validateRequest.getMarketDataSummary(req.query),
      parseParams: (req) => {
        const { timeRange = 24 * 60 * 60 * 1000 } = req.query;
        return parseInt(timeRange);
      }
    }
  );

  /**
   * Context7 Pattern: Get item price history
   * GET /api/market-data/item/:itemId/history
   */
  getItemPriceHistory = this.createTimeBasedEndpoint(
    this.marketDataService.getItemPriceHistory,
    'fetch item price history',
    {
      parseParams: (req) => ({
        itemId: parseInt(req.params.itemId),
        ...this.parseTimeRangeQuery(req),
        limit: parseInt(req.query.limit || 100),
        interval: req.query.interval || 'hour'
      })
    }
  );

  /**
   * Context7 Pattern: Get top traded items
   * GET /api/market-data/top-items
   */
  getTopTradedItems = this.createMarketDataGetEndpoint(
    this.marketDataService.getTopTradedItems,
    'fetch top traded items',
    {
      validator: () => validateRequest.getTopTradedItems(req.query)
    }
  );

  /**
   * Context7 Pattern: Search items by name
   * GET /api/market-data/search
   */
  searchItems = this.createGetEndpoint(
    this.marketDataService.searchItems,
    {
      operationName: 'search items',
      validator: () => validateRequest.searchItems(req.query),
      parseParams: (req) => {
        const { q: searchTerm, limit = 20, onlyTradeable = false, sortBy = 'relevance' } = req.query;

        if (!searchTerm || searchTerm.trim().length < 2) {
          throw new Error('Search term must be at least 2 characters long');
        }

        return {
          searchTerm: searchTerm.trim(),
          limit: parseInt(limit),
          onlyTradeable: onlyTradeable === 'true',
          sortBy
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get live market data from OSRS Wiki API
   */
  async getLiveMarketData(options) {
    this.logger.info('Fetching live market data', { options });

    const liveData = await this.marketDataService.fetchLiveMarketData(options);

    this.logger.info('Successfully fetched live market data', {
      itemCount: liveData.length
    });

    return liveData;
  }

  /**
   * Context7 Pattern: Get latest prices from OSRS Wiki API
   */
  async getLatestPrices(itemIds = null) {
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
  }

  /**
   * Context7 Pattern: Get popular items
   * GET /api/market-data/popular-items
   */
  getPopularItems = this.createGetEndpoint(
    async(options) => {
      const { SmartItemSelectorService } = require('../services/SmartItemSelectorService');
      // SOLID: Use injected dependency instead of creating new instance
      const smartItemSelector = this.smartItemSelectorService;
      return await smartItemSelector.getHighValueItems(this.marketDataService, options.limit);
    },
    {
      operationName: 'fetch popular items',
      parseParams: (req) => {
        const { limit = 50, timeRange = 7 * 24 * 60 * 60 * 1000, sortBy = 'volume' } = req.query;
        return {
          limit: parseInt(limit),
          timeRange: parseInt(timeRange),
          sortBy
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get top flips leaderboard
   * GET /api/market-data/top-flips
   */
  getTopFlips = this.createTradingAnalysisEndpoint(
    this.marketDataService.getTopFlips,
    'fetch top flips'
  );

  /**
   * Context7 Pattern: Get trading recommendations
   * GET /api/market-data/recommendations
   */
  getRecommendations = this.createTradingAnalysisEndpoint(
    this.marketDataService.getRecommendations,
    'fetch recommendations'
  );

  /**
   * Context7 Pattern: Get alerts
   * GET /api/market-data/alerts
   */
  getAlerts = this.createGetEndpoint(
    this.marketDataService.getAlerts,
    {
      operationName: 'fetch alerts',
      parseParams: this.parseAlertQuery
    }
  );

  /**
   * Context7 Pattern: Create alert
   * POST /api/market-data/alerts
   */
  createAlert = this.createPostEndpoint(
    this.marketDataService.createAlert,
    {
      operationName: 'create alert',
      parseBody: (req) => {
        const { itemId, type, threshold, email, webhook, userId = 'default' } = req.body;

        if (!itemId || !type || threshold === undefined) {
          throw new Error('Missing required fields: itemId, type, threshold');
        }

        return {
          itemId: parseInt(itemId),
          type,
          threshold: parseFloat(threshold),
          email,
          webhook,
          userId,
          createdAt: new Date(),
          status: 'active'
        };
      }
    }
  );

  /**
   * Context7 Pattern: Delete alert
   * DELETE /api/market-data/alerts/:alertId
   */
  deleteAlert = this.createDeleteEndpoint(
    this.marketDataService.deleteAlert,
    {
      operationName: 'delete alert',
      resourceIdParam: 'alertId'
    }
  );

  /**
   * Context7 Pattern: Get analytics
   * GET /api/market-data/analytics
   */
  getAnalytics = this.createTimeBasedEndpoint(
    this.marketDataService.getAnalytics,
    'fetch analytics',
    {
      parseParams: (req) => {
        const { type = 'trends', itemId, ...timeParams } = req.query;
        return {
          type,
          itemId: itemId ? parseInt(itemId) : undefined,
          ...this.parseTimeRangeQuery(req)
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get categories
   * GET /api/market-data/categories
   */
  getCategories = this.createGetEndpoint(
    this.marketDataService.getCategories,
    {
      operationName: 'fetch categories',
      parseParams: (req) => ({
        includeStats: req.query.includeStats === 'true'
      })
    }
  );

  /**
   * Context7 Pattern: Export data
   * GET /api/market-data/export
   */
  exportData = this.endpointFactory.createCustomEndpoint(
    async(req, res) => {
      const options = this.parseExportQuery(req);
      const exportData = await this.marketDataService.exportData(options);

      // Set appropriate content type based on format
      switch (options.format) {
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
    },
    { operationName: 'export data' }
  );

  /**
   * Context7 Pattern: Compare items
   * GET /api/market-data/compare
   */
  compareItems = this.createTimeBasedEndpoint(
    this.marketDataService.compareItems,
    'compare items',
    {
      parseParams: (req) => {
        const { itemIds, metrics = 'price,volume,margin' } = req.query;

        if (!itemIds) {
          throw new Error('itemIds parameter is required');
        }

        return {
          itemIds: itemIds.split(',').map(id => parseInt(id)),
          metrics: metrics.split(','),
          ...this.parseTimeRangeQuery(req)
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get portfolio analysis
   * GET /api/market-data/portfolio
   */
  getPortfolioAnalysis = this.createTimeBasedEndpoint(
    this.marketDataService.getPortfolioAnalysis,
    'analyze portfolio',
    {
      parseParams: (req) => {
        const { items } = req.query;

        if (!items) {
          throw new Error('items parameter is required');
        }

        let portfolioItems;
        try {
          portfolioItems = JSON.parse(items);
        } catch {
          throw new Error('Invalid JSON format for items parameter');
        }

        return {
          items: portfolioItems,
          ...this.parseTimeRangeQuery(req)
        };
      }
    }
  );

  /**
   * Context7 Pattern: Validate data
   * POST /api/market-data/validate
   */
  validateData = this.createPostEndpoint(
    this.marketDataService.validateData,
    {
      operationName: 'validate data',
      parseBody: (req) => {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
          throw new Error('items array is required');
        }

        return items;
      }
    }
  );

  /**
   * Context7 Pattern: Manual test mode for AI trading
   * POST /api/market-data/manual-test
   */
  manualTest = this.createPostEndpoint(
    this.marketDataService.processManualTest,
    {
      operationName: 'process manual test',
      parseBody: (req) => {
        const { itemId, action, price, quantity, testMode = true } = req.body;

        if (!itemId || !action || !price || !quantity) {
          throw new Error('Missing required fields: itemId, action, price, quantity');
        }

        return {
          itemId: parseInt(itemId),
          action,
          price: parseFloat(price),
          quantity: parseInt(quantity),
          testMode,
          timestamp: new Date(),
          userId: 'manual_test_user'
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get manual test results
   * GET /api/market-data/manual-test/results
   */
  getManualTestResults = this.createGetEndpoint(
    this.marketDataService.getManualTestResults,
    {
      operationName: 'fetch manual test results',
      parseParams: (req) => {
        const { testId, limit = 50 } = req.query;
        return {
          testId,
          limit: parseInt(limit),
          userId: 'manual_test_user'
        };
      }
    }
  );
}

module.exports = { MarketDataController };
