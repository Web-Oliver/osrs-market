/**
 * 🎯 Smart Item Selector Service - Context7 Optimized
 *
 * Context7 Pattern: Service Layer for Smart Item Selection
 * - Focuses on high-value trading opportunities
 * - Reduces API calls by targeting profitable items
 * - Implements intelligent trending discovery
 * - DRY principles with reusable selection patterns
 * - SOLID architecture with single responsibility
 */

const { BaseService } = require('./BaseService');
const { OSRSWikiService } = require('./OSRSWikiService');

class SmartItemSelectorService extends BaseService {
  constructor() {
    super('SmartItemSelectorService', {
      enableCache: true,
      cachePrefix: 'smart_item_selector',
      cacheTTL: 300, // 5 minutes for item selection
      enableMongoDB: false // No MongoDB needed for selection logic
    });
    
    this.osrsWikiService = new OSRSWikiService();
  }

  /**
   * Context7 Pattern: Get high-value items based on actual market data
   */
  async getHighValueItems(marketDataService, limit = 50) {
    try {
      this.logger.debug('Getting high-value items from market data');

      const cacheKey = `high_value_items_${limit}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      if (!marketDataService) {
        throw new Error('MarketDataService is required for item selection');
      }

      // Get latest prices from OSRS Wiki API
      const latestPrices = await this.osrsWikiService.getLatestPrices();
      const itemMapping = await this.osrsWikiService.getItemMapping();

      const highValueItems = [];
      const priceData = latestPrices.data || {};

      // Filter for high-value items
      for (const [itemIdStr, prices] of Object.entries(priceData)) {
        const itemId = parseInt(itemIdStr);
        const itemInfo = itemMapping.find(item => item.id === itemId);

        if (itemInfo && prices.high && prices.high >= 100000) { // 100k gp minimum
          const spread = prices.high - prices.low;
          const spreadPercent = prices.low > 0 ? (spread / prices.low) * 100 : 0;

          if (spreadPercent >= 2) { // At least 2% spread for profitability
            highValueItems.push({
              itemId: itemId,
              itemName: itemInfo.name,
              priceData: prices,
              spread: spread,
              spreadPercent: spreadPercent,
              profitPotential: spread * 0.95, // Assume 5% tax
              members: itemInfo.members,
              tradeable: itemInfo.tradeable_on_ge
            });
          }
        }
      }

      // Sort by profit potential and take top items
      const sortedItems = highValueItems
        .sort((a, b) => b.profitPotential - a.profitPotential)
        .slice(0, limit);

      this.setCachedResult(cacheKey, sortedItems);

      this.logger.debug('Successfully retrieved high-value items', {
        count: highValueItems.length
      });

      return sortedItems;
    } catch (error) {
      this.logger.error('Error getting high-value items', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get trending items based on actual market activity
   */
  async getTrendingItems(marketDataService, limit = 20) {
    try {
      this.logger.debug('Getting trending items from market data');

      const cacheKey = `trending_items_${limit}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      if (!marketDataService) {
        throw new Error('MarketDataService is required for trending item selection');
      }

      // Get current and 5-minute average prices to detect trends
      const [latestPrices, fiveMinPrices] = await Promise.all([
        this.osrsWikiService.getLatestPrices(),
        this.osrsWikiService.get5MinutePrices()
      ]);

      const itemMapping = await this.osrsWikiService.getItemMapping();

      const trendingItems = [];
      const latestData = latestPrices.data || {};
      const fiveMinData = fiveMinPrices.data || {};

      // Find items with significant price changes
      for (const [itemIdStr, latestPrice] of Object.entries(latestData)) {
        const itemId = parseInt(itemIdStr);
        const itemInfo = itemMapping.find(item => item.id === itemId);
        const fiveMinPrice = fiveMinData[itemIdStr];

        if (itemInfo && latestPrice.high && fiveMinPrice?.avgHighPrice) {
          const priceChange = latestPrice.high - fiveMinPrice.avgHighPrice;
          const priceChangePercent = (priceChange / fiveMinPrice.avgHighPrice) * 100;

          // Filter for significant price changes (5% or more)
          if (Math.abs(priceChangePercent) >= 5) {
            trendingItems.push({
              itemId: itemId,
              itemName: itemInfo.name,
              priceData: latestPrice,
              priceChange: priceChange,
              priceChangePercent: priceChangePercent,
              volume: fiveMinPrice.highPriceVolume || 0,
              trend: priceChangePercent > 0 ? 'up' : 'down',
              members: itemInfo.members,
              tradeable: itemInfo.tradeable_on_ge
            });
          }
        }
      }

      // Sort by absolute price change percentage
      const sortedItems = trendingItems
        .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
        .slice(0, limit);

      this.setCachedResult(cacheKey, sortedItems);

      this.logger.debug('Successfully retrieved trending items', {
        count: trendingItems.length
      });

      return sortedItems;
    } catch (error) {
      this.logger.error('Error getting trending items', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get stable trading items for consistent profit
   */
  async getStableItems(marketDataService, limit = 30) {
    try {
      this.logger.debug('Getting stable trading items from market data');

      const cacheKey = `stable_items_${limit}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      if (!marketDataService) {
        throw new Error('MarketDataService is required for stable item selection');
      }

      // Query for stable items with consistent volume and low volatility
      const stableItems = await marketDataService.getMarketData({
        maxVolatility: 10, // Low volatility
        minVolume: 50, // Consistent trading volume
        sortBy: 'consistency',
        limit: limit,
        timeRange: 7 * 24 * 60 * 60 * 1000 // Last 7 days
      });

      this.setCachedResult(cacheKey, stableItems);

      this.logger.debug('Successfully retrieved stable items', {
        count: stableItems.length
      });

      return stableItems;
    } catch (error) {
      this.logger.error('Error getting stable items', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get items by category based on market performance
   */
  async getItemsByCategory(marketDataService, category, limit = 25) {
    try {
      this.logger.debug('Getting items by category from market data', { category });

      const cacheKey = `category_items_${category}_${limit}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      if (!marketDataService) {
        throw new Error('MarketDataService is required for category item selection');
      }

      // Query for items in specific category
      const categoryItems = await marketDataService.getMarketData({
        category: category,
        sortBy: 'profitPotential',
        limit: limit,
        timeRange: 24 * 60 * 60 * 1000 // Last 24 hours
      });

      this.setCachedResult(cacheKey, categoryItems);

      this.logger.debug('Successfully retrieved category items', {
        category,
        count: categoryItems.length
      });

      return categoryItems;
    } catch (error) {
      this.logger.error('Error getting items by category', error, { category });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get personalized recommendations based on user preferences
   */
  async getPersonalizedRecommendations(marketDataService, userPreferences, limit = 20) {
    try {
      this.logger.debug('Getting personalized recommendations', { userPreferences });

      const cacheKey = `personalized_${JSON.stringify(userPreferences)}_${limit}`;
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      if (!marketDataService) {
        throw new Error('MarketDataService is required for personalized recommendations');
      }

      // Build query based on user preferences
      const query = {
        minPrice: userPreferences.minPrice || 0,
        maxPrice: userPreferences.maxPrice || Number.MAX_SAFE_INTEGER,
        categories: userPreferences.categories || [],
        riskLevel: userPreferences.riskLevel || 'medium',
        sortBy: userPreferences.sortBy || 'profitPotential',
        limit: limit,
        timeRange: userPreferences.timeRange || 24 * 60 * 60 * 1000
      };

      const recommendations = await marketDataService.getMarketData(query);

      this.setCachedResult(cacheKey, recommendations);

      this.logger.debug('Successfully retrieved personalized recommendations', {
        count: recommendations.length
      });

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting personalized recommendations', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Cache management
   */
  getCachedResult(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      this.logger.debug('Returning cached result', { key });
      return cached.data;
    }
    return null;
  }

  setCachedResult(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Context7 Pattern: Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }
}

module.exports = { SmartItemSelectorService };
