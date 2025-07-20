/**
 * 🔧 Application Constants - Context7 Optimized
 *
 * Context7 Pattern: Centralized Configuration
 * - SOLID: Single Responsibility Principle (SRP) - Handles ONLY application constants
 * - DRY: Eliminates scattered magic numbers and repeated configuration values
 * - Single source of truth for all application constants
 * - Environment-aware configuration
 * - Type-safe constant definitions
 */

class AppConstants {
  // =============================================================================
  // OSRS MARKET DOMAIN CONSTANTS
  // =============================================================================
  
  static OSRS = {
    TOTAL_ITEMS: 3000,
    MAX_ITEM_ID: 50000,
    MIN_ITEM_ID: 1,
    
    // GE Tax Configuration
    TAX_RATE: 0.01, // 1% GE tax
    TAX_FREE_THRESHOLD: 100, // Items under 100 gp are tax-free
    
    // Price Limits
    MAX_PRICE: 2147483647, // Max int32
    MIN_PRICE: 1,
    
    // Volume Limits
    MAX_VOLUME: 1000000,
    MIN_VOLUME: 0,
    
    // High-Value Item Threshold
    HIGH_VALUE_THRESHOLD: 100000, // 100k+ gp items
    HIGH_ALCH_THRESHOLD: 10000   // 10k+ high alch value
  };

  // =============================================================================
  // SERVER CONFIGURATION
  // =============================================================================
  
  static SERVER = {
    DEFAULT_PORT: 3000,
    DEVELOPMENT_PORT: 3000,
    PRODUCTION_PORT: process.env.PORT || 3000,
    
    // Timeout Configuration
    REQUEST_TIMEOUT: 30000,      // 30 seconds
    RESPONSE_TIMEOUT: 45000,     // 45 seconds
    KEEP_ALIVE_TIMEOUT: 5000,    // 5 seconds
    
    // Body Parser Limits
    JSON_LIMIT: '10mb',
    URL_ENCODED_LIMIT: '10mb',
    
    // CORS Configuration
    CORS_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    
    // Security Headers
    HSTS_MAX_AGE: 31536000, // 1 year
    CONTENT_SECURITY_POLICY: "default-src 'self'"
  };

  // =============================================================================
  // DATABASE CONFIGURATION
  // =============================================================================
  
  static DATABASE = {
    // MongoDB Connection Pool
    MAX_POOL_SIZE: 10,           // Maximum connections in pool
    MIN_POOL_SIZE: 2,            // Minimum connections maintained
    MAX_CONNECTING: 2,           // Max concurrent connection attempts
    MAX_IDLE_TIME_MS: 60000,     // 60 seconds idle timeout
    
    // Connection Timeouts
    CONNECT_TIMEOUT_MS: 30000,   // 30 seconds connection timeout
    SOCKET_TIMEOUT_MS: 120000,   // 120 seconds socket timeout
    SERVER_SELECTION_TIMEOUT_MS: 30000, // 30 seconds server selection
    
    // Query Defaults
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000,
    MIN_LIMIT: 1,
    
    // Cleanup Configuration
    DEFAULT_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    CLEANUP_BATCH_SIZE: 1000
  };

  // =============================================================================
  // API RATE LIMITING
  // =============================================================================
  
  static RATE_LIMITING = {
    // Standard Rate Limits
    WINDOW_MS: 15 * 60 * 1000,   // 15 minutes
    MAX_REQUESTS: 100,           // Max requests per window
    
    // API-Specific Limits
    MARKET_DATA_REQUESTS: 200,   // Higher limit for market data
    EXPORT_REQUESTS: 10,         // Lower limit for exports
    SEARCH_REQUESTS: 50,         // Moderate limit for searches
    
    // Burst Protection
    BURST_WINDOW_MS: 60 * 1000,  // 1 minute
    BURST_MAX_REQUESTS: 20,      // Max burst requests
    
    // Skip Conditions
    SKIP_SUCCESSFUL_REQUESTS: false,
    SKIP_FAILED_REQUESTS: false
  };

  // =============================================================================
  // CACHING CONFIGURATION
  // =============================================================================
  
