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

      // Context7 Pattern: Validate item ID parameter
      const validation = validateRequest.getItemPriceHistory({
        ...req.params,
        ...req.query
      });
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

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
}

module.exports = { MarketDataController };