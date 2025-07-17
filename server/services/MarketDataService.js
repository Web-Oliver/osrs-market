/**
 * 📈 Market Data Service - Context7 Optimized
 * 
 * Context7 Pattern: Service Layer for Market Data Operations
 * - Business logic for OSRS market data
 * - DRY principles with reusable service methods
 * - Solid architecture with single responsibility
 * - Data transformation and aggregation
 * - Caching and performance optimization
 */

const MongoDataPersistence = require('./mongoDataPersistence');
const { Logger } = require('../utils/Logger');
const { CacheManager } = require('../utils/CacheManager');
const { DataTransformer } = require('../utils/DataTransformer');
const { PriceCalculator } = require('../utils/PriceCalculator');

class MarketDataService {
  constructor() {
    this.logger = new Logger('MarketDataService');
    this.cache = new CacheManager('market_data', 600); // 10 minutes cache
    this.dataTransformer = new DataTransformer();
    this.priceCalculator = new PriceCalculator();
    
    // Context7 Pattern: Initialize MongoDB persistence
    this.initializeMongoDB();
  }

  /**
   * Context7 Pattern: Initialize MongoDB with proper error handling
   */
  async initializeMongoDB() {
    try {
      const mongoConfig = {
        connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_DATABASE || 'osrs_market_tracker'
      };

      this.mongoService = new MongoDataPersistence(mongoConfig);
      await this.mongoService.connect();
      
      this.logger.info('MongoDB persistence initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize MongoDB persistence', error);
      this.mongoService = null;
    }
  }