  static CACHE = {
    // Default TTL Values (in milliseconds)
    DEFAULT_TTL: 5 * 60 * 1000,        // 5 minutes
    MARKET_DATA_TTL: 2 * 60 * 1000,    // 2 minutes (fast-changing data)
    ITEM_INFO_TTL: 60 * 60 * 1000,     // 1 hour (slow-changing data)
    ANALYTICS_TTL: 10 * 60 * 1000,     // 10 minutes
    
    // Cache Size Limits
    MAX_CACHE_SIZE: 1000,
    MAX_MEMORY_USAGE: 100 * 1024 * 1024, // 100MB
    
    // Cache Keys
    PREFIXES: {
      MARKET_DATA: 'md:',
      ITEM_INFO: 'item:',
      ANALYTICS: 'analytics:',
      USER_SESSION: 'session:'
    }
  };

  // =============================================================================
  // MONITORING & METRICS
  // =============================================================================
  
  static MONITORING = {
    // Health Check Intervals
    HEALTH_CHECK_INTERVAL: 30000,     // 30 seconds
    METRICS_COLLECTION_INTERVAL: 60000, // 1 minute
    
    // Performance Thresholds
    RESPONSE_TIME_THRESHOLD: 1000,    // 1 second warning threshold
    ERROR_RATE_THRESHOLD: 0.05,       // 5% error rate threshold
    MEMORY_USAGE_THRESHOLD: 0.8,      // 80% memory usage threshold
    
    // Data Retention
    METRICS_RETENTION_DAYS: 30,
    LOG_RETENTION_DAYS: 7,
    
    // Alert Thresholds
    CRITICAL_ERROR_THRESHOLD: 0.1,    // 10% error rate = critical
    HIGH_LATENCY_THRESHOLD: 5000,     // 5 seconds = high latency
    LOW_SUCCESS_RATE_THRESHOLD: 0.9   // Below 90% success rate
  };

  // =============================================================================
  // EXTERNAL API CONFIGURATION
  // =============================================================================
  
  static EXTERNAL_API = {
    // OSRS Wiki API
    OSRS_WIKI: {
      BASE_URL: 'https://prices.runescape.wiki/api/v1',
      TIMEOUT: 10000,               // 10 seconds
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 1000,            // 1 second
      RATE_LIMIT: 5,                // 5 requests per second
      BATCH_SIZE: 300               // Items per batch request
    },
    
    // AI Microservice
    AI_SERVICE: {
      BASE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
      TIMEOUT: 30000,               // 30 seconds
      RETRY_ATTEMPTS: 2,
      RETRY_DELAY: 2000,            // 2 seconds
      HEALTH_CHECK_INTERVAL: 60000  // 1 minute
    }
  };

  // =============================================================================
  // DATA PROCESSING
  // =============================================================================
  
  static DATA_PROCESSING = {
    // Batch Processing
    BATCH_SIZE: 1000,
    MAX_BATCH_SIZE: 5000,
    MIN_BATCH_SIZE: 100,
    
    // Data Quality
    MIN_DATA_QUALITY_SCORE: 0.7,     // 70% minimum quality
    ANOMALY_DETECTION_THRESHOLD: 3,   // 3 standard deviations
    
    // Validation Thresholds
    MAX_PRICE_CHANGE_PERCENT: 200,   // 200% max price change
    MIN_VOLUME_FOR_ANALYSIS: 10,     // Minimum volume for analysis
    
    // Performance
    PROCESSING_TIMEOUT: 60000,       // 1 minute
    MAX_MEMORY_PER_BATCH: 50 * 1024 * 1024 // 50MB per batch
  };

  // =============================================================================
  // EXPORT CONFIGURATION
  // =============================================================================
  
  static EXPORT = {
    // File Size Limits
    MAX_EXPORT_SIZE: 100 * 1024 * 1024, // 100MB
    MAX_RECORDS_PER_EXPORT: 1000000,    // 1 million records
    
    // Format Configuration
    CSV_DELIMITER: ',',
    CSV_QUOTE: '"',
    CSV_ESCAPE: '"',
    CSV_LINE_BREAK: '\n',
    
    // Compression
    ENABLE_COMPRESSION: true,
    COMPRESSION_LEVEL: 6,             // zlib compression level
    
    // Temporary Files
    TEMP_FILE_TTL: 60 * 60 * 1000,   // 1 hour
    CLEANUP_INTERVAL: 10 * 60 * 1000  // 10 minutes
  };

