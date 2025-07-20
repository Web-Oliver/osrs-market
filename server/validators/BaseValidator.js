/**
 * 🔍 Base Validator - Context7 Optimized
 *
 * Context7 Pattern: Base Validation Class
 * - Shared validation logic
 * - Reusable validation methods
 * - Consistent error handling
 * - Type-safe validation patterns
 * - DRY-compliant common validation patterns
 * - Standardized error message formatting
 * - Time-based validation utilities
 * - ID and range validation mixins
 * 
 * @description This is the core validation class that eliminates DRY violations
 * across the OSRS market application. All specific validators should extend this
 * class and use its common validation methods instead of implementing their own.
 * 
 * @example
 * // Extending BaseValidator
 * class MyValidator extends BaseValidator {
 *   validateMyData(data) {
 *     const idValidation = this.validateItemId(data.itemId);
 *     if (!idValidation.isValid) {
 *       return this.formatErrorResponse(idValidation.error);
 *     }
 *     return this.formatSuccessResponse(data);
 *   }
 * }
 * 
 * @author OSRS Market AI Team
 * @version 2.0.0
 * @since 1.0.0
 */

const TimeConstants = require('../utils/TimeConstants');

/**
 * BaseValidator class providing DRY-compliant validation patterns
 * @class BaseValidator
 */
class BaseValidator {
  /**
   * Creates an instance of BaseValidator
   * @constructor
   * @description Initializes the validator with an empty errors array
   */
  constructor() {
    /**
     * Array to store validation errors
     * @type {Array<string>}
     * @private
     */
    this.errors = [];
  }

  /**
   * Context7 Pattern: Main validation method
   */
  validateData(data, schema) {
    this.errors = [];

    // Validate each section of the schema
    for (const [section, rules] of Object.entries(schema)) {
      const sectionData = data[section] || {};
      this.validateSection(sectionData, rules, section);
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors
    };
  }

  /**
   * Context7 Pattern: Validate a section of data
   */
  validateSection(data, rules, sectionName) {
    for (const [field, rule] of Object.entries(rules)) {
      this.validateField(data[field], rule, `${sectionName}.${field}`);
    }
  }

  /**
   * Context7 Pattern: Validate individual field
   */
  validateField(value, rule, fieldPath) {
    // Check if field is required
    if (rule.required && (value === undefined || value === null || value === '')) {
      this.errors.push(`${fieldPath} is required`);
      return;
    }

    // Skip validation if field is optional and not provided
    if (rule.optional && (value === undefined || value === null)) {
      return;
    }

    // Type validation
    if (value !== undefined && value !== null) {
      this.validateType(value, rule, fieldPath);
    }
  }

  /**
   * Context7 Pattern: Validate field type
   */
  validateType(value, rule, fieldPath) {
    switch (rule.type) {
    case 'string':
      this.validateString(value, rule, fieldPath);
      break;
    case 'number':
      this.validateNumber(value, rule, fieldPath);
      break;
    case 'boolean':
      this.validateBoolean(value, rule, fieldPath);
      break;
    case 'array':
      this.validateArray(value, rule, fieldPath);
      break;
    case 'object':
      this.validateObject(value, rule, fieldPath);
      break;
    default:
      this.errors.push(`${fieldPath} has unknown type: ${rule.type}`);
    }
  }

  /**
   * Context7 Pattern: Validate string type
   */
  validateString(value, rule, fieldPath) {
    if (typeof value !== 'string') {
      this.errors.push(`${fieldPath} must be a string`);
      return;
    }

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      this.errors.push(`${fieldPath} must be at least ${rule.minLength} characters long`);
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      this.errors.push(`${fieldPath} must not exceed ${rule.maxLength} characters`);
    }

