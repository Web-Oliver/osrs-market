/**
 * 🛡️ Validation Middleware Factory - Context7 Optimized
 *
 * Context7 Pattern: Middleware factory implementing validation patterns
 * - Single Responsibility: Request validation
 * - Open/Closed: Extensible validation strategies
 * - DRY: Eliminates repetitive validation code across routes
 * - Strategy Pattern: Different validation strategies for different needs
 * - Factory Pattern: Creates validation middleware dynamically
 */

const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class ValidationMiddleware {
  constructor() {
    this.logger = new Logger('ValidationMiddleware');
  }

  /**
   * Context7 Pattern: Validate request using schema
   * Creates validation middleware for specific validation schema
   */
  validate(schema, options = {}) {
    return ValidationMiddleware.create(
      (req) => this.validateSchema(req, schema),
      options
    );
  }

  /**
   * Context7 Pattern: Validate request against schema
   * Internal method for schema validation
   */
  validateSchema(req, schema) {
    const errors = [];
    
    // Validate each section of the schema
    for (const [section, sectionSchema] of Object.entries(schema)) {
      const data = req[section];
      if (!data) continue;
      
      for (const [field, rules] of Object.entries(sectionSchema)) {
        const value = data[field];
        const fieldResult = this.validateField(value, rules, `${section}.${field}`);
        
        if (!fieldResult.isValid) {
          errors.push(...fieldResult.errors);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      sanitized: req
    };
  }

  /**
   * Context7 Pattern: Create validation middleware
   * SOLID Principle: Single responsibility for validation
   * @param {Function} validator - Validation function
   * @param {Object} options - Validation options
   * @returns {Function} Express middleware function
   */
  static create(validator, options = {}) {
    const {
      validateBody = true,
      validateParams = false,
      validateQuery = false,
      allowUnknown = false,
      stripUnknown = false
    } = options;

    return (req, res, next) => {
      try {
        const validationTarget = {};

        // Build validation target based on options
        if (validateBody) {
          validationTarget.body = req.body;
        }
        if (validateParams) {
          validationTarget.params = req.params;
        }
        if (validateQuery) {
          validationTarget.query = req.query;
        }

        // Execute validation
        const result = validator(validationTarget);

        if (!result.isValid) {
          return ApiResponse.badRequest(res, 'Validation failed', {
            errors: result.errors,
            received: stripUnknown ? undefined : validationTarget
          });
        }

        // Optionally strip unknown fields
        if (stripUnknown && result.sanitized) {
          if (validateBody) {
            req.body = result.sanitized.body || req.body;
          }
          if (validateParams) {
            req.params = result.sanitized.params || req.params;
          }
          if (validateQuery) {
            req.query = result.sanitized.query || req.query;
          }
        }

        next();
      } catch (error) {
        const logger = new Logger('ValidationMiddleware');
        logger.error('Validation middleware error', error, {
          url: req.url,
          method: req.method
        });

        return ApiResponse.internalServerError(res, 'Validation error occurred');
      }
    };
  }

  /**
   * Context7 Pattern: Create schema-based validation middleware
   * Strategy Pattern: Different validation strategies
   * @param {Object} schema - Validation schema
   * @param {Object} options - Validation options
   * @returns {Function} Express middleware function
   */
  static createSchema(schema, options = {}) {
    return ValidationMiddleware.create((data) => {
      return ValidationMiddleware.validateSchema(data, schema, options);
    }, options);
  }

  /**
   * Context7 Pattern: Schema validation implementation
   * @param {Object} data - Data to validate
   * @param {Object} schema - Validation schema
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  static validateSchema(data, schema, options = {}) {
    const errors = [];
    const sanitized = {};

    for (const [section, sectionSchema] of Object.entries(schema)) {
      const sectionData = data[section] || {};
      const sectionResult = ValidationMiddleware.validateSection(
        sectionData,
        sectionSchema,
        section,
        options
      );

      errors.push(...sectionResult.errors);
      sanitized[section] = sectionResult.sanitized;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: options.stripUnknown ? sanitized : undefined
    };
  }

  /**
   * Context7 Pattern: Section validation
   * @param {Object} data - Section data to validate
   * @param {Object} schema - Section schema
   * @param {string} sectionName - Name of section
   * @param {Object} options - Validation options
   * @returns {Object} Section validation result
   */
  static validateSection(data, schema, sectionName, options = {}) {
    const errors = [];
    const sanitized = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldPath = `${sectionName}.${field}`;

      const fieldResult = ValidationMiddleware.validateField(
        value,
        rules,
        fieldPath,
        options
      );

      errors.push(...fieldResult.errors);

      if (fieldResult.isValid || options.allowUnknown) {
        sanitized[field] = fieldResult.sanitized !== undefined ? fieldResult.sanitized : value;
      }
    }

    // Handle unknown fields
    if (!options.allowUnknown) {
      const unknownFields = Object.keys(data).filter(key => !schema[key]);
      unknownFields.forEach(field => {
        errors.push(`${sectionName}.${field} is not allowed`);
      });
    }

    return { errors, sanitized };
  }

  /**
   * Context7 Pattern: Field validation
   * @param {*} value - Field value
   * @param {Object} rules - Validation rules
   * @param {string} fieldPath - Field path for errors
   * @param {Object} options - Validation options
   * @returns {Object} Field validation result
   */
  static validateField(value, rules, fieldPath, options = {}) {
    const errors = [];
    let sanitized = value;

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldPath} is required`);
      return { errors, isValid: false };
    }

    // Skip further validation if value is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return { errors, isValid: true, sanitized: undefined };
    }

    // Type validation
    if (rules.type) {
      const typeResult = ValidationMiddleware.validateType(value, rules.type, fieldPath);
      errors.push(...typeResult.errors);
      if (typeResult.sanitized !== undefined) {
        sanitized = typeResult.sanitized;
      }
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldPath} must be at least ${rules.minLength} characters long`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldPath} must be no more than ${rules.maxLength} characters long`);
    }

    // Range validation
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldPath} must be at least ${rules.min}`);
    }

    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldPath} must be no more than ${rules.max}`);
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldPath} format is invalid`);
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldPath} must be one of: ${rules.enum.join(', ')}`);
    }

    // Custom validation
    if (rules.custom && typeof rules.custom === 'function') {
      try {
        const customResult = rules.custom(value, fieldPath);
        if (customResult !== true) {
          errors.push(customResult || `${fieldPath} failed custom validation`);
        }
      } catch (error) {
        errors.push(`${fieldPath} custom validation error: ${error.message}`);
      }
    }

    return {
      errors,
      isValid: errors.length === 0,
      sanitized
    };
  }

  /**
   * Context7 Pattern: Type validation with conversion
   * Strategy Pattern: Different type validation strategies
   * @param {*} value - Value to validate
   * @param {string} type - Expected type
   * @param {string} fieldPath - Field path for errors
   * @returns {Object} Type validation result
   */
  static validateType(value, type, fieldPath) {
    const errors = [];
    let sanitized = value;

    switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        sanitized = String(value);
      }
      break;

    case 'number':
      if (typeof value !== 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${fieldPath} must be a valid number`);
        } else {
          sanitized = num;
        }
      }
      break;

    case 'integer':
      if (!Number.isInteger(Number(value))) {
        errors.push(`${fieldPath} must be an integer`);
      } else {
        sanitized = parseInt(value);
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        if (value === 'true' || value === '1' || value === 1) {
          sanitized = true;
        } else if (value === 'false' || value === '0' || value === 0) {
          sanitized = false;
        } else {
          errors.push(`${fieldPath} must be a boolean`);
        }
      }
      break;

    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${fieldPath} must be an array`);
      }
      break;

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(`${fieldPath} must be an object`);
      }
      break;

    case 'email':
      if (typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${fieldPath} must be a valid email address`);
        }
      } else {
        errors.push(`${fieldPath} must be a string email address`);
      }
      break;

    case 'url':
      if (typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          errors.push(`${fieldPath} must be a valid URL`);
        }
      } else {
        errors.push(`${fieldPath} must be a string URL`);
      }
      break;

    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        errors.push(`${fieldPath} must be a valid date`);
      } else {
        sanitized = date;
      }
      break;

    default:
      errors.push(`Unknown validation type: ${type}`);
    }

    return { errors, sanitized };
  }

  /**
   * Context7 Pattern: Quick validation middleware for common patterns
   * Factory Pattern: Pre-configured validation strategies
   */
  static required(fields) {
    return ValidationMiddleware.create((data) => {
      const errors = [];

      fields.forEach(field => {
        const value = data.body?.[field] || data.params?.[field] || data.query?.[field];
        if (value === undefined || value === null || value === '') {
          errors.push(`${field} is required`);
        }
      });

      return { isValid: errors.length === 0, errors };
    });
  }

  /**
   * Context7 Pattern: Pagination validation middleware
   */
  static pagination(options = {}) {
    const schema = {
      query: {
        page: { type: 'integer', min: 1, required: false },
        limit: { type: 'integer', min: 1, max: options.maxLimit || 100, required: false },
        sort: { type: 'string', required: false },
        order: { type: 'string', enum: ['asc', 'desc'], required: false }
      }
    };

    return ValidationMiddleware.createSchema(schema, { validateQuery: true });
  }

  /**
   * Context7 Pattern: ID parameter validation
   */
  static mongoId(paramName = 'id') {
    return ValidationMiddleware.create((data) => {
      const id = data.params?.[paramName];
      const mongoIdRegex = /^[0-9a-fA-F]{24}$/;

      if (!id || !mongoIdRegex.test(id)) {
        return {
          isValid: false,
          errors: [`${paramName} must be a valid MongoDB ObjectId`]
        };
      }

      return { isValid: true, errors: [] };
    }, { validateParams: true });
  }

  /**
   * Context7 Pattern: Request tracking middleware
   * Adds unique request ID and tracking metadata
   */
  requestTracking() {
    return (req, res, next) => {
      // Generate unique request ID
      req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request metadata
      req.metadata = {
        startTime: Date.now(),
        userAgent: req.get('User-Agent'),
        clientIp: req.ip || req.connection.remoteAddress,
        method: req.method,
        url: req.url
      };

      // Add request ID to response headers
      res.setHeader('X-Request-ID', req.id);

      this.logger.debug('Request tracked', {
        requestId: req.id,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent')
      });

      next();
    };
  }

  /**
   * Context7 Pattern: Performance monitoring middleware
   * Tracks request performance metrics
   */
  performanceMonitoring() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(...args) {
        const duration = Date.now() - startTime;
        
        // Log performance metrics
        if (req.logger) {
          req.logger.debug('Request completed', {
            requestId: req.id,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration: `${duration}ms`
          });
        }

        // Add performance headers
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Timestamp', new Date().toISOString());

        // Call original end method
        originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Context7 Pattern: Security headers middleware
   * Adds basic security headers
   */
  securityHeaders() {
    return (req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      next();
    };
  }

  /**
   * Context7 Pattern: Rate limiting validation
   * Basic rate limiting for API endpoints
   */
  rateLimit(options = {}) {
    const { 
      windowMs = 15 * 60 * 1000, // 15 minutes
      maxRequests = 100,
      message = 'Too many requests, please try again later'
    } = options;

    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      
      // Clean old entries
      for (const [ip, data] of requests.entries()) {
        if (now - data.resetTime > windowMs) {
          requests.delete(ip);
        }
      }

      // Get or create request data
      let requestData = requests.get(key);
      if (!requestData || now - requestData.resetTime > windowMs) {
        requestData = {
          count: 0,
          resetTime: now
        };
        requests.set(key, requestData);
      }

      // Check rate limit
      if (requestData.count >= maxRequests) {
        return ApiResponse.tooManyRequests(res, message, {
          retryAfter: Math.ceil((requestData.resetTime + windowMs - now) / 1000)
        });
      }

      // Increment counter
      requestData.count++;

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestData.count));
      res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime + windowMs).toISOString());

      next();
    };
  }

  /**
   * Context7 Pattern: Request size limit middleware
   * Limits the size of incoming requests
   */
  requestSizeLimit(options = {}) {
    const { limit = '10mb', message = 'Request entity too large' } = options;
    
    return (req, res, next) => {
      // Parse limit to bytes
      const limitBytes = this.parseSize(limit);
      
      // Check content-length header
      const contentLength = parseInt(req.get('content-length') || '0');
      
      if (contentLength > limitBytes) {
        return ApiResponse.badRequest(res, message, {
          limit,
          received: `${Math.round(contentLength / 1024)}KB`,
          maxAllowed: `${Math.round(limitBytes / 1024)}KB`
        });
      }
      
      next();
    };
  }

  /**
   * Helper method to parse size strings to bytes
   */
  parseSize(size) {
    if (typeof size === 'number') return size;
    
    const units = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';
    
    return Math.floor(value * (units[unit] || 1));
  }
}

module.exports = { ValidationMiddleware };
