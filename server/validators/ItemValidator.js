/**
 * 🛡️ Item Validator - Context7 Validation Layer
 *
 * Context7 Pattern: Input Validation and Data Integrity
 * - SOLID: Single Responsibility - Item data validation
 * - DRY: Reusable validation rules and error handling
 * - Comprehensive input sanitization and validation
 * - Business rule enforcement
 * - Security through input validation
 */

const { Logger } = require('../utils/Logger');

class ItemValidator {
  constructor() {
    this.logger = new Logger('ItemValidator');

    // Context7 Pattern: Validation constants
    this.CONSTRAINTS = {
      ITEM_ID: {
        MIN: 1,
        MAX: 999999999
      },
      NAME: {
        MIN_LENGTH: 1,
        MAX_LENGTH: 200
      },
      EXAMINE: {
        MAX_LENGTH: 500
      },
      VALUE: {
        MIN: 0,
        MAX: 2147483647 // Max 32-bit integer
      },
      WEIGHT: {
        MIN: 0,
        MAX: 999999
      },
      BUY_LIMIT: {
        MIN: 1,
        MAX: 999999
      },
      SEARCH_TERM: {
        MIN_LENGTH: 2,
        MAX_LENGTH: 100
      }
    };

    this.ALLOWED_CATEGORIES = [
      'runes', 'potions', 'food', 'smithing', 'woodcutting',
      'farming', 'high_value', 'members', 'free', 'general'
    ];

    this.ALLOWED_SORT_FIELDS = [
      'name', 'value', 'highalch', 'lowalch', 'itemId', 'updatedAt'
    ];

    this.ALLOWED_SORT_ORDERS = ['asc', 'desc', 1, -1];
  }

