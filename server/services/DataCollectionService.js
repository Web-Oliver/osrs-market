/**
 * 📊 Data Collection Service - Context7 Optimized
 * 
 * Context7 Pattern: Advanced Data Collection and Processing System
 * - Orchestrates data collection from multiple sources
 * - Smart item selection and filtering
 * - Rate limiting and performance optimization
 * - Real-time monitoring and statistics
 * - Background job scheduling
 */

const { OSRSWikiService } = require('./OSRSWikiService');
const { OSRSDataScraperService } = require('./OSRSDataScraperService');
const { MonitoringService } = require('./MonitoringService');
const { MarketDataService } = require('./MarketDataService');
const { MongoDataPersistence } = require('../mongoDataPersistence');
const { Logger } = require('../utils/Logger');
const { CacheManager } = require('../utils/CacheManager');
const { MetricsCalculator } = require('../utils/MetricsCalculator');
const { PerformanceMonitor } = require('../utils/PerformanceMonitor');

class DataCollectionService {
  constructor() {
    this.logger = new Logger('DataCollectionService');
    this.cache = new CacheManager('data_collection', 300000); // 5 minutes cache
    this.metricsCalculator = new MetricsCalculator();
    this.performanceMonitor = new PerformanceMonitor();
    
    // Initialize services
    this.osrsWikiService = new OSRSWikiService();
    this.osrsDataScraperService = new OSRSDataScraperService();
    this.monitoringService = new MonitoringService();
    this.marketDataService = new MarketDataService();
    
    // CRITICAL: Initialize MongoDB persistence
    this.initializePersistence();
    
    // Collection state
    this.isCollecting = false;
    this.collectionInterval = null;
    this.collectionStats = this.initializeStats();
    
    // Smart item selection
    this.selectedItems = new Set();
    this.itemMetrics = new Map();
    
    // Configuration
    this.config = {
      collectionInterval: 30000, // 30 seconds
      maxItemsToTrack: 100,
      minProfitMargin: 5, // 5%
      minVolume: 10,
      maxRetries: 3,
      smartSelectionEnabled: true,
      adaptiveThresholds: true
    };
  }

  /**
   * CRITICAL: Initialize MongoDB persistence
   */
  async initializePersistence() {
    try {
      const mongoConfig = {
        connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_DATABASE || 'osrs_market_data'
      };
      
      this.mongoPersistence = new MongoDataPersistence(mongoConfig);
      await this.mongoPersistence.initialize();
      
      this.logger.info('✅ MongoDB persistence initialized for data collection');
    } catch (error) {
      this.logger.error('❌ Failed to initialize MongoDB persistence', error);
      this.mongoPersistence = null;
    }
  }

