/**
 * 🌐 External API Validator - Context7 Optimized
 * 
 * Context7 Pattern: Validation Layer for External API Requests
 * - Centralized validation logic for external API endpoints
 * - Reusable validation schemas
 * - Comprehensive error reporting
 * - Type-safe validation patterns
 */

const { BaseValidator } = require('./BaseValidator');

class ExternalAPIValidator extends BaseValidator {
  constructor() {
    super();
    this.validationSchemas = this.initializeSchemas();
  }

  /**
   * Context7 Pattern: Initialize validation schemas
   */
  initializeSchemas() {
    return {
      getTimeseries: {
        params: {
          itemId: { type: 'number', required: true, min: 1, max: 50000 }
        },
        query: {
          timestep: { 
            type: 'string', 
            optional: true, 
            enum: ['5m', '1h', '6h', '24h'] 
          }
        }
      },
      searchItems: {
        query: {
          q: { type: 'string', required: true, minLength: 2, maxLength: 100 },
          limit: { type: 'number', optional: true, min: 1, max: 100 }
        }
      },
      getItemData: {
        params: {
          itemId: { type: 'number', required: true, min: 1, max: 50000 }
        }
      },
      getBulkItemData: {
        body: {
          itemIds: { 
            type: 'array', 
            required: true, 
            minItems: 1, 
            maxItems: 100,
            items: { type: 'number', min: 1, max: 50000 }
          }
        }
      }
    };
  }