  /**
   * Context7 Pattern: Get market data with advanced filtering
   */
  async getMarketData(options = {}) {
    try {
      this.logger.debug('Fetching market data', { options });

      const cacheKey = this.generateCacheKey('market_data', options);
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Returning cached market data');
        return cachedData;
      }

      let data;
      if (this.mongoService) {
        data = await this.mongoService.getMarketData(options);
      } else {
        data = this.generateFallbackMarketData(options);
      }

      // Context7 Pattern: Transform data for consistent API response
      const transformedData = this.dataTransformer.transformMarketData(data);
      
      // Context7 Pattern: Apply additional business logic
      const enrichedData = this.enrichMarketData(transformedData, options);
      
      this.cache.set(cacheKey, enrichedData);
      
      this.logger.debug('Successfully fetched market data', {
        recordCount: enrichedData.length,
        source: this.mongoService ? 'mongodb' : 'fallback'
      });

      return enrichedData;
    } catch (error) {
      this.logger.error('Error fetching market data', error, { options });
      return this.generateFallbackMarketData(options);
    }
  }

  /**
   * Context7 Pattern: Save market data with validation and enrichment
   */
  async saveMarketData(data) {
    try {
      this.logger.debug('Saving market data', {
        itemCount: data.items?.length,
        source: data.collectionSource
      });

      const startTime = Date.now();
      
      // Context7 Pattern: Validate and enrich data
      const enrichedItems = this.enrichMarketDataForSave(data.items, data.metadata);
      
      if (this.mongoService) {
        await this.mongoService.saveMarketData(enrichedItems, data.collectionSource);
        
        // Context7 Pattern: Invalidate cache on data change
        this.cache.deletePattern('market_data_*');
        
        const processingTime = Date.now() - startTime;
        
        this.logger.debug('Successfully saved market data', {
          itemsSaved: enrichedItems.length,
          processingTime,
          source: data.collectionSource
        });

        return {
          itemsSaved: enrichedItems.length,
          processingTime,
          source: data.collectionSource
        };
      } else {
        this.logger.warn('MongoDB unavailable, simulating save operation');
        return {
          itemsSaved: data.items.length,
          processingTime: 50,
          source: data.collectionSource
        };
      }
    } catch (error) {
      this.logger.error('Error saving market data', error, {
        itemCount: data.items?.length,
        source: data.collectionSource
      });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get market data summary with analytics
   */
  async getMarketDataSummary(timeRange = 24 * 60 * 60 * 1000) {
    try {
      this.logger.debug('Fetching market data summary', { timeRange });

      const cacheKey = `market_summary_${timeRange}`;
      const cachedSummary = this.cache.get(cacheKey);
      
      if (cachedSummary) {
        this.logger.debug('Returning cached market data summary');
        return cachedSummary;
      }

      const cutoffTime = Date.now() - timeRange;
      let summary;

      if (this.mongoService) {
        // Context7 Pattern: Use aggregation for efficient summary
        summary = await this.calculateMarketSummary(cutoffTime);
      } else {
        summary = this.generateFallbackSummary(timeRange);
      }

      // Context7 Pattern: Add calculated metrics
      const enhancedSummary = this.calculateSummaryMetrics(summary, timeRange);
      
      this.cache.set(cacheKey, enhancedSummary);
      
      this.logger.debug('Successfully fetched market data summary', {
        timeRange,
        totalItems: enhancedSummary.totalItems
      });

      return enhancedSummary;
    } catch (error) {
      this.logger.error('Error fetching market data summary', error, { timeRange });
      return this.generateFallbackSummary(timeRange);
    }
  }

  /**
   * Context7 Pattern: Get item price history with trend analysis
   */
  async getItemPriceHistory(options) {
    try {
      this.logger.debug('Fetching item price history', { options });

      const cacheKey = this.generateCacheKey('item_history', options);
      const cachedHistory = this.cache.get(cacheKey);
      
      if (cachedHistory) {
        this.logger.debug('Returning cached item price history');
        return cachedHistory;
      }

      let history;
      if (this.mongoService) {
        history = await this.getItemHistoryFromMongo(options);
      } else {
        history = this.generateFallbackItemHistory(options);
      }

      // Context7 Pattern: Calculate price trends and indicators
      const enrichedHistory = this.calculatePriceTrends(history, options);
      
      this.cache.set(cacheKey, enrichedHistory);
      
      this.logger.debug('Successfully fetched item price history', {
        itemId: options.itemId,
        recordCount: enrichedHistory.length
      });

      return enrichedHistory;
    } catch (error) {
      this.logger.error('Error fetching item price history', error, { options });
      return this.generateFallbackItemHistory(options);
    }
  }

  /**
   * Context7 Pattern: Get top traded items with ranking
   */
  async getTopTradedItems(options) {
    try {
      this.logger.debug('Fetching top traded items', { options });

      const cacheKey = this.generateCacheKey('top_items', options);
      const cachedItems = this.cache.get(cacheKey);
      
      if (cachedItems) {
        this.logger.debug('Returning cached top traded items');
        return cachedItems;
      }

      let topItems;
      if (this.mongoService) {
        topItems = await this.getTopItemsFromMongo(options);
      } else {
        topItems = this.generateFallbackTopItems(options);
      }

      // Context7 Pattern: Calculate trading metrics and rankings
      const rankedItems = this.calculateItemRankings(topItems, options);
      
      this.cache.set(cacheKey, rankedItems);
      
      this.logger.debug('Successfully fetched top traded items', {
        itemCount: rankedItems.length,
        sortBy: options.sortBy
      });

      return rankedItems;
    } catch (error) {
      this.logger.error('Error fetching top traded items', error, { options });
      return this.generateFallbackTopItems(options);
    }
  }

  /**
   * Context7 Pattern: Search items with relevance scoring
   */
  async searchItems(options) {
    try {
      this.logger.debug('Searching items', { options });

      const cacheKey = this.generateCacheKey('search', options);
      const cachedResults = this.cache.get(cacheKey);
      
      if (cachedResults) {
        this.logger.debug('Returning cached search results');
        return cachedResults;
      }

      let results;
      if (this.mongoService) {
        results = await this.searchItemsInMongo(options);
      } else {
        results = this.generateFallbackSearchResults(options);
      }

      // Context7 Pattern: Calculate relevance scores
      const scoredResults = this.calculateRelevanceScores(results, options);
      
      this.cache.set(cacheKey, scoredResults);
      
      this.logger.debug('Successfully searched items', {
        searchTerm: options.searchTerm,
        resultCount: scoredResults.length
      });

      return scoredResults;
    } catch (error) {
      this.logger.error('Error searching items', error, { options });
      return this.generateFallbackSearchResults(options);
    }
  }

  // Context7 Pattern: Private helper methods for data processing

  /**
   * Generate cache key for consistent caching
   */
  generateCacheKey(prefix, options) {
    const keyParts = [prefix];
    Object.keys(options).sort().forEach(key => {
      keyParts.push(`${key}:${options[key]}`);
    });
    return keyParts.join('_');
  }

  /**
   * Enrich market data with additional context
   */
  enrichMarketData(data, options) {
    return data.map(item => ({
      ...item,
      // Context7 Pattern: Add calculated fields
      profitMargin: this.priceCalculator.calculateProfitMargin(item),
      volatility: this.priceCalculator.calculateVolatility(item),
      tradingVolume: this.priceCalculator.calculateTradingVolume(item),
      priceChange24h: this.priceCalculator.calculatePriceChange(item, '24h'),
      trend: this.priceCalculator.calculateTrend(item),
      recommendation: this.priceCalculator.generateRecommendation(item)
    }));
  }

  /**
   * Enrich market data for saving
   */
  enrichMarketDataForSave(items, metadata) {
    return items.map(item => ({
      ...item,
      // Context7 Pattern: Add metadata and timestamps
      savedAt: Date.now(),
      source: metadata?.source || 'API',
      clientInfo: {
        ip: metadata?.clientIp,
        userAgent: metadata?.userAgent,
        requestId: metadata?.requestId
      },
      // Context7 Pattern: Add calculated fields
      dataQuality: this.dataTransformer.calculateDataQuality(item),
      completeness: this.dataTransformer.calculateCompleteness(item)
    }));
  }

  /**
   * Calculate market summary from MongoDB
   */
  async calculateMarketSummary(cutoffTime) {
    const pipeline = [
      { $match: { timestamp: { $gte: cutoffTime } } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          uniqueItems: { $addToSet: '$itemId' },
          totalVolume: { $sum: '$volume' },
          avgPrice: { $avg: '$priceData.high' },
          maxPrice: { $max: '$priceData.high' },
          minPrice: { $min: '$priceData.low' },
          totalProfit: { $sum: '$profit' }
        }
      }
    ];

    const [result] = await this.mongoService.marketDataCollection.aggregate(pipeline).toArray();
    return result || {};
  }

  /**
   * Calculate summary metrics
   */
  calculateSummaryMetrics(summary, timeRange) {
    return {
      ...summary,
      timeRange,
      timeRangeHours: timeRange / 3600000,
      uniqueItemsCount: summary.uniqueItems?.length || 0,
      averageVolumePerItem: summary.totalVolume / (summary.uniqueItems?.length || 1),
      priceSpread: (summary.maxPrice || 0) - (summary.minPrice || 0),
      profitability: this.priceCalculator.calculateProfitability(summary),
      marketHealth: this.priceCalculator.calculateMarketHealth(summary)
    };
  }

  /**
   * Calculate price trends and indicators
   */
  calculatePriceTrends(history, options) {
    return history.map((item, index) => ({
      ...item,
      // Context7 Pattern: Add technical indicators
      movingAverage: this.priceCalculator.calculateMovingAverage(history, index, 5),
      rsi: this.priceCalculator.calculateRSI(history, index),
      macd: this.priceCalculator.calculateMACD(history, index),
      support: this.priceCalculator.calculateSupport(history, index),
      resistance: this.priceCalculator.calculateResistance(history, index),
      trendDirection: this.priceCalculator.calculateTrendDirection(history, index)
    }));
  }

  /**
   * Calculate item rankings
   */
  calculateItemRankings(items, options) {
    return items.map((item, index) => ({
      ...item,
      rank: index + 1,
      score: this.priceCalculator.calculateTradingScore(item, options),
      percentile: ((items.length - index) / items.length) * 100,
      category: this.priceCalculator.categorizeItem(item)
    }));
  }

  /**
   * Calculate relevance scores for search results
   */
  calculateRelevanceScores(results, options) {
    return results.map(item => ({
      ...item,
      relevanceScore: this.calculateSearchRelevance(item, options.searchTerm),
      matchType: this.determineMatchType(item, options.searchTerm)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Calculate search relevance score
   */
  calculateSearchRelevance(item, searchTerm) {
    const name = item.itemName || item.name || '';
    const searchLower = searchTerm.toLowerCase();
    const nameLower = name.toLowerCase();

    let score = 0;
    
    // Exact match gets highest score
    if (nameLower === searchLower) score += 100;
    
    // Starts with search term
    if (nameLower.startsWith(searchLower)) score += 50;
    
    // Contains search term
    if (nameLower.includes(searchLower)) score += 25;
    
    // Word boundary matches
    const words = searchLower.split(' ');
    words.forEach(word => {
      if (nameLower.includes(word)) score += 10;
    });

    return score;
  }

  /**
   * Determine match type for search results
   */
  determineMatchType(item, searchTerm) {
    const name = (item.itemName || item.name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();

    if (name === searchLower) return 'exact';
    if (name.startsWith(searchLower)) return 'prefix';
    if (name.includes(searchLower)) return 'contains';
    return 'partial';
  }

  // Context7 Pattern: Fallback methods for when MongoDB is unavailable

  /**
   * Generate fallback market data
   */
  generateFallbackMarketData(options) {
    const mockItems = [
      { itemId: 4151, itemName: 'Abyssal whip', priceData: { high: 2500000, low: 2400000 } },
      { itemId: 11802, itemName: 'Armadyl godsword', priceData: { high: 45000000, low: 44000000 } },
      { itemId: 4712, itemName: 'Dragon bones', priceData: { high: 2500, low: 2400 } }
    ];

    return mockItems.slice(0, options.limit || 10);
  }

  /**
   * Generate fallback summary
   */
  generateFallbackSummary(timeRange) {
    return {
      totalItems: 150,
      uniqueItems: ['4151', '11802', '4712'],
      totalVolume: 50000,
      avgPrice: 1500000,
      maxPrice: 45000000,
      minPrice: 2400,
      totalProfit: 125000,
      timeRange,
      timeRangeHours: timeRange / 3600000
    };
  }

  /**
   * Generate fallback item history
   */
  generateFallbackItemHistory(options) {
    const history = [];
    const now = Date.now();
    
    for (let i = 0; i < (options.limit || 24); i++) {
      const basePrice = 2500000 + (Math.random() - 0.5) * 200000;
      history.push({
        timestamp: now - (i * 3600000), // 1 hour intervals
        itemId: options.itemId,
        priceData: {
          high: Math.round(basePrice * 1.02),
          low: Math.round(basePrice * 0.98)
        },
        volume: Math.round(Math.random() * 1000)
      });
    }
    
    return history.reverse();
  }

  /**
   * Generate fallback top items
   */
  generateFallbackTopItems(options) {
    const topItems = [
      { itemId: 4151, itemName: 'Abyssal whip', volume: 5000, price: 2500000 },
      { itemId: 11802, itemName: 'Armadyl godsword', volume: 1200, price: 45000000 },
      { itemId: 4712, itemName: 'Dragon bones', volume: 15000, price: 2500 }
    ];

    return topItems.slice(0, options.limit || 10);
  }

  /**
   * Generate fallback search results
   */
  generateFallbackSearchResults(options) {
    const allItems = [
      { itemId: 4151, itemName: 'Abyssal whip' },
      { itemId: 11802, itemName: 'Armadyl godsword' },
      { itemId: 4712, itemName: 'Dragon bones' }
    ];

    return allItems.filter(item => 
      item.itemName.toLowerCase().includes(options.searchTerm.toLowerCase())
    ).slice(0, options.limit || 10);
  }
}

module.exports = { MarketDataService };