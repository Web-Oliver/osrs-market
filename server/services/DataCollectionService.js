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
const { ItemModel } = require('../models/ItemModel');
const { ScrapeQueueModel } = require('../models/ScrapeQueueModel');

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

    // Start memory monitoring for all services
    this.startMemoryMonitoring();

    // Initialize WebSocket streaming (will be set by server)
    this.webSocketService = null;

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

      // Process discovered items and store them in ItemModel
      let newItemsCount = 0;
      let queuedItemsCount = 0;

      for (const discoveredItem of discoveredItems) {
        try {
          // Check if item already exists
          const existingItem = await ItemModel.findOne({ itemId: discoveredItem.itemId });

          if (!existingItem) {
            // Create new item record with basic information
            const newItem = await ItemModel.create({
              itemId: discoveredItem.itemId,
              name: discoveredItem.name,
              examine: discoveredItem.examine || 'Item discovered from Top 100 lists',
              members: discoveredItem.members || false,
              lowalch: discoveredItem.lowalch || 0,
              highalch: discoveredItem.highalch || 0,
              tradeable_on_ge: true, // Items from Top 100 are GE tradeable
              stackable: discoveredItem.stackable || false,
              noted: false,
              value: discoveredItem.value || 1,
              weight: discoveredItem.weight || 0,
              dataSource: 'osrs_ge_scraper',
              status: 'active',
              has6MonthHistoryScraped: false
            });

            this.logger.info(`📦 Created new item: ${newItem.name} (ID: ${newItem.itemId})`);
            newItemsCount++;

            // Queue the new item for 6-month historical data scraping
            await this.queueItemFor6MonthScrape(newItem.itemId);
            queuedItemsCount++;

          } else {
            this.logger.debug(`⏭️  Item already exists: ${existingItem.name} (ID: ${existingItem.itemId})`);
          }

        } catch (itemError) {
          this.logger.error(`❌ Failed to process item ${discoveredItem.itemId}: ${discoveredItem.name}`, itemError);
          // Continue processing other items
        }
      }

      this.logger.info(`✅ Processing complete: ${newItemsCount} new items created, ${queuedItemsCount} items queued for historical scraping`);

      return {
        success: true,
        itemsDiscovered: discoveredItems.length,
        newItemsCreated: newItemsCount,
        itemsQueuedForScraping: queuedItemsCount,
        items: discoveredItems
      };

    } catch (error) {
      this.logger.error('❌ Failed to discover and store new items', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Queue item for 6-month historical data scraping
   * @param {number} itemId - The item ID to queue for scraping
   * @returns {Promise<void>}
   */
  async queueItemFor6MonthScrape(itemId) {
    try {
      // Check if item already has 6-month history scraped
      const item = await ItemModel.findOne({ itemId, has6MonthHistoryScraped: true });

      if (item) {
        this.logger.debug(`⏭️  Item ${itemId} already has 6-month history scraped, skipping queue`);
        return;
      }

      // Check if item is already queued
      const existingQueueItem = await ScrapeQueueModel.findOne({ itemId });

      if (existingQueueItem) {
        this.logger.debug(`⏭️  Item ${itemId} is already queued for scraping (status: ${existingQueueItem.status})`);
        return;
      }

      // Add item to scrape queue
      await ScrapeQueueModel.create({
        itemId: itemId,
        status: 'pending',
        createdAt: new Date(),
        retries: 0
      });

      this.logger.info(`🔄 Queued item ${itemId} for 6-month historical data scraping`);

    } catch (error) {
      this.logger.error(`❌ Failed to queue item ${itemId} for 6-month scraping`, error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Process scrape queue with concurrency control
   * @param {number} batchSize - Number of items to process in this batch (default: 10)
   * @returns {Promise<Object>} Processing results
   */
  async processScrapeQueue(batchSize = 10) {
    const pLimit = require('p-limit');
    const { MarketDataService } = require('./MarketDataService');

    try {
      this.logger.info('🔄 Starting scrape queue processing');

      if (!this.osrsDataScraperService.browser) {
        await this.osrsDataScraperService.launchBrowser();
      }

      // Get items ready for processing (pending + retry-ready failed)
      const itemsToProcess = await ScrapeQueueModel.getItemsReadyForProcessing(batchSize);

      if (itemsToProcess.length === 0) {
        this.logger.info('✅ No items in scrape queue to process');
        return {
          success: true,
          itemsProcessed: 0,
          itemsSuccessful: 0,
          itemsFailed: 0,
          message: 'No items to process'
        };
      }

      this.logger.info(`📊 Processing ${itemsToProcess.length} items from scrape queue`);

      // Set up concurrency limit (maximum 5 simultaneous scrapes)
      const limit = pLimit(5);
      let successfulItems = 0;
      let failedItems = 0;
      const results = [];

      // Process items with concurrency control
      const processingPromises = itemsToProcess.map(queueItem =>
        limit(async() => {
          const itemId = queueItem.itemId;

          try {
            // Mark item as processing
            await queueItem.markAsProcessing();

            // Fetch item name from ItemModel
            const item = await ItemModel.findOne({ itemId });
            if (!item) {
              throw new Error(`Item ${itemId} not found in ItemModel`);
            }

            const itemName = item.name;
            this.logger.info(`📈 Processing item: ${itemName} (ID: ${itemId})`);

            // Scrape individual item page for historical data
            const historicalData = await this.osrsDataScraperService.scrapeIndividualItemPage(itemId, itemName);

            // Save historical data to MarketPriceSnapshotModel
            const marketDataService = new MarketDataService();
            let savedCount = 0;

            for (const dataPoint of historicalData) {
              const snapshotData = {
                itemId: itemId,
                timestamp: dataPoint.timestamp,
                interval: 'daily_scrape',
                highPrice: dataPoint.price,
                lowPrice: dataPoint.price, // For daily average, high and low are the same
                volume: dataPoint.volume,
                source: 'ge_scraper'
              };

              try {
                await marketDataService.saveMarketSnapshot(snapshotData);
                savedCount++;
              } catch (saveError) {
                this.logger.warn(`⚠️ Failed to save data point for ${itemName} (ID: ${itemId})`, saveError);
                // Continue with other data points
              }
            }

            // Mark item as having 6-month history scraped
            await ItemModel.findOneAndUpdate(
              { itemId },
              { has6MonthHistoryScraped: true }
            );

            // Mark queue item as completed
            await queueItem.markAsCompleted();

            this.logger.info(`✅ Successfully processed ${itemName} (ID: ${itemId}): ${savedCount} data points saved`);

            successfulItems++;
            results.push({
              itemId,
              itemName,
              status: 'success',
              dataPointsSaved: savedCount,
              historicalDataCount: historicalData.length
            });

          } catch (error) {
            this.logger.error(`❌ Failed to process item ${itemId}`, error);

            // Mark queue item as failed
            await queueItem.markAsFailed(error.message);

            failedItems++;
            results.push({
              itemId,
              status: 'failed',
              error: error.message,
              retries: queueItem.retries + 1
            });
          }
        })
      );

      // Wait for all processing to complete
      await Promise.all(processingPromises);

      // Get queue statistics
      const queueStats = await ScrapeQueueModel.getQueueStats();

      this.logger.info(`✅ Scrape queue processing completed: ${successfulItems} successful, ${failedItems} failed`);

      return {
        success: true,
        itemsProcessed: itemsToProcess.length,
        itemsSuccessful: successfulItems,
        itemsFailed: failedItems,
        results,
        queueStats: queueStats[0] || {}
      };

    } catch (error) {
      this.logger.error('❌ Failed to process scrape queue', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Collect 5-minute market data from OSRS Wiki API
   * @returns {Promise<Object>} Collection results
   */
  async collect5mMarketData() {
    try {
      this.logger.info('📊 Collecting 5-minute market data');

      // Fetch 5-minute prices from OSRS Wiki API
      const fiveMinPrices = await this.osrsWikiService.get5MinutePrices();

      if (!fiveMinPrices || !fiveMinPrices.data) {
        throw new Error('No 5-minute price data received');
      }

      const marketDataService = new MarketDataService();
      let savedCount = 0;
      let errorCount = 0;

      // Process each item's price data
      for (const [itemIdStr, priceData] of Object.entries(fiveMinPrices.data)) {
        const itemId = parseInt(itemIdStr);

        if (!priceData || (!priceData.avgHighPrice && !priceData.avgLowPrice)) {
          continue;
        }

        try {
          const snapshotData = {
            itemId: itemId,
            timestamp: fiveMinPrices.timestamp * 1000, // Convert to milliseconds
            interval: '5m',
            highPrice: priceData.avgHighPrice || priceData.avgLowPrice || 0,
            lowPrice: priceData.avgLowPrice || priceData.avgHighPrice || 0,
            volume: priceData.highPriceVolume || priceData.lowPriceVolume || 0,
            source: 'osrs_wiki_api'
          };

          await marketDataService.saveMarketSnapshot(snapshotData);
          savedCount++;

        } catch (error) {
          this.logger.warn(`⚠️ Failed to save 5-minute data for item ${itemId}`, error);
          errorCount++;
        }
      }

      this.logger.info(`✅ 5-minute market data collection completed: ${savedCount} items saved, ${errorCount} errors`);

      return {
        success: true,
        itemsSaved: savedCount,
        errors: errorCount,
        totalItems: Object.keys(fiveMinPrices.data).length
      };

    } catch (error) {
      this.logger.error('❌ Failed to collect 5-minute market data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Collect 1-hour market data from OSRS Wiki API
   * @returns {Promise<Object>} Collection results
   */
  async collect1hMarketData() {
    try {
      this.logger.info('📊 Collecting 1-hour market data');

      // Fetch 1-hour prices from OSRS Wiki API
      const oneHourPrices = await this.osrsWikiService.get1HourPrices();

      if (!oneHourPrices || !oneHourPrices.data) {
        throw new Error('No 1-hour price data received');
      }

      const marketDataService = new MarketDataService();
      let savedCount = 0;
      let errorCount = 0;

      // Process each item's price data
      for (const [itemIdStr, priceData] of Object.entries(oneHourPrices.data)) {
        const itemId = parseInt(itemIdStr);

        if (!priceData || (!priceData.avgHighPrice && !priceData.avgLowPrice)) {
          continue;
        }

        try {
          const snapshotData = {
            itemId: itemId,
            timestamp: oneHourPrices.timestamp * 1000, // Convert to milliseconds
            interval: '1h',
            highPrice: priceData.avgHighPrice || priceData.avgLowPrice || 0,
            lowPrice: priceData.avgLowPrice || priceData.avgHighPrice || 0,
            volume: priceData.highPriceVolume || priceData.lowPriceVolume || 0,
            source: 'osrs_wiki_api'
          };

          await marketDataService.saveMarketSnapshot(snapshotData);
          savedCount++;

        } catch (error) {
          this.logger.warn(`⚠️ Failed to save 1-hour data for item ${itemId}`, error);
          errorCount++;
        }
      }

      this.logger.info(`✅ 1-hour market data collection completed: ${savedCount} items saved, ${errorCount} errors`);

      return {
        success: true,
        itemsSaved: savedCount,
        errors: errorCount,
        totalItems: Object.keys(oneHourPrices.data).length
      };

    } catch (error) {
      this.logger.error('❌ Failed to collect 1-hour market data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Collect latest market data from OSRS Wiki API (on-demand)
   * @returns {Promise<Object>} Collection results
   */
  async collectLatestMarketData() {
    try {
      this.logger.info('📊 Collecting latest market data');

      // Fetch latest prices from OSRS Wiki API
      const latestPrices = await this.osrsWikiService.getLatestPrices();

      if (!latestPrices || !latestPrices.data) {
        throw new Error('No latest price data received');
      }

      const marketDataService = new MarketDataService();
      let savedCount = 0;
      let errorCount = 0;

      // Process each item's price data
      for (const [itemIdStr, priceData] of Object.entries(latestPrices.data)) {
        const itemId = parseInt(itemIdStr);

        if (!priceData || (!priceData.high && !priceData.low)) {
          continue;
        }

        try {
          const snapshotData = {
            itemId: itemId,
            timestamp: latestPrices.timestamp * 1000, // Convert to milliseconds
            interval: 'latest',
            highPrice: priceData.high || priceData.low || 0,
            lowPrice: priceData.low || priceData.high || 0,
            volume: 0, // Latest prices don't include volume
            source: 'osrs_wiki_api'
          };

          await marketDataService.saveMarketSnapshot(snapshotData);
          savedCount++;

        } catch (error) {
          this.logger.warn(`⚠️ Failed to save latest data for item ${itemId}`, error);
          errorCount++;
        }
      }

      this.logger.info(`✅ Latest market data collection completed: ${savedCount} items saved, ${errorCount} errors`);

      // Stream the collected data in real-time
      if (savedCount > 0) {
        try {
          const marketData = Object.entries(latestPrices.data).map(([itemId, priceData]) => ({
            itemId: parseInt(itemId),
            priceData,
            timestamp: Date.now()
          }));
          this.streamMarketData(marketData);
        } catch (streamError) {
          // Mark as operational error - streaming failure shouldn't crash collection
          streamError.isOperational = true;
          this.logger.warn('⚠️ Failed to stream market data (non-critical)', streamError);
        }
      }

      return {
        success: true,
        itemsSaved: savedCount,
        errors: errorCount,
        totalItems: Object.keys(latestPrices.data).length
      };

    } catch (error) {
      this.logger.error('❌ Failed to collect latest market data', error);
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
      this.collectionInterval = setInterval(async() => {
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
   * Get stats for auto training service compatibility
   */
  getStats() {
    return {
      isCollecting: this.isCollecting,
      totalCollections: this.collectionStats.totalCollections || 0,
      lastCollection: this.collectionStats.lastCollectionTime || null,
      memoryUsage: this.getMemoryUsage(),
      successfulCollections: this.collectionStats.successfulCollections || 0,
      failedCollections: this.collectionStats.failedCollections || 0,
      totalItemsProcessed: this.collectionStats.totalItemsProcessed || 0,
      averageResponseTime: this.collectionStats.averageResponseTime || 0,
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

      if (item.priceData.high) {
        score += 25;
      }
      if (item.priceData.low) {
        score += 25;
      }
      if (item.profitMargin > 0) {
        score += 25;
      }
      if (item.volume > 0) {
        score += 25;
      }

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
   * Get latest collected data for reporting
   */
  getLatestData() {
    // Return a mock structure since we don't store latest data in memory
    // In a real implementation, this could return the most recent cache entry
    return {
      timestamp: Date.now(),
      items: [], // Empty items array as placeholder
      metadata: {
        totalItems: this.selectedItems?.size || 0,
        collectionTime: this.collectionStats.lastCollectionTime
      }
    };
  }

  /**
   * Get market metrics for reporting
   */
  getMarketMetrics() {
    const stats = this.getCollectionStats();
    const recentData = this.getLatestData();

    return {
      totalCollections: stats.totalCollections || 0,
      successRate: stats.totalCollections > 0 ?
        ((stats.successfulCollections || 0) / stats.totalCollections * 100).toFixed(1) + '%' : '0%',
      averageResponseTime: stats.averageResponseTime || 0,
      itemsProcessed: stats.totalItemsProcessed || 0,
      dataQuality: recentData?.items ?
        (recentData.items.length > 0 ? '100%' : '0%') : '0%',
      collectionFrequency: this.config.collectionInterval,
      selectedItemsCount: this.selectedItems?.size || 0,
      memoryUsage: this.getMemoryUsage(),
      uptime: stats.startTime ? Date.now() - stats.startTime : 0,
      lastCollectionTime: stats.lastCollectionTime,
      errors: stats.errors?.length || 0
    };
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

  // =========================================
  // MEMORY MANAGEMENT METHODS
  // =========================================

  /**
   * MEMORY MANAGEMENT: Start memory monitoring for the service
   */
  startMemoryMonitoring() {
    try {
      // Start memory monitoring for scraper service
      if (this.osrsDataScraperService.startMemoryMonitoring) {
        this.osrsDataScraperService.startMemoryMonitoring();
      }

      // Start our own memory monitoring
      this.memoryMonitorInterval = setInterval(async () => {
        await this.monitorServiceMemory();
      }, 300000); // Every 5 minutes

      this.logger.info('📊 Memory monitoring started for DataCollectionService');
    } catch (error) {
      this.logger.error('❌ Failed to start memory monitoring', error);
    }
  }

  /**
   * MEMORY MANAGEMENT: Monitor service memory usage
   */
  async monitorServiceMemory() {
    try {
      const usage = process.memoryUsage();
      const memoryMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024)
      };

      // Log warning if memory usage is high
      if (memoryMB.heapUsed > 400) { // More than 400MB
        this.logger.warn(`⚠️ High memory usage: ${memoryMB.heapUsed}MB heap used`);
        
        // Stream memory alert
        this.streamMemoryAlert(memoryMB);
        
        // Perform cleanup
        await this.performMemoryCleanup();
      }

      // Save memory metrics
      if (this.mongoPersistence) {
        await this.mongoPersistence.saveLiveMonitoringData({
          timestamp: Date.now(),
          memoryUsage: memoryMB.rss,
          heapUsed: memoryMB.heapUsed,
          selectedItemsCount: this.selectedItems.size,
          cacheSize: this.itemMetrics.size,
          source: 'memory_monitor'
        });
      }

      return memoryMB;
    } catch (error) {
      this.logger.error('❌ Error monitoring memory', error);
    }
  }

  /**
   * MEMORY MANAGEMENT: Perform memory cleanup
   */
  async performMemoryCleanup() {
    try {
      this.logger.info('🧹 Performing memory cleanup...');

      // Clear old cache entries
      const maxAge = 3600000; // 1 hour
      const currentTime = Date.now();
      let clearCount = 0;

      for (const [key, value] of this.itemMetrics.entries()) {
        if (value.timestamp && currentTime - value.timestamp > maxAge) {
          this.itemMetrics.delete(key);
          clearCount++;
        }
      }

      // Clear cache
      if (this.cache && this.cache.clear) {
        this.cache.clear();
      }

      // Cleanup scraper service
      if (this.osrsDataScraperService.cleanupCache) {
        this.osrsDataScraperService.cleanupCache();
      }

      // Force garbage collection if available
      if (global.gc) {
        const beforeGC = process.memoryUsage().heapUsed;
        global.gc();
        const afterGC = process.memoryUsage().heapUsed;
        const freed = Math.round((beforeGC - afterGC) / 1024 / 1024);
        this.logger.info(`🗑️ Garbage collection freed ${freed}MB`);
      }

      this.logger.info(`✅ Memory cleanup completed - cleared ${clearCount} old entries`);
    } catch (error) {
      this.logger.error('❌ Error during memory cleanup', error);
    }
  }

  /**
   * MEMORY MANAGEMENT: Stop memory monitoring
   */
  stopMemoryMonitoring() {
    try {
      if (this.memoryMonitorInterval) {
        clearInterval(this.memoryMonitorInterval);
        this.memoryMonitorInterval = null;
      }

      // Stop scraper memory monitoring
      if (this.osrsDataScraperService.stopMemoryMonitoring) {
        this.osrsDataScraperService.stopMemoryMonitoring();
      }

      this.logger.info('🛑 Memory monitoring stopped');
    } catch (error) {
      this.logger.error('❌ Error stopping memory monitoring', error);
    }
  }

  /**
   * MEMORY MANAGEMENT: Get comprehensive memory statistics
   */
  getMemoryStats() {
    const usage = process.memoryUsage();
    const memoryMB = {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };

    return {
      process: memoryMB,
      service: {
        selectedItems: this.selectedItems.size,
        itemMetrics: this.itemMetrics.size,
        isCollecting: this.isCollecting,
        uptime: this.collectionStats.startTime ? Date.now() - this.collectionStats.startTime : 0
      },
      scraper: this.osrsDataScraperService.getMemoryUsage ? this.osrsDataScraperService.getMemoryUsage() : null
    };
  }

  // =========================================
  // WEBSOCKET INTEGRATION METHODS
  // =========================================

  /**
   * WEBSOCKET: Set WebSocket service for real-time streaming
   */
  setWebSocketService(webSocketService) {
    this.webSocketService = webSocketService;
    this.logger.info('📡 WebSocket service attached for real-time streaming');
  }

  /**
   * WEBSOCKET: Stream market data in real-time
   */
  streamMarketData(marketData) {
    try {
      if (this.webSocketService) {
        const streamData = {
          timestamp: Date.now(),
          itemCount: marketData.length,
          items: marketData.slice(0, 10), // Send first 10 items to avoid large payloads
          summary: {
            totalItems: marketData.length,
            avgPrice: marketData.reduce((sum, item) => sum + (item.priceData?.high || 0), 0) / marketData.length,
            topItem: marketData[0]?.itemName || 'N/A'
          }
        };

        this.webSocketService.broadcastMarketData(streamData);
        this.logger.debug(`📊 Streamed market data: ${marketData.length} items`);
      }
    } catch (error) {
      this.logger.error('❌ Error streaming market data', error);
    }
  }

  /**
   * WEBSOCKET: Stream collection statistics
   */
  streamCollectionStats() {
    try {
      if (this.webSocketService) {
        const stats = this.getCollectionStats();
        const memoryStats = this.getMemoryStats();

        const streamData = {
          stats,
          memory: memoryStats,
          pipeline: this.getPipelineStatus(),
          timestamp: Date.now()
        };

        this.webSocketService.broadcastSystemHealth(streamData);
        this.logger.debug('📈 Streamed collection statistics');
      }
    } catch (error) {
      this.logger.error('❌ Error streaming collection stats', error);
    }
  }

  /**
   * WEBSOCKET: Stream memory alerts when usage is high
   */
  streamMemoryAlert(memoryData) {
    try {
      if (this.webSocketService && memoryData.heapUsed > 300) {
        this.webSocketService.broadcastMemoryAlert(memoryData);
        this.logger.warn(`⚠️ Streamed memory alert: ${memoryData.heapUsed}MB`);
      }
    } catch (error) {
      this.logger.error('❌ Error streaming memory alert', error);
    }
  }

  /**
   * WEBSOCKET: Stream pipeline status updates
   */
  streamPipelineStatus() {
    try {
      if (this.webSocketService) {
        const status = this.getPipelineStatus();
        this.webSocketService.broadcastPipelineStatus(status);
        this.logger.debug('🔄 Streamed pipeline status');
      }
    } catch (error) {
      this.logger.error('❌ Error streaming pipeline status', error);
    }
  }

  // =========================================
  // DATA PIPELINE ORCHESTRATOR METHODS
  // =========================================

  /**
   * ORCHESTRATOR: Start complete data pipeline
   * Coordinates scraper → backend → AI microservice flow
   */
  async startDataPipeline() {
    try {
      this.logger.info('🚀 Starting Data Pipeline Orchestrator');
      
      // Step 1: Initialize all services
      await this.initializeAllServices();
      
      // Step 2: Start data collection
      await this.startDataCollection();
      
      // Step 3: Start AI data pipeline
      await this.startAIDataFlow();
      
      // Step 4: Setup real-time monitoring
      await this.setupRealTimeMonitoring();
      
      this.logger.info('✅ Data Pipeline Orchestrator started successfully');
      return { success: true, message: 'Pipeline started' };
    } catch (error) {
      this.logger.error('❌ Failed to start data pipeline', error);
      throw error;
    }
  }

  /**
   * ORCHESTRATOR: Initialize all pipeline services
   */
  async initializeAllServices() {
    this.logger.info('🔧 Initializing pipeline services...');
    
    // Initialize MongoDB persistence
    if (!this.mongoPersistence) {
      await this.initializePersistence();
    }
    
    // Initialize scraper
    if (!this.osrsDataScraperService.mongoPersistence) {
      await this.osrsDataScraperService.initialize();
    }
    
    // Test AI microservice connection
    await this.testAIServiceConnection();
    
    this.logger.info('✅ All pipeline services initialized');
  }

  /**
   * ORCHESTRATOR: Test AI microservice connection
   */
  async testAIServiceConnection() {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        this.logger.info('✅ AI microservice connection verified');
        return true;
      } else {
        throw new Error(`AI service responded with status: ${response.status}`);
      }
    } catch (error) {
      this.logger.warn('⚠️ AI microservice not responding, pipeline will continue without AI features');
      return false;
    }
  }

  /**
   * ORCHESTRATOR: Start AI data flow pipeline
   */
  async startAIDataFlow() {
    try {
      this.logger.info('🤖 Starting AI data flow pipeline...');
      
      // Set up periodic data push to AI service
      this.aiDataInterval = setInterval(async () => {
        try {
          await this.pushDataToAI();
        } catch (error) {
          this.logger.error('❌ Error in AI data push', error);
        }
      }, 60000); // Every minute
      
      this.logger.info('✅ AI data flow pipeline started');
    } catch (error) {
      this.logger.error('❌ Failed to start AI data flow', error);
    }
  }

  /**
   * ORCHESTRATOR: Push latest market data to AI microservice
   */
  async pushDataToAI() {
    try {
      // Validate prerequisites - fail fast
      if (!this.mongoPersistence) {
        const error = new Error('MongoDB persistence not initialized');
        error.isOperational = true;
        throw error;
      }

      // Get latest market data from MongoDB
      const marketData = await this.mongoPersistence.getMarketData({
        limit: 100,
        onlyTradeable: true
      });

      if (marketData.length === 0) {
        return { success: false, message: 'No market data available' };
      }

      // Format data for AI service with validation
      const aiData = marketData.map(item => {
        if (!item.itemId || !item.priceData) {
          const error = new Error(`Invalid market data item: missing itemId or priceData`);
          error.isOperational = true;
          throw error;
        }
        return {
          itemId: item.itemId,
          itemName: item.itemName,
          priceData: item.priceData,
          timestamp: item.timestamp,
          spread: item.spread,
          volume: item.volume
        };
      });

      // Send to AI microservice with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        const response = await fetch('http://localhost:8000/api/v1/training/market-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: aiData,
            timestamp: Date.now(),
            source: 'pipeline_orchestrator'
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (response.ok) {
          this.logger.info(`📤 Pushed ${aiData.length} market items to AI service`);
          return { success: true, itemsPushed: aiData.length };
        } else {
          const aiError = new Error(`AI service responded with status: ${response.status}`);
          aiError.isOperational = true; // AI service issues are operational
          throw aiError;
        }
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          const timeoutError = new Error('AI service request timeout (10s)');
          timeoutError.isOperational = true;
          throw timeoutError;
        }
        throw fetchError;
      }
    } catch (error) {
      // Log error with operational flag context
      const logLevel = error.isOperational ? 'warn' : 'error';
      this.logger[logLevel](`❌ Failed to push data to AI service`, error);
      
      return { 
        success: false, 
        error: error.message,
        isOperational: error.isOperational || false
      };
    }
  }

  /**
   * ORCHESTRATOR: Setup real-time monitoring
   */
  async setupRealTimeMonitoring() {
    try {
      this.logger.info('📊 Setting up real-time monitoring...');
      
      // Monitor pipeline health every 30 seconds
      this.healthMonitorInterval = setInterval(async () => {
        await this.monitorPipelineHealth();
      }, 30000);
      
      // Save monitoring metrics every 5 minutes
      this.metricsInterval = setInterval(async () => {
        await this.saveMonitoringMetrics();
      }, 300000);
      
      this.logger.info('✅ Real-time monitoring active');
    } catch (error) {
      this.logger.error('❌ Failed to setup monitoring', error);
    }
  }

  /**
   * ORCHESTRATOR: Monitor pipeline health
   */
  async monitorPipelineHealth() {
    try {
      const health = {
        timestamp: Date.now(),
        scraper: this.osrsDataScraperService.browser ? 'healthy' : 'unhealthy',
        database: this.mongoPersistence ? 'healthy' : 'unhealthy',
        aiService: await this.testAIServiceConnection() ? 'healthy' : 'unhealthy',
        dataCollection: this.isCollecting ? 'active' : 'inactive',
        selectedItems: this.selectedItems.size,
        memoryUsage: this.getMemoryUsage()
      };

      // Log health issues
      if (health.scraper === 'unhealthy') {
        this.logger.warn('⚠️ Scraper service unhealthy - attempting restart');
        await this.osrsDataScraperService.launchBrowser();
      }

      if (health.database === 'unhealthy') {
        this.logger.warn('⚠️ Database connection unhealthy');
        await this.initializePersistence();
      }

      return health;
    } catch (error) {
      this.logger.error('❌ Error monitoring pipeline health', error);
      return { error: error.message };
    }
  }

  /**
   * ORCHESTRATOR: Save monitoring metrics to database
   */
  async saveMonitoringMetrics() {
    try {
      if (!this.mongoPersistence) return;

      const metrics = {
        timestamp: Date.now(),
        pipelineStatus: 'active',
        itemsProcessed: this.collectionStats.totalItemsProcessed || 0,
        successRate: this.collectionStats.totalCollections > 0 ?
          (this.collectionStats.successfulCollections / this.collectionStats.totalCollections) * 100 : 0,
        responseTime: this.collectionStats.averageResponseTime || 0,
        memoryUsage: this.getMemoryUsage().rss,
        selectedItemsCount: this.selectedItems.size,
        errors: this.collectionStats.errors.length
      };

      await this.mongoPersistence.saveLiveMonitoringData(metrics);
      this.logger.debug('📊 Monitoring metrics saved to database');
    } catch (error) {
      this.logger.error('❌ Failed to save monitoring metrics', error);
    }
  }

  /**
   * ORCHESTRATOR: Stop data pipeline
   */
  async stopDataPipeline() {
    try {
      this.logger.info('🛑 Stopping Data Pipeline Orchestrator');
      
      // Stop data collection
      await this.stopDataCollection();
      
      // Clear intervals
      if (this.aiDataInterval) {
        clearInterval(this.aiDataInterval);
        this.aiDataInterval = null;
      }
      
      if (this.healthMonitorInterval) {
        clearInterval(this.healthMonitorInterval);
        this.healthMonitorInterval = null;
      }
      
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = null;
      }
      
      this.logger.info('✅ Data Pipeline Orchestrator stopped');
      return { success: true, message: 'Pipeline stopped' };
    } catch (error) {
      this.logger.error('❌ Failed to stop data pipeline', error);
      throw error;
    }
  }

  /**
   * ORCHESTRATOR: Get pipeline status
   */
  getPipelineStatus() {
    return {
      isActive: this.isCollecting,
      aiDataFlow: !!this.aiDataInterval,
      healthMonitoring: !!this.healthMonitorInterval,
      metricsCollection: !!this.metricsInterval,
      selectedItems: this.selectedItems.size,
      uptime: this.collectionStats.startTime ? Date.now() - this.collectionStats.startTime : 0,
      lastDataPush: this.lastAIDataPush || null,
      stats: this.getCollectionStats()
    };
  }
}

module.exports = { DataCollectionService };
