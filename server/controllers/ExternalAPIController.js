/**
 * 🌐 External API Controller - Context7 Optimized
 *
 * Context7 Pattern: Controller Layer for External API Operations
 * - Handles external API requests (OSRS Wiki, etc.)
 * - Thin controllers with business logic in services
 * - Proper validation and error handling
 * - DRY principles with reusable patterns
 */

const { OSRSWikiService } = require('../services/OSRSWikiService');
const { validateRequest } = require('../validators/ExternalAPIValidator');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class ExternalAPIController {
  constructor() {
    this.osrsWikiService = new OSRSWikiService();
    this.logger = new Logger('ExternalAPIController');

    // Context7 Pattern: Bind methods to preserve 'this' context
    this.getLatestPrices = this.getLatestPrices.bind(this);
    this.getItemMapping = this.getItemMapping.bind(this);
    this.getTimeseries = this.getTimeseries.bind(this);
    this.searchItems = this.searchItems.bind(this);
    this.getItemData = this.getItemData.bind(this);
    this.getBulkItemData = this.getBulkItemData.bind(this);
    this.getAPIStatus = this.getAPIStatus.bind(this);
  }

  /**
   * Context7 Pattern: Get latest prices from OSRS Wiki
   * GET /api/external/osrs-wiki/latest-prices
   */
  async getLatestPrices(req, res, next) {
    try {
      this.logger.info('Fetching latest prices from OSRS Wiki', {
        ip: req.ip,
        requestId: req.id
      });

      const data = await this.osrsWikiService.getLatestPrices();

      this.logger.info('Successfully fetched latest prices', {
        itemCount: Object.keys(data.data || {}).length,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Latest prices fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching latest prices', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get item mapping
   * GET /api/external/osrs-wiki/item-mapping
   */
  async getItemMapping(req, res, next) {
    try {
      this.logger.info('Fetching item mapping from OSRS Wiki', {
        ip: req.ip,
        requestId: req.id
      });

      const data = await this.osrsWikiService.getItemMapping();

      this.logger.info('Successfully fetched item mapping', {
        itemCount: data.length,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Item mapping fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching item mapping', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get timeseries data
   * GET /api/external/osrs-wiki/timeseries/:itemId
   */
  async getTimeseries(req, res, next) {
    try {
      this.logger.info('Fetching timeseries data', {
        itemId: req.params.itemId,
        timestep: req.query.timestep,
        requestId: req.id
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.getTimeseries({
        ...req.params,
        ...req.query
      });

      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const itemId = parseInt(req.params.itemId);
      const timestep = req.query.timestep || '5m';

      const data = await this.osrsWikiService.getTimeseries(itemId, timestep);

      this.logger.info('Successfully fetched timeseries data', {
        itemId,
        timestep,
        dataPoints: data.data ? data.data.length : 0,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Timeseries data fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching timeseries data', error, {
        itemId: req.params.itemId,
        timestep: req.query.timestep,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Search items
   * GET /api/external/osrs-wiki/search
   */
  async searchItems(req, res, next) {
    try {
      this.logger.info('Searching items', {
        query: req.query.q,
        limit: req.query.limit,
        requestId: req.id
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.searchItems(req.query);

      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid search parameters', validation.errors);
      }

      const query = req.query.q;
      const limit = req.query.limit ? parseInt(req.query.limit) : 20;

      const data = await this.osrsWikiService.searchItems(query, limit);

      this.logger.info('Successfully searched items', {
        query,
        resultCount: data.results.length,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Items search completed successfully');
    } catch (error) {
      this.logger.error('Error searching items', error, {
        query: req.query.q,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get specific item data
   * GET /api/external/osrs-wiki/item/:itemId
   */
  async getItemData(req, res, next) {
    try {
      this.logger.info('Fetching item data', {
        itemId: req.params.itemId,
        requestId: req.id
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.getItemData(req.params);

      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid item ID', validation.errors);
      }

      const itemId = parseInt(req.params.itemId);
      const data = await this.osrsWikiService.getItemData(itemId);

      this.logger.info('Successfully fetched item data', {
        itemId,
        itemName: data.name,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Item data fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching item data', error, {
        itemId: req.params.itemId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get bulk item data
   * POST /api/external/osrs-wiki/bulk-items
   */
  async getBulkItemData(req, res, next) {
    try {
      this.logger.info('Fetching bulk item data', {
        itemCount: req.body.itemIds?.length,
        requestId: req.id
      });

      // Context7 Pattern: Validate request body
      const validation = validateRequest.getBulkItemData(req.body);

      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request body', validation.errors);
      }

      const itemIds = req.body.itemIds;
      const data = await this.osrsWikiService.getBulkItemData(itemIds);

      this.logger.info('Successfully fetched bulk item data', {
        requested: itemIds.length,
        successful: data.stats.successful,
        failed: data.stats.failed,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Bulk item data fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching bulk item data', error, {
        itemCount: req.body.itemIds?.length,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get API status
   * GET /api/external/osrs-wiki/status
   */
  async getAPIStatus(req, res, next) {
    try {
      this.logger.info('Checking OSRS Wiki API status', {
        requestId: req.id
      });

      const status = await this.osrsWikiService.getAPIStatus();

      this.logger.info('OSRS Wiki API status check completed', {
        status: status.status,
        responseTime: status.responseTime,
        requestId: req.id
      });

      return ApiResponse.success(res, status, 'API status retrieved successfully');
    } catch (error) {
      this.logger.error('Error checking API status', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get service statistics
   * GET /api/external/osrs-wiki/stats
   */
  async getServiceStats(req, res, next) {
    try {
      this.logger.info('Fetching service statistics', {
        requestId: req.id
      });

      const stats = this.osrsWikiService.getStatistics();

      this.logger.info('Successfully fetched service statistics', {
        requestId: req.id
      });

      return ApiResponse.success(res, stats, 'Service statistics retrieved successfully');
    } catch (error) {
      this.logger.error('Error fetching service statistics', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Clear service cache
   * POST /api/external/osrs-wiki/clear-cache
   */
  async clearCache(req, res, next) {
    try {
      this.logger.info('Clearing service cache', {
        requestId: req.id
      });

      this.osrsWikiService.clearCache();

      this.logger.info('Service cache cleared successfully', {
        requestId: req.id
      });

      return ApiResponse.success(res, { cleared: true }, 'Cache cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing cache', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get market summary
   * GET /api/external/osrs-wiki/market-summary
   */
  async getMarketSummary(req, res, next) {
    try {
      this.logger.info('Fetching market summary', {
        requestId: req.id
      });

      // Get both latest prices and item mapping
      const [latestPrices, itemMapping] = await Promise.all([
        this.osrsWikiService.getLatestPrices(),
        this.osrsWikiService.getItemMapping()
      ]);

      // Calculate market summary
      const summary = this.calculateMarketSummary(latestPrices, itemMapping);

      this.logger.info('Successfully fetched market summary', {
        totalItems: summary.totalItems,
        itemsWithPrices: summary.itemsWithPrices,
        requestId: req.id
      });

      return ApiResponse.success(res, summary, 'Market summary retrieved successfully');
    } catch (error) {
      this.logger.error('Error fetching market summary', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get trending items
   * GET /api/external/osrs-wiki/trending
   */
  async getTrendingItems(req, res, next) {
    try {
      this.logger.info('Fetching trending items', {
        limit: req.query.limit,
        requestId: req.id
      });

      const limit = req.query.limit ? parseInt(req.query.limit) : 10;

      // Get latest prices
      const latestPrices = await this.osrsWikiService.getLatestPrices();

      // Calculate trending items based on price data freshness
      const trendingItems = this.calculateTrendingItems(latestPrices, limit);

      this.logger.info('Successfully fetched trending items', {
        itemCount: trendingItems.length,
        requestId: req.id
      });

      return ApiResponse.success(res, trendingItems, 'Trending items retrieved successfully');
    } catch (error) {
      this.logger.error('Error fetching trending items', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  // Context7 Pattern: Private helper methods

  /**
   * Calculate market summary
   */
  calculateMarketSummary(latestPrices, itemMapping) {
    const priceData = latestPrices.data || {};
    const totalItems = itemMapping.length;
    const itemsWithPrices = Object.keys(priceData).length;

    let totalValue = 0;
    let totalSpread = 0;
    let highestPrice = 0;
    let lowestPrice = Infinity;

    for (const [, prices] of Object.entries(priceData)) {
      if (prices.high) {
        totalValue += prices.high;
        highestPrice = Math.max(highestPrice, prices.high);
        lowestPrice = Math.min(lowestPrice, prices.high);
      }

      if (prices.high && prices.low) {
        totalSpread += (prices.high - prices.low);
      }
    }

    const averagePrice = itemsWithPrices > 0 ? totalValue / itemsWithPrices : 0;
    const averageSpread = itemsWithPrices > 0 ? totalSpread / itemsWithPrices : 0;

    return {
      totalItems,
      itemsWithPrices,
      priceDataCoverage: `${((itemsWithPrices / totalItems) * 100).toFixed(1)}%`,
      averagePrice: Math.round(averagePrice),
      averageSpread: Math.round(averageSpread),
      highestPrice,
      lowestPrice: lowestPrice === Infinity ? 0 : lowestPrice,
      totalMarketValue: Math.round(totalValue),
      lastUpdated: latestPrices.timestamp
    };
  }

  /**
   * Calculate trending items
   */
  calculateTrendingItems(latestPrices, limit) {
    const priceData = latestPrices.data || {};
    const trending = [];

    for (const [itemId, prices] of Object.entries(priceData)) {
      if (prices.high && prices.low && prices.highTime && prices.lowTime) {
        const now = Date.now();
        const avgAge = ((now - prices.highTime) + (now - prices.lowTime)) / 2;
        const spread = prices.high - prices.low;
        const profitMargin = (spread / prices.low) * 100;

        // Score based on recent activity and profitability
        const freshnessScore = Math.max(0, 100 - (avgAge / (1000 * 60 * 60))); // Hours since update
        const profitScore = Math.min(100, profitMargin * 2);
        const trendingScore = (freshnessScore * 0.6) + (profitScore * 0.4);

        trending.push({
          itemId: parseInt(itemId),
          trendingScore: Math.round(trendingScore),
          profitMargin: Math.round(profitMargin * 100) / 100,
          spread,
          highPrice: prices.high,
          lowPrice: prices.low,
          lastUpdate: Math.max(prices.highTime, prices.lowTime)
        });
      }
    }

    return trending
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);
  }
}

module.exports = { ExternalAPIController };
