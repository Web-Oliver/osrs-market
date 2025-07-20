/**
 * 📋 Common Validation Schemas - Context7 Optimized
 *
 * Context7 Pattern: Centralized validation schema definitions
 * - Single Responsibility: Common validation rule definitions
 * - DRY: Eliminates 20+ duplicate validation patterns across validators
 * - Consistent validation rules across the entire application
 */

const TimeConstants = require('../utils/TimeConstants');

class CommonValidationSchemas {
  /**
   * Context7 Pattern: Standard field validation schemas
   * DRY: Eliminates duplicate field validation across 20+ files
   */
  static get STANDARD_FIELDS() {
    return {
      // Pagination fields
      page: {
        type: 'number',
        min: 1,
        max: 10000,
        optional: true,
        default: 1,
        description: 'Page number for pagination'
      },

      limit: {
        type: 'number',
        min: 1,
        max: 1000,
        optional: true,
        default: 20,
        description: 'Number of items per page'
      },

      offset: {
        type: 'number',
        min: 0,
        optional: true,
        default: 0,
        description: 'Number of items to skip'
      },

      // Sorting fields
      sortBy: {
        type: 'string',
        enum: ['name', 'createdAt', 'updatedAt', 'value', 'price', 'volume', 'profit'],
        optional: true,
        default: 'createdAt',
        description: 'Field to sort by'
      },

      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        optional: true,
        default: 'desc',
        description: 'Sort order (ascending or descending)'
      },

      // Boolean flags
      booleanFlag: {
        type: 'boolean',
        optional: true,
        description: 'Boolean flag field'
      },

      includeInactive: {
        type: 'boolean',
        optional: true,
        default: false,
        description: 'Include inactive items in results'
      },

      // Time-related fields
      timeRange: {
        type: 'string',
        enum: ['5m', '15m', '30m', '1h', '2h', '6h', '12h', '24h', '2d', '3d', '7d', '14d', '30d'],
        optional: true,
        default: '24h',
        description: 'Time range for data retrieval'
      },

      startTime: {
        type: 'string',
        format: 'date-time',
        optional: true,
        description: 'Start time for date range filtering'
      },

      endTime: {
        type: 'string',
        format: 'date-time',
        optional: true,
        description: 'End time for date range filtering'
      },

      // ID fields
      itemId: {
        type: 'number',
        min: 1,
        max: 99999999,
        description: 'OSRS item ID'
      },

      userId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'User identifier'
      },

