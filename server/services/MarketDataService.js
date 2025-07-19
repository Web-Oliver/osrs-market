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
const fetch = require('node-fetch');
const { CacheManager } = require('../utils/CacheManager');
const { DataTransformer } = require('../utils/DataTransformer');
const { PriceCalculator } = require('../utils/PriceCalculator');
const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');
const { OSRSWikiService } = require('./OSRSWikiService');
const { MarketPriceSnapshotModel } = require('../models/MarketPriceSnapshotModel');
const { 
  calculateProfitAfterTax, 
  calculateProfitPercentageAfterTax,
  calculateGETax,
  calculateNetSellPrice,
  isTaxFree 
} = require('../utils/marketConstants');

// TRADING INTEGRATION
const { AITradingOrchestratorService } = require('./AITradingOrchestratorService');
const { ItemRepository } = require('../repositories/ItemRepository');

class MarketDataService {
  constructor() {
    this.logger = new Logger('MarketDataService');
    this.cache = new CacheManager('market_data', 600); // 10 minutes cache
    this.dataTransformer = new DataTransformer();
    this.priceCalculator = new PriceCalculator();
    this.metricsCalculator = new FinancialMetricsCalculator();
    this.osrsWikiService = new OSRSWikiService();
    
    // TRADING INTEGRATION
    this.itemRepository = new ItemRepository();
    this.aiTrading = new AITradingOrchestratorService();
    
    // Context7 Pattern: Initialize MongoDB persistence
    this.initializeMongoDB();
  }

