/**
 * 🌐 External API Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for External API Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const { OSRSWikiService } = require('../services/OSRSWikiService');
const { validateRequest } = require('../validators/ExternalAPIValidator');

class ExternalAPIController extends BaseController {
  constructor(dependencies = {}) {
    super('ExternalAPIController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.osrsWikiService = dependencies.osrsWikiService || new OSRSWikiService();
  }

  /**
   * Context7 Pattern: Get latest prices from OSRS Wiki
   * GET /api/external/osrs-wiki/latest-prices
   */
  getLatestPrices = this.createGetEndpoint(
    this.osrsWikiService.getLatestPrices,
    { operationName: 'fetch latest prices from OSRS Wiki' }
  );

  /**
   * Context7 Pattern: Get item mapping
   * GET /api/external/osrs-wiki/item-mapping
   */
  getItemMapping = this.createGetEndpoint(
    this.osrsWikiService.getItemMapping,
    { operationName: 'fetch item mapping from OSRS Wiki' }
  );

  /**
   * Context7 Pattern: Get timeseries data
   * GET /api/external/osrs-wiki/timeseries/:itemId
   */
  getTimeseries = this.createGetEndpoint(
    async(params) => {
      const { itemId, timestep } = params;
      return await this.osrsWikiService.getTimeseries(itemId, timestep);
    },
    {
      operationName: 'fetch timeseries data',
      validator: (req) => validateRequest.getTimeseries({ ...req.params, ...req.query }),
      parseParams: (req) => ({
        itemId: parseInt(req.params.itemId),
        timestep: req.query.timestep || '5m'
      })
    }
  );

  /**
   * Context7 Pattern: Search items
   * GET /api/external/osrs-wiki/search
   */
  searchItems = this.createGetEndpoint(
    async(params) => {
      const { query, limit } = params;
      return await this.osrsWikiService.searchItems(query, limit);
    },
    {
      operationName: 'search items',
      validator: (req) => validateRequest.searchItems(req.query),
      parseParams: (req) => ({
        query: req.query.q,
        limit: req.query.limit ? parseInt(req.query.limit) : 20
      })
    }
  );

  /**
   * Context7 Pattern: Get specific item data
   * GET /api/external/osrs-wiki/item/:itemId
   */
  getItemData = this.createGetEndpoint(
    async(params) => {
      const { itemId } = params;
      return await this.osrsWikiService.getItemData(itemId);
    },
    {
      operationName: 'fetch item data',
      validator: (req) => validateRequest.getItemData(req.params),
      parseParams: (req) => ({
        itemId: parseInt(req.params.itemId)
      })
    }
  );

  /**
   * Context7 Pattern: Get bulk item data
   * POST /api/external/osrs-wiki/bulk-items
   */
  getBulkItemData = this.createPostEndpoint(
    async(bulkData) => {
      const { itemIds } = bulkData;
      return await this.osrsWikiService.getBulkItemData(itemIds);
    },
    {
      operationName: 'fetch bulk item data',
      validator: (req) => validateRequest.getBulkItemData(req.body),
      parseBody: (req) => ({ itemIds: req.body.itemIds })
    }
  );

  /**
   * Context7 Pattern: Get API status
   * GET /api/external/osrs-wiki/status
   */
  getAPIStatus = this.createGetEndpoint(
    this.osrsWikiService.getAPIStatus,
    { operationName: 'check OSRS Wiki API status' }
  );

  /**
   * Context7 Pattern: Get service statistics
   * GET /api/external/osrs-wiki/stats
   */
  getServiceStats = this.createGetEndpoint(
    () => this.osrsWikiService.getStatistics(),
    { operationName: 'fetch service statistics' }
  );

  /**
   * Context7 Pattern: Clear service cache
   * POST /api/external/osrs-wiki/clear-cache
   */
  clearCache = this.createPostEndpoint(
    () => {
      this.osrsWikiService.clearCache();
      return { cleared: true };
    },
    { operationName: 'clear service cache' }
  );

  /**
   * Context7 Pattern: Get market summary
   * GET /api/external/osrs-wiki/market-summary
   */
  getMarketSummary = this.createGetEndpoint(
    async() => {
      // Get both latest prices and item mapping
      const [latestPrices, itemMapping] = await Promise.all([
        this.osrsWikiService.getLatestPrices(),
        this.osrsWikiService.getItemMapping()
      ]);

      // Calculate market summary
      return this.calculateMarketSummary(latestPrices, itemMapping);
    },
    { operationName: 'fetch market summary' }
  );

  /**
   * Context7 Pattern: Get trending items
   * GET /api/external/osrs-wiki/trending
   */
  getTrendingItems = this.createGetEndpoint(
    async(params) => {
      const { limit } = params;

      // Get latest prices
      const latestPrices = await this.osrsWikiService.getLatestPrices();

      // Calculate trending items based on price data freshness
      return this.calculateTrendingItems(latestPrices, limit);
    },
    {
      operationName: 'fetch trending items',
      parseParams: (req) => ({
        limit: req.query.limit ? parseInt(req.query.limit) : 10
      })
    }
  );

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
