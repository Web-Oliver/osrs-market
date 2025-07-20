/**
 * 🔄 Data Transformer - Context7 Optimized
 *
 * Context7 Pattern: Data Transformation and Normalization System
 * - Consistent data format transformation
 * - Data validation and cleansing
 * - Type conversion and normalization
 * - Data quality assessment
 */

const { AppConstants } = require('../config/AppConstants');

class DataTransformer {
  constructor() {
    this.transformationCache = new Map();
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Context7 Pattern: Initialize validation rules
   */
  initializeValidationRules() {
    return {
      marketData: {
        required: ['itemId', 'itemName', 'priceData'],
        types: {
          itemId: 'number',
          itemName: 'string',
          priceData: 'object'
        },
        ranges: {
          itemId: { min: AppConstants.OSRS.MIN_ITEM_ID, max: AppConstants.OSRS.MAX_ITEM_ID },
          volume: { min: AppConstants.OSRS.MIN_VOLUME, max: AppConstants.OSRS.MAX_VOLUME }
        }
      },
      monitoringData: {
        required: ['timestamp', 'apiRequests', 'successRate'],
        types: {
          timestamp: 'number',
          apiRequests: 'number',
          successRate: 'number'
        },
        ranges: {
          successRate: { min: 0, max: 100 },
          apiRequests: { min: 0, max: 1000 }
        }
      }
    };
  }

  /**
   * Context7 Pattern: Transform market data
   */
  transformMarketData(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map(item => {
      const transformed = {
        itemId: this.normalizeItemId(item.itemId),
        itemName: this.normalizeItemName(item.itemName),
        priceData: this.transformPriceData(item.priceData),
        timestamp: this.normalizeTimestamp(item.timestamp),
        metadata: this.extractMetadata(item)
      };

      // Add calculated fields
      transformed.profitMargin = this.calculateProfitMargin(transformed);
      transformed.priceSpread = this.calculatePriceSpread(transformed);
      transformed.dataQuality = this.calculateDataQuality(transformed);

      return transformed;
    });
  }

  /**
   * Context7 Pattern: Transform monitoring data
   */
  transformMonitoringData(data) {
    if (!Array.isArray(data)) {
      data = [data];
    }

    return data.map(item => {
      const transformed = {
        timestamp: this.normalizeTimestamp(item.timestamp),
        apiRequests: this.normalizeNumber(item.apiRequests, 0),
        successRate: this.normalizePercentage(item.successRate),
        itemsProcessed: this.normalizeNumber(item.itemsProcessed, 0),
        profit: this.normalizeNumber(item.profit, 0),
        memoryUsage: this.normalizeNumber(item.memoryUsage, 0),
        responseTime: this.normalizeNumber(item.responseTime, 0),
        rateLimitStatus: this.normalizeRateLimitStatus(item.rateLimitStatus),
        itemSelectionEfficiency: this.normalizePercentage(item.itemSelectionEfficiency),
        dataQuality: this.normalizePercentage(item.dataQuality)
      };

      // Add calculated fields
      transformed.requestsPerSecond = this.calculateRequestsPerSecond(transformed);
      transformed.efficiencyScore = this.calculateEfficiencyScore(transformed);
      transformed.healthStatus = this.calculateHealthStatus(transformed);

      return transformed;
    });
  }

  /**
   * Context7 Pattern: Transform price data
   */
  transformPriceData(priceData) {
    if (!priceData || typeof priceData !== 'object') {
      return {
        high: null,
        low: null,
        highTime: null,
        lowTime: null,
        spread: null,
        midPrice: null
      };
    }

    const transformed = {
      high: this.normalizePrice(priceData.high),
      low: this.normalizePrice(priceData.low),
      highTime: this.normalizeTimestamp(priceData.highTime),
      lowTime: this.normalizeTimestamp(priceData.lowTime)
    };

    // Calculate derived values
    if (transformed.high && transformed.low) {
      transformed.spread = transformed.high - transformed.low;
      transformed.midPrice = (transformed.high + transformed.low) / 2;
      transformed.spreadPercent = (transformed.spread / transformed.midPrice) * 100;
    }

    return transformed;
  }

  /**
   * Context7 Pattern: Normalize item ID
   */
  normalizeItemId(itemId) {
    if (typeof itemId === 'string') {
      const parsed = parseInt(itemId, 10);
      return isNaN(parsed) ? null : parsed;
    }

    if (typeof itemId === 'number') {
      return itemId > 0 ? itemId : null;
    }

    return null;
  }

  /**
   * Context7 Pattern: Normalize item name
   */
  normalizeItemName(itemName) {
    if (typeof itemName !== 'string') {
      return null;
    }

    return itemName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s-()]/g, '')
      .substring(0, 100);
  }

  /**
   * Context7 Pattern: Normalize timestamp
   */
  normalizeTimestamp(timestamp) {
    if (!timestamp) {
      return Date.now();
    }

    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp).getTime();
      return isNaN(parsed) ? Date.now() : parsed;
    }

    if (typeof timestamp === 'number') {
      // Handle both seconds and milliseconds
      const value = timestamp < 1e12 ? timestamp * 1000 : timestamp;
      return isNaN(value) ? Date.now() : value;
    }

    return Date.now();
  }

  /**
   * Context7 Pattern: Normalize price
   */
  normalizePrice(price) {
    if (price === null || price === undefined) {
      return null;
    }

    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      return isNaN(parsed) ? null : Math.max(0, parsed);
    }

    if (typeof price === 'number') {
      return price >= 0 ? price : null;
    }

    return null;
  }

  /**
   * Context7 Pattern: Normalize number
   */
  normalizeNumber(value, defaultValue = 0) {
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    }

    return defaultValue;
  }

  /**
   * Context7 Pattern: Normalize percentage
   */
  normalizePercentage(value) {
    const normalized = this.normalizeNumber(value, 0);
    return Math.max(0, Math.min(100, normalized));
  }

  /**
   * Context7 Pattern: Normalize rate limit status
   */
  normalizeRateLimitStatus(status) {
    const validStatuses = ['HEALTHY', 'THROTTLED', 'COOLDOWN', 'OVERLOADED'];

    if (typeof status === 'string' && validStatuses.includes(status.toUpperCase())) {
      return status.toUpperCase();
    }

    return 'UNKNOWN';
  }

  /**
   * Context7 Pattern: Calculate profit margin
   */
  calculateProfitMargin(item) {
    if (!item.priceData || !item.priceData.high || !item.priceData.low) {
      return 0;
    }

    const buy = item.priceData.low;
    const sell = item.priceData.high;
    const margin = sell - buy;

    return buy > 0 ? (margin / buy) * 100 : 0;
  }

  /**
   * Context7 Pattern: Calculate price spread
   */
  calculatePriceSpread(item) {
    if (!item.priceData || !item.priceData.high || !item.priceData.low) {
      return 0;
    }

    return item.priceData.high - item.priceData.low;
  }

  /**
   * Context7 Pattern: Calculate requests per second
   */
  calculateRequestsPerSecond(item) {
    if (!item.apiRequests || !item.responseTime) {
      return 0;
    }

    const responseTimeSeconds = item.responseTime / 1000;
    return responseTimeSeconds > 0 ? item.apiRequests / responseTimeSeconds : 0;
  }

  /**
   * Context7 Pattern: Calculate efficiency score
   */
  calculateEfficiencyScore(item) {
    const scores = [];

    // Success rate score
    if (item.successRate) {
      scores.push(item.successRate);
    }

    // Item selection efficiency score
    if (item.itemSelectionEfficiency) {
      scores.push(item.itemSelectionEfficiency);
    }

    // Data quality score
    if (item.dataQuality) {
      scores.push(item.dataQuality);
    }

    // Response time score (inverted - lower is better)
    if (item.responseTime) {
      const responseTimeScore = Math.max(0, 100 - (item.responseTime / 10));
      scores.push(responseTimeScore);
    }

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  /**
   * Context7 Pattern: Calculate health status
   */
  calculateHealthStatus(item) {
    if (!item.successRate || !item.dataQuality) {
      return 'UNKNOWN';
    }

    const averageHealth = (item.successRate + item.dataQuality) / 2;

    if (averageHealth >= 95) {
      return 'EXCELLENT';
    }
    if (averageHealth >= 85) {
      return 'GOOD';
    }
    if (averageHealth >= 70) {
      return 'FAIR';
    }
    if (averageHealth >= 50) {
      return 'POOR';
    }
    return 'CRITICAL';
  }

  /**
   * Context7 Pattern: Calculate data quality
   */
  calculateDataQuality(item) {
    let score = 0;
    let factors = 0;

    // Required fields presence
    if (item.itemId) {
      score += 25; factors++;
    }
    if (item.itemName) {
      score += 20; factors++;
    }
    if (item.priceData && item.priceData.high) {
      score += 25; factors++;
    }
    if (item.priceData && item.priceData.low) {
      score += 25; factors++;
    }
    if (item.timestamp) {
      score += 5; factors++;
    }

    return factors > 0 ? score : 0;
  }

  /**
   * Context7 Pattern: Calculate completeness
   */
  calculateCompleteness(item) {
    const requiredFields = ['itemId', 'itemName', 'priceData'];
    const optionalFields = ['timestamp', 'volume', 'members', 'tradeable'];

    let required = 0;
    let optional = 0;

    requiredFields.forEach(field => {
      if (this.hasValidValue(item, field)) {
        required++;
      }
    });

    optionalFields.forEach(field => {
      if (this.hasValidValue(item, field)) {
        optional++;
      }
    });

    const requiredScore = (required / requiredFields.length) * 80;
    const optionalScore = (optional / optionalFields.length) * 20;

    return requiredScore + optionalScore;
  }

  /**
   * Context7 Pattern: Check if field has valid value
   */
  hasValidValue(item, field) {
    const value = this.getNestedValue(item, field);
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Context7 Pattern: Get nested value
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Context7 Pattern: Extract metadata
   */
  extractMetadata(item) {
    const metadata = {};

    // Extract common metadata fields
    const metadataFields = [
      'source', 'version', 'collectionTime', 'accuracy',
      'confidence', 'provider', 'lastUpdated'
    ];

    metadataFields.forEach(field => {
      if (item[field] !== undefined) {
        metadata[field] = item[field];
      }
    });

    return metadata;
  }

  /**
   * Context7 Pattern: Validate data structure
   */
  validateData(data, type = 'marketData') {
    const rules = this.validationRules[type];
    if (!rules) {
      return { isValid: false, errors: ['Unknown data type'] };
    }

    const errors = [];

    // Check required fields
    rules.required.forEach(field => {
      if (!this.hasValidValue(data, field)) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Check data types
    Object.entries(rules.types).forEach(([field, expectedType]) => {
      const value = this.getNestedValue(data, field);
      if (value !== null && value !== undefined) {
        const actualType = typeof value;
        if (actualType !== expectedType) {
          errors.push(`Invalid type for ${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    });

    // Check ranges
    Object.entries(rules.ranges || {}).forEach(([field, range]) => {
      const value = this.getNestedValue(data, field);
      if (typeof value === 'number') {
        if (value < range.min || value > range.max) {
          errors.push(`Value for ${field} out of range: ${value} (expected ${range.min}-${range.max})`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Transform batch data
   */
  transformBatch(data, type = 'marketData') {
    if (!Array.isArray(data)) {
      return [];
    }

    const results = [];
    const errors = [];

    data.forEach((item, index) => {
      try {
        const validation = this.validateData(item, type);
        if (!validation.isValid) {
          errors.push({ index, errors: validation.errors });
          return;
        }

        const transformed = type === 'marketData' ?
          this.transformMarketData(item)[0] :
          this.transformMonitoringData(item)[0];

        results.push(transformed);
      } catch (error) {
        errors.push({ index, errors: [error.message] });
      }
    });

    return {
      results,
      errors,
      processed: data.length,
      successful: results.length,
      failed: errors.length
    };
  }

  /**
   * Context7 Pattern: Clear transformation cache
   */
  clearCache() {
    this.transformationCache.clear();
  }

  /**
   * Context7 Pattern: Get transformation statistics
   */
  getStatistics() {
    return {
      cacheSize: this.transformationCache.size,
      validationRules: Object.keys(this.validationRules),
      lastCleared: this.lastCleared || null
    };
  }
}

module.exports = { DataTransformer };
