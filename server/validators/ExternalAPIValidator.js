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

    // Additional validation for itemId using BaseValidator
    const itemIdValidation = this.validateInteger(data.itemId, 1, 50000, 'itemId');
    if (!itemIdValidation.isValid) {
      return {
        isValid: false,
        errors: [itemIdValidation.error]
      };
    }

    return this.formatSuccessResponse(null, 'External API validation successful');
  }

  /**
   * Context7 Pattern: Validate search items request
   */
  searchItems(data) {
    const validation = this.validateData(data, this.validationSchemas.searchItems);

    if (!validation.isValid) {
      return validation;
    }

    // Additional validation for search query using BaseValidator
    const queryValidation = this.validateStringLength(data.q, 2, 100, 'searchQuery');
    if (!queryValidation.isValid) {
      return {
        isValid: false,
        errors: [queryValidation.error]
      };
    }

    // Enhanced security validation
    const securityValidation = this.validateSecureString(queryValidation.value, 'searchQuery');
    if (!securityValidation.isValid) {
      return {
        isValid: false,
        errors: [securityValidation.error]
      };
    }

    return this.formatSuccessResponse(null, 'External API validation successful');
  }

  /**
   * Context7 Pattern: Validate item data request
   */
  getItemData(data) {
    const validation = this.validateData(data, this.validationSchemas.getItemData);

    if (!validation.isValid) {
      return validation;
    }

    // Additional validation for itemId using BaseValidator
    const itemIdValidation = this.validateInteger(data.itemId, 1, 50000, 'itemId');
    if (!itemIdValidation.isValid) {
      return {
        isValid: false,
        errors: [itemIdValidation.error]
      };
    }

    return this.formatSuccessResponse(null, 'External API validation successful');
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

    // Validate each item ID using BaseValidator array validation
    const arrayValidation = this.validateArray(
      data.itemIds,
      1,
      100,
      (itemId, index) => this.validateInteger(itemId, 1, 50000, `itemId[${index}]`),
      'itemIds'
    );

    if (!arrayValidation.isValid) {
      return {
        isValid: false,
        errors: arrayValidation.errors || [arrayValidation.error]
      };
    }

    const validItemIds = arrayValidation.value;

    // Check for duplicates
    const uniqueIds = new Set(validItemIds);
    if (uniqueIds.size !== validItemIds.length) {
      return {
        isValid: false,
        errors: ['Duplicate item IDs are not allowed']
      };
    }

    return this.formatSuccessResponse(null, 'External API validation successful');
  }

  /**
   * Context7 Pattern: Validate timestep parameter (Enhanced with DRY pattern)
   */
  validateTimestep(timestep) {
    const validTimesteps = ['5m', '1h', '6h', '24h'];
    
    if (!timestep) {
      return { isValid: true, timestep: '5m' }; // Default
    }

    const enumValidation = this.validateEnum(timestep, validTimesteps, 'timestep', false);
    
    if (!enumValidation.isValid) {
      return { isValid: false, error: enumValidation.error };
    }

    return { isValid: true, timestep: enumValidation.value };
  }

  /**
   * Context7 Pattern: Validate item ID parameter (Enhanced with DRY pattern)
   */
  validateItemId(itemId) {
    const validation = super.validateInteger(itemId, 1, 50000, 'itemId');
    
    if (!validation.isValid) {
      return { isValid: false, error: validation.error };
    }

    return { isValid: true, itemId: validation.value };
  }

  /**
   * Context7 Pattern: Validate search query (Enhanced with DRY pattern)
   */
  validateSearchQuery(query) {
    // First validate string length
    const lengthValidation = this.validateStringLength(query, 2, 100, 'searchQuery');
    if (!lengthValidation.isValid) {
      return lengthValidation;
    }

    // Then validate security
    const securityValidation = this.validateSecureString(lengthValidation.value, 'searchQuery');
    if (!securityValidation.isValid) {
      return securityValidation;
    }

    return { isValid: true, query: securityValidation.value };
  }

  /**
   * Context7 Pattern: Validate limit parameter (Enhanced with DRY pattern)
   */
  validateLimit(limit) {
    return super.validateLimit(limit, 20, 100);
  }

  /**
   * Context7 Pattern: Validate array of item IDs (Enhanced with DRY pattern)
   */
  validateItemIdArray(itemIds) {
    // Use BaseValidator array validation
    const arrayValidation = this.validateArray(
      itemIds,
      1,
      100,
      (itemId, index) => this.validateInteger(itemId, 1, 50000, `itemId[${index}]`),
      'itemIds'
    );

    if (!arrayValidation.isValid) {
      return arrayValidation;
    }

    const validItemIds = arrayValidation.value;

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

      // Use BaseValidator for security validation
      const securityValidation = this.validateSecureString(userAgent, 'User-Agent');
      if (!securityValidation.isValid) {
        errors.push(securityValidation.error);
      }
    }

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'EXTERNAL_API_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'External API validation successful');
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
