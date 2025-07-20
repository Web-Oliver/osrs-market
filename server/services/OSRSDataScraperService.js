/**
 * 🕷️ OSRS Data Scraper Service - SOLID & DRY Optimized
 *
 * SOLID Principles Implementation:
 * - SRP: Single responsibility for coordinating OSRS data scraping (reduced from 1,666 to ~350 lines)
 * - OCP: Open for extension through dependency injection
 * - LSP: Maintains consistent interface
 * - ISP: Uses focused interfaces for scraping concerns
 * - DIP: Depends on abstractions, not concrete implementations
 *
 * DRY Principle Implementation:
 * - Eliminates duplicate scraping logic (delegates to fetch/processing services)
 * - Reuses common patterns through dependency injection
 * - Consolidates data validation and transformation
 *
 * God Class Elimination:
 * - Original: 1,666 lines doing everything
 * - Optimized: ~350 lines orchestrating focused operations
 */

const { BaseService } = require('./BaseService');
const { MarketDataFetchService } = require('./consolidated/MarketDataFetchService');
const { MarketDataProcessingService } = require('./consolidated/MarketDataProcessingService');
const { FinancialCalculationService } = require('./consolidated/FinancialCalculationService');
const { ItemModel } = require('../models/ItemModel');
const { ScrapeQueueModel } = require('../models/ScrapeQueueModel');

class OSRSDataScraperService extends BaseService {
  constructor(dependencies = {}) {
    super('OSRSDataScraperService', {
      enableCache: true,
      cachePrefix: 'osrs_scraper',
      cacheTTL: 600,
      enableMongoDB: true
    });

    // SOLID: Dependency Injection (DIP)
    this.fetchService = dependencies.fetchService || new MarketDataFetchService();
    this.processingService = dependencies.processingService || new MarketDataProcessingService({
      financialCalculator: new FinancialCalculationService()
    });

    // Scraping configuration
    this.scrapingConfig = {
      maxConcurrentScrapes: 5,
      delayBetweenScrapes: 1000, // 1 second
      maxRetries: 3,
      timeout: 30000, // 30 seconds
      respectRateLimit: true,
      ...dependencies.config
    };

    // Scraping state
    this.activeScrapes = new Map();
    this.scrapingStats = {
      totalScrapes: 0,
      successfulScrapes: 0,
      failedScrapes: 0,
      averageScrapeTime: 0,
      lastScrapeTime: null
    };

    this.logger.info('OSRS Data Scraper Service initialized', {
      config: this.scrapingConfig
    });
  }

  /**
   * SOLID: Start scraping operation
   */
  async startScraping() {
    return this.execute(async () => {
const {
        itemIds = [],
        source = 'wiki',
        priority = 'normal',
        enableProcessing = true
      } = options;

      this.logger.info('Starting OSRS data scraping', {
        itemCount: itemIds.length,
        source,
        priority
      });

      const result = await this.performScraping({
        itemIds,
        source,
        priority,
        enableProcessing
      });

      this.updateScrapingStats(result, true);

      return result;
    }, 'startScraping', { logSuccess: true });
  }

  /**
   * SOLID: Perform scraping operation
   */
  async performScraping() {
    return this.execute(async () => {
const batchResults = await this.scrapeBatch(batch, source);
        Object.assign(results.scraped, batchResults);

        // Process scraped data if enabled
        if (enableProcessing && Object.keys(batchResults).length > 0) {
          const processed = await this.processScrapedData(batchResults, source);
          Object.assign(results.processed, processed);
        }

        // Respect rate limiting
        if (this.scrapingConfig.respectRateLimit) {
          await this.delay(this.scrapingConfig.delayBetweenScrapes);
        }
    }, 'performScraping', { logSuccess: true });
  }

  /**
   * SOLID: Scrape from GE (Grand Exchange) - Simplified
   */
  async scrapeFromGE() {
    return this.execute(async () => {
// Simplified GE scraping (would use actual GE API in production)
      const basePrice = Math.floor(Math.random() * 1000000) + 1000;
      
      return {
        itemId: parseInt(itemId),
        highPrice: basePrice * 1.05,
        lowPrice: basePrice * 0.95,
        volume: Math.floor(Math.random() * 500) + 50,
        timestamp: Date.now(),
        source: 'ge'
      };
    }, 'scrapeFromGE', { logSuccess: true });
  }

  /**
   * SOLID: Scrape from mapping data - Delegates to FetchService
   */
  async scrapeFromMapping() {
    return this.execute(async () => {
const mappingData = await this.fetchService.fetchMappingData();
      
      const itemMapping = mappingData.find(item => item.id === parseInt(itemId));
      if (!itemMapping) {
        throw new Error(`No mapping found for item ${itemId}`);
      }

      return {
        itemId: parseInt(itemId),
        name: itemMapping.name,
        examine: itemMapping.examine,
        members: itemMapping.members,
        timestamp: Date.now(),
        source: 'mapping'
      };
    }, 'scrapeFromMapping', { logSuccess: true });
  }

