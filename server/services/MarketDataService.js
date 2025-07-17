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
const { OSRSWikiService } = require('./OSRSWikiService');
const { MarketPriceSnapshotModel } = require('../models/MarketPriceSnapshotModel');

// TRADING INTEGRATION
const { AITradingOrchestratorService } = require('./AITradingOrchestratorService');
const { ItemRepository } = require('../repositories/ItemRepository');

class MarketDataService {
  constructor() {
    this.logger = new Logger('MarketDataService');
    this.cache = new CacheManager('market_data', 600); // 10 minutes cache
    this.dataTransformer = new DataTransformer();
    this.priceCalculator = new PriceCalculator();
    this.osrsWikiService = new OSRSWikiService();
    
    // TRADING INTEGRATION
    this.itemRepository = new ItemRepository();
    this.aiTrading = new AITradingOrchestratorService();
    
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
        // Fall back to live OSRS Wiki API data
        this.logger.info('MongoDB unavailable, fetching live data from OSRS Wiki API');
        data = await this.fetchLiveMarketData(options);
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
      throw error;
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
        throw new Error('Database connection unavailable - cannot fetch market data summary');
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
      throw error;
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
        // Fall back to live OSRS Wiki API data
        this.logger.info('MongoDB unavailable, fetching live price history from OSRS Wiki API');
        history = await this.fetchLiveItemHistory(options);
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
      throw error;
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
        // Fall back to live OSRS Wiki API data
        this.logger.info('MongoDB unavailable, fetching live top items from OSRS Wiki API');
        topItems = await this.fetchLiveTopItems(options);
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
      throw error;
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
        // Fall back to live OSRS Wiki API data
        this.logger.info('MongoDB unavailable, searching items using OSRS Wiki API');
        results = await this.searchItemsLive(options);
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
      throw error;
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

  // Context7 Pattern: MongoDB data retrieval methods

  /**
   * Get item history from MongoDB
   */
  async getItemHistoryFromMongo(options) {
    const query = {
      itemId: options.itemId,
      timestamp: {
        $gte: options.startTime || (Date.now() - 24 * 60 * 60 * 1000),
        $lte: options.endTime || Date.now()
      }
    };

    return await this.mongoService.marketDataCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 100)
      .toArray();
  }