    // Enum validation
    if (rule.enum && !rule.enum.includes(value)) {
      this.errors.push(`${fieldPath} must be one of: ${rule.enum.join(', ')}`);
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      this.errors.push(`${fieldPath} does not match required pattern`);
    }
  }

  /**
   * Context7 Pattern: Validate number type
   */
  validateNumber(value, rule, fieldPath) {
    const numericValue = Number(value);

    if (isNaN(numericValue)) {
      this.errors.push(`${fieldPath} must be a valid number`);
      return;
    }

    // Range validation
    if (rule.min !== undefined && numericValue < rule.min) {
      this.errors.push(`${fieldPath} must be at least ${rule.min}`);
    }

    if (rule.max !== undefined && numericValue > rule.max) {
      this.errors.push(`${fieldPath} must not exceed ${rule.max}`);
    }

    // Integer validation
    if (rule.integer && !Number.isInteger(numericValue)) {
      this.errors.push(`${fieldPath} must be an integer`);
    }
  }

  /**
   * Context7 Pattern: Validate boolean type
   */
  validateBoolean(value, rule, fieldPath) {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      this.errors.push(`${fieldPath} must be a boolean`);
    }
  }

  /**
   * Context7 Pattern: Validate array type
   */
  validateArray(value, rule, fieldPath) {
    if (!Array.isArray(value)) {
      this.errors.push(`${fieldPath} must be an array`);
      return;
    }

    // Length validation
    if (rule.minItems && value.length < rule.minItems) {
      this.errors.push(`${fieldPath} must contain at least ${rule.minItems} items`);
    }

    if (rule.maxItems && value.length > rule.maxItems) {
      this.errors.push(`${fieldPath} must not contain more than ${rule.maxItems} items`);
    }

    // Item validation
    if (rule.items) {
      value.forEach((item, index) => {
        this.validateField(item, rule.items, `${fieldPath}[${index}]`);
      });
    }
  }

  /**
   * Context7 Pattern: Validate object type
   */
  validateObject(value, rule, fieldPath) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      this.errors.push(`${fieldPath} must be an object`);
      return;
    }

    // Properties validation
    if (rule.properties) {
      for (const [prop, propRule] of Object.entries(rule.properties)) {
        this.validateField(value[prop], propRule, `${fieldPath}.${prop}`);
      }
    }
  }

  /**
   * Context7 Pattern: Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Context7 Pattern: Validate URL format
   */
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Context7 Pattern: Validate timestamp
   */
  validateTimestamp(timestamp) {
    const numericTimestamp = Number(timestamp);

    if (isNaN(numericTimestamp)) {
      return { isValid: false, error: 'Timestamp must be a valid number' };
    }

    // Check if timestamp is reasonable (not too old, not too far in future)
    const now = Date.now();
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);

    if (numericTimestamp < oneYearAgo || numericTimestamp > oneYearFromNow) {
      return { isValid: false, error: 'Timestamp is outside reasonable range' };
    }

    return { isValid: true, timestamp: numericTimestamp };
  }

  /**
   * Context7 Pattern: Sanitize string input
   */
  sanitizeString(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  /**
   * Context7 Pattern: Validate IP address
   */
  validateIpAddress(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Context7 Pattern: Validate UUID format
   */
  validateUuid(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Context7 Pattern: Convert validation errors to response format
   */
  formatErrors(errors) {
    return errors.map(error => ({
      field: error.split(' ')[0],
      message: error,
      code: 'VALIDATION_ERROR'
    }));
  }

  /**
   * Context7 Pattern: Clear errors
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Context7 Pattern: Add custom error
   */
  addError(message) {
    this.errors.push(message);
  }

  /**
   * Context7 Pattern: Check if validation passed
   */
  isValid() {
    return this.errors.length === 0;
  }

  /**
   * Context7 Pattern: Get validation errors
   */
  getErrors() {
    return this.errors;
  }

  // =============================================================================
  // COMMON VALIDATION MIXINS - DRY Pattern Implementation
  // =============================================================================

  /**
   * Context7 Pattern: Validate integer with range (DRY pattern)
   * Replaces duplicate isValidInteger methods across validators
   * @param {*} value - Value to validate
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateInteger(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, fieldName = 'field') {
    if (value === undefined || value === null) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const numericValue = Number(value);
    
    if (isNaN(numericValue)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }

    if (!Number.isInteger(numericValue)) {
      return { isValid: false, error: `${fieldName} must be an integer` };
    }

    if (numericValue < min || numericValue > max) {
      return { 
        isValid: false, 
        error: `${fieldName} must be between ${min} and ${max}` 
      };
    }

    return { isValid: true, value: numericValue };
  }

  /**
   * Context7 Pattern: Validate float with range (DRY pattern)
   * Replaces duplicate isValidFloat methods across validators
   * @param {*} value - Value to validate
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateFloat(value, min = Number.MIN_VALUE, max = Number.MAX_VALUE, fieldName = 'field') {
    if (value === undefined || value === null) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const numericValue = Number(value);
    
    if (isNaN(numericValue) || !isFinite(numericValue)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }

    if (numericValue < min || numericValue > max) {
      return { 
        isValid: false, 
        error: `${fieldName} must be between ${min} and ${max}` 
      };
    }

    return { isValid: true, value: numericValue };
  }

  /**
   * Context7 Pattern: Validate string with length constraints (DRY pattern)
   * Replaces duplicate isValidString methods across validators
   * @param {*} value - Value to validate
   * @param {number} minLength - Minimum length
   * @param {number} maxLength - Maximum length
   * @param {string} fieldName - Field name for error messages
   * @param {boolean} required - Whether field is required
   * @returns {Object} Validation result
   */
  validateStringLength(value, minLength = 0, maxLength = Infinity, fieldName = 'field', required = true) {
    if (value === undefined || value === null || value === '') {
      if (required) {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true, value: '' };
    }

    if (typeof value !== 'string') {
      return { isValid: false, error: `${fieldName} must be a string` };
    }

    const trimmedValue = value.trim();
    
    if (trimmedValue.length < minLength) {
      return { 
        isValid: false, 
        error: `${fieldName} must be at least ${minLength} characters long` 
      };
    }

    if (trimmedValue.length > maxLength) {
      return { 
        isValid: false, 
        error: `${fieldName} must not exceed ${maxLength} characters` 
      };
    }

    return { isValid: true, value: trimmedValue };
  }

  /**
   * Context7 Pattern: Validate OSRS item ID (DRY pattern)
   * Centralized item ID validation used across multiple validators
   * @param {*} itemId - Item ID to validate
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateItemId(itemId, fieldName = 'itemId') {
    const validation = this.validateInteger(itemId, 1, 999999, fieldName);
    
    if (!validation.isValid) {
      return validation;
    }

    return { isValid: true, value: validation.value };
  }

  /**
   * Context7 Pattern: Validate limit parameter (DRY pattern)
   * Centralized limit validation used across multiple validators
   * @param {*} limit - Limit value to validate
   * @param {number} defaultLimit - Default limit if not provided
   * @param {number} maxLimit - Maximum allowed limit
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateLimit(limit, defaultLimit = 50, maxLimit = 1000, fieldName = 'limit') {
    if (limit === undefined || limit === null) {
      return { isValid: true, value: defaultLimit };
    }

    const validation = this.validateInteger(limit, 1, maxLimit, fieldName);
    
    if (!validation.isValid) {
      return validation;
    }

    return { isValid: true, value: validation.value };
  }

  /**
   * Context7 Pattern: Validate time range parameter (DRY pattern)
   * Centralized time range validation with TimeConstants
   * @param {*} timeRange - Time range to validate
   * @param {number} defaultRange - Default range if not provided
   * @param {number} maxRange - Maximum allowed range
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateTimeRange(timeRange, defaultRange = TimeConstants.ONE_HOUR, maxRange = TimeConstants.THIRTY_DAYS, fieldName = 'timeRange') {
    if (timeRange === undefined || timeRange === null) {
      return { isValid: true, value: defaultRange };
    }

    const validation = this.validateInteger(timeRange, TimeConstants.ONE_MINUTE, maxRange, fieldName);
    
    if (!validation.isValid) {
      return validation;
    }

    return { isValid: true, value: validation.value };
  }

  /**
   * Context7 Pattern: Enhanced timestamp validation (DRY pattern)
   * Replaces multiple timestamp validation implementations
   * @param {*} timestamp - Timestamp to validate
   * @param {string} fieldName - Field name for error messages
   * @param {boolean} allowFuture - Whether to allow future timestamps
   * @param {number} maxPastAge - Maximum age in milliseconds
   * @returns {Object} Validation result
   */
  validateTimestampEnhanced(timestamp, fieldName = 'timestamp', allowFuture = false, maxPastAge = TimeConstants.ONE_DAY) {
    if (timestamp === undefined || timestamp === null) {
      return { isValid: false, error: `${fieldName} is required` };
    }

    const numericTimestamp = Number(timestamp);

    if (isNaN(numericTimestamp)) {
      return { isValid: false, error: `${fieldName} must be a valid number` };
    }

    const now = Date.now();
    
    // Check if timestamp is too far in the past
    if (numericTimestamp < now - maxPastAge) {
      return { 
        isValid: false, 
        error: `${fieldName} cannot be more than ${Math.floor(maxPastAge / TimeConstants.ONE_HOUR)} hours old` 
      };
    }

    // Check if timestamp is in the future (when not allowed)
    if (!allowFuture && numericTimestamp > now + TimeConstants.ONE_MINUTE) {
      return { 
        isValid: false, 
        error: `${fieldName} cannot be more than 1 minute in the future` 
      };
    }

    // Check if timestamp is too far in the future (even when allowed)
    if (allowFuture && numericTimestamp > now + TimeConstants.ONE_DAY) {
      return { 
        isValid: false, 
        error: `${fieldName} cannot be more than 24 hours in the future` 
      };
    }

    return { isValid: true, value: numericTimestamp };
  }

  /**
   * Context7 Pattern: Validate percentage value (DRY pattern)
   * Common validation for success rates, efficiency metrics, etc.
   * @param {*} value - Percentage value to validate
   * @param {string} fieldName - Field name for error messages
   * @param {boolean} required - Whether field is required
   * @returns {Object} Validation result
   */
  validatePercentage(value, fieldName = 'percentage', required = true) {
    if (value === undefined || value === null) {
      if (required) {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true, value: 0 };
    }

    const validation = this.validateFloat(value, 0, 100, fieldName);
    
    if (!validation.isValid) {
      return validation;
    }

    return { isValid: true, value: validation.value };
  }

  /**
   * Context7 Pattern: Validate array with item validation (DRY pattern)
   * Generic array validation with individual item validation
   * @param {*} array - Array to validate
   * @param {number} minItems - Minimum number of items
   * @param {number} maxItems - Maximum number of items
   * @param {Function} itemValidator - Function to validate each item
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateArray(array, minItems = 0, maxItems = 1000, itemValidator = null, fieldName = 'array') {
    if (!Array.isArray(array)) {
      return { isValid: false, error: `${fieldName} must be an array` };
    }

    if (array.length < minItems) {
      return { 
        isValid: false, 
        error: `${fieldName} must contain at least ${minItems} items` 
      };
    }

    if (array.length > maxItems) {
      return { 
        isValid: false, 
        error: `${fieldName} must not contain more than ${maxItems} items` 
      };
    }

    // Validate individual items if validator provided
    if (itemValidator && typeof itemValidator === 'function') {
      const errors = [];
      const validatedItems = [];

      array.forEach((item, index) => {
        const validation = itemValidator(item, index);
        if (!validation.isValid) {
          errors.push(`${fieldName}[${index}]: ${validation.error}`);
        } else {
          validatedItems.push(validation.value || item);
        }
      });

      if (errors.length > 0) {
        return { isValid: false, errors };
      }

      return { isValid: true, value: validatedItems };
    }

    return { isValid: true, value: array };
  }

  /**
   * Context7 Pattern: Standardized error response formatting (DRY pattern)
   * Consistent error response structure across all validators
   * @param {Array|string} errors - Error messages
   * @param {string} code - Error code
   * @returns {Object} Formatted error response
   */
  formatErrorResponse(errors, code = 'VALIDATION_ERROR') {
    const errorArray = Array.isArray(errors) ? errors : [errors];
    
    return {
      isValid: false,
      errors: errorArray.map(error => ({
        message: error,
        code,
        timestamp: Date.now()
      }))
    };
  }

  /**
   * Context7 Pattern: Standardized success response formatting (DRY pattern)
   * Consistent success response structure across all validators
   * @param {*} data - Validated data
   * @param {string} message - Success message
   * @returns {Object} Formatted success response
   */
  formatSuccessResponse(data = null, message = 'Validation successful') {
    return {
      isValid: true,
      data,
      message,
      timestamp: Date.now()
    };
  }

  /**
   * Context7 Pattern: Validate enum value (DRY pattern)
   * Generic enum validation used across validators
   * @param {*} value - Value to validate
   * @param {Array} allowedValues - Array of allowed values
   * @param {string} fieldName - Field name for error messages
   * @param {boolean} required - Whether field is required
   * @returns {Object} Validation result
   */
  validateEnum(value, allowedValues, fieldName = 'field', required = true) {
    if (value === undefined || value === null) {
      if (required) {
        return { isValid: false, error: `${fieldName} is required` };
      }
      return { isValid: true, value: allowedValues[0] }; // Default to first value
    }

    if (!allowedValues.includes(value)) {
      return { 
        isValid: false, 
        error: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
      };
    }

    return { isValid: true, value };
  }

  /**
   * Context7 Pattern: Enhanced security string validation (DRY pattern)
   * Validates strings for potentially malicious content
   * @param {*} value - String to validate
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateSecureString(value, fieldName = 'field') {
    if (typeof value !== 'string') {
      return { isValid: false, error: `${fieldName} must be a string` };
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

    if (dangerousPatterns.some(pattern => pattern.test(value))) {
      return { 
        isValid: false, 
        error: `${fieldName} contains invalid or potentially dangerous characters` 
      };
    }

    return { isValid: true, value: this.sanitizeString(value) };
  }
}

module.exports = { BaseValidator };