  /**
   * SOLID: Process scraped data - Delegates to ProcessingService
   */
  async processScrapedData() {
    return this.execute(async () => {
// Convert scraped data to format expected by processing service
      const formattedData = {
        data: scrapedData
      };

      let processedData;
      if (source === 'wiki') {
        processedData = this.processingService.processLiveMarketData(formattedData);
      } else {
        // For other sources, use live data processing as fallback
        processedData = this.processingService.processLiveMarketData(formattedData);
      }

      this.logger.debug('Processed scraped data', {
        source,
        inputCount: Object.keys(scrapedData).length,
        outputCount: Object.keys(processedData).length
      });

      return processedData;
    }, 'processScrapedData', { logSuccess: true });
  }

  /**
   * SOLID: Add items to scraping queue
   */
  async addToScrapingQueue() {
    return this.execute(async () => {
const { priority = 'normal', source = 'wiki' } = options;

      const queueItems = items.map(item => ({
        itemId: typeof item === 'object' ? item.itemId || item.id : item,
        itemName: typeof item === 'object' ? item.name : undefined,
        priority,
        source,
        status: 'pending',
        createdAt: new Date(),
        retryCount: 0
      }));

      const result = await ScrapeQueueModel.insertMany(queueItems);
      
      this.logger.info('Added items to scraping queue', {
        count: result.length,
        priority,
        source
      });

      return result;
    }, 'addToScrapingQueue', { logSuccess: true });
  }

  /**
   * SOLID: Process scraping queue
   */
  async processScrapingQueue() {
    return this.execute(async () => {
const { 
        limit = 100,
        priority = null,
        source = null 
      } = options;

      // Build query
      const query = { status: 'pending' };
      if (priority) query.priority = priority;
      if (source) query.source = source;

      // Get items from queue
      const queueItems = await ScrapeQueueModel.find(query)
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit);

      if (queueItems.length === 0) {
        return { processed: 0, message: 'No items in queue' };
      }

      this.logger.info('Processing scraping queue', {
        itemCount: queueItems.length,
        priority,
        source
      });

      // Group by source for efficient processing
      const itemsBySource = {};
      queueItems.forEach(item => {
        if (!itemsBySource[item.source]) {
          itemsBySource[item.source] = [];
        }
        itemsBySource[item.source].push(item);
      });

      let processedCount = 0;
      const results = {};

      // Process each source group
      for (const [sourceType, items] of Object.entries(itemsBySource)) {
        try {
          const itemIds = items.map(item => item.itemId);
          const scrapingResult = await this.performScraping({
            itemIds,
            source: sourceType,
            enableProcessing: true
          });

          results[sourceType] = scrapingResult;

          // Update queue items as completed
          for (const item of items) {
            await ScrapeQueueModel.findByIdAndUpdate(item._id, {
              status: 'completed',
              completedAt: new Date(),
              result: scrapingResult.scraped[item.itemId] || null
            });
            processedCount++;
          }
    }, 'processScrapingQueue', { logSuccess: true });
  }

  /**
   * SOLID: Get scraping statistics
   */
  getScrapingStats() {
    return {
      ...this.scrapingStats,
      activeScrapes: this.activeScrapes.size,
      successRate: this.scrapingStats.totalScrapes > 0 
        ? this.scrapingStats.successfulScrapes / this.scrapingStats.totalScrapes 
        : 0,
      config: this.scrapingConfig,
      lastUpdate: new Date()
    };
  }

  /**
   * SOLID: Get queue status
   */
  async getQueueStatus() {
    return this.execute(async () => {
const [pending, completed, failed] = await Promise.all([
        ScrapeQueueModel.countDocuments({ status: 'pending' }),
        ScrapeQueueModel.countDocuments({ status: 'completed' }),
        ScrapeQueueModel.countDocuments({ status: 'failed' })
      ]);

      return {
        pending,
        completed,
        failed,
        total: pending + completed + failed,
        lastUpdated: new Date()
      };
    }, 'getQueueStatus', { logSuccess: true });
  }

  /**
   * SOLID: Clean up old queue items
   */
  async cleanupQueue() {
    return this.execute(async () => {
const cutoff = new Date(Date.now() - maxAgeMs);
      
      const deleted = await ScrapeQueueModel.deleteMany({
        $or: [
          { status: 'completed', completedAt: { $lt: cutoff } },
          { status: 'failed', failedAt: { $lt: cutoff } }
        ]
      });

      this.logger.info('Cleaned up old queue items', {
        deletedCount: deleted.deletedCount,
        cutoffDate: cutoff
      });

      return deleted.deletedCount;
    }, 'cleanupQueue', { logSuccess: true });
  }

  // Helper methods

  /**
   * Create batches from array
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Update scraping statistics
   */
  updateScrapingStats(result, success) {
    this.scrapingStats.totalScrapes++;
    this.scrapingStats.lastScrapeTime = new Date();

    if (success) {
      this.scrapingStats.successfulScrapes++;
      
      if (result?.metadata?.duration) {
        // Update running average
        const alpha = 0.1;
        this.scrapingStats.averageScrapeTime = 
          this.scrapingStats.averageScrapeTime === 0
            ? result.metadata.duration
            : (1 - alpha) * this.scrapingStats.averageScrapeTime + alpha * result.metadata.duration;
      }
    } else {
      this.scrapingStats.failedScrapes++;
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { OSRSDataScraperService };