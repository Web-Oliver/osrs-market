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
const { BaseService } = require('./BaseService');
const { RateLimiter } = require('../utils/RateLimiter');

class OSRSWikiService extends BaseService {
  constructor() {
    super('OSRSWikiService', {
      enableCache: true,
      cachePrefix: 'osrs_wiki',
      cacheTTL: 300, // 5 minutes default
      enableMongoDB: false // No MongoDB needed for external API service
    });
    
    this.rateLimiter = new RateLimiter();

    // Enhanced caching configuration
    this.cacheConfig = {
      latest_prices: 120000, // 2 minutes for latest prices
      item_mapping: 3600000, // 1 hour for item mapping (stable data)
      timeseries: 60000, // 1 minute for timeseries
      search_results: 600000, // 10 minutes for search results
      item_data: 300000, // 5 minutes for individual item data
      '5m_prices': 60000, // 1 minute for 5-minute prices
      '1h_prices': 300000 // 5 minutes for 1-hour prices
    };

    // Circuit breaker for API downtime handling
    this.circuitBreaker = {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureThreshold: 5,
      timeoutThreshold: 60000, // 1 minute timeout
      resetTimeout: 300000 // 5 minutes before retry
    };

    // Per-item rate limiting - track last fetch time for each item
    this.itemLastFetchTime = new Map();
    this.ITEM_RATE_LIMIT_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

    // OSRS Wiki API configuration
    this.baseURL = 'https://prices.runescape.wiki/api/v1/osrs';
    this.userAgent = 'OSRS-Market-Tracker/1.0 (Educational AI Trading Research; Contact: github.com/your-repo/issues)';
    this.timeout = 10000; // 10 seconds

    // Rate limiting configuration (respectful usage)
    this.rateLimitConfig = {
      windowMs: 60000, // 1 minute
      max: 20, // 20 requests per minute (very conservative)
      key: 'osrs_wiki_api'
    };

    // Enhanced rate limiting for different endpoint types
    this.endpointLimits = {
      latest: { windowMs: 60000, max: 10 }, // 10/min for latest prices
      mapping: { windowMs: 300000, max: 2 }, // 2 per 5 minutes for mapping
      timeseries: { windowMs: 60000, max: 5 }, // 5/min for timeseries
      '5m': { windowMs: 60000, max: 10 }, // 10/min for 5-minute data
      '1h': { windowMs: 60000, max: 10 } // 10/min for 1-hour data
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
   * Context7 Pattern: Check circuit breaker state
   */
  checkCircuitBreaker() {
    const now = Date.now();

    switch (this.circuitBreaker.state) {
    case 'OPEN':
      // Check if enough time has passed to try again
      if (now - this.circuitBreaker.lastFailureTime >= this.circuitBreaker.resetTimeout) {
        this.circuitBreaker.state = 'HALF_OPEN';
        this.logger.info('Circuit breaker state changed to HALF_OPEN - attempting recovery');
        return true;
      }
      this.logger.warn('Circuit breaker is OPEN - API calls blocked');
      return false;

    case 'HALF_OPEN':
    case 'CLOSED':
      return true;

    default:
      return true;
    }
  }

  /**
   * Context7 Pattern: Record API failure
   */
  recordFailure(error) {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.logger.error('Circuit breaker opened due to repeated failures', {
        failureCount: this.circuitBreaker.failureCount,
        error: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Record API success
   */
  recordSuccess() {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.state = 'CLOSED';
      this.logger.info('Circuit breaker closed - API recovered');
    }
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
  }

  /**
   * Context7 Pattern: Get stale data with extended expiry for graceful degradation
   */
  getStaleData(cacheKey, maxAge = 3600000) { // 1 hour max stale age
    const cache = this.cache.cache || new Map();
    const entry = cache.get(cacheKey);

    if (entry) {
      const age = Date.now() - entry.timestamp;
      if (age <= maxAge) {
        this.logger.info('Returning stale cached data due to API issues', {
          cacheKey,
          ageMinutes: Math.round(age / 60000),
          maxAgeMinutes: Math.round(maxAge / 60000)
        });
        return entry.value;
      }
    }

    return null;
  }

  /**
   * Context7 Pattern: Get latest item prices with BaseService optimization
   */
  async getLatestPrices() {
    return await this.withCache('latest_prices', async () => {
      return await this.withRetry(async () => {
        this.logger.debug('Fetching latest prices from OSRS Wiki API');

        // Check circuit breaker first
        if (!this.checkCircuitBreaker()) {
          const staleData = this.getStaleData('latest_prices');
          if (staleData) {
            return staleData;
          }
          throw new Error('API is unavailable and no cached data available');
        }

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

        // Fetch from API
        const response = await axios.get(`${this.baseURL}/latest`, this.axiosConfig);

        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = this.transformLatestPrices(response.data);

        // Record success for circuit breaker
        this.recordSuccess();

        this.logger.debug('Successfully fetched latest prices', {
          itemCount: Object.keys(data.data || {}).length,
          timestamp: data.timestamp
        });

        return data;
      }, 'fetch latest prices from OSRS Wiki');
    }, this.cacheConfig.latest_prices / 1000); // Convert to seconds
  }

  /**
   * Context7 Pattern: Get 5-minute average prices with BaseService optimization
   */
  async get5MinutePrices() {
    return await this.withCache('5m_prices', async () => {
      return await this.withRetry(async () => {
        this.logger.debug('Fetching 5-minute average prices from OSRS Wiki API');

        // Check circuit breaker first
        if (!this.checkCircuitBreaker()) {
          const staleData = this.getStaleData('5m_prices');
          if (staleData) {
            return staleData;
          }
          throw new Error('API is unavailable and no cached data available');
        }

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

        // Fetch from API
        const response = await axios.get(`${this.baseURL}/5m`, this.axiosConfig);

        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = this.transform5MinutePrices(response.data);

        // Record success for circuit breaker
        this.recordSuccess();

        this.logger.debug('Successfully fetched 5-minute prices', {
          itemCount: Object.keys(data.data || {}).length,
          timestamp: data.timestamp
        });

        return data;
      }, 'fetch 5-minute prices from OSRS Wiki');
    }, this.cacheConfig['5m_prices'] / 1000); // Convert to seconds
  }

  /**
   * Context7 Pattern: Get 1-hour average prices with BaseService optimization
   */
  async get1HourPrices() {
    return await this.withCache('1h_prices', async () => {
      return await this.withRetry(async () => {
        this.logger.debug('Fetching 1-hour average prices from OSRS Wiki API');

        // Check circuit breaker first
        if (!this.checkCircuitBreaker()) {
          const staleData = this.getStaleData('1h_prices');
          if (staleData) {
            return staleData;
          }
          throw new Error('API is unavailable and no cached data available');
        }

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

        // Fetch from API
        const response = await axios.get(`${this.baseURL}/1h`, this.axiosConfig);

        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = this.transform1HourPrices(response.data);

        // Record success for circuit breaker
        this.recordSuccess();

        this.logger.debug('Successfully fetched 1-hour prices', {
          itemCount: Object.keys(data.data || {}).length,
          timestamp: data.timestamp
        });

        return data;
      }, 'fetch 1-hour prices from OSRS Wiki');
    }, this.cacheConfig['1h_prices'] / 1000); // Convert to seconds
  }

  /**
   * Context7 Pattern: Get item mapping with BaseService optimization
   */
  async getItemMapping() {
    return await this.withCache('item_mapping', async () => {
      return await this.withRetry(async () => {
        this.logger.debug('Fetching item mapping from OSRS Wiki API');

        // Check rate limit
        const rateLimitResult = await this.rateLimiter.checkLimit(
          this.rateLimitConfig.key,
          this.rateLimitConfig
        );

        if (rateLimitResult.exceeded) {
          throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
        }

        // Fetch from API
        const response = await axios.get(`${this.baseURL}/mapping`, this.axiosConfig);

        if (response.status !== 200) {
          throw new Error(`API returned status ${response.status}`);
        }

        const data = this.transformItemMapping(response.data);

        this.logger.debug('Successfully fetched item mapping', {
          itemCount: data.length
        });

        return data;
      }, 'fetch item mapping from OSRS Wiki');
    }, this.cacheConfig.item_mapping / 1000); // Convert to seconds
  }

  /**
   * Context7 Pattern: Get timeseries data for item with per-item rate limiting and BaseService optimization
   */
  async getTimeseries(itemId, timestep = '5m') {
    // Validate parameters
    this.validateRequiredParams({ itemId, timestep }, ['itemId', 'timestep']);
    
    if (typeof itemId !== 'number') {
      throw new Error('Invalid item ID provided');
    }

    const validTimesteps = ['5m', '1h', '6h', '24h'];
    if (!validTimesteps.includes(timestep)) {
      throw new Error(`Invalid timestep. Must be one of: ${validTimesteps.join(', ')}`);
    }

    return await this.withCache(`timeseries_${itemId}_${timestep}`, async () => {
      return await this.withRetry(async () => {
        this.logger.debug('Fetching timeseries data', { itemId, timestep });

        // Check per-item rate limit first
        if (!this.canFetchItem(itemId)) {
          const cooldownTime = this.getItemCooldownTime(itemId);
          this.logger.debug('Item rate limited for timeseries', {
            itemId,
            timestep,
            cooldownRemaining: Math.ceil(cooldownTime / 1000) + 's'
          });
          throw new Error(`Item ${itemId} is rate limited for timeseries. Try again in ${Math.ceil(cooldownTime / 1000)} seconds.`);
        }

        // Check global rate limit
        const rateLimitResult = await this.rateLimiter.checkLimit(
          this.rateLimitConfig.key,
          this.rateLimitConfig
        );

        if (rateLimitResult.exceeded) {
          throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
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

        // Mark item as fetched for rate limiting
        this.markItemFetched(itemId);

        this.logger.debug('Successfully fetched timeseries data', {
          itemId,
          timestep,
          dataPoints: data.data ? data.data.length : 0
        });

        return data;
      }, `fetch timeseries data for item ${itemId}`);
    }, this.cacheConfig.timeseries / 1000); // Convert to seconds
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
   * Context7 Pattern: Check if item can be fetched (per-item rate limiting)
   */
  canFetchItem(itemId) {
    const lastFetchTime = this.itemLastFetchTime.get(itemId);
    if (!lastFetchTime) {
      return true; // Never fetched before
    }

    const timeSinceLastFetch = Date.now() - lastFetchTime;
    return timeSinceLastFetch >= this.ITEM_RATE_LIMIT_MS;
  }

  /**
   * Context7 Pattern: Mark item as fetched
   */
  markItemFetched(itemId) {
    this.itemLastFetchTime.set(itemId, Date.now());
  }

  /**
   * Context7 Pattern: Get remaining time until item can be fetched again
   */
  getItemCooldownTime(itemId) {
    const lastFetchTime = this.itemLastFetchTime.get(itemId);
    if (!lastFetchTime) {
      return 0; // No cooldown
    }

    const timeSinceLastFetch = Date.now() - lastFetchTime;
    const remainingTime = this.ITEM_RATE_LIMIT_MS - timeSinceLastFetch;
    return Math.max(0, remainingTime);
  }

  /**
   * Context7 Pattern: Get specific item data with per-item rate limiting
   */
  async getItemData(itemId) {
    try {
      this.logger.debug('Fetching item data', { itemId });

      // Check per-item rate limit first
      if (!this.canFetchItem(itemId)) {
        const cooldownTime = this.getItemCooldownTime(itemId);
        this.logger.debug('Item rate limited', {
          itemId,
          cooldownRemaining: Math.ceil(cooldownTime / 1000) + 's'
        });

        // Return cached data if available
        const cacheKey = `item_data_${itemId}`;
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
          this.logger.debug('Returning cached item data due to rate limit', { itemId });
          return cachedData;
        }

        throw new Error(`Item ${itemId} is rate limited. Try again in ${Math.ceil(cooldownTime / 1000)} seconds.`);
      }

      // Check cache first
      const cacheKey = `item_data_${itemId}`;
      const cachedData = this.cache.get(cacheKey);
      if (cachedData) {
        this.logger.debug('Returning cached item data', { itemId });
        return cachedData;
      }

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

      // Cache the result with enhanced timeout
      this.cache.set(cacheKey, itemData, this.cacheConfig.item_data);

      // Mark item as fetched for rate limiting
      this.markItemFetched(itemId);

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
   * Context7 Pattern: Get bulk item data with per-item rate limiting
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

      // Filter out rate-limited items and get from cache if available
      const allowedItemIds = [];
      const rateLimitedItems = [];
      const cachedItems = [];

      for (const itemId of validItemIds) {
        if (this.canFetchItem(itemId)) {
          allowedItemIds.push(itemId);
        } else {
          // Try to get from cache first
          const cacheKey = `item_data_${itemId}`;
          const cachedData = this.cache.get(cacheKey);
          if (cachedData) {
            cachedItems.push(cachedData);
          } else {
            const cooldownTime = this.getItemCooldownTime(itemId);
            rateLimitedItems.push({
              id: itemId,
              error: `Rate limited. Try again in ${Math.ceil(cooldownTime / 1000)} seconds.`,
              cooldownRemaining: cooldownTime
            });
          }
        }
      }

      this.logger.debug('Rate limiting analysis', {
        total: validItemIds.length,
        allowed: allowedItemIds.length,
        rateLimited: rateLimitedItems.length,
        cached: cachedItems.length
      });

      // Get mapping and prices for allowed items
      const [mapping, prices] = await Promise.all([
        this.getItemMapping(),
        this.getLatestPrices()
      ]);

      // Build mapping lookup
      const mappingLookup = new Map(
        mapping.map(item => [item.id, item])
      );

      // Process allowed items (fresh data)
      const freshResults = allowedItemIds.map(itemId => {
        const itemMapping = mappingLookup.get(itemId);
        const priceData = prices.data[itemId];

        if (!itemMapping) {
          return {
            id: itemId,
            error: 'Item not found in mapping'
          };
        }

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

        // Cache the result with enhanced timeout
        const cacheKey = `item_data_${itemId}`;
        this.cache.set(cacheKey, itemData, this.cacheConfig.item_data);

        // Mark item as fetched for rate limiting
        this.markItemFetched(itemId);

        return itemData;
      });

      // Combine all results
      const allResults = [...freshResults, ...cachedItems, ...rateLimitedItems];

      this.logger.debug('Successfully fetched bulk item data', {
        requested: itemIds.length,
        valid: validItemIds.length,
        fresh: freshResults.length,
        cached: cachedItems.length,
        rateLimited: rateLimitedItems.length,
        successful: allResults.filter(r => !r.error).length
      });

      return {
        items: allResults,
        timestamp: Date.now(),
        stats: {
          requested: itemIds.length,
          valid: validItemIds.length,
          fresh: freshResults.length,
          cached: cachedItems.length,
          rateLimited: rateLimitedItems.length,
          successful: allResults.filter(r => !r.error).length,
          failed: allResults.filter(r => r.error).length
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
   * Transform 5-minute prices data
   */
  transform5MinutePrices(data) {
    return {
      data: data.data || {},
      timestamp: data.timestamp || Date.now()
    };
  }

  /**
   * Transform 1-hour prices data
   */
  transform1HourPrices(data) {
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
      if (results.length >= limit) {
        break;
      }

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
   * Get service statistics including per-item rate limiting
   */
  getStatistics() {
    const now = Date.now();
    const itemRateLimitStats = {
      totalItemsTracked: this.itemLastFetchTime.size,
      itemsInCooldown: 0,
      itemsReady: 0,
      averageCooldownTime: 0,
      oldestFetch: null,
      newestFetch: null
    };

    let totalCooldownTime = 0;
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const [itemId, lastFetchTime] of this.itemLastFetchTime.entries()) {
      const cooldownTime = this.getItemCooldownTime(itemId);

      if (cooldownTime > 0) {
        itemRateLimitStats.itemsInCooldown++;
        totalCooldownTime += cooldownTime;
      } else {
        itemRateLimitStats.itemsReady++;
      }

      if (lastFetchTime < oldestTime) {
        oldestTime = lastFetchTime;
        itemRateLimitStats.oldestFetch = new Date(lastFetchTime).toISOString();
      }

      if (lastFetchTime > newestTime) {
        newestTime = lastFetchTime;
        itemRateLimitStats.newestFetch = new Date(lastFetchTime).toISOString();
      }
    }

    if (itemRateLimitStats.itemsInCooldown > 0) {
      itemRateLimitStats.averageCooldownTime = Math.round(totalCooldownTime / itemRateLimitStats.itemsInCooldown);
    }

    return {
      cache: this.cache.getStats(),
      rateLimit: this.rateLimiter.getStats(this.rateLimitConfig.key),
      itemRateLimit: itemRateLimitStats,
      config: {
        baseURL: this.baseURL,
        timeout: this.timeout,
        rateLimitConfig: this.rateLimitConfig,
        itemRateLimitMs: this.ITEM_RATE_LIMIT_MS
      }
    };
  }

  /**
   * Get per-item rate limiting status
   */
  getItemRateLimitStatus(itemIds = []) {
    const now = Date.now();
    const results = [];

    for (const itemId of itemIds) {
      const lastFetchTime = this.itemLastFetchTime.get(itemId);
      const cooldownTime = this.getItemCooldownTime(itemId);
      const canFetch = this.canFetchItem(itemId);

      results.push({
        itemId,
        canFetch,
        lastFetchTime: lastFetchTime ? new Date(lastFetchTime).toISOString() : null,
        cooldownRemaining: cooldownTime,
        cooldownRemainingFormatted: cooldownTime > 0 ? `${Math.ceil(cooldownTime / 1000)}s` : 'Ready',
        nextAvailableTime: lastFetchTime ? new Date(lastFetchTime + this.ITEM_RATE_LIMIT_MS).toISOString() : 'Now'
      });
    }

    return {
      itemStatuses: results,
      rateLimitMs: this.ITEM_RATE_LIMIT_MS,
      timestamp: new Date(now).toISOString()
    };
  }

  /**
   * Clear per-item rate limiting for specific items or all items
   */
  clearItemRateLimit(itemIds = []) {
    if (itemIds.length === 0) {
      // Clear all items
      const clearedCount = this.itemLastFetchTime.size;
      this.itemLastFetchTime.clear();
      this.logger.info('Cleared all per-item rate limits', { clearedCount });
      return { clearedCount, clearedItems: 'all' };
    } else {
      // Clear specific items
      const clearedItems = [];
      for (const itemId of itemIds) {
        if (this.itemLastFetchTime.has(itemId)) {
          this.itemLastFetchTime.delete(itemId);
          clearedItems.push(itemId);
        }
      }
      this.logger.info('Cleared per-item rate limits for specific items', { clearedItems });
      return { clearedCount: clearedItems.length, clearedItems };
    }
  }
}

module.exports = { OSRSWikiService };