  /**
   * Context7 Pattern: Discover and store new items using OSRSDataScraperService
   */
  async discoverAndStoreNewItems() {
    try {
      this.logger.info('🔍 Starting item discovery process');
      
      // Initialize scraper if not already done
      if (!this.osrsDataScraperService.mongoPersistence) {
        await this.osrsDataScraperService.initialize();
      }
      
      // Get Top 100 items for discovery (scale=3 - 6 months)
      const discoveredItems = await this.osrsDataScraperService.getTop100ItemsForDiscovery();
      
      this.logger.info(`✅ Discovered ${discoveredItems.length} items from Top 100 lists`);
      
      // TODO: Process discovered items and store them in ItemModel
      // This should create new Item records for items not already in the database
      // For now, we'll just log the discovered items
      
      const itemSummary = discoveredItems.slice(0, 10).map(item => ({
        id: item.itemId,
        name: item.name
      }));
      
      this.logger.info('📋 Sample discovered items:', itemSummary);
      
      return {
        success: true,
        itemsDiscovered: discoveredItems.length,
        items: discoveredItems
      };
      
    } catch (error) {
      this.logger.error('❌ Failed to discover and store new items', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Initialize collection statistics
   */
  initializeStats() {
    return {
      totalCollections: 0,
      successfulCollections: 0,
      failedCollections: 0,
      totalItemsProcessed: 0,
      totalProfit: 0,
      averageResponseTime: 0,
      lastCollectionTime: null,
      startTime: null,
      errors: [],
      itemsTracked: 0,
      apiRequestsCount: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Context7 Pattern: Start data collection
   */
  async startCollection() {
    try {
      if (this.isCollecting) {
        this.logger.warn('Data collection already running');
        return { success: false, message: 'Collection already running' };
      }

      this.logger.info('Starting data collection service');
      
      this.isCollecting = true;
      this.collectionStats.startTime = Date.now();
      
      // Initialize smart item selection
      await this.initializeSmartSelection();
      
      // Start collection interval
      this.collectionInterval = setInterval(async () => {
        await this.performCollection();
      }, this.config.collectionInterval);
      
      // Perform initial collection
      await this.performCollection();
      
      this.logger.info('Data collection service started successfully', {
        interval: this.config.collectionInterval,
        itemsToTrack: this.selectedItems.size
      });
      
      return {
        success: true,
        message: 'Data collection started',
        config: this.config,
        itemsSelected: this.selectedItems.size
      };
    } catch (error) {
      this.logger.error('Failed to start data collection', error);
      this.isCollecting = false;
      throw error;
    }
  }

  /**
   * Context7 Pattern: Stop data collection
   */
  async stopCollection() {
    try {
      if (!this.isCollecting) {
        this.logger.warn('Data collection not running');
        return { success: false, message: 'Collection not running' };
      }

      this.logger.info('Stopping data collection service');
      
      this.isCollecting = false;
      
      if (this.collectionInterval) {
        clearInterval(this.collectionInterval);
        this.collectionInterval = null;
      }
      
      // Save final statistics
      await this.saveCollectionStats();
      
      this.logger.info('Data collection service stopped successfully');
      
      return {
        success: true,
        message: 'Data collection stopped',
        stats: this.getCollectionStats()
      };
    } catch (error) {
      this.logger.error('Failed to stop data collection', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Perform single collection cycle
   */
  async performCollection() {
    const monitor = this.performanceMonitor.startMonitoring(`collection_${Date.now()}`);
    
    try {
      this.logger.debug('Starting collection cycle');
      
      const startTime = Date.now();
      this.collectionStats.totalCollections++;
      
      monitor.addMarker('collection_start');
      
      // Get prices from all intervals (latest, 5min, 1hour) for comprehensive AI training
      const [latestPrices, fiveMinPrices, oneHourPrices] = await Promise.all([
        this.osrsWikiService.getLatestPrices(),
        this.osrsWikiService.get5MinutePrices(),
        this.osrsWikiService.get1HourPrices()
      ]);
      
      monitor.addMarker('prices_fetched');
      this.collectionStats.apiRequestsCount += 3; // Updated for 3 API calls
      
      // Filter prices for selected items across all intervals
      const selectedLatest = this.filterSelectedItems(latestPrices);
      const selected5Min = this.filterSelectedItems(fiveMinPrices);
      const selected1Hour = this.filterSelectedItems(oneHourPrices);
      
      monitor.addMarker('prices_filtered');
      
      // Process and analyze data for all intervals
      const [latestProcessed, fiveMinProcessed, oneHourProcessed] = await Promise.all([
        this.processCollectedData(selectedLatest, 'latest'),
        this.processCollectedData(selected5Min, '5min'),
        this.processCollectedData(selected1Hour, '1hour')
      ]);
      
      // Combine all processed data
      const processedData = [...latestProcessed, ...fiveMinProcessed, ...oneHourProcessed];
      
      monitor.addMarker('data_processed');
      
      // Save to database
      await this.saveCollectedData(processedData);
      
      monitor.addMarker('data_saved');
      
      // Update statistics
      const responseTime = Date.now() - startTime;
      this.updateCollectionStats(processedData, responseTime);
      
      // Save monitoring data
      await this.saveMonitoringData(processedData, responseTime);
      
      monitor.addMarker('monitoring_saved');
      
      // Update smart selection if enabled
      if (this.config.smartSelectionEnabled) {
        await this.updateSmartSelection(processedData);
      }
      
      monitor.addMarker('smart_selection_updated');
      
      this.collectionStats.successfulCollections++;
      this.collectionStats.lastCollectionTime = Date.now();
      
      this.logger.debug('Collection cycle completed successfully', {
        itemsProcessed: processedData.length,
        responseTime,
        totalCollections: this.collectionStats.totalCollections
      });
      
    } catch (error) {
      this.logger.error('Collection cycle failed', error);
      this.collectionStats.failedCollections++;
      this.collectionStats.errors.push({
        error: error.message,
        timestamp: Date.now()
      });
      
      // Keep only last 10 errors
      if (this.collectionStats.errors.length > 10) {
        this.collectionStats.errors.shift();
      }
    } finally {
      monitor.finish();
    }
  }

  /**
   * Context7 Pattern: Initialize smart item selection
   */
  async initializeSmartSelection() {
    try {
      this.logger.info('Initializing smart item selection');
      
      // Get item mapping
      const itemMapping = await this.osrsWikiService.getItemMapping();
      
      // Get latest prices
      const latestPrices = await this.osrsWikiService.getLatestPrices();
      
      // Analyze items and select the most profitable ones
      const analyzedItems = this.analyzeItemProfitability(itemMapping, latestPrices);
      
      // Select top items based on criteria
      const selectedItems = this.selectTopItems(analyzedItems);
      
      // Update selected items set
      this.selectedItems.clear();
      selectedItems.forEach(item => this.selectedItems.add(item.id));
      
      this.logger.info('Smart item selection completed', {
        totalItems: itemMapping.length,
        selectedItems: this.selectedItems.size,
        criteria: {
          maxItems: this.config.maxItemsToTrack,
          minProfitMargin: this.config.minProfitMargin,
          minVolume: this.config.minVolume
        }
      });
      
      return {
        totalItems: itemMapping.length,
        selectedItems: this.selectedItems.size,
        items: selectedItems
      };
    } catch (error) {
      this.logger.error('Failed to initialize smart selection', error);
      
      // When SmartItemSelectorService is unavailable, we cannot proceed without real data
      throw new Error('SmartItemSelectorService is required for item selection - cannot use fallback data');
      
      // Note: Previously this used hardcoded fallback items, but this has been removed
      // to ensure only real market data is used for trading decisions
      
      this.logger.info('Using fallback item selection', {
        selectedItems: this.selectedItems.size
      });
    }
  }

  /**
   * Context7 Pattern: Analyze item profitability
   */
  analyzeItemProfitability(itemMapping, latestPrices) {
    const analyzed = [];
    
    for (const item of itemMapping) {
      const priceData = latestPrices.data[item.id];
      
      if (!priceData || !priceData.high || !priceData.low) {
        continue;
      }
      
      // Skip non-tradeable items
      if (!item.tradeable_on_ge) {
        continue;
      }
      
      const profitMargin = ((priceData.high - priceData.low) / priceData.low) * 100;
      const spread = priceData.high - priceData.low;
      const midPrice = (priceData.high + priceData.low) / 2;
      
      // Estimate volume based on price data freshness
      const volumeEstimate = this.estimateVolume(priceData);
      
      analyzed.push({
        id: item.id,
        name: item.name,
        profitMargin,
        spread,
        midPrice,
        volume: volumeEstimate,
        priceData,
        members: item.members,
        buyLimit: item.buy_limit || 0,
        value: item.value || 0,
        score: this.calculateItemScore(profitMargin, spread, volumeEstimate, midPrice)
      });
    }
    
    return analyzed.sort((a, b) => b.score - a.score);
  }

  /**
   * Context7 Pattern: Select top items based on criteria
   */
  selectTopItems(analyzedItems) {
    const selected = [];
    
    for (const item of analyzedItems) {
      if (selected.length >= this.config.maxItemsToTrack) {
        break;
      }
      
      // Apply filters
      if (item.profitMargin < this.config.minProfitMargin) {
        continue;
      }
      
      if (item.volume < this.config.minVolume) {
        continue;
      }
      
      // Skip very low-value items
      if (item.midPrice < 100) {
        continue;
      }
      
      selected.push(item);
    }
    
    return selected;
  }

  /**
   * Context7 Pattern: Calculate item score
   */
  calculateItemScore(profitMargin, spread, volume, midPrice) {
    // Weighted scoring algorithm
    const profitWeight = 0.4;
    const spreadWeight = 0.3;
    const volumeWeight = 0.2;
    const priceWeight = 0.1;
    
    const profitScore = Math.min(100, profitMargin * 2);
    const spreadScore = Math.min(100, spread / 1000);
    const volumeScore = Math.min(100, volume / 10);
    const priceScore = Math.min(100, Math.log10(midPrice) * 10);
    
    return (
      profitScore * profitWeight +
      spreadScore * spreadWeight +
      volumeScore * volumeWeight +
      priceScore * priceWeight
    );
  }

  /**
   * Context7 Pattern: Estimate volume based on price data
   */
  estimateVolume(priceData) {
    const now = Date.now();
    const highAge = now - (priceData.highTime || now);
    const lowAge = now - (priceData.lowTime || now);
    
    // Fresher data indicates higher volume
    const avgAge = (highAge + lowAge) / 2;
    const hoursSinceUpdate = avgAge / (1000 * 60 * 60);
    
    // Inverse relationship: fresher data = higher volume estimate
    return Math.max(1, 100 - (hoursSinceUpdate * 10));
  }

  /**
   * Context7 Pattern: Filter selected items from price data
   */
  filterSelectedItems(latestPrices) {
    const filtered = {};
    
    for (const itemId of this.selectedItems) {
      if (latestPrices.data[itemId]) {
        filtered[itemId] = latestPrices.data[itemId];
      }
    }
    
    return {
      data: filtered,
      timestamp: latestPrices.timestamp
    };
  }

  /**
   * Context7 Pattern: Process collected data
   */
  async processCollectedData(selectedPrices, interval = 'latest') {
    const processed = [];
    
    for (const [itemId, priceData] of Object.entries(selectedPrices.data)) {
      const processedItem = {
        itemId: parseInt(itemId),
        interval, // Track which interval this data comes from
        priceData,
        timestamp: selectedPrices.timestamp,
        profitMargin: this.calculateProfitMargin(priceData),
        spread: this.calculateSpread(priceData),
        volume: this.estimateVolume(priceData),
        collectionSource: 'DataCollectionService'
      };
      
      processed.push(processedItem);
    }
    
    return processed;
  }

  /**
   * Context7 Pattern: Calculate profit margin
   */
  calculateProfitMargin(priceData) {
    if (!priceData.high || !priceData.low) {
      return 0;
    }
    
    return ((priceData.high - priceData.low) / priceData.low) * 100;
  }

  /**
   * Context7 Pattern: Calculate spread
   */
  calculateSpread(priceData) {
    if (!priceData.high || !priceData.low) {
      return 0;
    }
    
    return priceData.high - priceData.low;
  }

  /**
   * Context7 Pattern: Save collected data
   */
  async saveCollectedData(processedData) {
    if (processedData.length === 0) {
      return;
    }
    
    try {
      // CRITICAL: Save to MongoDB for AI training and historical analysis
      if (this.mongoPersistence) {
        // Convert to historical price format for MongoDB
        const historicalPrices = processedData.map(item => ({
          itemId: item.itemId,
          interval: item.interval || 'latest', // Use the actual interval from data
          priceData: item.priceData,
          high: item.priceData?.high || null,
          low: item.priceData?.low || null,
          highTime: item.priceData?.highTime || null,
          lowTime: item.priceData?.lowTime || null,
          profitMargin: item.profitMargin,
          spread: item.spread,
          volume: item.volume,
          collectionSource: item.collectionSource,
          timestamp: item.timestamp
        }));

        // Bulk save historical prices for AI training
        await this.mongoPersistence.bulkSaveHistoricalPrices(historicalPrices);
        
        this.logger.debug('✅ Historical prices saved to MongoDB for AI training', {
          itemsSaved: historicalPrices.length
        });
      } else {
        this.logger.warn('⚠️ MongoDB persistence not available - data not saved');
      }

      // Also save to legacy MarketDataService for backwards compatibility
      const enrichedData = {
        items: processedData,
        collectionSource: 'DataCollectionService',
        metadata: {
          timestamp: Date.now(),
          itemCount: processedData.length,
          collectionStats: this.collectionStats
        }
      };
      
      await this.marketDataService.saveMarketData(enrichedData);
      
      this.logger.debug('Collected data saved successfully', {
        itemsSaved: processedData.length,
        mongoDBSaved: !!this.mongoPersistence
      });
    } catch (error) {
      this.logger.error('Failed to save collected data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Save monitoring data
   */
  async saveMonitoringData(processedData, responseTime) {
    try {
      const monitoringData = {
        timestamp: Date.now(),
        apiRequests: 1,
        successRate: this.calculateSuccessRate(),
        itemsProcessed: processedData.length,
        profit: this.calculateTotalProfit(processedData),
        memoryUsage: this.getMemoryUsage(),
        responseTime,
        rateLimitStatus: 'HEALTHY', // Would be determined by actual rate limiter
        itemSelectionEfficiency: this.calculateSelectionEfficiency(),
        dataQuality: this.calculateDataQuality(processedData)
      };
      
      await this.monitoringService.saveLiveMonitoringData(monitoringData);
      
      this.logger.debug('Monitoring data saved successfully');
    } catch (error) {
      this.logger.error('Failed to save monitoring data', error);
      // Don't throw - monitoring failure shouldn't stop collection
    }
  }

  /**
   * Context7 Pattern: Update collection statistics
   */
  updateCollectionStats(processedData, responseTime) {
    this.collectionStats.totalItemsProcessed += processedData.length;
    this.collectionStats.totalProfit += this.calculateTotalProfit(processedData);
    
    // Update average response time
    const totalResponseTime = this.collectionStats.averageResponseTime * 
      (this.collectionStats.successfulCollections - 1) + responseTime;
    this.collectionStats.averageResponseTime = 
      totalResponseTime / this.collectionStats.successfulCollections;
    
    this.collectionStats.itemsTracked = this.selectedItems.size;
  }

  /**
   * Context7 Pattern: Update smart selection
   */
  async updateSmartSelection(processedData) {
    // Update item metrics
    for (const item of processedData) {
      this.itemMetrics.set(item.itemId, {
        profitMargin: item.profitMargin,
        spread: item.spread,
        volume: item.volume,
        lastUpdate: Date.now()
      });
    }
    
    // Periodically refresh selection (every 100 collections)
    if (this.collectionStats.totalCollections % 100 === 0) {
      await this.refreshSmartSelection();
    }
  }

  /**
   * Context7 Pattern: Refresh smart selection
   */
  async refreshSmartSelection() {
    try {
      this.logger.info('Refreshing smart item selection');
      
      const result = await this.initializeSmartSelection();
      
      this.logger.info('Smart item selection refreshed', {
        previousCount: this.selectedItems.size,
        newCount: result.selectedItems
      });
    } catch (error) {
      this.logger.error('Failed to refresh smart selection', error);
    }
  }

  /**
   * Context7 Pattern: Get collection status
   */
  getCollectionStatus() {
    return {
      isCollecting: this.isCollecting,
      uptime: this.collectionStats.startTime ? 
        Date.now() - this.collectionStats.startTime : 0,
      stats: this.getCollectionStats(),
      config: this.config,
      selectedItems: Array.from(this.selectedItems),
      lastCollection: this.collectionStats.lastCollectionTime
    };
  }

  /**
   * Context7 Pattern: Get collection statistics
   */
  getCollectionStats() {
    return {
      ...this.collectionStats,
      successRate: this.calculateSuccessRate(),
      averageItemsPerCollection: this.collectionStats.totalCollections > 0 ? 
        this.collectionStats.totalItemsProcessed / this.collectionStats.totalCollections : 0,
      uptime: this.collectionStats.startTime ? 
        Date.now() - this.collectionStats.startTime : 0
    };
  }

  /**
   * Context7 Pattern: Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('Configuration updated', { newConfig });
    
    // If collection interval changed and we're collecting, restart
    if (this.isCollecting && newConfig.collectionInterval) {
      this.logger.info('Restarting collection with new interval');
      this.stopCollection().then(() => {
        this.startCollection();
      });
    }
    
    return this.config;
  }

  // Helper methods

  /**
   * Calculate success rate
   */
  calculateSuccessRate() {
    if (this.collectionStats.totalCollections === 0) {
      return 100;
    }
    
    return (this.collectionStats.successfulCollections / 
      this.collectionStats.totalCollections) * 100;
  }

  /**
   * Calculate total profit
   */
  calculateTotalProfit(processedData) {
    return processedData.reduce((total, item) => {
      return total + (item.spread || 0);
    }, 0);
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024); // MB
  }

  /**
   * Calculate selection efficiency
   */
  calculateSelectionEfficiency() {
    const totalPossibleItems = 3000; // Approximate total OSRS items
    const efficiency = (this.selectedItems.size / totalPossibleItems) * 100;
    return 100 - efficiency; // Higher percentage means more efficient (fewer items)
  }

  /**
   * Calculate data quality
   */
  calculateDataQuality(processedData) {
    if (processedData.length === 0) {
      return 0;
    }
    
    const qualityScores = processedData.map(item => {
      let score = 0;
      
      if (item.priceData.high) score += 25;
      if (item.priceData.low) score += 25;
      if (item.profitMargin > 0) score += 25;
      if (item.volume > 0) score += 25;
      
      return score;
    });
    
    return qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  }

  /**
   * Save collection statistics
   */
  async saveCollectionStats() {
    try {
      // Save final stats to database or file
      this.logger.info('Final collection statistics', this.getCollectionStats());
    } catch (error) {
      this.logger.error('Failed to save collection statistics', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Data collection cache cleared');
  }

  /**
   * Get service health
   */
  getHealth() {
    return {
      status: this.isCollecting ? 'running' : 'stopped',
      uptime: this.collectionStats.startTime ? 
        Date.now() - this.collectionStats.startTime : 0,
      stats: this.getCollectionStats(),
      memory: this.getMemoryUsage(),
      selectedItems: this.selectedItems.size,
      errors: this.collectionStats.errors.length
    };
  }
}

module.exports = { DataCollectionService };