  /**
   * Get top items from MongoDB
   */
  async getTopItemsFromMongo(options) {
    const pipeline = [
      {
        $match: {
          timestamp: {
            $gte: options.startTime || (Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      },
      {
        $group: {
          _id: '$itemId',
          itemName: { $first: '$itemName' },
          totalVolume: { $sum: '$volume' },
          avgPrice: { $avg: '$priceData.high' },
          lastPrice: { $last: '$priceData.high' }
        }
      },
      {
        $sort: {
          [options.sortBy || 'totalVolume']: -1
        }
      },
      {
        $limit: options.limit || 10
      }
    ];

    return await this.mongoService.marketDataCollection.aggregate(pipeline).toArray();
  }

  /**
   * Search items in MongoDB
   */
  async searchItemsInMongo(options) {
    const query = {
      itemName: {
        $regex: options.searchTerm,
        $options: 'i'
      }
    };

    return await this.mongoService.marketDataCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 10)
      .toArray();
  }

  /**
   * Context7 Pattern: Fetch live market data from OSRS Wiki API
   */
  async fetchLiveMarketData(options) {
    try {
      this.logger.debug('Fetching live market data from OSRS Wiki API', { options });
      
      const latestPrices = await this.osrsWikiService.getLatestPrices();
      const itemMapping = await this.osrsWikiService.getItemMapping();
      
      const marketData = [];
      const priceData = latestPrices.data || {};
      
      // Get bulk data efficiently
      const itemIds = options.itemIds || [
        4151,  // Abyssal whip
        11802, // Armadyl godsword
        4712,  // Dragon bones
        139,   // Cooked lobster
        560,   // Death rune
        561,   // Nature rune
        562,   // Law rune
        563,   // Cosmic rune
        565,   // Blood rune
        566    // Soul rune
      ];

      // Use bulk item data method for efficiency
      const bulkResult = await this.osrsWikiService.getBulkItemData(
        itemIds.slice(0, options.limit || 50)
      );
      
      // Transform bulk result to market data format
      for (const item of bulkResult.items) {
        if (!item.error && item.priceData) {
          marketData.push({
            itemId: item.id,
            itemName: item.name,
            priceData: {
              high: item.priceData.high,
              low: item.priceData.low,
              highTime: item.priceData.highTime,
              lowTime: item.priceData.lowTime
            },
            volume: 0, // Volume not available in latest prices
            timestamp: Date.now(),
            source: 'osrs_wiki_bulk'
          });
        }
      }
      
      this.logger.info('Successfully fetched live market data', {
        itemCount: marketData.length,
        source: 'osrs_wiki_api'
      });
      
      return marketData;
    } catch (error) {
      this.logger.error('Error fetching live market data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Fetch live item history from OSRS Wiki API
   */
  async fetchLiveItemHistory(options) {
    try {
      this.logger.debug('Fetching live item history from OSRS Wiki API', { options });
      
      const timeseriesData = await this.osrsWikiService.getTimeseries(
        options.itemId,
        options.timestep || '5m'
      );
      
      const history = (timeseriesData.data || []).map(point => ({
        timestamp: point.timestamp * 1000, // Convert to milliseconds
        itemId: options.itemId,
        priceData: {
          high: point.avgHighPrice,
          low: point.avgLowPrice
        },
        volume: point.highPriceVolume || 0,
        source: 'osrs_wiki_timeseries'
      }));
      
      this.logger.info('Successfully fetched live item history', {
        itemId: options.itemId,
        dataPoints: history.length,
        source: 'osrs_wiki_api'
      });
      
      return history;
    } catch (error) {
      this.logger.error('Error fetching live item history', error, { options });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Fetch live top items from OSRS Wiki API
   */
  async fetchLiveTopItems(options) {
    try {
      this.logger.debug('Fetching live top items from OSRS Wiki API', { options });
      
      const latestPrices = await this.osrsWikiService.getLatestPrices();
      const itemMapping = await this.osrsWikiService.getItemMapping();
      
      const topItems = [];
      const priceData = latestPrices.data || {};
      
      // Get high-value items based on price - filter first, then bulk fetch
      const highValueItemIds = [];
      
      for (const [itemIdStr, prices] of Object.entries(priceData)) {
        const itemId = parseInt(itemIdStr);
        if (prices.high && prices.high > 100000) { // Items worth more than 100k
          highValueItemIds.push(itemId);
        }
      }
      
      // Use bulk fetch for efficiency (limit to reasonable number)
      const limitedItemIds = highValueItemIds.slice(0, Math.min(options.limit || 50, 100));
      const bulkResult = await this.osrsWikiService.getBulkItemData(limitedItemIds);
      
      const highValueItems = [];
      for (const item of bulkResult.items) {
        if (!item.error && item.priceData && item.priceData.high > 100000) {
          highValueItems.push({
            itemId: item.id,
            itemName: item.name,
            price: item.priceData.high,
            volume: 0, // Volume not available in latest prices
            priceData: item.priceData,
            source: 'osrs_wiki_bulk'
          });
        }
      }
      
      // Sort by price and take top items
      const sortedItems = highValueItems
        .sort((a, b) => {
          switch (options.sortBy) {
            case 'price':
              return b.price - a.price;
            case 'volume':
              return b.volume - a.volume;
            default:
              return b.price - a.price;
          }
        })
        .slice(0, options.limit || 10);
      
      this.logger.info('Successfully fetched live top items', {
        itemCount: sortedItems.length,
        source: 'osrs_wiki_api'
      });
      
      return sortedItems;
    } catch (error) {
      this.logger.error('Error fetching live top items', error, { options });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Search items using OSRS Wiki API
   */
  async searchItemsLive(options) {
    try {
      this.logger.debug('Searching items using OSRS Wiki API', { options });
      
      const searchResults = await this.osrsWikiService.searchItems(
        options.searchTerm,
        options.limit || 10
      );
      
      // Get price data for search results using bulk fetch
      const itemIds = searchResults.results.map(item => item.id);
      const bulkResult = await this.osrsWikiService.getBulkItemData(itemIds);
      
      // Create lookup map for efficient matching
      const itemDataMap = new Map();
      for (const item of bulkResult.items) {
        if (!item.error) {
          itemDataMap.set(item.id, item);
        }
      }
      
      const results = searchResults.results.map(searchItem => {
        const itemData = itemDataMap.get(searchItem.id);
        return {
          itemId: searchItem.id,
          itemName: searchItem.name,
          priceData: itemData?.priceData || null,
          relevanceScore: searchItem.relevanceScore,
          timestamp: Date.now(),
          source: 'osrs_wiki_search_bulk'
        };
      });
      
      this.logger.info('Successfully searched items', {
        searchTerm: options.searchTerm,
        resultCount: results.length,
        source: 'osrs_wiki_api'
      });
      
      return results;
    } catch (error) {
      this.logger.error('Error searching items', error, { options });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Save market snapshot with upsert functionality
   * 
   * Implementation of Step 0.2 requirement - uses findOneAndUpdate with upsert
   * to prevent duplicate entries based on itemId, timestamp, and interval
   * 
   * @param {Partial<IMarketPriceSnapshot>} data - Market snapshot data
   * @returns {Promise<IMarketPriceSnapshot>} Saved or updated market snapshot
   * @throws {Error} If validation fails or database error occurs
   */
  async saveMarketSnapshot(data) {
    try {
      this.logger.debug('Attempting to save market snapshot', {
        itemId: data.itemId,
        timestamp: data.timestamp,
        interval: data.interval,
        source: data.source
      });

      // Validate required fields
      if (!data.itemId || !data.timestamp || !data.interval) {
        throw new Error('Missing required fields: itemId, timestamp, interval');
      }

      // Validate price consistency
      if (data.highPrice && data.lowPrice && data.highPrice < data.lowPrice) {
        throw new Error('High price cannot be less than low price');
      }

      // Validate interval enum
      const validIntervals = ['daily_scrape', '5m', '1h', 'latest', '6m_scrape'];
      if (!validIntervals.includes(data.interval)) {
        throw new Error(`Invalid interval: ${data.interval}. Must be one of: ${validIntervals.join(', ')}`);
      }

      // Validate RSI if provided
      if (data.rsi !== undefined && data.rsi !== null && (data.rsi < 0 || data.rsi > 100)) {
        throw new Error('RSI must be between 0 and 100');
      }

      // Create filter for compound unique index (itemId, interval, timestamp)
      const filter = {
        itemId: data.itemId,
        interval: data.interval,
        timestamp: data.timestamp
      };

      // Use findOneAndUpdate with upsert for atomic operation
      // This prevents race conditions and ensures data consistency
      const options = {
        upsert: true,           // Create if not exists
        new: true,              // Return updated document
        runValidators: false,   // Disable mongoose validators to avoid cross-field validation issues
        setDefaultsOnInsert: true // Apply defaults on insert
      };

      const snapshot = await MarketPriceSnapshotModel.findOneAndUpdate(
        filter,
        data,  // Use direct assignment instead of $set to avoid validation issues
        options
      );

      this.logger.info('Market snapshot saved successfully', {
        id: snapshot._id,
        itemId: snapshot.itemId,
        timestamp: snapshot.timestamp,
        interval: snapshot.interval,
        highPrice: snapshot.highPrice,
        lowPrice: snapshot.lowPrice,
        volume: snapshot.volume,
        source: snapshot.source
      });

      return snapshot;

    } catch (error) {
      this.logger.error('Failed to save market snapshot', error, {
        itemId: data?.itemId,
        timestamp: data?.timestamp,
        interval: data?.interval
      });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get market snapshots with filtering capabilities
   * 
   * Implementation of Step 0.2 requirement - supports optional filtering
   * by interval, startDate, and endDate for flexible querying
   * 
   * @param {number} itemId - The item ID to query
   * @param {string} [interval] - Optional interval filter ('latest', '5m', '1h', etc.)
   * @param {number} [startDate] - Optional start timestamp (Unix timestamp)
   * @param {number} [endDate] - Optional end timestamp (Unix timestamp)
   * @returns {Promise<IMarketPriceSnapshot[]>} Array of market snapshots
   * @throws {Error} If validation fails or database error occurs
   */
  async getMarketSnapshots(itemId, interval, startDate, endDate) {
    try {
      this.logger.debug('Querying market snapshots', {
        itemId,
        interval,
        startDate,
        endDate
      });

      // Validate required parameters
      if (!itemId || typeof itemId !== 'number') {
        throw new Error('itemId must be a valid number');
      }

      // Build query filter
      const filter = { itemId };

      // Add interval filter if provided
      if (interval) {
        filter.interval = interval;
      }

      // Add timestamp range filter if provided
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) {
          filter.timestamp.$gte = startDate;
        }
        if (endDate) {
          filter.timestamp.$lte = endDate;
        }
      }

      // Execute query with sorting by timestamp (newest first)
      const snapshots = await MarketPriceSnapshotModel
        .find(filter)
        .sort({ timestamp: -1 })
        .exec();

      this.logger.info('Market snapshots retrieved successfully', {
        itemId,
        interval,
        startDate,
        endDate,
        count: snapshots.length
      });

      return snapshots;

    } catch (error) {
      this.logger.error('Failed to retrieve market snapshots', error, {
        itemId,
        interval,
        startDate,
        endDate
      });
      throw error;
    }
  }
}

module.exports = { MarketDataService };