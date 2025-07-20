/**
 * 🔧 Parameter Parser - Context7 Optimized
 *
 * Context7 Pattern: Centralized parameter parsing utilities
 * - Single Responsibility: Parameter parsing and validation
 * - DRY: Eliminates repetitive parsing logic
 * - Strategy Pattern: Different parsing strategies for different parameter types
 * - Type Safety: Consistent parameter type conversion
 */

class ParameterParser {
  /**
   * Context7 Pattern: Parse standard query parameters
   * Common pattern used across multiple endpoints
   * @param {Object} query - Request query parameters
   * @returns {Object} Parsed parameters
   */
  static parseStandardQuery(query) {
    const {
      limit,
      sortBy,
      sortOrder,
      search,
      ...otherParams
    } = query;

    return {
      limit: limit ? this.parseInteger(limit, 50, 1, 1000) : 50,
      sortBy: sortBy || 'timestamp',
      sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc',
      search: search ? search.trim() : undefined,
      ...this.parseRemainingParams(otherParams)
    };
  }

  /**
   * Context7 Pattern: Parse pagination parameters
   * Standardized pagination handling
   */
  static parsePaginationQuery(query) {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      ...filters
    } = query;

    return {
      page: this.parseInteger(page, 1, 1, 1000),
      limit: this.parseInteger(limit, 50, 1, 100),
      sortBy: sortBy || 'timestamp',
      sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc',
      offset: ((this.parseInteger(page, 1, 1, 1000) - 1) * this.parseInteger(limit, 50, 1, 100)),
      filters: this.parseRemainingParams(filters)
    };
  }

  /**
   * Context7 Pattern: Parse time range parameters
   * Common pattern for historical data queries
   */
  static parseTimeRangeQuery(query) {
    const {
      startTime,
      endTime,
      timeRange,
      interval,
      ...otherParams
    } = query;

    const now = Date.now();
    const defaultTimeRange = 24 * 60 * 60 * 1000; // 24 hours

    return {
      startTime: startTime ? this.parseTimestamp(startTime) : 
                 timeRange ? now - this.parseInteger(timeRange, defaultTimeRange) : 
                 now - defaultTimeRange,
      endTime: endTime ? this.parseTimestamp(endTime) : now,
      timeRange: timeRange ? this.parseInteger(timeRange, defaultTimeRange) : defaultTimeRange,
      interval: this.parseInterval(interval),
      ...this.parseRemainingParams(otherParams)
    };
  }

  /**
   * Context7 Pattern: Parse market data specific parameters
   * Domain-specific parameter parsing for market endpoints
   */
  static parseMarketDataQuery(query) {
    const {
      itemId,
      itemIds,
      onlyTradeable,
      includeMembers,
      category,
      minPrice,
      maxPrice,
      minVolume,
      maxVolume,
      ...otherParams
    } = query;

    return {
      itemId: itemId ? this.parseInteger(itemId) : undefined,
      itemIds: itemIds ? this.parseIntegerArray(itemIds) : undefined,
      onlyTradeable: this.parseBoolean(onlyTradeable, true),
      includeMembers: this.parseBoolean(includeMembers, false),
      category: category || undefined,
      priceRange: this.createRange(minPrice, maxPrice),
      volumeRange: this.createRange(minVolume, maxVolume),
      ...this.parseStandardQuery(otherParams)
    };
  }

  /**
   * Context7 Pattern: Parse trading analysis parameters
   * Specialized parsing for trading and analytics endpoints
   */
  static parseTradingAnalysisQuery(query) {
    const {
      strategy,
      riskLevel,
      timeHorizon,
      investmentAmount,
      includePredictions,
      confidenceThreshold,
      ...otherParams
    } = query;

    return {
      strategy: this.parseStrategy(strategy),
      riskLevel: this.parseRiskLevel(riskLevel),
      timeHorizon: this.parseTimeHorizon(timeHorizon),
      investmentAmount: investmentAmount ? this.parseFloat(investmentAmount, 0, 1000000000) : undefined,
      includePredictions: this.parseBoolean(includePredictions, false),
      confidenceThreshold: this.parseFloat(confidenceThreshold, 0.5, 0, 1),
      ...this.parseTimeRangeQuery(otherParams)
    };
  }

  /**
   * Context7 Pattern: Parse alert parameters
   * Alert-specific parameter parsing
   */
  static parseAlertQuery(query) {
    const {
      type,
      status,
      userId,
      priority,
      ...otherParams
    } = query;

    return {
      type: this.parseAlertType(type),
      status: this.parseAlertStatus(status),
      userId: userId || 'default',
      priority: this.parseAlertPriority(priority),
      ...this.parseStandardQuery(otherParams)
    };
  }

  /**
   * Context7 Pattern: Parse export parameters
   * Export-specific parameter parsing
   */
  static parseExportQuery(query) {
    const {
      format,
      compression,
      includeMetadata,
      ...otherParams
    } = query;

    return {
      format: this.parseExportFormat(format),
      compression: this.parseBoolean(compression, false),
      includeMetadata: this.parseBoolean(includeMetadata, true),
      ...this.parseMarketDataQuery(otherParams)
    };
  }

  // Type Conversion Utilities

  static parseInteger(value, defaultValue = 0, min = null, max = null) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    const parsed = parseInt(value);
    if (isNaN(parsed)) {
      return defaultValue;
    }

    if (min !== null && parsed < min) return min;
    if (max !== null && parsed > max) return max;
    
    return parsed;
  }

  static parseFloat(value, defaultValue = 0, min = null, max = null) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      return defaultValue;
    }

    if (min !== null && parsed < min) return min;
    if (max !== null && parsed > max) return max;
    
    return parsed;
  }

  static parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
      return defaultValue;
    }

    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowered = value.toLowerCase();
      return lowered === 'true' || lowered === '1' || lowered === 'yes';
    }
    if (typeof value === 'number') {
      return value !== 0;
    }

    return defaultValue;
  }

  static parseTimestamp(value) {
    if (!value) return null;
    
    const parsed = parseInt(value);
    if (isNaN(parsed)) return null;
    
    // Handle both seconds and milliseconds timestamps
    return parsed > 10000000000 ? parsed : parsed * 1000;
  }

  static parseIntegerArray(value, separator = ',') {
    if (!value) return [];
    
    if (Array.isArray(value)) {
      return value.map(v => this.parseInteger(v)).filter(v => !isNaN(v));
    }
    
    if (typeof value === 'string') {
      return value.split(separator)
        .map(v => this.parseInteger(v.trim()))
        .filter(v => !isNaN(v));
    }
    
    return [];
  }

  static parseStringArray(value, separator = ',') {
    if (!value) return [];
    
    if (Array.isArray(value)) return value;
    
    if (typeof value === 'string') {
      return value.split(separator).map(v => v.trim()).filter(v => v.length > 0);
    }
    
    return [];
  }

  // Domain-Specific Parsers

  static parseInterval(value) {
    const validIntervals = ['minute', 'hour', 'day', 'week', 'month'];
    return validIntervals.includes(value) ? value : 'hour';
  }

  static parseStrategy(value) {
    const validStrategies = ['conservative', 'balanced', 'aggressive', 'scalping', 'swing'];
    return validStrategies.includes(value) ? value : 'balanced';
  }

  static parseRiskLevel(value) {
    const validRiskLevels = ['low', 'medium', 'high'];
    return validRiskLevels.includes(value) ? value : 'medium';
  }

  static parseTimeHorizon(value) {
    const validHorizons = ['short', 'medium', 'long'];
    return validHorizons.includes(value) ? value : 'short';
  }

  static parseAlertType(value) {
    const validTypes = ['price', 'volume', 'margin', 'prediction', 'custom'];
    return validTypes.includes(value) ? value : undefined;
  }

  static parseAlertStatus(value) {
    const validStatuses = ['active', 'paused', 'triggered', 'expired'];
    return validStatuses.includes(value) ? value : 'active';
  }

  static parseAlertPriority(value) {
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    return validPriorities.includes(value) ? value : 'medium';
  }

  static parseExportFormat(value) {
    const validFormats = ['json', 'csv', 'xlsx', 'xml'];
    return validFormats.includes(value) ? value : 'json';
  }

  // Utility Methods

  static createRange(min, max) {
    const parsedMin = min ? this.parseFloat(min) : null;
    const parsedMax = max ? this.parseFloat(max) : null;
    
    if (parsedMin === null && parsedMax === null) return undefined;
    
    return {
      min: parsedMin,
      max: parsedMax
    };
  }

  static parseRemainingParams(params) {
    const parsed = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Try to intelligently parse the value
      if (value === 'true' || value === 'false') {
        parsed[key] = this.parseBoolean(value);
      } else if (!isNaN(value) && value !== '') {
        parsed[key] = this.parseFloat(value);
      } else {
        parsed[key] = value;
      }
    }
    
    return parsed;
  }

  /**
   * Context7 Pattern: Validate parsed parameters
   * @param {Object} params - Parsed parameters
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  static validateParsedParams(params, schema) {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = params[field];
      
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${field} is required`);
        continue;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be no more than ${rules.max}`);
        }
        
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = { ParameterParser };