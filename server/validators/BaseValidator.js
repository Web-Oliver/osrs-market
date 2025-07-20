/**
 * 🔍 Base Validator - Context7 Optimized
 *
 * Context7 Pattern: Base Validation Class
 * - Shared validation logic
 * - Reusable validation methods
 * - Consistent error handling
 * - Type-safe validation patterns
 */

class BaseValidator {
  constructor() {
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
}

module.exports = { BaseValidator };
