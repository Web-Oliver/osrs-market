/**
 * 🏗️ Base Service - Context7 Optimized Architecture
 *
 * Context7 Pattern: Base class implementing common service patterns
 * - Single Responsibility: Common service functionality
 * - Open/Closed: Open for extension, closed for modification
 * - DRY: Eliminates repetitive patterns across all services
 * - Dependency Inversion: Abstract dependencies through options
 * - Standardized logging, caching, and MongoDB connections
 */

const { Logger } = require('../utils/Logger');
const { CacheManager } = require('../utils/CacheManager');
class BaseService {
  constructor(serviceName, options = {}) {
    if (!serviceName) {
      throw new Error('Service name is required for BaseService');
    }

    this.serviceName = serviceName;
    this.logger = new Logger(serviceName);
    // Error handling moved to centralized manager
    this.startTime = Date.now();
    this.options = {
      // Default options
      enableCache: true,
      cachePrefix: serviceName.toLowerCase().replace(/service$/, ''),
      cacheTTL: 600, // 10 minutes default
      enableMongoDB: true,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };

    // Initialize cache if enabled
    if (this.options.enableCache) {
      this.cache = new CacheManager(
        this.options.cachePrefix,
        this.options.cacheTTL
      );
    }

    // Initialize MongoDB if enabled
    if (this.options.enableMongoDB) {
      this.initializeMongoDB();
    }

    this.logger.info(`${serviceName} initialized with options:`, {
      enableCache: this.options.enableCache,
      enableMongoDB: this.options.enableMongoDB,
      cacheTTL: this.options.cacheTTL
    });
  }

  /**
   * Context7 Pattern: Initialize MongoDB with centralized error handling
   * SOLID Principle: Single responsibility for DB initialization
   */
  async initializeMongoDB() {
    return this.errorManager.handleAsync(async() => {
      // Check if MongoDataPersistence is available
      const MongoDataPersistence = require('./mongoDataPersistence');

      const config = {
        connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
        databaseName: process.env.MONGODB_DATABASE || 'osrs_market_data'
      };

      this.mongoService = new MongoDataPersistence(config);

      // Only connect if not already connected globally
      if (!this.mongoService.isConnected()) {
        await this.mongoService.connect();
        this.logger.info('MongoDB connection established');
      }

      return this.mongoService;
    }, 'initializeMongoDB', {
      logSuccess: true,
      serviceName: this.serviceName
    }).catch(error => {
      if (this.options.requireMongoDB) {
        throw error;
      }
      // Non-fatal if MongoDB is optional
      return null;
    });
  }

  /**
   * Context7 Pattern: Async operation with centralized retry logic - Eliminates duplicate retry patterns
   * SOLID Principle: Open/closed - extensible retry pattern
   * @param {Function} operation - Async operation to retry
   * @param {string} operationName - Name for logging
   * @param {number} attempts - Number of retry attempts
   * @returns {Promise<*>} Operation result
   */
  async withRetry(operation, operationName = 'operation', attempts = this.options.retryAttempts) {
    return this.errorManager.handleWithRetry(operation, operationName, {
      maxRetries: attempts - 1,
      delayMs: this.options.retryDelay,
      exponentialBackoff: true,
      metadata: { serviceName: this.serviceName }
    });
  }