  /**
   * Context7 Pattern: Validate timeseries request
   */
  getTimeseries(data) {
    const validation = this.validateData(data, this.validationSchemas.getTimeseries);
    
    if (!validation.isValid) {
      return validation;
    }

    // Additional validation for itemId
    const itemId = parseInt(data.itemId);
    if (isNaN(itemId) || itemId < 1 || itemId > 50000) {
      return {
        isValid: false,
        errors: ['Item ID must be a number between 1 and 50000']
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate search items request
   */
  searchItems(data) {
    const validation = this.validateData(data, this.validationSchemas.searchItems);
    
    if (!validation.isValid) {
      return validation;
    }

    // Additional validation for search query
    const query = data.q ? data.q.trim() : '';
    if (query.length < 2) {
      return {
        isValid: false,
        errors: ['Search query must be at least 2 characters long']
      };
    }

    // Check for potentially malicious patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /expression\(/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(query))) {
      return {
        isValid: false,
        errors: ['Search query contains invalid characters']
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate item data request
   */
  getItemData(data) {
    const validation = this.validateData(data, this.validationSchemas.getItemData);
    
    if (!validation.isValid) {
      return validation;
    }

    // Additional validation for itemId
    const itemId = parseInt(data.itemId);
    if (isNaN(itemId) || itemId < 1 || itemId > 50000) {
      return {
        isValid: false,
        errors: ['Item ID must be a number between 1 and 50000']
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate bulk item data request
   */
  getBulkItemData(data) {
    const validation = this.validateData(data, this.validationSchemas.getBulkItemData);
    
    if (!validation.isValid) {
      return validation;
    }

    // Additional validation for itemIds array
    if (!Array.isArray(data.itemIds)) {
      return {
        isValid: false,
        errors: ['itemIds must be an array']
      };
    }

    if (data.itemIds.length === 0) {
      return {
        isValid: false,
        errors: ['itemIds array cannot be empty']
      };
    }

    if (data.itemIds.length > 100) {
      return {
        isValid: false,
        errors: ['Cannot request more than 100 items at once']
      };
    }

    // Validate each item ID
    const errors = [];
    const validItemIds = [];
    
    data.itemIds.forEach((itemId, index) => {
      const numericId = parseInt(itemId);
      
      if (isNaN(numericId)) {
        errors.push(`Item ID at index ${index} is not a valid number`);
      } else if (numericId < 1 || numericId > 50000) {
        errors.push(`Item ID at index ${index} must be between 1 and 50000`);
      } else {
        validItemIds.push(numericId);
      }
    });

    if (errors.length > 0) {
      return {
        isValid: false,
        errors
      };
    }

    // Check for duplicates
    const uniqueIds = new Set(validItemIds);
    if (uniqueIds.size !== validItemIds.length) {
      return {
        isValid: false,
        errors: ['Duplicate item IDs are not allowed']
      };
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate timestep parameter
   */
  validateTimestep(timestep) {
    const validTimesteps = ['5m', '1h', '6h', '24h'];
    
    if (!timestep) {
      return { isValid: true, timestep: '5m' }; // Default
    }
    
    if (typeof timestep !== 'string') {
      return { isValid: false, error: 'Timestep must be a string' };
    }
    
    if (!validTimesteps.includes(timestep)) {
      return { 
        isValid: false, 
        error: `Timestep must be one of: ${validTimesteps.join(', ')}` 
      };
    }
    
    return { isValid: true, timestep };
  }

  /**
   * Context7 Pattern: Validate item ID parameter
   */
  validateItemId(itemId) {
    if (!itemId) {
      return { isValid: false, error: 'Item ID is required' };
    }
    
    const numericId = parseInt(itemId);
    
    if (isNaN(numericId)) {
      return { isValid: false, error: 'Item ID must be a number' };
    }
    
    if (numericId < 1 || numericId > 50000) {
      return { isValid: false, error: 'Item ID must be between 1 and 50000' };
    }
    
    return { isValid: true, itemId: numericId };
  }

  /**
   * Context7 Pattern: Validate search query
   */
  validateSearchQuery(query) {
    if (!query) {
      return { isValid: false, error: 'Search query is required' };
    }
    
    if (typeof query !== 'string') {
      return { isValid: false, error: 'Search query must be a string' };
    }
    
    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < 2) {
      return { isValid: false, error: 'Search query must be at least 2 characters long' };
    }
    
    if (trimmedQuery.length > 100) {
      return { isValid: false, error: 'Search query must not exceed 100 characters' };
    }
    
    // Check for potentially malicious patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /expression\(/i,
      /data:/i,
      /vbscript:/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(trimmedQuery))) {
      return { isValid: false, error: 'Search query contains invalid characters' };
    }
    
    return { isValid: true, query: trimmedQuery };
  }

  /**
   * Context7 Pattern: Validate limit parameter
   */
  validateLimit(limit) {
    if (!limit) {
      return { isValid: true, limit: 20 }; // Default
    }
    
    const numericLimit = parseInt(limit);
    
    if (isNaN(numericLimit)) {
      return { isValid: false, error: 'Limit must be a number' };
    }
    
    if (numericLimit < 1) {
      return { isValid: false, error: 'Limit must be at least 1' };
    }
    
    if (numericLimit > 100) {
      return { isValid: false, error: 'Limit cannot exceed 100' };
    }
    
    return { isValid: true, limit: numericLimit };
  }

  /**
   * Context7 Pattern: Validate array of item IDs
   */
  validateItemIdArray(itemIds) {
    if (!Array.isArray(itemIds)) {
      return { isValid: false, error: 'Item IDs must be an array' };
    }
    
    if (itemIds.length === 0) {
      return { isValid: false, error: 'Item IDs array cannot be empty' };
    }
    
    if (itemIds.length > 100) {
      return { isValid: false, error: 'Cannot request more than 100 items at once' };
    }
    
    const errors = [];
    const validItemIds = [];
    
    itemIds.forEach((itemId, index) => {
      const validation = this.validateItemId(itemId);
      
      if (!validation.isValid) {
        errors.push(`Item ID at index ${index}: ${validation.error}`);
      } else {
        validItemIds.push(validation.itemId);
      }
    });
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    // Check for duplicates
    const uniqueIds = new Set(validItemIds);
    if (uniqueIds.size !== validItemIds.length) {
      return { isValid: false, error: 'Duplicate item IDs are not allowed' };
    }
    
    return { isValid: true, itemIds: validItemIds };
  }

  /**
   * Context7 Pattern: Validate external API request headers
   */
  validateHeaders(headers) {
    const requiredHeaders = ['user-agent'];
    const errors = [];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        errors.push(`Missing required header: ${header}`);
      }
    }
    
    // Check User-Agent format
    if (headers['user-agent']) {
      const userAgent = headers['user-agent'];
      
      // Basic validation for User-Agent format
      if (userAgent.length < 5 || userAgent.length > 200) {
        errors.push('User-Agent header must be between 5 and 200 characters');
      }
      
      // Check for potentially malicious patterns
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i
      ];

      if (dangerousPatterns.some(pattern => pattern.test(userAgent))) {
        errors.push('User-Agent header contains invalid characters');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate rate limiting parameters
   */
  validateRateLimitParams(params) {
    const {
      windowMs = 60000, // 1 minute
      max = 30, // 30 requests per minute
      skipFailedRequests = false
    } = params;
    
    const errors = [];
    
    if (typeof windowMs !== 'number' || windowMs < 1000 || windowMs > 3600000) {
      errors.push('Window time must be between 1 second and 1 hour');
    }
    
    if (typeof max !== 'number' || max < 1 || max > 1000) {
      errors.push('Max requests must be between 1 and 1000');
    }
    
    if (typeof skipFailedRequests !== 'boolean') {
      errors.push('skipFailedRequests must be a boolean');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      params: { windowMs, max, skipFailedRequests }
    };
  }

  /**
   * Context7 Pattern: Validate cache parameters
   */
  validateCacheParams(params) {
    const {
      ttl = 300000, // 5 minutes
      maxSize = 1000,
      enabled = true
    } = params;
    
    const errors = [];
    
    if (typeof ttl !== 'number' || ttl < 1000 || ttl > 3600000) {
      errors.push('TTL must be between 1 second and 1 hour');
    }
    
    if (typeof maxSize !== 'number' || maxSize < 1 || maxSize > 10000) {
      errors.push('Max cache size must be between 1 and 10000');
    }
    
    if (typeof enabled !== 'boolean') {
      errors.push('Enabled must be a boolean');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      params: { ttl, maxSize, enabled }
    };
  }
}

// Context7 Pattern: Export validation functions
const validateRequest = new ExternalAPIValidator();

module.exports = {
  ExternalAPIValidator,
  validateRequest
};