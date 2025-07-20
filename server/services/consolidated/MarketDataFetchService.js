/**
 * 🌐 Market Data Fetch Service - Context7 Pattern
 *
 * Single Responsibility Principle Implementation:
 * - ONLY responsible for fetching raw market data from external APIs
 * - Separated from MarketDataService to reduce God Class violation
 * - Handles API communication, rate limiting, and error recovery
 * - No business logic or data processing
 *
 * SOLID Principles Applied:
 * - SRP: Single responsibility for data fetching
 * - OCP: Open for extension with new data sources
 * - DIP: Uses dependency injection for HTTP client and cache
 */

const { BaseService } = require('../BaseService');
const fetch = require('node-fetch');

class MarketDataFetchService extends BaseService {
  constructor(dependencies = {}) {
    super('MarketDataFetchService', {
      enableCache: true,
      cachePrefix: 'market_fetch',
      cacheTTL: 300, // 5 minutes
      enableMongoDB: false
    });

    // Dependency injection
    this.httpClient = dependencies.httpClient || fetch;
    this.userAgent = dependencies.userAgent || 'OSRS-Market-Backend - Market Analysis Tool';
  }

  /**
   * Fetch live market data from OSRS Wiki latest endpoint
   * @returns {Object} Raw market data from OSRS Wiki API
   */
  async fetchLiveMarketData() {
    return await this.withCache('live_market_data', async() => {
      return await this.withRetry(async() => {
        this.logger.info('Fetching live market data from OSRS Wiki API');

        const response = await this.httpClient('https://prices.runescape.wiki/api/v1/osrs/latest', {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`OSRS Wiki API returned ${response.status}: ${response.statusText}`);
        }

        const wikiData = await response.json();
        this.logger.info(`Fetched data for ${Object.keys(wikiData.data || {}).length} items`);

        return wikiData;
      }, 'fetch live market data', 3);
    }, 300); // Cache for 5 minutes
  }

  /**
   * Fetch 5-minute market data from OSRS Wiki timeseries endpoint
   * @returns {Object} Raw 5-minute market data
   */
  async fetch5MinuteMarketData() {
    return await this.withCache('5m_market_data', async() => {
      return await this.withRetry(async() => {
        this.logger.info('Fetching 5-minute market data from OSRS Wiki API');

        const response = await this.httpClient('https://prices.runescape.wiki/api/v1/osrs/5m', {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`OSRS Wiki 5m API returned ${response.status}: ${response.statusText}`);
        }

        const wikiData = await response.json();
        this.logger.info(`Fetched 5m data for ${Object.keys(wikiData.data || {}).length} items`);

        return wikiData;
      }, 'fetch 5-minute market data', 3);
    }, 300);
  }

  /**
   * Fetch 1-hour market data from OSRS Wiki timeseries endpoint
   * @returns {Object} Raw 1-hour market data
   */
  async fetch1HourMarketData() {
    return await this.withCache('1h_market_data', async() => {
      return await this.withRetry(async() => {
        this.logger.info('Fetching 1-hour market data from OSRS Wiki API');

        const response = await this.httpClient('https://prices.runescape.wiki/api/v1/osrs/1h', {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`OSRS Wiki 1h API returned ${response.status}: ${response.statusText}`);
        }

        const wikiData = await response.json();
        this.logger.info(`Fetched 1h data for ${Object.keys(wikiData.data || {}).length} items`);

        return wikiData;
      }, 'fetch 1-hour market data', 3);
    }, 600); // Cache for 10 minutes
  }

  /**
   * Fetch specific item data by ID
   * @param {number} itemId - Item ID to fetch
   * @returns {Object} Raw item data
   */
  async fetchItemData(itemId) {
    if (!itemId || isNaN(itemId)) {
      throw new Error('Invalid item ID provided');
    }

    return await this.withCache(`item_${itemId}`, async() => {
      return await this.withRetry(async() => {
        this.logger.info(`Fetching data for item ${itemId}`);

        const response = await this.httpClient(`https://prices.runescape.wiki/api/v1/osrs/latest?id=${itemId}`, {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`OSRS Wiki item API returned ${response.status}: ${response.statusText}`);
        }

        const itemData = await response.json();
        this.logger.debug(`Fetched data for item ${itemId}`, { data: itemData });

        return itemData;
      }, `fetch item ${itemId} data`, 3);
    }, 300);
  }

  /**
   * Fetch mapping data (item names, etc.)
   * @returns {Object} Raw mapping data
   */
  async fetchMappingData() {
    return await this.withCache('mapping_data', async() => {
      return await this.withRetry(async() => {
        this.logger.info('Fetching mapping data from OSRS Wiki API');

        const response = await this.httpClient('https://prices.runescape.wiki/api/v1/osrs/mapping', {
          headers: {
            'User-Agent': this.userAgent
          }
        });

        if (!response.ok) {
          throw new Error(`OSRS Wiki mapping API returned ${response.status}: ${response.statusText}`);
        }

        const mappingData = await response.json();
        this.logger.info(`Fetched mapping data for ${mappingData.length || 0} items`);

        return mappingData;
      }, 'fetch mapping data', 3);
    }, 3600); // Cache for 1 hour
  }

  /**
   * Test API connectivity
   * @returns {boolean} True if API is accessible
   */
  async testAPIConnectivity() {
    try {
      const response = await this.httpClient('https://prices.runescape.wiki/api/v1/osrs/latest', {
        method: 'HEAD',
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 5000
      });

      const isConnected = response.ok;
      this.logger.info(`API connectivity test: ${isConnected ? 'PASS' : 'FAIL'}`, {
        status: response.status,
        statusText: response.statusText
      });

      return isConnected;
    } catch (error) {
      // Error handling moved to centralized manager - context: API connectivity test failed
      return false;
    }
  }

  /**
   * Get API status and health information
   * @returns {Object} API health status
   */
  async getAPIStatus() {
    try {
      const startTime = Date.now();
      const isConnected = await this.testAPIConnectivity();
      const responseTime = Date.now() - startTime;

      return {
        connected: isConnected,
        responseTime,
        endpoint: 'https://prices.runescape.wiki/api/v1/osrs/',
        lastChecked: new Date(),
        userAgent: this.userAgent
      };
    } catch (error) {
      // Error handling moved to centralized manager - context: Error checking API status
      return {
        connected: false,
        responseTime: null,
        endpoint: 'https://prices.runescape.wiki/api/v1/osrs/',
        lastChecked: new Date(),
        error: error.message
      };
    }
  }
}

module.exports = { MarketDataFetchService };