  // =============================================================================
  // SECURITY CONFIGURATION
  // =============================================================================
  
  static SECURITY = {
    // Input Validation
    MAX_INPUT_LENGTH: 10000,
    MAX_ARRAY_LENGTH: 1000,
    
    // Session Configuration
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
    
    // Encryption
    SALT_ROUNDS: 12,
    
    // Headers
    SECURITY_HEADERS: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  };

  // =============================================================================
  // ERROR HANDLING
  // =============================================================================
  
  static ERRORS = {
    // HTTP Status Codes
    STATUS_CODES: {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      METHOD_NOT_ALLOWED: 405,
      CONFLICT: 409,
      UNPROCESSABLE_ENTITY: 422,
      TOO_MANY_REQUESTS: 429,
      INTERNAL_SERVER_ERROR: 500,
      BAD_GATEWAY: 502,
      SERVICE_UNAVAILABLE: 503,
      GATEWAY_TIMEOUT: 504
    },
    
    // Error Categories
    CATEGORIES: {
      VALIDATION: 'validation',
      AUTHENTICATION: 'authentication',
      AUTHORIZATION: 'authorization',
      NOT_FOUND: 'not_found',
      RATE_LIMIT: 'rate_limit',
      SERVER_ERROR: 'server_error',
      EXTERNAL_API: 'external_api',
      DATABASE: 'database'
    },
    
    // Retry Configuration
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
    EXPONENTIAL_BACKOFF: true
  };

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get environment-specific configuration
   */
  static getEnvConfig(env = process.env.NODE_ENV) {
    const configs = {
      development: {
        ...this.SERVER,
        PORT: this.SERVER.DEVELOPMENT_PORT,
        LOG_LEVEL: 'debug',
        ENABLE_PROFILING: true
      },
      
      production: {
        ...this.SERVER,
        PORT: this.SERVER.PRODUCTION_PORT,
        LOG_LEVEL: 'info',
        ENABLE_PROFILING: false
      },
      
      test: {
        ...this.SERVER,
        PORT: 0, // Random port for testing
        LOG_LEVEL: 'error',
        ENABLE_PROFILING: false
      }
    };
    
    return configs[env] || configs.development;
  }

  /**
   * Get timeout configuration for specific operation
   */
  static getTimeout(operation) {
    const timeouts = {
      request: this.SERVER.REQUEST_TIMEOUT,
      response: this.SERVER.RESPONSE_TIMEOUT,
      database: this.DATABASE.CONNECT_TIMEOUT_MS,
      external_api: this.EXTERNAL_API.OSRS_WIKI.TIMEOUT,
      processing: this.DATA_PROCESSING.PROCESSING_TIMEOUT,
      export: this.EXPORT.TEMP_FILE_TTL
    };
    
    return timeouts[operation] || this.SERVER.REQUEST_TIMEOUT;
  }

  /**
   * Get rate limit configuration for specific endpoint
   */
  static getRateLimit(endpoint) {
    const limits = {
      'market-data': this.RATE_LIMITING.MARKET_DATA_REQUESTS,
      'export': this.RATE_LIMITING.EXPORT_REQUESTS,
      'search': this.RATE_LIMITING.SEARCH_REQUESTS,
      'default': this.RATE_LIMITING.MAX_REQUESTS
    };
    
    return {
      windowMs: this.RATE_LIMITING.WINDOW_MS,
      max: limits[endpoint] || limits.default
    };
  }

  /**
   * Validate constant ranges
   */
  static validateConstants() {
    const validations = [
      {
        check: this.DATABASE.MAX_POOL_SIZE >= this.DATABASE.MIN_POOL_SIZE,
        message: 'MAX_POOL_SIZE must be >= MIN_POOL_SIZE'
      },
      {
        check: this.RATE_LIMITING.WINDOW_MS > 0,
        message: 'RATE_LIMITING.WINDOW_MS must be positive'
      },
      {
        check: this.OSRS.MAX_ITEM_ID > this.OSRS.MIN_ITEM_ID,
        message: 'MAX_ITEM_ID must be > MIN_ITEM_ID'
      }
    ];
    
    const errors = validations.filter(v => !v.check).map(v => v.message);
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }
}

// Validate constants on module load
AppConstants.validateConstants();

module.exports = { AppConstants };