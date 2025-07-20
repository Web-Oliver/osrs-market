/**
 * 🏺 OSRS Scraper Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for OSRS Data Scraping Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const { OSRSDataScraperService } = require('../services/OSRSDataScraperService');

class OSRSScraperController extends BaseController {
  constructor() {
    super('OSRSScraperController');
    this.scraperService = null;
    this.currentScrapeStatus = {
      isRunning: false,
      startTime: null,
      progress: null,
      error: null
    };
  }

  /**
   * Context7 Pattern: Initialize scraper service
   */
  async initializeService() {
    if (!this.scraperService) {
      this.scraperService = new OSRSDataScraperService();
      await this.scraperService.initialize();
    }
    return this.scraperService;
  }

  /**
   * Context7 Pattern: Start full OSRS data import
   */
  startFullImport = this.createPostEndpoint(
    async () => {
      if (this.currentScrapeStatus.isRunning) {
        const error = new Error('A scraping operation is already in progress');
        error.statusCode = 409;
        throw error;
      }

      // Initialize service if needed
      await this.initializeService();

      // Set scraping status
      this.currentScrapeStatus = {
        isRunning: true,
        startTime: Date.now(),
        progress: 'Initializing scraper...',
        error: null
      };

      // Start scraping asynchronously
      this.performAsyncScrape().catch(error => {
        this.logger.error('❌ Async scrape failed', error);
        this.currentScrapeStatus.isRunning = false;
        this.currentScrapeStatus.error = error.message;
      });

      return {
        message: 'OSRS data import started',
        scrapeId: `scrape_${Date.now()}`,
        status: this.currentScrapeStatus,
        estimatedTime: '5-10 minutes',
        categories: [
          'Most Traded Items',
          'Greatest Rise Items',
          'Greatest Fall Items',
          'Most Valuable Items'
        ]
      };
    },
    { operationName: 'start full OSRS data import' }
  );

  /**
   * Context7 Pattern: Perform asynchronous scraping operation
   */
  async performAsyncScrape() {
    try {
      this.currentScrapeStatus.progress = 'Launching browser...';

      const result = await this.scraperService.performFullScrape();

      this.currentScrapeStatus = {
        isRunning: false,
        startTime: this.currentScrapeStatus.startTime,
        completedTime: Date.now(),
        progress: 'Completed successfully',
        error: null,
        result: {
          success: result.success,
          totalTime: result.totalTime,
          itemsScraped: result.itemsScraped,
          patternsDetected: result.patternsDetected,
          dataAvailable: true
        }
      };

      this.logger.info('✅ Full OSRS data import completed successfully', {
        totalTime: result.totalTime,
        itemsScraped: result.itemsScraped,
        patternsDetected: result.patternsDetected
      });

    } catch (error) {
      this.currentScrapeStatus.isRunning = false;
      this.currentScrapeStatus.error = error.message;
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get current scraping status
   */
  getScrapingStatus = this.createGetEndpoint(
    async () => {
      await this.initializeService();

      const serviceStatus = this.scraperService.getStatus();
      const status = {
        ...this.currentScrapeStatus,
        service: serviceStatus,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
      };

      return status;
    },
    { operationName: 'get scraping status' }
  );

  /**
   * Context7 Pattern: Get latest scraped data
   */
  getLatestScrapedData = this.endpointFactory.createCustomEndpoint(
    async (req, res) => {
      await this.initializeService();

      const { category, limit = 50, format = 'json' } = req.query;

      if (!this.scraperService.mongoPersistence) {
        const error = new Error('Database connection not available');
        error.statusCode = 503;
        throw error;
      }

      // Get latest scrape data from MongoDB
      const scrapeDataCollection = this.scraperService.mongoPersistence.database.collection('osrs_scrape_data');
      const latestScrape = await scrapeDataCollection.findOne(
        {},
        { sort: { timestamp: -1 } }
      );

      if (!latestScrape) {
        const error = new Error('No scraped data available. Please run a scrape operation first.');
        error.statusCode = 404;
        throw error;
      }

      let responseData = latestScrape;

      // Filter by category if specified
      if (category && latestScrape.categories[category]) {
        responseData = {
          ...latestScrape,
          categories: {
            [category]: latestScrape.categories[category].slice(0, parseInt(limit))
          }
        };
      } else if (category) {
        const error = new Error(`Category '${category}' not found. Valid categories: ${Object.keys(latestScrape.categories).join(', ')}`);
        error.statusCode = 400;
        throw error;
      }

      // Handle different response formats
      if (format === 'csv') {
        return this.respondWithCSV(res, responseData);
      } else if (format === 'summary') {
        return this.respondWithSummary(res, responseData);
      }

      return this.sendSuccess(res, responseData, 'Latest scraped data retrieved successfully');
    },
    { operationName: 'get latest scraped data' }
  );

  /**
   * Context7 Pattern: Get detected market patterns
   */
  getMarketPatterns = this.createGetEndpoint(
    async (params) => {
      await this.initializeService();

      const { type, significance, limit } = params;

      if (!this.scraperService.mongoPersistence) {
        const error = new Error('Database connection not available');
        error.statusCode = 503;
        throw error;
      }

      // Build query filter
      const filter = {};
      if (type) {
        filter.type = type;
      }
      if (significance) {
        filter.significance = significance;
      }

      // Get patterns from MongoDB
      const patternsCollection = this.scraperService.mongoPersistence.database.collection('osrs_market_patterns');
      const patterns = await patternsCollection
        .find(filter)
        .sort({ detectedAt: -1 })
        .limit(parseInt(limit))
        .toArray();

      // Get pattern statistics
      const stats = await patternsCollection.aggregate([
        { $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgSignificance: { $avg: { $cond: [
            { $eq: ['$significance', 'CRITICAL'] }, 3,
            { $cond: [{ $eq: ['$significance', 'HIGH'] }, 2, 1] }
          ] } }
        } },
        { $sort: { count: -1 } }
      ]).toArray();

      return {
        patterns,
        statistics: {
          total: patterns.length,
          byType: stats,
          availableTypes: [...new Set(patterns.map(p => p.type))],
          availableSignificances: [...new Set(patterns.map(p => p.significance))]
        }
      };
    },
    {
      operationName: 'get market patterns',
      parseParams: (req) => ({
        type: req.query.type,
        significance: req.query.significance,
        limit: parseInt(req.query.limit || 100)
      })
    }
  );

  /**
   * Context7 Pattern: Search for specific item data
   */
  searchItemData = this.createGetEndpoint(
    async (params) => {
      await this.initializeService();

      const { query, includeHistorical } = params;

      if (!query) {
        const error = new Error('Search query parameter is required');
        error.statusCode = 400;
        throw error;
      }

      if (!this.scraperService.mongoPersistence) {
        const error = new Error('Database connection not available');
        error.statusCode = 503;
        throw error;
      }

      // Search in latest scrape data
      const scrapeDataCollection = this.scraperService.mongoPersistence.database.collection('osrs_scrape_data');
      const latestScrape = await scrapeDataCollection.findOne(
        {},
        { sort: { timestamp: -1 } }
      );

      const searchResults = [];
      const queryLower = query.toLowerCase();

      if (latestScrape) {
        // Search through all categories
        for (const [category, items] of Object.entries(latestScrape.categories)) {
          for (const item of items) {
            if (item.name.toLowerCase().includes(queryLower)) {
              searchResults.push({
                ...item,
                matchedIn: category
              });
            }
          }
        }
      }

      let historicalData = null;
      if (includeHistorical === 'true') {
        // Search historical data
        const historicalCollection = this.scraperService.mongoPersistence.database.collection('osrs_item_historical');
        historicalData = await historicalCollection
          .find({
            $or: [
              { itemName: { $regex: queryLower, $options: 'i' } },
              { searchedName: { $regex: queryLower, $options: 'i' } }
            ]
          })
          .sort({ fetchedAt: -1 })
          .limit(10)
          .toArray();
      }

      return {
        searchQuery: query,
        results: searchResults,
        historicalData: historicalData,
        totalFound: searchResults.length
      };
    },
    {
      operationName: 'search item data',
      parseParams: (req) => ({
        query: req.query.query,
        includeHistorical: req.query.includeHistorical || false
      })
    }
  );

  /**
   * Context7 Pattern: Get scraper health status
   */
  getHealthStatus = this.createGetEndpoint(
    async () => {
      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        service: {
          initialized: !!this.scraperService,
          database: !!this.scraperService?.mongoPersistence,
          lastScrape: this.currentScrapeStatus.completedTime || null
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
          platform: process.platform
        },
        scraping: this.currentScrapeStatus
      };

      // Determine overall health status
      if (!this.scraperService || !this.scraperService.mongoPersistence) {
        health.status = 'degraded';
      }

      if (this.currentScrapeStatus.error) {
        health.status = 'unhealthy';
      }

      return health;
    },
    { operationName: 'get scraper health status' }
  );

  /**
   * Context7 Pattern: Helper method to respond with CSV format
   */
  respondWithCSV(res, data) {
    try {
      const items = Object.values(data.categories).flat();

      const csvHeader = 'Name,Price,Change,Category,Rank,ScrapedAt\n';
      const csvRows = items.map(item =>
        `"${item.name}","${item.priceText}","${item.changeText}","${item.category}",${item.rank},"${new Date(item.scrapedAt).toISOString()}"`
      ).join('\n');

      const csv = csvHeader + csvRows;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="osrs_market_data.csv"');
      return res.send(csv);

    } catch (error) {
      this.logger.error('❌ Failed to generate CSV response', error);
      return this.sendError(res, 'Failed to generate CSV', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Helper method to respond with summary format
   */
  respondWithSummary(res, data) {
    try {
      const summary = {
        scrapeId: data.scrapeId,
        timestamp: data.timestamp,
        totalItems: data.integrity.totalItems,
        patternsDetected: data.integrity.patternsDetected,
        categories: {}
      };

      for (const [category, items] of Object.entries(data.categories)) {
        summary.categories[category] = {
          count: items.length,
          topItems: items.slice(0, 5).map(item => ({
            name: item.name,
            price: item.priceText,
            change: item.changeText,
            rank: item.rank
          })),
          priceRange: {
            highest: Math.max(...items.map(i => i.price)),
            lowest: Math.min(...items.map(i => i.price))
          }
        };
      }

      return this.sendSuccess(res, summary, 'Data summary retrieved successfully');

    } catch (error) {
      this.logger.error('❌ Failed to generate summary response', error);
      return this.sendError(res, 'Failed to generate summary', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Cleanup resources
   */
  async cleanup() {
    try {
      if (this.scraperService) {
        await this.scraperService.cleanup();
      }
      this.logger.info('✅ OSRS Scraper Controller cleanup completed');
    } catch (error) {
      this.logger.error('❌ Error during controller cleanup', error);
    }
  }
}

module.exports = { OSRSScraperController };