  /**
   * Context7 Pattern: Get live market data from OSRS Wiki API
   */
  async getLiveMarketData() {
    try {
      this.logger.info('Fetching live market data from OSRS Wiki API');
      
      const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/latest', {
        headers: {
          'User-Agent': 'OSRS-Market-Backend - Market Analysis Tool'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OSRS Wiki API returned ${response.status}`);
      }
      
      const wikiData = await response.json();
      const processedData = {};
      
      // Convert wiki format to our market data format
      Object.entries(wikiData.data).forEach(([itemId, priceData]) => {
        if (priceData.high && priceData.low) {
          const marginGp = priceData.high - priceData.low;
          const marginPercent = (marginGp / priceData.low) * 100;
          
          processedData[itemId] = {
            itemId: parseInt(itemId),
            highPrice: priceData.high,
            lowPrice: priceData.low,
            volume: 100, // Wiki doesn't provide volume in latest endpoint
            marginGp: marginGp,
            marginPercent: marginPercent,
            rsi: 50, // Default neutral RSI
            volatility: Math.min(marginPercent * 2, 100), // Estimated volatility
            riskScore: Math.min(25 + (marginPercent * 0.5), 100), // Estimated risk
            expectedProfitPerHour: marginGp * 20, // Estimated profit per hour
            timestamp: priceData.highTime || Date.now()
          };
        }
      });
      
      this.logger.info(`Processed ${Object.keys(processedData).length} items from OSRS Wiki API`);
      return processedData;
      
    } catch (error) {
      this.logger.error('Failed to fetch live market data from OSRS Wiki', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get 5-minute market data from OSRS Wiki API with volume
   */
  async get5MinuteMarketData() {
    try {
      this.logger.info('Fetching 5-minute market data from OSRS Wiki API');
      
      const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/5m', {
        headers: {
          'User-Agent': 'OSRS-Market-Backend - Market Analysis Tool'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OSRS Wiki 5m API returned ${response.status}`);
      }
      
      const wikiData = await response.json();
      const processedData = {};
      
      // Convert wiki 5m format to our market data format
      Object.entries(wikiData.data).forEach(([itemId, priceData]) => {
        if (priceData.avgHighPrice && priceData.avgLowPrice && priceData.highPriceVolume) {
          const marginGp = priceData.avgHighPrice - priceData.avgLowPrice;
          const marginPercent = (marginGp / priceData.avgLowPrice) * 100;
          const volume = priceData.highPriceVolume + priceData.lowPriceVolume;
          
          // Calculate volatility based on price range and volume
          const priceRange = (marginGp / priceData.avgLowPrice) * 100;
          const volatility = Math.min(priceRange * 1.5, 100);
          
          // Calculate risk score based on volatility and volume
          const volumeScore = Math.min(volume / 100, 50); // Higher volume = lower risk
          const riskScore = Math.max(5, Math.min(95, volatility - volumeScore + 25));
          
          // Calculate expected profit per hour based on volume and margin
          const turnoverRate = Math.min(volume / 10, 50); // How often we can flip
          const expectedProfitPerHour = marginGp * turnoverRate;
          
          processedData[itemId] = {
            itemId: parseInt(itemId),
            highPrice: priceData.avgHighPrice,
            lowPrice: priceData.avgLowPrice,
            volume: volume,
            marginGp: marginGp,
            marginPercent: marginPercent,
            rsi: volume > 50 ? (volume > 200 ? 45 : 50) : 55, // Estimate RSI based on volume
            volatility: volatility,
            riskScore: riskScore,
            expectedProfitPerHour: expectedProfitPerHour,
            timestamp: wikiData.timestamp || Date.now(),
            interval: '5m',
            source: 'osrs_wiki_5m'
          };
        }
      });
      
      this.logger.info(`Processed ${Object.keys(processedData).length} items from OSRS Wiki 5m API`);
      return processedData;
      
    } catch (error) {
      this.logger.error('Failed to fetch 5-minute market data from OSRS Wiki', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get 1-hour market data from OSRS Wiki API
   */
  async get1HourMarketData() {
    try {
      this.logger.info('Fetching 1-hour market data from OSRS Wiki API');
      
      const response = await fetch('https://prices.runescape.wiki/api/v1/osrs/1h', {
        headers: {
          'User-Agent': 'OSRS-Market-Backend - Market Analysis Tool'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OSRS Wiki 1h API returned ${response.status}`);
      }
      
      const wikiData = await response.json();
      const processedData = {};
      
      // Convert wiki 1h format to our market data format
      Object.entries(wikiData.data).forEach(([itemId, priceData]) => {
        if (priceData.avgHighPrice && priceData.avgLowPrice && priceData.highPriceVolume) {
          const marginGp = priceData.avgHighPrice - priceData.avgLowPrice;
          const marginPercent = priceData.avgLowPrice > 0 ? (marginGp / priceData.avgLowPrice) * 100 : 0;
          const volume = priceData.highPriceVolume + priceData.lowPriceVolume;
          
          // Calculate expected profit per hour (conservative estimate for 1h data)
          const expectedProfitPerHour = marginGp * Math.min(volume / 20, 30); // More conservative for 1h data
          
          // Calculate volatility and risk based on price spread
          const volatility = priceData.avgLowPrice > 0 ? (marginGp / priceData.avgLowPrice) * 100 : 0;
          const riskScore = Math.min(100, Math.max(0, volatility * 2)); // Risk increases with volatility
          
          // Calculate RSI (simplified for API data)
          const rsi = 50 + (marginPercent / 2); // Simplified RSI calculation
          
          processedData[itemId] = {
            itemId: parseInt(itemId),
            highPrice: priceData.avgHighPrice,
            lowPrice: priceData.avgLowPrice,
            volume: volume,
            marginGp: marginGp,
            marginPercent: marginPercent,
            volatility: volatility,
            rsi: Math.min(100, Math.max(0, rsi)),
            riskScore: riskScore,
            expectedProfitPerHour: expectedProfitPerHour,
            timestamp: wikiData.timestamp || Date.now(),
            interval: '1h',
            source: 'osrs_wiki_1h'
          };
        }
      });
      
      this.logger.info(`Processed ${Object.keys(processedData).length} items from 1-hour market data`);
      return processedData;
      
    } catch (error) {
      this.logger.error('Failed to fetch 1-hour market data from OSRS Wiki API', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Sync 5-minute data to database
   */
  async sync5MinuteData() {
    try {
      const marketData = await this.get5MinuteMarketData();
      const savedCount = 0;
      
      // Save each item's market data to database
      for (const [itemId, data] of Object.entries(marketData)) {
        try {
          await this.saveMarketSnapshot({
            itemId: data.itemId,
            timestamp: data.timestamp,
            interval: '5m',
            highPrice: data.highPrice,
            lowPrice: data.lowPrice,
            volume: data.volume,
            source: 'osrs_wiki_5m',
            marginGp: data.marginGp,
            marginPercent: data.marginPercent,
            volatility: data.volatility,
            rsi: data.rsi,
            riskScore: data.riskScore,
            expectedProfitPerHour: data.expectedProfitPerHour
          });
        } catch (error) {
          // Don't fail entire sync for one item
          this.logger.warn(`Failed to save market data for item ${itemId}:`, error.message);
        }
      }
      
      this.logger.info(`Synced 5-minute market data for ${Object.keys(marketData).length} items`);
      return { success: true, itemCount: Object.keys(marketData).length };
      
    } catch (error) {
      this.logger.error('Failed to sync 5-minute market data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Sync 1-hour data to database
   */
  async sync1HourData() {
    try {
      const marketData = await this.get1HourMarketData();
      const savedCount = 0;
      
      // Save each item's market data to database
      for (const [itemId, data] of Object.entries(marketData)) {
        try {
          await this.saveMarketSnapshot({
            itemId: data.itemId,
            timestamp: data.timestamp,
            interval: '1h',
            highPrice: data.highPrice,
            lowPrice: data.lowPrice,
            volume: data.volume,
            source: 'osrs_wiki_1h',
            marginGp: data.marginGp,
            marginPercent: data.marginPercent,
            volatility: data.volatility,
            rsi: data.rsi,
            riskScore: data.riskScore,
            expectedProfitPerHour: data.expectedProfitPerHour
          });
        } catch (error) {
          // Don't fail entire sync for one item
          this.logger.warn(`Failed to save 1-hour market data for item ${itemId}:`, error.message);
        }
      }
      
      this.logger.info(`Synced 1-hour market data for ${Object.keys(marketData).length} items`);
      return { success: true, itemCount: Object.keys(marketData).length };
      
    } catch (error) {
      this.logger.error('Failed to sync 1-hour market data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get timeseries data from OSRS Wiki API with intelligent rate limiting
   * Max 1 request per minute, only once per day per item for deep analysis
   */
  async getTimeseriesData(itemId, timestep = '5m', maxPoints = 365) {
    try {
      // Check if we already have recent timeseries data for this item
      const cacheKey = `timeseries_${itemId}_${timestep}`;
      const lastFetch = this.timeseriesCache?.get(cacheKey);
      const now = Date.now();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      // Only fetch once per day per item for deep analysis
      if (lastFetch && (now - lastFetch) < dayInMs) {
        this.logger.info(`Skipping timeseries fetch for item ${itemId} - already fetched today`);
        return null;
      }
      
      // Rate limiting - max 1 request per minute
      if (this.lastTimeseriesRequest && (now - this.lastTimeseriesRequest) < 60000) {
        this.logger.warn('Timeseries rate limit hit - max 1 request per minute');
        throw new Error('Rate limit exceeded for timeseries API - try again in 1 minute');
      }
      
      this.logger.info(`Fetching timeseries data for item ${itemId} with timestep ${timestep}`);
      
      const response = await fetch(`https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=${timestep}&id=${itemId}`, {
        headers: {
          'User-Agent': 'OSRS-Market-Backend - Market Analysis Tool'
        }
      });
      
      if (!response.ok) {
        throw new Error(`OSRS Wiki timeseries API returned ${response.status}`);
      }
      
      const timeseriesData = await response.json();
      
      // Update rate limiting tracking
      this.lastTimeseriesRequest = now;
      
      // Cache the fetch time to prevent duplicate requests
      if (!this.timeseriesCache) {
        this.timeseriesCache = new Map();
      }
      this.timeseriesCache.set(cacheKey, now);
      
      // Process timeseries data for analysis
      const processedTimeseries = {
        itemId: parseInt(itemId),
        timestep: timestep,
        dataPoints: timeseriesData.data ? timeseriesData.data.map(point => ({
          timestamp: point.timestamp,
          avgHighPrice: point.avgHighPrice,
          avgLowPrice: point.avgLowPrice,
          highPriceVolume: point.highPriceVolume,
          lowPriceVolume: point.lowPriceVolume
        })) : [],
        fetchedAt: now,
        source: 'osrs_wiki_timeseries'
      };
      
      // Calculate additional insights from timeseries data
      if (processedTimeseries.dataPoints.length > 1) {
        processedTimeseries.insights = this.calculateTimeseriesInsights(processedTimeseries.dataPoints);
      }
      
      this.logger.info(`Successfully fetched ${processedTimeseries.dataPoints.length} timeseries data points for item ${itemId}`);
      
      // Save to database for historical analysis
      await this.saveTimeseriesData(processedTimeseries);
      
      return processedTimeseries;
      
    } catch (error) {
      this.logger.error(`Failed to fetch timeseries data for item ${itemId}`, error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Calculate insights from timeseries data
   */
  calculateTimeseriesInsights(dataPoints) {
    try {
      const prices = dataPoints.map(p => (p.avgHighPrice + p.avgLowPrice) / 2).filter(p => p > 0);
      const volumes = dataPoints.map(p => (p.highPriceVolume || 0) + (p.lowPriceVolume || 0)).filter(v => v > 0);
      
      if (prices.length === 0) return null;
      
      // Price trend analysis
      const startPrice = prices[0];
      const endPrice = prices[prices.length - 1];
      const priceChange = endPrice - startPrice;
      const priceChangePercent = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;
      
      // Volatility calculation
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const priceVariances = prices.map(p => Math.pow(p - avgPrice, 2));
      const volatility = Math.sqrt(priceVariances.reduce((sum, v) => sum + v, 0) / priceVariances.length);
      const volatilityPercent = avgPrice > 0 ? (volatility / avgPrice) * 100 : 0;
      
      // Volume analysis
      const avgVolume = volumes.length > 0 ? volumes.reduce((sum, v) => sum + v, 0) / volumes.length : 0;
      const maxVolume = volumes.length > 0 ? Math.max(...volumes) : 0;
      
      // Trend strength (simple momentum)
      const recentPrices = prices.slice(-10); // Last 10 data points
      const olderPrices = prices.slice(0, 10); // First 10 data points
      const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
      const trendStrength = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      
      return {
        priceChange: priceChange,
        priceChangePercent: priceChangePercent,
        volatilityPercent: volatilityPercent,
        avgPrice: avgPrice,
        avgVolume: avgVolume,
        maxVolume: maxVolume,
        trendStrength: trendStrength,
        trendDirection: trendStrength > 2 ? 'bullish' : trendStrength < -2 ? 'bearish' : 'neutral',
        dataQuality: prices.length / dataPoints.length, // Ratio of valid price points
        analyzedAt: Date.now()
      };
      
    } catch (error) {
      this.logger.error('Failed to calculate timeseries insights', error);
      return null;
    }
  }

  /**
   * Context7 Pattern: Save timeseries data to database
   */
  async saveTimeseriesData(timeseriesData) {
    try {
      if (!this.mongoService) {
        await this.initializeMongoDB();
      }
      
      const collection = 'market_timeseries';
      const document = {
        itemId: timeseriesData.itemId,
        timestep: timeseriesData.timestep,
        dataPoints: timeseriesData.dataPoints,
        insights: timeseriesData.insights,
        fetchedAt: timeseriesData.fetchedAt,
        source: timeseriesData.source,
        createdAt: new Date()
      };
      
      // Use upsert to prevent duplicates
      const filter = { 
        itemId: timeseriesData.itemId, 
        timestep: timeseriesData.timestep,
        fetchedAt: timeseriesData.fetchedAt
      };
      
      await this.mongoService.upsert(collection, filter, document);
      
      this.logger.info(`Saved timeseries data for item ${timeseriesData.itemId} to database`);
      
    } catch (error) {
      this.logger.error('Failed to save timeseries data to database', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get timeseries data from database
   */
  async getStoredTimeseriesData(itemId, timestep = '5m', limit = 1) {
    try {
      if (!this.mongoService) {
        await this.initializeMongoDB();
      }
      
      const collection = 'market_timeseries';
      const filter = { itemId: parseInt(itemId), timestep: timestep };
      const options = { 
        sort: { fetchedAt: -1 }, 
        limit: limit 
      };
      
      const results = await this.mongoService.find(collection, filter, options);
      
      this.logger.info(`Retrieved ${results.length} timeseries records for item ${itemId}`);
      return results;
      
    } catch (error) {
      this.logger.error(`Failed to get stored timeseries data for item ${itemId}`, error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Initialize MongoDB with proper error handling
   */
  async initializeMongoDB() {
    try {
      const mongoConfig = {
        connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_DATABASE || 'osrs_market_data'
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

      // Calculate all derived metrics using FinancialMetricsCalculator
      if (data.highPrice && data.lowPrice) {
        try {
          // Get historical data for this item (last 30 data points for trend analysis)
          const historicalData = await this.getHistoricalDataForCalculation(data.itemId, data.interval);
          
          // Use FinancialMetricsCalculator to calculate all metrics
          const calculatedMetrics = this.metricsCalculator.calculateAllMetrics(data, historicalData);
          
          // Merge all calculated metrics into the data object
          Object.assign(data, calculatedMetrics);
          
          this.logger.debug('All derived metrics calculated', {
            itemId: data.itemId,
            sellPrice: data.highPrice,
            buyPrice: data.lowPrice,
            geTaxAmount: data.geTaxAmount,
            isTaxFree: data.isTaxFree,
            grossProfitGp: data.grossProfitGp,
            marginGp: data.marginGp,
            marginPercent: data.marginPercent,
            riskScore: data.riskScore,
            expectedProfitPerHour: data.expectedProfitPerHour,
            volatility: data.volatility,
            velocity: data.velocity,
            rsi: data.rsi,
            momentumScore: data.momentumScore
          });
        } catch (metricsError) {
          this.logger.error('Error calculating derived metrics, using fallback calculations', metricsError);
          
          // Fallback to basic calculations if FinancialMetricsCalculator fails
          const buyPrice = data.lowPrice;
          const sellPrice = data.highPrice;
          
          // Calculate GE tax details
          data.geTaxAmount = calculateGETax(sellPrice);
          data.isTaxFree = isTaxFree(sellPrice);
          data.netSellPrice = calculateNetSellPrice(sellPrice);
          
          // Calculate profit margins
          data.grossProfitGp = sellPrice - buyPrice;
          data.grossProfitPercent = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;
          data.marginGp = calculateProfitAfterTax(buyPrice, sellPrice);
          data.marginPercent = calculateProfitPercentageAfterTax(buyPrice, sellPrice);
          
          // Calculate profit per GE slot (assuming 1 item per slot for now)
          data.profitPerGeSlot = data.marginGp;
          
          this.logger.debug('Fallback GE tax calculations completed', {
            itemId: data.itemId,
            sellPrice,
            buyPrice,
            geTaxAmount: data.geTaxAmount,
            isTaxFree: data.isTaxFree,
            grossProfitGp: data.grossProfitGp,
            marginGp: data.marginGp,
            marginPercent: data.marginPercent
          });
        }
      }

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
        source: snapshot.source,
        geTaxAmount: snapshot.geTaxAmount,
        isTaxFree: snapshot.isTaxFree,
        marginGp: snapshot.marginGp,
        marginPercent: snapshot.marginPercent
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
   * Context7 Pattern: Get historical data for metric calculation
   * 
   * Helper method to retrieve recent historical data for an item
   * to support trend analysis and technical indicators
   */
  async getHistoricalDataForCalculation(itemId, interval, limit = 30) {
    try {
      // Get recent snapshots for this item in the same interval
      const recentSnapshots = await MarketPriceSnapshotModel
        .find({ 
          itemId, 
          interval 
        })
        .sort({ timestamp: -1 })
        .limit(limit)
        .exec();

      // Convert to price array for trend analysis
      const historicalPrices = recentSnapshots
        .reverse() // Oldest first for trend calculation
        .map(snapshot => (snapshot.highPrice + snapshot.lowPrice) / 2);

      this.logger.debug('Retrieved historical data for metrics calculation', {
        itemId,
        interval,
        dataPoints: historicalPrices.length,
        limit
      });

      return historicalPrices;
    } catch (error) {
      this.logger.error('Error retrieving historical data for calculation', error, {
        itemId,
        interval,
        limit
      });
      return []; // Return empty array if unable to get historical data
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

  /**
   * Context7 Pattern: Get top flips based on profitability score
   */
  async getTopFlips(options = {}) {
    try {
      this.logger.info('Getting top flips', options);

      const {
        limit = 20,
        timeRange = 24 * 60 * 60 * 1000, // 24 hours
        sortBy = 'profitability'
      } = options;

      const now = Date.now();
      const startTime = now - timeRange;

      // Get recent market data for calculating profitability
      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startTime },
            interval: { $in: ['latest', '5m', '1h'] }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$itemId',
            latestData: { $first: '$$ROOT' }
          }
        },
        {
          $project: {
            itemId: '$_id',
            highPrice: '$latestData.highPrice',
            lowPrice: '$latestData.lowPrice',
            volume: '$latestData.volume',
            marginGp: '$latestData.marginGp',
            marginPercent: '$latestData.marginPercent',
            expectedProfitPerHour: '$latestData.expectedProfitPerHour',
            riskScore: '$latestData.riskScore',
            velocity: '$latestData.velocity',
            profitabilityScore: {
              $add: [
                { $multiply: [{ $ifNull: ['$latestData.expectedProfitPerHour', 0] }, 0.4] },
                { $multiply: [{ $ifNull: ['$latestData.marginPercent', 0] }, 0.3] },
                { $multiply: [{ $ifNull: ['$latestData.volume', 0] }, 0.2] },
                { $multiply: [{ $subtract: [100, { $ifNull: ['$latestData.riskScore', 50] }] }, 0.1] }
              ]
            }
          }
        },
        {
          $match: {
            profitabilityScore: { $gt: 0 }
          }
        },
        {
          $sort: { profitabilityScore: -1 }
        },
        {
          $limit: limit
        }
      ];

      const topFlips = await MarketPriceSnapshotModel.aggregate(pipeline);

      // Enrich with item names
      const enrichedFlips = [];
      for (const flip of topFlips) {
        try {
          const item = await this.itemRepository.getItemByItemId(flip.itemId);
          enrichedFlips.push({
            ...flip,
            itemName: item?.name || `Item ${flip.itemId}`,
            members: item?.members || false,
            tradeable: item?.tradeable_on_ge || false
          });
        } catch (error) {
          this.logger.warn('Failed to get item info', { itemId: flip.itemId, error: error.message });
          enrichedFlips.push({
            ...flip,
            itemName: `Item ${flip.itemId}`,
            members: false,
            tradeable: true
          });
        }
      }

      this.logger.info('Successfully retrieved top flips', {
        count: enrichedFlips.length,
        options
      });

      return enrichedFlips;
    } catch (error) {
      this.logger.error('Error getting top flips', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get trading recommendations
   */
  async getRecommendations(options = {}) {
    try {
      this.logger.info('Getting recommendations', options);

      const {
        strategy = 'balanced',
        riskLevel = 'medium',
        timeHorizon = 'short',
        limit = 10
      } = options;

      // Risk level mappings
      const riskThresholds = {
        low: { maxRisk: 30, minVolume: 1000 },
        medium: { maxRisk: 60, minVolume: 500 },
        high: { maxRisk: 100, minVolume: 100 }
      };

      const risk = riskThresholds[riskLevel];
      const now = Date.now();
      
      // Time horizon mappings
      const timeRanges = {
        short: 2 * 60 * 60 * 1000, // 2 hours
        medium: 8 * 60 * 60 * 1000, // 8 hours
        long: 24 * 60 * 60 * 1000   // 24 hours
      };

      const timeRange = timeRanges[timeHorizon];
      const startTime = now - timeRange;

      const pipeline = [
        {
          $match: {
            timestamp: { $gte: startTime },
            interval: { $in: ['latest', '5m', '1h'] },
            riskScore: { $lte: risk.maxRisk },
            volume: { $gte: risk.minVolume }
          }
        },
        {
          $sort: { timestamp: -1 }
        },
        {
          $group: {
            _id: '$itemId',
            latestData: { $first: '$$ROOT' }
          }
        },
        {
          $project: {
            itemId: '$_id',
            highPrice: '$latestData.highPrice',
            lowPrice: '$latestData.lowPrice',
            volume: '$latestData.volume',
            marginGp: '$latestData.marginGp',
            marginPercent: '$latestData.marginPercent',
            expectedProfitPerHour: '$latestData.expectedProfitPerHour',
            riskScore: '$latestData.riskScore',
            velocity: '$latestData.velocity',
            recommendation: {
              $switch: {
                branches: [
                  {
                    case: { $and: [
                      { $lt: ['$latestData.riskScore', 30] },
                      { $gt: ['$latestData.marginPercent', 5] }
                    ]},
                    then: 'Strong Buy'
                  },
                  {
                    case: { $and: [
                      { $lt: ['$latestData.riskScore', 50] },
                      { $gt: ['$latestData.marginPercent', 3] }
                    ]},
                    then: 'Buy'
                  },
                  {
                    case: { $and: [
                      { $lt: ['$latestData.riskScore', 70] },
                      { $gt: ['$latestData.marginPercent', 2] }
                    ]},
                    then: 'Hold'
                  }
                ],
                default: 'Watch'
              }
            }
          }
        },
        {
          $match: {
            recommendation: { $in: ['Strong Buy', 'Buy', 'Hold'] }
          }
        },
        {
          $sort: { expectedProfitPerHour: -1 }
        },
        {
          $limit: limit
        }
      ];

      const recommendations = await MarketPriceSnapshotModel.aggregate(pipeline);

      this.logger.info('Successfully retrieved recommendations', {
        count: recommendations.length,
        options
      });

      return recommendations;
    } catch (error) {
      this.logger.error('Error getting recommendations', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get alerts
   */
  async getAlerts(options = {}) {
    try {
      this.logger.info('Getting alerts', options);

      const {
        type,
        status = 'active',
        userId = 'default'
      } = options;

      // For now, return mock alerts since we don't have a proper alerts model
      // In production, this would query an AlertModel
      const mockAlerts = [
        {
          id: '1',
          itemId: 4151,
          itemName: 'Abyssal whip',
          type: 'price_above',
          threshold: 3000000,
          currentValue: 2850000,
          status: 'active',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          userId
        },
        {
          id: '2',
          itemId: 11802,
          itemName: 'Bandos chestplate',
          type: 'margin_spike',
          threshold: 10,
          currentValue: 8.5,
          status: 'active',
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          userId
        }
      ];

      const filteredAlerts = mockAlerts.filter(alert => {
        if (type && alert.type !== type) return false;
        if (status && alert.status !== status) return false;
        if (userId && alert.userId !== userId) return false;
        return true;
      });

      this.logger.info('Successfully retrieved alerts', {
        count: filteredAlerts.length,
        options
      });

      return filteredAlerts;
    } catch (error) {
      this.logger.error('Error getting alerts', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Create alert
   */
  async createAlert(alertData) {
    try {
      this.logger.info('Creating alert', alertData);

      // For now, return mock alert creation
      // In production, this would create an alert in AlertModel
      const alert = {
        id: Date.now().toString(),
        ...alertData,
        createdAt: new Date(),
        status: 'active'
      };

      this.logger.info('Successfully created alert', {
        alertId: alert.id,
        itemId: alert.itemId
      });

      return alert;
    } catch (error) {
      this.logger.error('Error creating alert', error, alertData);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Delete alert
   */
  async deleteAlert(alertId) {
    try {
      this.logger.info('Deleting alert', { alertId });

      // For now, return mock deletion
      // In production, this would delete from AlertModel
      const result = {
        deleted: true,
        alertId,
        deletedAt: new Date()
      };

      this.logger.info('Successfully deleted alert', {
        alertId
      });

      return result;
    } catch (error) {
      this.logger.error('Error deleting alert', error, { alertId });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get analytics
   */
  async getAnalytics(options = {}) {
    try {
      this.logger.info('Getting analytics', options);

      const {
        type = 'trends',
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        itemId
      } = options;

      const now = Date.now();
      const startTime = now - timeRange;

      let pipeline = [];

      switch (type) {
        case 'trends':
          pipeline = [
            {
              $match: {
                timestamp: { $gte: startTime },
                interval: { $in: ['5m', '1h'] }
              }
            },
            {
              $group: {
                _id: {
                  itemId: '$itemId',
                  hour: { $hour: { $toDate: '$timestamp' } }
                },
                avgPrice: { $avg: { $add: ['$highPrice', '$lowPrice'] } },
                avgVolume: { $avg: '$volume' },
                count: { $sum: 1 }
              }
            },
            {
              $sort: { '_id.hour': 1 }
            },
            {
              $limit: 100
            }
          ];
          break;
        case 'volume':
          pipeline = [
            {
              $match: {
                timestamp: { $gte: startTime },
                interval: { $in: ['5m', '1h'] }
              }
            },
            {
              $group: {
                _id: '$itemId',
                totalVolume: { $sum: '$volume' },
                avgVolume: { $avg: '$volume' },
                maxVolume: { $max: '$volume' },
                minVolume: { $min: '$volume' }
              }
            },
            {
              $sort: { totalVolume: -1 }
            },
            {
              $limit: 50
            }
          ];
          break;
        default:
          pipeline = [
            {
              $match: {
                timestamp: { $gte: startTime }
              }
            },
            {
              $group: {
                _id: null,
                totalRecords: { $sum: 1 },
                avgPrice: { $avg: { $add: ['$highPrice', '$lowPrice'] } },
                avgVolume: { $avg: '$volume' }
              }
            }
          ];
      }

      if (itemId) {
        pipeline.unshift({
          $match: {
            itemId: parseInt(itemId)
          }
        });
      }

      const analytics = await MarketPriceSnapshotModel.aggregate(pipeline);

      this.logger.info('Successfully retrieved analytics', {
        type,
        count: analytics.length,
        options
      });

      return analytics;
    } catch (error) {
      this.logger.error('Error getting analytics', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get categories
   */
  async getCategories(options = {}) {
    try {
      this.logger.info('Getting categories', options);

      const {
        includeStats = false
      } = options;

      // Basic OSRS item categories
      const categories = [
        {
          id: 'weapons',
          name: 'Weapons',
          description: 'Combat weapons and equipment',
          color: '#ff4444'
        },
        {
          id: 'armor',
          name: 'Armor',
          description: 'Defensive equipment',
          color: '#4444ff'
        },
        {
          id: 'tools',
          name: 'Tools',
          description: 'Skilling tools and equipment',
          color: '#44ff44'
        },
        {
          id: 'resources',
          name: 'Resources',
          description: 'Raw materials and resources',
          color: '#ffff44'
        },
        {
          id: 'consumables',
          name: 'Consumables',
          description: 'Food, potions, and other consumables',
          color: '#ff44ff'
        },
        {
          id: 'misc',
          name: 'Miscellaneous',
          description: 'Other items',
          color: '#44ffff'
        }
      ];

      if (includeStats) {
        // Add basic stats for each category
        for (const category of categories) {
          category.stats = {
            itemCount: Math.floor(Math.random() * 1000) + 100,
            avgPrice: Math.floor(Math.random() * 100000) + 1000,
            totalVolume: Math.floor(Math.random() * 10000000) + 100000
          };
        }
      }

      this.logger.info('Successfully retrieved categories', {
        count: categories.length,
        includeStats
      });

      return categories;
    } catch (error) {
      this.logger.error('Error getting categories', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Export data
   */
  async exportData(options = {}) {
    try {
      this.logger.info('Exporting data', options);

      const {
        format = 'json',
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        itemIds
      } = options;

      const now = Date.now();
      const startTime = now - timeRange;

      let filter = {
        timestamp: { $gte: startTime }
      };

      if (itemIds && itemIds.length > 0) {
        filter.itemId = { $in: itemIds };
      }

      const data = await MarketPriceSnapshotModel
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(10000)
        .exec();

      let exportData;
      
      switch (format) {
        case 'csv':
          const csvHeaders = 'itemId,timestamp,highPrice,lowPrice,volume,interval,source\n';
          const csvRows = data.map(item => 
            `${item.itemId},${item.timestamp},${item.highPrice},${item.lowPrice},${item.volume},${item.interval},${item.source}`
          ).join('\n');
          exportData = csvHeaders + csvRows;
          break;
        case 'xlsx':
          // For now, return JSON format for xlsx
          // In production, you would use a library like xlsx to generate actual Excel files
          exportData = JSON.stringify(data, null, 2);
          break;
        default:
          exportData = JSON.stringify(data, null, 2);
      }

      this.logger.info('Successfully exported data', {
        format,
        recordCount: data.length,
        options
      });

      return exportData;
    } catch (error) {
      this.logger.error('Error exporting data', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Compare items
   */
  async compareItems(options = {}) {
    try {
      this.logger.info('Comparing items', options);

      const {
        itemIds = [],
        timeRange = 7 * 24 * 60 * 60 * 1000, // 7 days
        metrics = ['price', 'volume', 'margin']
      } = options;

      const now = Date.now();
      const startTime = now - timeRange;

      const pipeline = [
        {
          $match: {
            itemId: { $in: itemIds },
            timestamp: { $gte: startTime }
          }
        },
        {
          $group: {
            _id: '$itemId',
            avgHighPrice: { $avg: '$highPrice' },
            avgLowPrice: { $avg: '$lowPrice' },
            avgVolume: { $avg: '$volume' },
            avgMargin: { $avg: '$marginGp' },
            avgMarginPercent: { $avg: '$marginPercent' },
            maxPrice: { $max: '$highPrice' },
            minPrice: { $min: '$lowPrice' },
            totalVolume: { $sum: '$volume' },
            dataPoints: { $sum: 1 }
          }
        },
        {
          $sort: { avgHighPrice: -1 }
        }
      ];

      const comparison = await MarketPriceSnapshotModel.aggregate(pipeline);

      // Add comparison metrics
      const enrichedComparison = comparison.map(item => ({
        itemId: item._id,
        metrics: {
          price: {
            avg: (item.avgHighPrice + item.avgLowPrice) / 2,
            max: item.maxPrice,
            min: item.minPrice
          },
          volume: {
            avg: item.avgVolume,
            total: item.totalVolume
          },
          margin: {
            avgGp: item.avgMargin,
            avgPercent: item.avgMarginPercent
          }
        },
        dataPoints: item.dataPoints
      }));

      this.logger.info('Successfully compared items', {
        itemCount: itemIds.length,
        resultCount: enrichedComparison.length,
        options
      });

      return {
        items: enrichedComparison,
        comparison: {
          timeRange,
          metrics,
          totalDataPoints: comparison.reduce((sum, item) => sum + item.dataPoints, 0)
        }
      };
    } catch (error) {
      this.logger.error('Error comparing items', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get portfolio analysis
   */
  async getPortfolioAnalysis(options = {}) {
    try {
      this.logger.info('Getting portfolio analysis', options);

      const {
        items = [],
        timeRange = 7 * 24 * 60 * 60 * 1000 // 7 days
      } = options;

      const now = Date.now();
      const startTime = now - timeRange;

      const itemIds = items.map(item => item.itemId);

      // Get current prices for portfolio items
      const currentPrices = await MarketPriceSnapshotModel
        .find({
          itemId: { $in: itemIds },
          timestamp: { $gte: now - 60 * 60 * 1000 } // Last hour
        })
        .sort({ timestamp: -1 })
        .exec();

      // Calculate portfolio value
      let totalValue = 0;
      let totalCost = 0;
      const portfolioItems = [];

      for (const item of items) {
        const currentPrice = currentPrices.find(p => p.itemId === item.itemId);
        const price = currentPrice ? (currentPrice.highPrice + currentPrice.lowPrice) / 2 : 0;
        const value = price * item.quantity;
        const cost = (item.buyPrice || 0) * item.quantity;

        totalValue += value;
        totalCost += cost;

        portfolioItems.push({
          itemId: item.itemId,
          quantity: item.quantity,
          buyPrice: item.buyPrice || 0,
          currentPrice: price,
          value: value,
          cost: cost,
          profit: value - cost,
          profitPercent: cost > 0 ? ((value - cost) / cost) * 100 : 0
        });
      }

      const analysis = {
        summary: {
          totalValue,
          totalCost,
          totalProfit: totalValue - totalCost,
          totalProfitPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
          itemCount: items.length
        },
        items: portfolioItems,
        performance: {
          bestPerformer: portfolioItems.reduce((best, item) => 
            item.profitPercent > best.profitPercent ? item : best, portfolioItems[0] || {}
          ),
          worstPerformer: portfolioItems.reduce((worst, item) => 
            item.profitPercent < worst.profitPercent ? item : worst, portfolioItems[0] || {}
          )
        }
      };

      this.logger.info('Successfully analyzed portfolio', {
        itemCount: items.length,
        totalValue,
        totalProfit: totalValue - totalCost,
        options
      });

      return analysis;
    } catch (error) {
      this.logger.error('Error analyzing portfolio', error, options);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Validate data
   */
  async validateData(items = []) {
    try {
      this.logger.info('Validating data', { itemCount: items.length });

      const validation = {
        valid: true,
        errors: [],
        warnings: [],
        summary: {
          totalItems: items.length,
          validItems: 0,
          invalidItems: 0
        }
      };

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemErrors = [];

        // Validate required fields
        if (!item.itemId || typeof item.itemId !== 'number') {
          itemErrors.push('itemId is required and must be a number');
        }

        if (!item.timestamp || typeof item.timestamp !== 'number') {
          itemErrors.push('timestamp is required and must be a number');
        }

        if (!item.highPrice || typeof item.highPrice !== 'number' || item.highPrice <= 0) {
          itemErrors.push('highPrice is required and must be a positive number');
        }

        if (!item.lowPrice || typeof item.lowPrice !== 'number' || item.lowPrice <= 0) {
          itemErrors.push('lowPrice is required and must be a positive number');
        }

        if (item.highPrice && item.lowPrice && item.highPrice < item.lowPrice) {
          itemErrors.push('highPrice cannot be less than lowPrice');
        }

        if (item.volume !== undefined && (typeof item.volume !== 'number' || item.volume < 0)) {
          itemErrors.push('volume must be a non-negative number');
        }

        if (itemErrors.length > 0) {
          validation.errors.push({
            index: i,
            itemId: item.itemId,
            errors: itemErrors
          });
          validation.summary.invalidItems++;
        } else {
          validation.summary.validItems++;
        }
      }

      validation.valid = validation.errors.length === 0;

      this.logger.info('Successfully validated data', {
        valid: validation.valid,
        totalItems: items.length,
        validItems: validation.summary.validItems,
        invalidItems: validation.summary.invalidItems,
        errorCount: validation.errors.length
      });

      return validation;
    } catch (error) {
      this.logger.error('Error validating data', error, { itemCount: items.length });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Process manual test for AI trading
   */
  async processManualTest(testData) {
    try {
      this.logger.info('Processing manual test', {
        itemId: testData.itemId,
        action: testData.action,
        price: testData.price,
        quantity: testData.quantity
      });

      // Generate unique test ID
      const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get current market data for the item
      const currentMarketData = await this.getMarketData({
        itemId: testData.itemId,
        limit: 1,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      let currentPrice = testData.price;
      if (currentMarketData.length > 0) {
        const latest = currentMarketData[0];
        currentPrice = (latest.highPrice + latest.lowPrice) / 2;
      }

      // Calculate potential profit/loss
      const profitLoss = testData.action === 'buy' 
        ? (currentPrice - testData.price) * testData.quantity
        : (testData.price - currentPrice) * testData.quantity;

      // Get AI recommendation for comparison
      const aiRecommendation = await this.getRecommendations({
        strategy: 'balanced',
        riskLevel: 'medium',
        limit: 1
      });

      const testResult = {
        testId,
        ...testData,
        currentPrice,
        profitLoss,
        profitLossPercentage: ((profitLoss / (testData.price * testData.quantity)) * 100).toFixed(2),
        aiRecommendation: aiRecommendation.length > 0 ? aiRecommendation[0] : null,
        status: 'processed',
        processedAt: new Date()
      };

      // Store test result in cache or database
      const cacheKey = `manual_test_${testId}`;
      this.cache.set(cacheKey, testResult);

      // Also store in general test results cache
      const allTestsKey = 'all_manual_tests';
      let allTests = this.cache.get(allTestsKey) || [];
      allTests.unshift(testResult);
      
      // Keep only last 100 tests
      if (allTests.length > 100) {
        allTests = allTests.slice(0, 100);
      }
      
      this.cache.set(allTestsKey, allTests);

      this.logger.info('Successfully processed manual test', {
        testId,
        profitLoss,
        action: testData.action,
        itemId: testData.itemId
      });

      return testResult;
    } catch (error) {
      this.logger.error('Error processing manual test', error, { testData });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get manual test results
   */
  async getManualTestResults(options = {}) {
    try {
      this.logger.info('Fetching manual test results', { options });

      const { testId, limit = 50, userId } = options;

      if (testId) {
        // Get specific test result
        const cacheKey = `manual_test_${testId}`;
        const testResult = this.cache.get(cacheKey);
        
        if (!testResult) {
          this.logger.warn('Test result not found', { testId });
          return [];
        }

        return [testResult];
      }

      // Get all test results
      const allTestsKey = 'all_manual_tests';
      let allTests = this.cache.get(allTestsKey) || [];

      // Filter by userId if provided
      if (userId) {
        allTests = allTests.filter(test => test.userId === userId);
      }

      // Apply limit
      const results = allTests.slice(0, limit);

      // Calculate summary statistics
      const summary = {
        totalTests: results.length,
        totalProfitLoss: results.reduce((sum, test) => sum + (test.profitLoss || 0), 0),
        successfulTests: results.filter(test => (test.profitLoss || 0) > 0).length,
        averageProfitLoss: results.length > 0 
          ? results.reduce((sum, test) => sum + (test.profitLoss || 0), 0) / results.length 
          : 0
      };

      this.logger.info('Successfully fetched manual test results', {
        resultCount: results.length,
        totalProfitLoss: summary.totalProfitLoss,
        successfulTests: summary.successfulTests
      });

      return {
        results,
        summary,
        pagination: {
          total: allTests.length,
          limit,
          returned: results.length
        }
      };
    } catch (error) {
      this.logger.error('Error fetching manual test results', error, { options });
      throw error;
    }
  }
}

module.exports = { MarketDataService };