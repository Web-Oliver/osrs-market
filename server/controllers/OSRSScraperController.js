/**
 * 🏺 OSRS Scraper Controller - Context7 Optimized
 *
 * Context7 Pattern: RESTful API Controller for OSRS Data Scraping
 * - Orchestrates data scraping operations
 * - Provides real-time scraping status and results
 * - Manages pattern detection and analysis
 * - Ensures proper error handling and logging
 */

const { OSRSDataScraperService } = require('../services/OSRSDataScraperService');
const { Logger } = require('../utils/Logger');
const { ApiResponse } = require('../utils/ApiResponse');

class OSRSScraperController {
  constructor() {
    this.logger = new Logger('OSRSScraperController');
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
  async startFullImport(req, res) {
    try {
      if (this.currentScrapeStatus.isRunning) {
        return ApiResponse.error(res, 'SCRAPE_IN_PROGRESS', 'A scraping operation is already in progress', 409);
      }

      this.logger.info('🏺 Starting full OSRS data import request');

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

      return ApiResponse.success(res, {
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
      }, 'Full OSRS data import initiated successfully');

    } catch (error) {
      this.logger.error('❌ Failed to start full import', error);
      this.currentScrapeStatus.isRunning = false;
      this.currentScrapeStatus.error = error.message;

      return ApiResponse.error(res, 'IMPORT_START_FAILED', 'Failed to start data import', error.message, 500);
    }
  }

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
  async getScrapingStatus(req, res) {
    try {
      await this.initializeService();

      const serviceStatus = this.scraperService.getStatus();
      const status = {
        ...this.currentScrapeStatus,
        service: serviceStatus,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: Date.now()
      };

      return ApiResponse.success(res, status, 'Scraping status retrieved successfully');

    } catch (error) {
      this.logger.error('❌ Failed to get scraping status', error);
      return ApiResponse.error(res, 'STATUS_FAILED', 'Failed to get scraping status', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Get latest scraped data
   */
  async getLatestScrapedData(req, res) {
    try {
      await this.initializeService();

      const { category, limit = 50, format = 'json' } = req.query;

      if (!this.scraperService.mongoPersistence) {
        return ApiResponse.error(res, 'DATABASE_NOT_CONNECTED', 'Database connection not available', 503);
      }

      // Get latest scrape data from MongoDB
      const scrapeDataCollection = this.scraperService.mongoPersistence.database.collection('osrs_scrape_data');
      const latestScrape = await scrapeDataCollection.findOne(
        {},
        { sort: { timestamp: -1 } }
      );

      if (!latestScrape) {
        return ApiResponse.error(res, 'NO_DATA', 'No scraped data available. Please run a scrape operation first.', 404);
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
        return ApiResponse.error(res, 'INVALID_CATEGORY', `Category '${category}' not found. Valid categories: ${Object.keys(latestScrape.categories).join(', ')}`, 400);
      }

      // Handle different response formats
      if (format === 'csv') {
        return this.respondWithCSV(res, responseData);
      } else if (format === 'summary') {
        return this.respondWithSummary(res, responseData);
      }

      return ApiResponse.success(res, responseData, 'Latest scraped data retrieved successfully');

    } catch (error) {
      this.logger.error('❌ Failed to get latest scraped data', error);
      return ApiResponse.error(res, 'DATA_RETRIEVAL_FAILED', 'Failed to retrieve scraped data', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Get detected market patterns
   */
  async getMarketPatterns(req, res) {
    try {
      await this.initializeService();

      const { type, significance, limit = 100 } = req.query;

      if (!this.scraperService.mongoPersistence) {
        return ApiResponse.error(res, 'DATABASE_NOT_CONNECTED', 'Database connection not available', 503);
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

      return ApiResponse.success(res, {
        patterns,
        statistics: {
          total: patterns.length,
          byType: stats,
          availableTypes: [...new Set(patterns.map(p => p.type))],
          availableSignificances: [...new Set(patterns.map(p => p.significance))]
        }
      }, 'Market patterns retrieved successfully');

    } catch (error) {
      this.logger.error('❌ Failed to get market patterns', error);
      return ApiResponse.error(res, 'PATTERNS_RETRIEVAL_FAILED', 'Failed to retrieve market patterns', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Search for specific item data
   */
  async searchItemData(req, res) {
    try {
      await this.initializeService();

      const { query, includeHistorical = false } = req.query;

      if (!query) {
        return ApiResponse.error(res, 'MISSING_QUERY', 'Search query parameter is required', 400);
      }

      if (!this.scraperService.mongoPersistence) {
        return ApiResponse.error(res, 'DATABASE_NOT_CONNECTED', 'Database connection not available', 503);
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

      return ApiResponse.success(res, {
        searchQuery: query,
        results: searchResults,
        historicalData: historicalData,
        totalFound: searchResults.length
      }, `Found ${searchResults.length} items matching '${query}'`);

    } catch (error) {
      this.logger.error('❌ Failed to search item data', error);
      return ApiResponse.error(res, 'SEARCH_FAILED', 'Failed to search item data', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Get scraper health status
   */
  async getHealthStatus(req, res) {
    try {
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

      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 202 : 503;

      return ApiResponse.success(res, health, 'Health status retrieved', statusCode);

    } catch (error) {
      this.logger.error('❌ Failed to get health status', error);
      return ApiResponse.error(res, 'HEALTH_CHECK_FAILED', 'Health check failed', error.message, 503);
    }
  }

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
      return ApiResponse.error(res, 'CSV_GENERATION_FAILED', 'Failed to generate CSV', error.message, 500);
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

      return ApiResponse.success(res, summary, 'Data summary retrieved successfully');

    } catch (error) {
      this.logger.error('❌ Failed to generate summary response', error);
      return ApiResponse.error(res, 'SUMMARY_GENERATION_FAILED', 'Failed to generate summary', error.message, 500);
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
