/**
 * 🏺 OSRS Wiki Service - Context7 Optimized
 * 
 * Context7 Pattern: External API Integration Service
 * - Centralized OSRS Wiki API communication
 * - Rate limiting and caching
 * - Error handling and fallback mechanisms
 * - Data transformation and validation
 */

const axios = require('axios');
const { Logger } = require('../utils/Logger');
const { CacheManager } = require('../utils/CacheManager');
const { RateLimiter } = require('../utils/RateLimiter');

class OSRSWikiService {
  constructor() {
    this.logger = new Logger('OSRSWikiService');
    this.cache = new CacheManager('osrs_wiki', 300000); // 5 minutes cache
    this.rateLimiter = new RateLimiter();
    
    // OSRS Wiki API configuration
    this.baseURL = 'https://prices.runescape.wiki/api/v1/osrs';
    this.userAgent = 'OSRS-Market-Tracker/1.0 (Educational AI Trading Research)';
    this.timeout = 10000; // 10 seconds
    
    // Rate limiting configuration (respectful usage)
    this.rateLimitConfig = {
      windowMs: 60000, // 1 minute
      max: 30, // 30 requests per minute (well under API limits)
      key: 'osrs_wiki_api'
    };
    
    this.axiosConfig = {
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }

  /**
   * Context7 Pattern: Get latest item prices
   */
  async getLatestPrices() {
    try {
      this.logger.debug('Fetching latest prices from OSRS Wiki API');

      // Check rate limit
      const rateLimitResult = await this.rateLimiter.checkLimit(
        this.rateLimitConfig.key,
        this.rateLimitConfig
      );

      if (rateLimitResult.exceeded) {
        this.logger.warn('Rate limit exceeded for OSRS Wiki API', {
          retryAfter: rateLimitResult.retryAfter,
          remaining: rateLimitResult.remaining
        });
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
      }

      // Check cache first
      const cacheKey = 'latest_prices';
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Returning cached latest prices');
        return cachedData;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseURL}/latest`, this.axiosConfig);
      
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = this.transformLatestPrices(response.data);
      
      // Cache the response
      this.cache.set(cacheKey, data);
      
      this.logger.debug('Successfully fetched latest prices', {
        itemCount: Object.keys(data.data || {}).length,
        timestamp: data.timestamp
      });

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch latest prices', error);
      
      // Try to return cached data if available
      const fallbackData = this.cache.get('latest_prices');
      if (fallbackData) {
        this.logger.info('Returning stale cached data due to API error');
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get item mapping
   */
  async getItemMapping() {
    try {
      this.logger.debug('Fetching item mapping from OSRS Wiki API');

      // Check rate limit
      const rateLimitResult = await this.rateLimiter.checkLimit(
        this.rateLimitConfig.key,
        this.rateLimitConfig
      );

      if (rateLimitResult.exceeded) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
      }

      // Check cache first (longer cache for mapping as it changes less frequently)
      const cacheKey = 'item_mapping';
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Returning cached item mapping');
        return cachedData;
      }

      // Fetch from API
      const response = await axios.get(`${this.baseURL}/mapping`, this.axiosConfig);
      
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = this.transformItemMapping(response.data);
      
      // Cache for longer period (mapping changes less frequently)
      this.cache.set(cacheKey, data, 3600000); // 1 hour cache
      
      this.logger.debug('Successfully fetched item mapping', {
        itemCount: data.length
      });

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch item mapping', error);
      
      // Try to return cached data if available
      const fallbackData = this.cache.get('item_mapping');
      if (fallbackData) {
        this.logger.info('Returning stale cached mapping due to API error');
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get timeseries data for item
   */
  async getTimeseries(itemId, timestep = '5m') {
    try {
      this.logger.debug('Fetching timeseries data', { itemId, timestep });

      // Validate parameters
      if (!itemId || typeof itemId !== 'number') {
        throw new Error('Invalid item ID provided');
      }

      const validTimesteps = ['5m', '1h', '6h', '24h'];
      if (!validTimesteps.includes(timestep)) {
        throw new Error(`Invalid timestep. Must be one of: ${validTimesteps.join(', ')}`);
      }

      // Check rate limit
      const rateLimitResult = await this.rateLimiter.checkLimit(
        this.rateLimitConfig.key,
        this.rateLimitConfig
      );

      if (rateLimitResult.exceeded) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
      }

      // Check cache first
      const cacheKey = `timeseries_${itemId}_${timestep}`;
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData) {
        this.logger.debug('Returning cached timeseries data');
        return cachedData;
      }

      // Fetch from API
      const response = await axios.get(
        `${this.baseURL}/timeseries?timestep=${timestep}&id=${itemId}`,
        this.axiosConfig
      );
      
      if (response.status !== 200) {
        throw new Error(`API returned status ${response.status}`);
      }

      const data = this.transformTimeseriesData(response.data, itemId, timestep);
      
      // Cache the response (shorter cache for timeseries)
      this.cache.set(cacheKey, data, 60000); // 1 minute cache
      
      this.logger.debug('Successfully fetched timeseries data', {
        itemId,
        timestep,
        dataPoints: data.data ? data.data.length : 0
      });

      return data;
    } catch (error) {
      this.logger.error('Failed to fetch timeseries data', error, { itemId, timestep });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Search items by name
   */
  async searchItems(query, limit = 20) {
    try {
      this.logger.debug('Searching items', { query, limit });

      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        throw new Error('Query must be at least 2 characters long');
      }

      // Get item mapping first
      const mapping = await this.getItemMapping();
      
      // Search through mapping
      const searchResults = this.searchInMapping(mapping, query.trim(), limit);
      
      this.logger.debug('Search completed', {
        query,
        resultCount: searchResults.length
      });

      return {
        query,
        results: searchResults,
        total: searchResults.length,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to search items', error, { query, limit });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get specific item data
   */
  async getItemData(itemId) {
    try {
      this.logger.debug('Fetching item data', { itemId });

      // Get both mapping and latest prices
      const [mapping, prices] = await Promise.all([
        this.getItemMapping(),
        this.getLatestPrices()
      ]);

      // Find item in mapping
      const itemMapping = mapping.find(item => item.id === itemId);
      if (!itemMapping) {
        throw new Error(`Item ${itemId} not found in mapping`);
      }

      // Get price data
      const priceData = prices.data[itemId] || null;

      const itemData = {
        id: itemId,
        name: itemMapping.name,
        examine: itemMapping.examine,
        members: itemMapping.members,
        tradeable: itemMapping.tradeable_on_ge,
        stackable: itemMapping.stackable,
        noted: itemMapping.noted,
        priceData: priceData ? {
          high: priceData.high,
          highTime: priceData.highTime,
          low: priceData.low,
          lowTime: priceData.lowTime
        } : null,
        timestamp: Date.now()
      };

      this.logger.debug('Successfully fetched item data', {
        itemId,
        itemName: itemData.name,
        hasPrice: !!priceData
      });

      return itemData;
    } catch (error) {
      this.logger.error('Failed to fetch item data', error, { itemId });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get bulk item data
   */
  async getBulkItemData(itemIds) {
    try {
      this.logger.debug('Fetching bulk item data', { itemCount: itemIds.length });

      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        throw new Error('Item IDs must be a non-empty array');
      }

      // Validate all item IDs
      const validItemIds = itemIds.filter(id => 
        typeof id === 'number' && id > 0
      );

      if (validItemIds.length === 0) {
        throw new Error('No valid item IDs provided');
      }

      // Get mapping and prices
      const [mapping, prices] = await Promise.all([
        this.getItemMapping(),
        this.getLatestPrices()
      ]);

      // Build mapping lookup
      const mappingLookup = new Map(
        mapping.map(item => [item.id, item])
      );

      // Process each item
      const results = validItemIds.map(itemId => {
        const itemMapping = mappingLookup.get(itemId);
        const priceData = prices.data[itemId];

        if (!itemMapping) {
          return {
            id: itemId,
            error: 'Item not found in mapping'
          };
        }

        return {
          id: itemId,
          name: itemMapping.name,
          examine: itemMapping.examine,
          members: itemMapping.members,
          tradeable: itemMapping.tradeable_on_ge,
          stackable: itemMapping.stackable,
          noted: itemMapping.noted,
          priceData: priceData ? {
            high: priceData.high,
            highTime: priceData.highTime,
            low: priceData.low,
            lowTime: priceData.lowTime
          } : null
        };
      });

      this.logger.debug('Successfully fetched bulk item data', {
        requested: itemIds.length,
        valid: validItemIds.length,
        successful: results.filter(r => !r.error).length
      });

      return {
        items: results,
        timestamp: Date.now(),
        stats: {
          requested: itemIds.length,
          valid: validItemIds.length,
          successful: results.filter(r => !r.error).length,
          failed: results.filter(r => r.error).length
        }
      };
    } catch (error) {
      this.logger.error('Failed to fetch bulk item data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get API status
   */
  async getAPIStatus() {
    try {
      const startTime = Date.now();
      
      // Make a simple request to check API health
      const response = await axios.get(`${this.baseURL}/latest`, {
        ...this.axiosConfig,
        timeout: 5000 // Shorter timeout for status check
      });

      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        statusCode: response.status,
        timestamp: Date.now(),
        rateLimitInfo: await this.rateLimiter.getStats(this.rateLimitConfig.key)
      };
    } catch (error) {
      this.logger.error('API status check failed', error);
      
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: Date.now(),
        rateLimitInfo: await this.rateLimiter.getStats(this.rateLimitConfig.key)
      };
    }
  }

  // Context7 Pattern: Private helper methods

  /**
   * Transform latest prices data
   */
  transformLatestPrices(data) {
    return {
      data: data.data || {},
      timestamp: data.timestamp || Date.now()
    };
  }

  /**
   * Transform item mapping data
   */
  transformItemMapping(data) {
    if (!Array.isArray(data)) {
      return [];
    }

    return data.map(item => ({
      id: item.id,
      name: item.name,
      examine: item.examine,
      members: item.members,
      tradeable_on_ge: item.tradeable_on_ge,
      stackable: item.stackable,
      noted: item.noted,
      value: item.value,
      lowalch: item.lowalch,
      highalch: item.highalch,
      weight: item.weight,
      buy_limit: item.buy_limit
    }));
  }

  /**
   * Transform timeseries data
   */
  transformTimeseriesData(data, itemId, timestep) {
    return {
      itemId,
      timestep,
      data: data.data || [],
      timestamp: Date.now()
    };
  }

  /**
   * Search in mapping data
   */
  searchInMapping(mapping, query, limit) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const item of mapping) {
      if (results.length >= limit) break;
      
      const nameLower = item.name.toLowerCase();
      
      // Calculate relevance score
      let score = 0;
      if (nameLower === queryLower) {
        score = 100; // Exact match
      } else if (nameLower.startsWith(queryLower)) {
        score = 80; // Starts with
      } else if (nameLower.includes(queryLower)) {
        score = 60; // Contains
      } else {
        // Check for word matches
        const words = queryLower.split(' ');
        const nameWords = nameLower.split(' ');
        
        for (const word of words) {
          if (nameWords.some(nameWord => nameWord.includes(word))) {
            score = Math.max(score, 40);
          }
        }
      }

      if (score > 0) {
        results.push({
          ...item,
          relevanceScore: score
        });
      }
    }

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('OSRS Wiki Service cache cleared');
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      cache: this.cache.getStats(),
      rateLimit: this.rateLimiter.getStats(this.rateLimitConfig.key),
      config: {
        baseURL: this.baseURL,
        timeout: this.timeout,
        rateLimitConfig: this.rateLimitConfig
      }
    };
  }
}

module.exports = { OSRSWikiService };