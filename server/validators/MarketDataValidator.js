/**
 * 🔍 Market Data Validator - Context7 Optimized
 *
 * Context7 Pattern: Validation Layer
 * - Centralized validation logic
 * - Reusable validation schemas
 * - Comprehensive error reporting
 * - Type-safe validation patterns
 */

const { BaseValidator } = require('./BaseValidator');

class MarketDataValidator extends BaseValidator {
  constructor() {
    super();
    this.validationSchemas = this.initializeSchemas();
  }

  /**
   * Context7 Pattern: Initialize validation schemas
   */
  initializeSchemas() {
    return {
      getMarketData: {
        query: {
          itemId: { type: 'number', min: 1, optional: true },
          startTime: { type: 'number', min: 0, optional: true },
          endTime: { type: 'number', min: 0, optional: true },
          limit: { type: 'number', min: 1, max: 1000, optional: true },
          onlyTradeable: { type: 'boolean', optional: true },
          sortBy: { type: 'string', enum: ['timestamp', 'itemId', 'profit'], optional: true },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], optional: true }
        }
      },
      saveMarketData: {
        body: {
          items: { type: 'array', required: true, minItems: 1 },
          collectionSource: { type: 'string', optional: true }
        }
      },
      getMarketDataSummary: {
        query: {
          timeRange: { type: 'number', min: 1, optional: true }
        }
      },
      getItemPriceHistory: {
        query: {
          itemId: { type: 'string', required: true, pattern: '^[1-9][0-9]*$' },
          startTime: { type: 'number', min: 0, optional: true },
          endTime: { type: 'number', min: 0, optional: true },
          limit: { type: 'number', min: 1, max: 1000, optional: true },
          interval: { type: 'string', enum: ['minute', 'hour', 'day'], optional: true }
        }
      },
      getTopTradedItems: {
        query: {
          limit: { type: 'number', min: 1, max: 100, optional: true },
          timeRange: { type: 'number', min: 1, optional: true },
          sortBy: { type: 'string', enum: ['volume', 'profit', 'price'], optional: true },
          onlyTradeable: { type: 'boolean', optional: true }
        }
      },
      searchItems: {
        query: {
          q: { type: 'string', required: true, minLength: 2 },
          limit: { type: 'number', min: 1, max: 100, optional: true },
          onlyTradeable: { type: 'boolean', optional: true },
          sortBy: { type: 'string', enum: ['relevance', 'name', 'price'], optional: true }
        }
      }
    };
  }

  /**
   * Context7 Pattern: Validate market data retrieval request
   */
  getMarketData(data) {
    return this.validateData(data, this.validationSchemas.getMarketData);
  }

  /**
   * Context7 Pattern: Validate market data save request
   */
  saveMarketData(data) {
    const validation = this.validateData(data, this.validationSchemas.saveMarketData);

    if (!validation.isValid) {
      return validation;
    }

    // Context7 Pattern: Additional validation for items array
    if (data.items && Array.isArray(data.items)) {
      const itemValidation = this.validateMarketDataItems(data.items);
      if (!itemValidation.isValid) {
        return itemValidation;
      }
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate market data summary request
   */
  getMarketDataSummary(data) {
    return this.validateData(data, this.validationSchemas.getMarketDataSummary);
  }

  /**
   * Context7 Pattern: Validate item price history request
   */
  getItemPriceHistory(data) {
    return this.validateData(data, this.validationSchemas.getItemPriceHistory);
  }

  /**
   * Context7 Pattern: Validate top traded items request
   */
  getTopTradedItems(data) {
    return this.validateData(data, this.validationSchemas.getTopTradedItems);
  }

  /**
   * Context7 Pattern: Validate search items request
   */
  searchItems(data) {
    return this.validateData(data, this.validationSchemas.searchItems);
  }

  /**
   * Context7 Pattern: Validate individual market data items
   */
  validateMarketDataItems(items) {
    const errors = [];

    items.forEach((item, index) => {
      if (!item.itemId || typeof item.itemId !== 'number') {
        errors.push(`Item ${index}: itemId is required and must be a number`);
      }

      if (!item.itemName || typeof item.itemName !== 'string') {
        errors.push(`Item ${index}: itemName is required and must be a string`);
      }

      if (!item.priceData || typeof item.priceData !== 'object') {
        errors.push(`Item ${index}: priceData is required and must be an object`);
      } else {
        if (item.priceData.high !== null && typeof item.priceData.high !== 'number') {
          errors.push(`Item ${index}: priceData.high must be a number or null`);
        }

        if (item.priceData.low !== null && typeof item.priceData.low !== 'number') {
          errors.push(`Item ${index}: priceData.low must be a number or null`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate item ID format
   */
  validateItemId(itemId) {
    if (!itemId) {
      return { isValid: false, error: 'Item ID is required' };
    }

    const numericId = parseInt(itemId);
    if (isNaN(numericId) || numericId < 1) {
      return { isValid: false, error: 'Item ID must be a positive number' };
    }

    return { isValid: true, itemId: numericId };
  }

  /**
   * Context7 Pattern: Validate time range parameters
   */
  validateTimeRange(startTime, endTime) {
    const errors = [];

    if (startTime && endTime) {
      const start = parseInt(startTime);
      const end = parseInt(endTime);

      if (isNaN(start) || isNaN(end)) {
        errors.push('Start time and end time must be valid numbers');
      } else if (start >= end) {
        errors.push('Start time must be before end time');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate sorting parameters
   */
  validateSortingParams(sortBy, sortOrder) {
    const errors = [];
    const validSortFields = ['timestamp', 'itemId', 'profit', 'volume', 'price', 'name', 'relevance'];
    const validSortOrders = ['asc', 'desc'];

    if (sortBy && !validSortFields.includes(sortBy)) {
      errors.push(`sortBy must be one of: ${validSortFields.join(', ')}`);
    }

    if (sortOrder && !validSortOrders.includes(sortOrder)) {
      errors.push(`sortOrder must be one of: ${validSortOrders.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate search query
   */
  validateSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Search query is required and must be a string' };
    }

    if (query.trim().length < 2) {
      return { isValid: false, error: 'Search query must be at least 2 characters long' };
    }

    if (query.length > 100) {
      return { isValid: false, error: 'Search query must not exceed 100 characters' };
    }

    return { isValid: true, query: query.trim() };
  }
}

// Context7 Pattern: Export validation functions
const validateRequest = new MarketDataValidator();

module.exports = {
  MarketDataValidator,
  validateRequest
};