      sessionId: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        description: 'Session identifier'
      }
    };
  }

  /**
   * Context7 Pattern: Market data specific validation schemas
   * DRY: Eliminates duplicate market validation patterns
   */
  static get MARKET_FIELDS() {
    return {
      price: {
        type: 'number',
        min: 0,
        max: 2147483647, // Max 32-bit integer (OSRS max value)
        description: 'Price in GP'
      },

      volume: {
        type: 'number',
        min: 0,
        max: 2147483647,
        description: 'Trading volume'
      },

      margin: {
        type: 'number',
        min: -100,
        max: 1000,
        description: 'Profit margin percentage'
      },

      minValue: {
        type: 'number',
        min: 0,
        max: 2147483647,
        optional: true,
        description: 'Minimum value filter'
      },

      maxValue: {
        type: 'number',
        min: 0,
        max: 2147483647,
        optional: true,
        description: 'Maximum value filter'
      },

      tradeable: {
        type: 'boolean',
        optional: true,
        description: 'Item is tradeable on Grand Exchange'
      },

      members: {
        type: 'boolean',
        optional: true,
        description: 'Item requires membership'
      }
    };
  }

  /**
   * Context7 Pattern: API request validation schemas
   * DRY: Eliminates duplicate API validation patterns
   */
  static get API_FIELDS() {
    return {
      format: {
        type: 'string',
        enum: ['json', 'csv', 'excel'],
        optional: true,
        default: 'json',
        description: 'Response format'
      },

      fields: {
        type: 'array',
        items: { type: 'string' },
        optional: true,
        description: 'Specific fields to include in response'
      },

      search: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        optional: true,
        description: 'Search term for filtering'
      },

      category: {
        type: 'string',
        enum: ['weapon', 'armour', 'tool', 'food', 'potion', 'rune', 'material', 'misc'],
        optional: true,
        description: 'Item category filter'
      }
    };
  }

  /**
   * Context7 Pattern: Configuration validation schemas
   * DRY: Eliminates duplicate configuration validation patterns
   */
  static get CONFIG_FIELDS() {
    return {
      timeout: {
        type: 'number',
        min: 1000,
        max: TimeConstants.FIVE_MINUTES,
        optional: true,
        default: TimeConstants.REQUEST_TIMEOUT_MEDIUM,
        description: 'Request timeout in milliseconds'
      },

      retryCount: {
        type: 'number',
        min: 0,
        max: 10,
        optional: true,
        default: 3,
        description: 'Number of retry attempts'
      },

      batchSize: {
        type: 'number',
        min: 1,
        max: 1000,
        optional: true,
        default: 100,
        description: 'Batch processing size'
      },

      enabled: {
        type: 'boolean',
        optional: true,
        default: true,
        description: 'Feature enabled flag'
      }
    };
  }

  /**
   * Context7 Pattern: Get complete validation schema for common patterns
   * DRY: Pre-built schemas for common use cases
   */
  static getPaginationSchema() {
    return {
      page: this.STANDARD_FIELDS.page,
      limit: this.STANDARD_FIELDS.limit,
      sortBy: this.STANDARD_FIELDS.sortBy,
      sortOrder: this.STANDARD_FIELDS.sortOrder
    };
  }

  static getTimeRangeSchema() {
    return {
      timeRange: this.STANDARD_FIELDS.timeRange,
      startTime: this.STANDARD_FIELDS.startTime,
      endTime: this.STANDARD_FIELDS.endTime
    };
  }

  static getMarketDataSchema() {
    return {
      ...this.getPaginationSchema(),
      ...this.getTimeRangeSchema(),
      itemId: { ...this.STANDARD_FIELDS.itemId, optional: true },
      minValue: this.MARKET_FIELDS.minValue,
      maxValue: this.MARKET_FIELDS.maxValue,
      tradeable: this.MARKET_FIELDS.tradeable,
      members: this.MARKET_FIELDS.members
    };
  }

  static getSearchSchema() {
    return {
      ...this.getPaginationSchema(),
      search: this.API_FIELDS.search,
      category: this.API_FIELDS.category,
      includeInactive: this.STANDARD_FIELDS.includeInactive
    };
  }

  static getExportSchema() {
    return {
      ...this.getTimeRangeSchema(),
      format: this.API_FIELDS.format,
      fields: this.API_FIELDS.fields,
      limit: { ...this.STANDARD_FIELDS.limit, max: 10000 } // Higher limit for exports
    };
  }

  /**
   * Context7 Pattern: Validation schema builder
   * DRY: Dynamic schema building from common patterns
   */
  static buildSchema(fieldNames = []) {
    const schema = {};
    const allFields = {
      ...this.STANDARD_FIELDS,
      ...this.MARKET_FIELDS,
      ...this.API_FIELDS,
      ...this.CONFIG_FIELDS
    };

    fieldNames.forEach(fieldName => {
      if (allFields[fieldName]) {
        schema[fieldName] = allFields[fieldName];
      }
    });

    return schema;
  }

  /**
   * Context7 Pattern: Get validation schema with custom overrides
   * DRY: Allows customization while maintaining standard base
   */
  static getSchemaWithOverrides(baseSchema, overrides = {}) {
    const schema = { ...baseSchema };
    
    Object.keys(overrides).forEach(field => {
      if (schema[field]) {
        schema[field] = { ...schema[field], ...overrides[field] };
      } else {
        schema[field] = overrides[field];
      }
    });

    return schema;
  }
}

module.exports = CommonValidationSchemas;