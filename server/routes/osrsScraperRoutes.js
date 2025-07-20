/**
 * 🏺 OSRS Scraper Routes - Context7 Optimized
 *
 * Context7 Pattern: RESTful API Routes for OSRS Data Scraping
 * - Comprehensive OSRS Grand Exchange data import endpoints
 * - Real-time scraping status and progress monitoring
 * - Market pattern detection and analysis
 * - Data export in multiple formats (JSON, CSV, Summary)
 */

const express = require('express');
const { OSRSScraperController } = require('../controllers/OSRSScraperController');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');

const router = express.Router();
const scraperController = new OSRSScraperController();
const requestMiddleware = new RequestMiddleware();
const errorMiddleware = new ErrorMiddleware();

/**
 * Context7 Pattern: Apply route-specific middleware only
 */

/**
 * POST /api/osrs-scraper/import/start
 * Start comprehensive OSRS data import from Grand Exchange
 *
 * Scrapes data from:
 * - Most Traded Items (list=0)
 * - Greatest Rise Items (list=1)
 * - Greatest Fall Items (list=3)
 * - Most Valuable Items (list=2)
 *
 * Features:
 * - Pattern detection and anomaly analysis
 * - Historical data fetching for interesting items
 * - Data integrity checks and MongoDB storage
 * - Respectful scraping with rate limiting
 */
router.post('/import/start',
  errorMiddleware.handleAsyncError(scraperController.startFullImport.bind(scraperController))
);

/**
 * GET /api/osrs-scraper/status
 * Get current scraping operation status
 *
 * Returns:
 * - Current scraping progress
 * - Service health status
 * - System resource usage
 * - Last scrape completion details
 */
router.get('/status', errorMiddleware.handleAsyncError(scraperController.getScrapingStatus.bind(scraperController)));

/**
 * GET /api/osrs-scraper/data/latest
 * Get latest scraped market data
 *
 * Query Parameters:
 * - category: Filter by category (mostTraded, greatestRise, greatestFall, mostValuable)
 * - limit: Limit number of results (default: 50)
 * - format: Response format (json, csv, summary)
 *
 * Example: GET /data/latest?category=mostTraded&limit=20&format=csv
 */
router.get('/data/latest', errorMiddleware.handleAsyncError(scraperController.getLatestScrapedData.bind(scraperController)));

/**
 * GET /api/osrs-scraper/patterns
 * Get detected market patterns and anomalies
 *
 * Query Parameters:
 * - type: Filter by pattern type (MULTI_CATEGORY_APPEARANCE, SIGNIFICANT_PRICE_CHANGE, HIGH_VALUE_UNUSUAL_ACTIVITY)
 * - significance: Filter by significance level (LOW, MEDIUM, HIGH, CRITICAL)
 * - limit: Limit number of results (default: 100)
 *
 * Features:
 * - Pattern statistics and aggregations
 * - Anomaly detection results
 * - Market intelligence insights
 */
router.get('/patterns', errorMiddleware.handleAsyncError(scraperController.getMarketPatterns.bind(scraperController)));

/**
 * GET /api/osrs-scraper/search
 * Search for specific item data across all categories
 *
 * Query Parameters:
 * - query: Item name to search for (required)
 * - includeHistorical: Include historical data (true/false)
 *
 * Features:
 * - Cross-category item search
 * - Historical data inclusion
 * - Fuzzy matching capabilities
 *
 * Example: GET /search?query=dragon&includeHistorical=true
 */
router.get('/search',
  errorMiddleware.handleAsyncError(scraperController.searchItemData.bind(scraperController))
);

/**
 * GET /api/osrs-scraper/health
 * Get scraper service health status
 *
 * Returns:
 * - Service initialization status
 * - Database connection health
 * - System resource monitoring
 * - Recent operation status
 */
router.get('/health', errorMiddleware.handleAsyncError(scraperController.getHealthStatus.bind(scraperController)));

/**
 * Context7 Pattern: API Documentation endpoint
 */
router.get('/', (req, res) => {
  const apiInfo = {
    name: 'OSRS Market Data Scraper API',
    version: '1.0.0',
    description: 'Comprehensive OSRS Grand Exchange data scraping and analysis system',
    features: [
      'Multi-category data scraping (Most Traded, Greatest Rise, Greatest Fall, Most Valuable)',
      'Real-time pattern detection and anomaly analysis',
      'Historical data fetching for high-interest items',
      'Data integrity checks and MongoDB storage',
      'Multiple export formats (JSON, CSV, Summary)',
      'Rate limiting and respectful scraping practices',
      'Advanced search and filtering capabilities'
    ],
    endpoints: {
      'POST /import/start': {
        description: 'Start comprehensive OSRS data import',
        rateLimit: '1 request per 10 minutes',
        features: ['Scrapes top 100 items from 4 categories', 'Pattern detection', 'Historical data fetching']
      },
      'GET /status': {
        description: 'Get current scraping operation status',
        features: ['Real-time progress', 'Service health', 'Resource monitoring']
      },
      'GET /data/latest': {
        description: 'Get latest scraped market data',
        parameters: ['category', 'limit', 'format'],
        formats: ['json', 'csv', 'summary']
      },
      'GET /patterns': {
        description: 'Get detected market patterns and anomalies',
        parameters: ['type', 'significance', 'limit'],
        features: ['Pattern statistics', 'Anomaly detection', 'Market intelligence']
      },
      'GET /search': {
        description: 'Search for specific item data',
        parameters: ['query (required)', 'includeHistorical'],
        rateLimit: '30 requests per minute',
        features: ['Cross-category search', 'Historical data', 'Fuzzy matching']
      },
      'GET /health': {
        description: 'Get scraper service health status',
        features: ['Service status', 'Database health', 'System monitoring']
      }
    },
    dataSources: {
      'OSRS Grand Exchange': {
        mostTraded: 'https://secure.runescape.com/m=itemdb_oldschool/top100?list=0&scale=3',
        greatestRise: 'https://secure.runescape.com/m=itemdb_oldschool/top100?list=1&scale=3',
        mostValuable: 'https://secure.runescape.com/m=itemdb_oldschool/top100?list=2&scale=3',
        greatestFall: 'https://secure.runescape.com/m=itemdb_oldschool/top100?list=3&scale=3'
      },
      'OSRS Wiki API': 'Used for historical price data and item details'
    },
    patternTypes: [
      'MULTI_CATEGORY_APPEARANCE - Items appearing in multiple top 100 lists',
      'SIGNIFICANT_PRICE_CHANGE - Items with major price movements (>20%)',
      'HIGH_VALUE_UNUSUAL_ACTIVITY - High-value items in unexpected categories'
    ],
    dataIntegrity: [
      'MD5 checksums for data validation',
      'Timestamp tracking for all operations',
      'Duplicate prevention and data deduplication',
      'Error handling and retry mechanisms'
    ],
    storage: {
      collections: [
        'osrs_scrape_data - Main scrape operation data',
        'osrs_market_patterns - Detected patterns and anomalies',
        'osrs_item_historical - Historical item data cache',
        'historical_prices - AI training data integration'
      ]
    },
    rateLimits: {
      import: '1 request per 10 minutes',
      search: '30 requests per minute',
      general: '120 requests per minute'
    }
  };

  res.json({
    success: true,
    data: apiInfo,
    message: 'OSRS Market Data Scraper API - Ready for comprehensive market analysis'
  });
});

module.exports = router;
