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
const TimeConstants = require('../utils/TimeConstants');

class MarketDataController extends BaseController {
  constructor(dependencies = {}) {
    super('MarketDataController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.marketDataService = dependencies.marketDataService || new MarketDataService();
    this.smartItemSelectorService = dependencies.smartItemSelectorService;
    
    // Initialize endpoints after service is set
    this.initializeEndpoints();
  }

  initializeEndpoints() {
    // All endpoints that require the service to be initialized
    this.getMarketData = this.createMarketDataGetEndpoint(
      this.marketDataService.getMarketData,
      'fetch market data',
      {
        validator: () => validateRequest.getMarketData(req.query)
      }
    );

    this.saveMarketData = this.createPostEndpoint(
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

    this.getMarketDataSummary = this.createTimeBasedEndpoint(
      this.marketDataService.getMarketDataSummary,
      'fetch market data summary',
      {
        validator: () => validateRequest.getMarketDataSummary(req.query),
        parseParams: (req) => {
          const { timeRange = TimeConstants.ONE_DAY } = req.query;
          return parseInt(timeRange);
        }
      }
    );

    this.getItemPriceHistory = this.createTimeBasedEndpoint(
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

    this.getTopTradedItems = this.createMarketDataGetEndpoint(
      this.marketDataService.getTopTradedItems,
      'fetch top traded items',
      {
        validator: () => validateRequest.getTopTradedItems(req.query)
      }
    );

    this.searchItems = this.createGetEndpoint(
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

    this.getTopFlips = this.createTradingAnalysisEndpoint(
      this.marketDataService.getTopFlips,
      'fetch top flips'
    );

    this.getRecommendations = this.createTradingAnalysisEndpoint(
      this.marketDataService.getRecommendations,
      'fetch recommendations'
    );

    this.getAlerts = this.createGetEndpoint(
      this.marketDataService.getAlerts,
      {
        operationName: 'fetch alerts',
        parseParams: this.parseAlertQuery
      }
    );

    this.createAlert = this.createPostEndpoint(
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
            metadata: {
              createdAt: Date.now(),
              clientIp: req.ip,
              userAgent: req.get('User-Agent'),
              requestId: req.id
            }
          };
        }
      }
    );

    this.deleteAlert = this.createDeleteEndpoint(
      this.marketDataService.deleteAlert,
      {
        operationName: 'delete alert',
        resourceIdParam: 'alertId'
      }
    );

    this.getAnalytics = this.createTimeBasedEndpoint(
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

    this.getCategories = this.createGetEndpoint(
      this.marketDataService.getCategories,
      {
        operationName: 'fetch categories',
        parseParams: (req) => ({
          includeStats: req.query.includeStats === 'true'
        })
      }
    );

    this.getPopularItems = this.createGetEndpoint(
      async(options) => {
        // SOLID: Use injected dependency instead of creating new instance
        const smartItemSelector = this.smartItemSelectorService;
        return await smartItemSelector.getHighValueItems(this.marketDataService, options.limit);
      },
      {
        operationName: 'fetch popular items',
        parseParams: (req) => {
          const { limit = 50, timeRange = TimeConstants.SEVEN_DAYS, sortBy = 'volume' } = req.query;
          return {
            limit: parseInt(limit),
            timeRange: parseInt(timeRange),
            sortBy
          };
        }
      }
    );
  }

  // ========================================
  // REGULAR ASYNC METHODS (NOT ENDPOINTS)
  // ========================================

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
   * Context7 Pattern: Get live market snapshot
   * GET /api/market-data/snapshot
   */
  async getMarketSnapshot(req, res, next) {
    try {
      this.logger.debug('Fetching market snapshot', {
        query: req.query,
        requestId: req.id
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.getMarketSnapshot(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid snapshot parameters', validation.errors);
      }

      const { itemIds, format = 'summary' } = req.query;

      const snapshot = await this.marketDataService.getMarketSnapshot({
        itemIds: itemIds ? itemIds.split(',').map(id => parseInt(id)) : undefined,
        format,
        includeMetadata: true,
        requestContext: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          requestId: req.id
        }
      });

      this.logger.debug('Successfully fetched market snapshot', {
        itemCount: snapshot.items ? snapshot.items.length : 0,
        format,
        requestId: req.id
      });

      return ApiResponse.success(res, snapshot, 'Market snapshot retrieved successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error fetching market snapshot
      next(error);
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Context7 Pattern: Parse time range query parameters
   */
  parseTimeRangeQuery(req) {
    const { startTime, endTime, timeRange } = req.query;
    
    if (startTime && endTime) {
      return {
        startTime: parseInt(startTime),
        endTime: parseInt(endTime)
      };
    }
    
    if (timeRange) {
      const currentTime = Date.now();
      const startTimeFromRange = currentTime - parseInt(timeRange);
      return { startTime: startTimeFromRange, endTime: currentTime };
    }
    
    // Default to last 24 hours
    const currentTime = Date.now();
    const defaultStartTime = currentTime - TimeConstants.ONE_DAY;
    return { startTime: defaultStartTime, endTime: currentTime };
  }

  /**
   * Context7 Pattern: Parse alert query parameters
   */
  parseAlertQuery(req) {
    const { userId = 'default', type, status = 'active' } = req.query;
    return {
      userId,
      type,
      status,
      limit: parseInt(req.query.limit || 50)
    };
  }
}

module.exports = { MarketDataController };