  /**
   * Context7 Pattern: Cache wrapper with centralized error handling
   * DRY Principle: Reusable caching pattern
   * @param {string} key - Cache key
   * @param {Function} operation - Operation to cache
   * @param {number} ttl - Time to live override
   * @returns {Promise<*>} Cached or fresh result
   */
  async withCache(key, operation, ttl = null) {
    if (!this.cache) {
      return this.errorManager.handleAsync(operation, 'cache_disabled_operation', {
        cacheKey: key
      });
    }

    return this.errorManager.handleAsync(async() => {
      // Try to get from cache first
      const cached = await this.cache.get(key);
      if (cached !== null) {
        this.logger.debug(`Cache hit for key: ${key}`);
        return cached;
      }

      // Execute operation and cache result
      const result = await operation();
      await this.cache.set(key, result, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
      return result;
    }, 'withCache', {
      cacheKey: key,
      ttl: ttl || this.options.cacheTTL
    });
  }

  /**
   * Context7 Pattern: Validate required parameters with centralized error handling
   * SOLID Principle: Single responsibility for validation
   * @param {Object} params - Parameters to validate
   * @param {Array<string>} required - Required parameter names
   * @throws {Error} If required parameters are missing
   */
  validateRequiredParams(params, required) {
    return this.errorManager.validateInput(params, (input) => {
      const missing = required.filter(param =>
        input[param] === undefined || input[param] === null || input[param] === ''
      );

      return {
        isValid: missing.length === 0,
        errors: missing.length > 0 ? [`Missing required parameters: ${missing.join(', ')}`] : []
      };
    }, 'validateRequiredParams');
  }

  /**
   * Context7 Pattern: Centralized error handling - DEPRECATED, use errorManager.handleAsync instead
   * @param {Error} error - Error to handle
   * @param {string} context - Context where error occurred
   * @param {Object} additionalInfo - Additional error context
   * @deprecated Use this.errorManager.handleAsync() for new code
   */
  handleError(error, context = 'unknown', additionalInfo = {}) {
    // Delegate to centralized error manager
    this.errorManager.handleError(error, context, {
      service: this.serviceName,
      ...additionalInfo
    });
  }

  /**
   * Execute async operation with centralized error handling - Eliminates duplicate try/catch
   * @param {Function} operation - Async operation to execute
   * @param {string} context - Context for logging
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<any>} Result or throws handled error
   */
  async execute(operation, context, metadata = {}) {
    return this.errorManager.handleAsync(operation, context, {
      service: this.serviceName,
      ...metadata
    });
  }

  /**
   * Execute batch operations with partial failure support
   * @param {Array} items - Items to process
   * @param {Function} operation - Operation to perform on each item
   * @param {string} context - Context for logging
   * @param {Object} options - Batch options
   * @returns {Object} Results with successes and failures
   */
  async executeBatch(items, operation, context, options = {}) {
    return this.errorManager.handleBatch(items, operation, context, {
      ...options,
      metadata: { service: this.serviceName, ...options.metadata }
    });
  }

  /**
   * Utility: Delay function for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Context7 Pattern: Graceful service shutdown with centralized error handling
   * Override in child classes for custom cleanup
   */
  async shutdown() {
    return this.errorManager.handleAsync(async() => {
      if (this.cache) {
        await this.cache.disconnect();
      }

      if (this.mongoService) {
        await this.mongoService.disconnect();
      }

      this.logger.info(`${this.serviceName} shutdown completed`);
      return true;
    }, 'shutdown', {
      logSuccess: true,
      service: this.serviceName
    }).catch(error => {
      // Log but don't re-throw shutdown errors
      // Error handling moved to centralized manager - context: operation
      return false;
    });
  }

  /**
   * Context7 Pattern: Health check with centralized error handling
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return this.errorManager.handleAsync(async() => {
      const health = {
        service: this.serviceName,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        errorStats: this.errorManager.getErrorStatistics(),
        checks: {}
      };

      // Check cache
      if (this.cache) {
        health.checks.cache = await this.cache.healthCheck() ? 'healthy' : 'unhealthy';
      }

      // Check MongoDB
      if (this.mongoService) {
        health.checks.mongodb = this.mongoService.isConnected() ? 'healthy' : 'unhealthy';
      }

      // Determine overall status
      const unhealthyChecks = Object.values(health.checks).filter(status => status === 'unhealthy');
      if (unhealthyChecks.length > 0) {
        health.status = 'degraded';
      }

      // Check if circuit breakers are active
      if (health.errorStats.activeCircuitBreakers > 0) {
        health.status = 'degraded';
        health.circuitBreakersActive = health.errorStats.activeCircuitBreakers;
      }

      return health;
    }, 'healthCheck').catch(error => {
      return {
        service: this.serviceName,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        uptime: Date.now() - this.startTime
      };
    });
  }
}

module.exports = { BaseService };
