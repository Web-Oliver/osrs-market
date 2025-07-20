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
   * Context7 Pattern: Initialize MongoDB with error handling
   * SOLID Principle: Single responsibility for DB initialization
   */
  async initializeMongoDB() {
    try {
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
    } catch (error) {
      this.logger.error('Failed to initialize MongoDB', error);
      if (this.options.requireMongoDB) {
        throw error;
      }
    }
  }

  /**
   * Context7 Pattern: Async operation with retry logic
   * SOLID Principle: Open/closed - extensible retry pattern
   * @param {Function} operation - Async operation to retry
   * @param {string} operationName - Name for logging
   * @param {number} attempts - Number of retry attempts
   * @returns {Promise<*>} Operation result
   */
  async withRetry(operation, operationName = 'operation', attempts = this.options.retryAttempts) {
    let lastError;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.info(`${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        this.logger.warn(`${operationName} failed on attempt ${attempt}/${attempts}`, {
          error: error.message,
          attempt
        });

        if (attempt < attempts) {
          await this.delay(this.options.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    this.logger.error(`${operationName} failed after ${attempts} attempts`, lastError);
    throw lastError;
  }

  /**
   * Context7 Pattern: Cache wrapper for operations
   * DRY Principle: Reusable caching pattern
   * @param {string} key - Cache key
   * @param {Function} operation - Operation to cache
   * @param {number} ttl - Time to live override
   * @returns {Promise<*>} Cached or fresh result
   */
  async withCache(key, operation, ttl = null) {
    if (!this.cache) {
      return await operation();
    }

    // Try to get from cache first
    const cached = await this.cache.get(key);
    if (cached !== null) {
      this.logger.debug(`Cache hit for key: ${key}`);
      return cached;
    }

    // Execute operation and cache result
    try {
      const result = await operation();
      await this.cache.set(key, result, ttl);
      this.logger.debug(`Cache set for key: ${key}`);
      return result;
    } catch (error) {
      this.logger.warn(`Operation failed, not caching result for key: ${key}`, error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Validate required parameters
   * SOLID Principle: Single responsibility for validation
   * @param {Object} params - Parameters to validate
   * @param {Array<string>} required - Required parameter names
   * @throws {Error} If required parameters are missing
   */
  validateRequiredParams(params, required) {
    const missing = required.filter(param => 
      params[param] === undefined || params[param] === null || params[param] === ''
    );

    if (missing.length > 0) {
      const error = new Error(`Missing required parameters: ${missing.join(', ')}`);
      error.name = 'ValidationError';
      error.missingParams = missing;
      throw error;
    }
  }

  /**
   * Context7 Pattern: Standardized error handling
   * @param {Error} error - Error to handle
   * @param {string} context - Context where error occurred
   * @param {Object} additionalInfo - Additional error context
   */
  handleError(error, context = 'unknown', additionalInfo = {}) {
    const errorInfo = {
      service: this.serviceName,
      context,
      ...additionalInfo
    };

    this.logger.error(`Error in ${this.serviceName}`, error, errorInfo);

    // Re-throw with additional context
    const enhancedError = new Error(error.message);
    enhancedError.originalError = error;
    enhancedError.service = this.serviceName;
    enhancedError.context = context;
    enhancedError.stack = error.stack;
    
    throw enhancedError;
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
   * Context7 Pattern: Graceful service shutdown
   * Override in child classes for custom cleanup
   */
  async shutdown() {
    try {
      if (this.cache) {
        await this.cache.disconnect();
      }
      
      if (this.mongoService) {
        await this.mongoService.disconnect();
      }
      
      this.logger.info(`${this.serviceName} shutdown completed`);
    } catch (error) {
      this.logger.error(`Error during ${this.serviceName} shutdown`, error);
    }
  }

  /**
   * Context7 Pattern: Health check for service
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    const health = {
      service: this.serviceName,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
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

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

module.exports = { BaseService };