  /**
   * Context7 Pattern: Validate item creation data
   */
  validateItemCreation(itemData) {
    try {
      this.logger.debug('Validating item creation data');

      const errors = [];
      const warnings = [];

      // Required fields validation
      if (!this.isValidItemId(itemData.itemId)) {
        errors.push('itemId is required and must be a positive integer');
      }

      if (!this.isValidName(itemData.name)) {
        errors.push(`name is required and must be 1-${this.CONSTRAINTS.NAME.MAX_LENGTH} characters`);
      }

      if (!this.isValidExamine(itemData.examine)) {
        errors.push(`examine text must not exceed ${this.CONSTRAINTS.EXAMINE.MAX_LENGTH} characters`);
      }

      // Optional fields validation
      if (itemData.value !== undefined && !this.isValidValue(itemData.value)) {
        errors.push('value must be a non-negative integer');
      }

      if (itemData.lowalch !== undefined && !this.isValidValue(itemData.lowalch)) {
        errors.push('lowalch must be a non-negative integer');
      }

      if (itemData.highalch !== undefined && !this.isValidValue(itemData.highalch)) {
        errors.push('highalch must be a non-negative integer');
      }

      if (itemData.weight !== undefined && !this.isValidWeight(itemData.weight)) {
        errors.push('weight must be a non-negative number');
      }

      if (itemData.buy_limit !== undefined && !this.isValidBuyLimit(itemData.buy_limit)) {
        errors.push('buy_limit must be a positive integer');
      }

      // Business rule validations
      if (itemData.highalch && itemData.lowalch && itemData.highalch < itemData.lowalch) {
        errors.push('highalch cannot be less than lowalch');
      }

      // Type validations
      if (itemData.members !== undefined && typeof itemData.members !== 'boolean') {
        errors.push('members must be a boolean');
      }

      if (itemData.tradeable_on_ge !== undefined && typeof itemData.tradeable_on_ge !== 'boolean') {
        errors.push('tradeable_on_ge must be a boolean');
      }

      if (itemData.stackable !== undefined && typeof itemData.stackable !== 'boolean') {
        errors.push('stackable must be a boolean');
      }

      if (itemData.noted !== undefined && typeof itemData.noted !== 'boolean') {
        errors.push('noted must be a boolean');
      }

      // Icon validation
      if (itemData.icon && typeof itemData.icon !== 'string') {
        errors.push('icon must be a string');
      }

      // Warnings for data quality
      if (itemData.examine && itemData.examine.toLowerCase() === 'no description available') {
        warnings.push('Item has default examine text');
      }

      if (itemData.value === 1) {
        warnings.push('Item has default value of 1');
      }

      const isValid = errors.length === 0;

      this.logger.debug('Item creation validation completed', {
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return {
        isValid,
        errors,
        warnings,
        sanitizedData: isValid ? this.sanitizeItemData(itemData) : null
      };

    } catch (error) {
      this.logger.error('Error validating item creation data', error);
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      };
    }
  }

  /**
   * Context7 Pattern: Validate item update data
   */
  validateItemUpdate(itemId, updateData) {
    try {
      this.logger.debug('Validating item update data', { itemId });

      const errors = [];
      const warnings = [];

      // Validate itemId
      if (!this.isValidItemId(itemId)) {
        errors.push('Invalid itemId provided');
      }

      // Prevent updating immutable fields
      const immutableFields = ['itemId', 'createdAt', 'version'];
      const attemptedImmutableUpdates = Object.keys(updateData)
        .filter(field => immutableFields.includes(field));

      if (attemptedImmutableUpdates.length > 0) {
        errors.push(`Cannot update immutable fields: ${attemptedImmutableUpdates.join(', ')}`);
      }

      // Validate individual fields if present
      if (updateData.name !== undefined && !this.isValidName(updateData.name)) {
        errors.push(`name must be 1-${this.CONSTRAINTS.NAME.MAX_LENGTH} characters`);
      }

      if (updateData.examine !== undefined && !this.isValidExamine(updateData.examine)) {
        errors.push(`examine text must not exceed ${this.CONSTRAINTS.EXAMINE.MAX_LENGTH} characters`);
      }

      if (updateData.value !== undefined && !this.isValidValue(updateData.value)) {
        errors.push('value must be a non-negative integer');
      }

      if (updateData.lowalch !== undefined && !this.isValidValue(updateData.lowalch)) {
        errors.push('lowalch must be a non-negative integer');
      }

      if (updateData.highalch !== undefined && !this.isValidValue(updateData.highalch)) {
        errors.push('highalch must be a non-negative integer');
      }

      // Business rule validation for alchemy values
      if (updateData.highalch !== undefined && updateData.lowalch !== undefined) {
        if (updateData.highalch < updateData.lowalch) {
          errors.push('highalch cannot be less than lowalch');
        }
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        warnings,
        sanitizedData: isValid ? this.sanitizeItemData(updateData) : null
      };

    } catch (error) {
      this.logger.error('Error validating item update data', error);
      return {
        isValid: false,
        errors: ['Validation error occurred'],
        warnings: []
      };
    }
  }

  /**
   * Context7 Pattern: Validate search parameters
   */
  validateSearchParams(params) {
    try {
      this.logger.debug('Validating search parameters');

      const errors = [];
      const sanitized = {};

      // Search term validation
      if (params.searchTerm) {
        if (!this.isValidSearchTerm(params.searchTerm)) {
          errors.push(
            `searchTerm must be ${this.CONSTRAINTS.SEARCH_TERM.MIN_LENGTH}-${this.CONSTRAINTS.SEARCH_TERM.MAX_LENGTH} characters`
          );
        } else {
          sanitized.searchTerm = this.sanitizeString(params.searchTerm);
        }
      }

      // Limit validation
      if (params.limit !== undefined) {
        const limit = parseInt(params.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          errors.push('limit must be an integer between 1 and 100');
        } else {
          sanitized.limit = limit;
        }
      }

      // Boolean field validations
      if (params.members !== undefined) {
        sanitized.members = this.parseBooleanParam(params.members);
      }

      if (params.tradeable !== undefined) {
        sanitized.tradeable = this.parseBooleanParam(params.tradeable);
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        sanitizedParams: isValid ? sanitized : null
      };

    } catch (error) {
      this.logger.error('Error validating search parameters', error);
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Context7 Pattern: Validate pagination parameters
   */
  validatePaginationParams(params) {
    try {
      const errors = [];
      const sanitized = {};

      // Page validation
      if (params.page !== undefined) {
        const page = parseInt(params.page);
        if (!Number.isInteger(page) || page < 1) {
          errors.push('page must be a positive integer');
        } else {
          sanitized.page = page;
        }
      }

      // Limit validation
      if (params.limit !== undefined) {
        const limit = parseInt(params.limit);
        if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
          errors.push('limit must be an integer between 1 and 100');
        } else {
          sanitized.limit = limit;
        }
      }

      // Sort validation
      if (params.sort) {
        const sortValidation = this.validateSortParam(params.sort);
        if (!sortValidation.isValid) {
          errors.push(...sortValidation.errors);
        } else {
          sanitized.sort = sortValidation.sanitizedSort;
        }
      }

      // Filter validations
      if (params.members !== undefined) {
        sanitized.members = this.parseBooleanParam(params.members);
      }

      if (params.tradeable !== undefined) {
        sanitized.tradeable = this.parseBooleanParam(params.tradeable);
      }

      if (params.minValue !== undefined) {
        const minValue = parseInt(params.minValue);
        if (!Number.isInteger(minValue) || minValue < 0) {
          errors.push('minValue must be a non-negative integer');
        } else {
          sanitized.minValue = minValue;
        }
      }

      if (params.maxValue !== undefined) {
        const maxValue = parseInt(params.maxValue);
        if (!Number.isInteger(maxValue) || maxValue < 0) {
          errors.push('maxValue must be a non-negative integer');
        } else {
          sanitized.maxValue = maxValue;
        }
      }

      // Business rule: maxValue should be greater than minValue
      if (sanitized.minValue && sanitized.maxValue && sanitized.maxValue < sanitized.minValue) {
        errors.push('maxValue must be greater than or equal to minValue');
      }

      const isValid = errors.length === 0;

      return {
        isValid,
        errors,
        sanitizedParams: isValid ? sanitized : null
      };

    } catch (error) {
      this.logger.error('Error validating pagination parameters', error);
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Context7 Pattern: Validate category parameter
   */
  validateCategory(category) {
    if (!category) {
      return { isValid: false, error: 'Category is required' };
    }

    if (!this.ALLOWED_CATEGORIES.includes(category)) {
      return {
        isValid: false,
        error: `Invalid category. Allowed values: ${this.ALLOWED_CATEGORIES.join(', ')}`
      };
    }

    return { isValid: true, sanitizedCategory: category };
  }

  /**
   * Context7 Pattern: Validate sort parameters
   */
  validateSortParam(sort) {
    try {
      const errors = [];
      const sanitizedSort = {};

      if (typeof sort === 'string') {
        // Handle string format like "name:asc" or "value:desc"
        const parts = sort.split(':');
        const field = parts[0];
        const order = parts[1] || 'asc';

        if (!this.ALLOWED_SORT_FIELDS.includes(field)) {
          errors.push(`Invalid sort field: ${field}. Allowed: ${this.ALLOWED_SORT_FIELDS.join(', ')}`);
        }

        if (!this.ALLOWED_SORT_ORDERS.includes(order)) {
          errors.push(`Invalid sort order: ${order}. Allowed: asc, desc`);
        }

        if (errors.length === 0) {
          sanitizedSort[field] = order === 'desc' ? -1 : 1;
        }
      } else if (typeof sort === 'object' && sort !== null) {
        // Handle object format like { name: 1, value: -1 }
        for (const [field, order] of Object.entries(sort)) {
          if (!this.ALLOWED_SORT_FIELDS.includes(field)) {
            errors.push(`Invalid sort field: ${field}`);
          }

          if (!this.ALLOWED_SORT_ORDERS.includes(order)) {
            errors.push(`Invalid sort order for ${field}: ${order}`);
          }

          if (errors.length === 0) {
            sanitizedSort[field] = order;
          }
        }
      } else {
        errors.push('sort parameter must be a string or object');
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedSort: errors.length === 0 ? sanitizedSort : null
      };

    } catch {
      return {
        isValid: false,
        errors: ['Invalid sort parameter format']
      };
    }
  }

  // Context7 Pattern: Individual field validators

  isValidItemId(itemId) {
    return Number.isInteger(itemId) &&
           itemId >= this.CONSTRAINTS.ITEM_ID.MIN &&
           itemId <= this.CONSTRAINTS.ITEM_ID.MAX;
  }

  isValidName(name) {
    return typeof name === 'string' &&
           name.trim().length >= this.CONSTRAINTS.NAME.MIN_LENGTH &&
           name.trim().length <= this.CONSTRAINTS.NAME.MAX_LENGTH;
  }

  isValidExamine(examine) {
    return !examine || (typeof examine === 'string' &&
           examine.length <= this.CONSTRAINTS.EXAMINE.MAX_LENGTH);
  }

  isValidValue(value) {
    return Number.isInteger(value) &&
           value >= this.CONSTRAINTS.VALUE.MIN &&
           value <= this.CONSTRAINTS.VALUE.MAX;
  }

  isValidWeight(weight) {
    return typeof weight === 'number' &&
           weight >= this.CONSTRAINTS.WEIGHT.MIN &&
           weight <= this.CONSTRAINTS.WEIGHT.MAX;
  }

  isValidBuyLimit(buyLimit) {
    return buyLimit === null || (Number.isInteger(buyLimit) &&
           buyLimit >= this.CONSTRAINTS.BUY_LIMIT.MIN &&
           buyLimit <= this.CONSTRAINTS.BUY_LIMIT.MAX);
  }

  isValidSearchTerm(searchTerm) {
    return typeof searchTerm === 'string' &&
           searchTerm.trim().length >= this.CONSTRAINTS.SEARCH_TERM.MIN_LENGTH &&
           searchTerm.trim().length <= this.CONSTRAINTS.SEARCH_TERM.MAX_LENGTH;
  }

  // Context7 Pattern: Data sanitization methods

  sanitizeItemData(itemData) {
    const sanitized = {};

    // Copy and sanitize string fields
    if (itemData.name) {
      sanitized.name = this.sanitizeString(itemData.name);
    }
    if (itemData.examine) {
      sanitized.examine = this.sanitizeString(itemData.examine);
    }
    if (itemData.icon) {
      sanitized.icon = this.sanitizeString(itemData.icon);
    }

    // Copy numeric fields
    if (itemData.itemId !== undefined) {
      sanitized.itemId = parseInt(itemData.itemId);
    }
    if (itemData.value !== undefined) {
      sanitized.value = parseInt(itemData.value);
    }
    if (itemData.lowalch !== undefined) {
      sanitized.lowalch = parseInt(itemData.lowalch);
    }
    if (itemData.highalch !== undefined) {
      sanitized.highalch = parseInt(itemData.highalch);
    }
    if (itemData.weight !== undefined) {
      sanitized.weight = parseFloat(itemData.weight);
    }
    if (itemData.buy_limit !== undefined) {
      sanitized.buy_limit = itemData.buy_limit ? parseInt(itemData.buy_limit) : null;
    }

    // Copy boolean fields
    if (itemData.members !== undefined) {
      sanitized.members = Boolean(itemData.members);
    }
    if (itemData.tradeable_on_ge !== undefined) {
      sanitized.tradeable_on_ge = Boolean(itemData.tradeable_on_ge);
    }
    if (itemData.stackable !== undefined) {
      sanitized.stackable = Boolean(itemData.stackable);
    }
    if (itemData.noted !== undefined) {
      sanitized.noted = Boolean(itemData.noted);
    }

    // Copy other fields as-is
    if (itemData.dataSource) {
      sanitized.dataSource = itemData.dataSource;
    }
    if (itemData.status) {
      sanitized.status = itemData.status;
    }

    return sanitized;
  }

  sanitizeString(str) {
    return typeof str === 'string' ? str.trim() : '';
  }

  parseBooleanParam(param) {
    if (typeof param === 'boolean') {
      return param;
    }
    if (typeof param === 'string') {
      const lower = param.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(param);
  }
}

module.exports = { ItemValidator };
