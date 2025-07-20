/**
 * 🔧 Request Middleware - Context7 Optimized
 *
 * Context7 Pattern: Middleware Layer
 * - Request logging and tracking
 * - Security headers and CORS
 * - Rate limiting and throttling
 * - Request validation and sanitization
 * - Performance monitoring
 */

const { v4: uuidv4 } = require('uuid');
const { Logger } = require('../utils/Logger');
const { RateLimiter } = require('../utils/RateLimiter');
const { SecurityHeaders } = require('../utils/SecurityHeaders');
const { PerformanceMonitor } = require('../utils/PerformanceMonitor');


class RequestMiddleware {
  constructor() {
    this.logger = new Logger('RequestMiddleware');
    this.rateLimiter = new RateLimiter();
    this.securityHeadersManager = new SecurityHeaders();
    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Context7 Pattern: Request ID and logging middleware
   */
  requestTracking() {
    return (req, res, next) => {
      // Context7 Pattern: Add unique request ID
      req.id = uuidv4();
      req.startTime = Date.now();

      // Context7 Pattern: Enhanced request logging
      this.logger.info('Incoming request', {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        timestamp: new Date().toISOString()
      });

      // Context7 Pattern: Response logging
      const originalSend = res.send;
      const logger = this.logger;
      res.send = function(data) {
        const duration = Date.now() - req.startTime;

        logger.info('Response sent', {
          requestId: req.id,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: data ? data.length : 0,
          timestamp: new Date().toISOString()
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Context7 Pattern: Request logger with service context
   */
  requestLogger(serviceName) {
    return (req, res, next) => {
      // Context7 Pattern: Add unique request ID
      req.id = uuidv4();
      req.startTime = Date.now();
      req.serviceName = serviceName;

      // Context7 Pattern: Enhanced request logging with service context
      this.logger.info(`[${serviceName}] Incoming request`, {
        requestId: req.id,
        service: serviceName,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type'),
        contentLength: req.get('Content-Length'),
        timestamp: new Date().toISOString()
      });

      // Context7 Pattern: Response logging
      const originalSend = res.send;
      const logger = this.logger;
      res.send = function(data) {
        const duration = Date.now() - req.startTime;

        logger.info(`[${serviceName}] Response sent`, {
          requestId: req.id,
          service: serviceName,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          contentLength: data ? data.length : 0,
          timestamp: new Date().toISOString()
        });

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Context7 Pattern: Security headers middleware
   */
  securityHeaders() {
    return (req, res, next) => {
      // Context7 Pattern: Apply security headers
      this.securityHeadersManager.applyHeaders(res);

      this.logger.debug('Security headers applied', {
        requestId: req.id,
        headers: this.securityHeadersManager.getAppliedHeaders()
      });

      next();
    };
  }

  /**
   * Context7 Pattern: CORS middleware with options
   */
  cors(options = {}) {
    const defaultOptions = {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 86400 // 24 hours
    };

    const corsOptions = { ...defaultOptions, ...options };

    return (req, res, next) => {
      const origin = req.headers.origin;

      // Context7 Pattern: Dynamic origin checking
      if (corsOptions.origin.includes(origin) || corsOptions.origin.includes('*')) {
        res.header('Access-Control-Allow-Origin', origin);
      }

      res.header('Access-Control-Allow-Methods', corsOptions.methods.join(', '));
      res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(', '));
      res.header('Access-Control-Allow-Credentials', corsOptions.credentials);
      res.header('Access-Control-Max-Age', corsOptions.maxAge);

      // Context7 Pattern: Handle preflight requests
      if (req.method === 'OPTIONS') {
        this.logger.debug('CORS preflight request handled', {
          requestId: req.id,
          origin,
          method: req.headers['access-control-request-method']
        });

        return res.status(200).end();
      }

      this.logger.debug('CORS headers applied', {
        requestId: req.id,
        origin,
        method: req.method
      });

      next();
    };
  }

  /**
   * Context7 Pattern: Rate limiting middleware
   */
  rateLimit(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false
    };

    const rateLimitOptions = { ...defaultOptions, ...options };

    return async(req, res, next) => {
      try {
        const key = `rate_limit:${req.ip}`;
        const result = await this.rateLimiter.checkLimit(key, rateLimitOptions);

        // Context7 Pattern: Add rate limit headers
        res.set({
          'X-RateLimit-Limit': rateLimitOptions.max,
          'X-RateLimit-Remaining': result.remaining,
          'X-RateLimit-Reset': result.resetTime
        });

        if (result.exceeded) {
          this.logger.warn('Rate limit exceeded', {
            requestId: req.id,
            ip: req.ip,
            limit: rateLimitOptions.max,
            windowMs: rateLimitOptions.windowMs
          });

          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: rateLimitOptions.message,
            retryAfter: result.retryAfter
          });
        }

        this.logger.debug('Rate limit check passed', {
          requestId: req.id,
          ip: req.ip,
          remaining: result.remaining
        });

        next();
      } catch (error) {
        // Error handling moved to centralized manager - context: Rate limit middleware error

        // Context7 Pattern: Fail open for availability
        next();
      }
    };
  }

  /**
   * Context7 Pattern: Request validation middleware
   */
  validateRequest(schema) {
    return (req, res, next) => {
      try {
        // Context7 Pattern: Validate request body, query, and params
        const validation = this.validateRequestData(req, schema);

        if (!validation.isValid) {
          this.logger.warn('Request validation failed', {
            requestId: req.id,
            errors: validation.errors,
            method: req.method,
            url: req.originalUrl
          });

          return res.status(400).json({
            error: 'Validation failed',
            details: validation.errors
          });
        }

        this.logger.debug('Request validation passed', {
          requestId: req.id,
          method: req.method,
          url: req.originalUrl
        });

        next();
      } catch (error) {
        // Error handling moved to centralized manager - context: Request validation middleware error

        return res.status(500).json({
          error: 'Internal server error',
          message: 'Request validation failed'
        });
      }
    };
  }

  /**
   * Context7 Pattern: Request sanitization middleware
   */
  sanitizeRequest() {
    return (req, res, next) => {
      try {
        // Context7 Pattern: Sanitize request data
        if (req.body) {
          req.body = this.sanitizeObject(req.body);
        }

        if (req.query) {
          req.query = this.sanitizeObject(req.query);
        }

        if (req.params) {
          req.params = this.sanitizeObject(req.params);
        }

        this.logger.debug('Request sanitized', {
          requestId: req.id,
          hasBody: !!req.body,
          hasQuery: !!Object.keys(req.query).length,
          hasParams: !!Object.keys(req.params).length
        });

        next();
      } catch (error) {
        // Error handling moved to centralized manager - context: Request sanitization error

        return res.status(500).json({
          error: 'Internal server error',
          message: 'Request sanitization failed'
        });
      }
    };
  }

  /**
   * Context7 Pattern: Performance monitoring middleware
   */
  performanceMonitoring() {
    return (req, res, next) => {
      // Context7 Pattern: Start performance monitoring
      const monitor = this.performanceMonitor.startMonitoring(req.id);

      req.performanceMonitor = monitor;

      // Context7 Pattern: Monitor response
      const originalSend = res.send;
      const logger = this.logger;
      res.send = function(data) {
        const metrics = monitor.finish();

        if (metrics) {
          logger.info('Performance metrics', {
            requestId: req.id,
            duration: metrics.duration,
            memoryUsage: metrics.memoryUsage,
            cpuUsage: metrics.cpuUsage,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode
          });

          // Context7 Pattern: Add performance headers
          res.set({
            'X-Response-Time': `${metrics.duration}ms`,
            'X-Memory-Usage': `${metrics.memoryUsage}MB`,
            'X-Request-ID': req.id
          });
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Context7 Pattern: Request size limit middleware
   */
  requestSizeLimit(options = {}) {
    const defaultOptions = {
      limit: '10mb',
      message: 'Request entity too large'
    };

    const sizeOptions = { ...defaultOptions, ...options };

    return (req, res, next) => {
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const maxSize = this.parseSize(sizeOptions.limit);

      if (contentLength > maxSize) {
        this.logger.warn('Request size exceeded', {
          requestId: req.id,
          contentLength,
          maxSize,
          ip: req.ip
        });

        return res.status(413).json({
          error: 'Request entity too large',
          message: sizeOptions.message,
          maxSize: sizeOptions.limit
        });
      }

      this.logger.debug('Request size check passed', {
        requestId: req.id,
        contentLength,
        maxSize
      });

      next();
    };
  }

  /**
   * Context7 Pattern: API versioning middleware
   */
  apiVersioning() {
    return (req, res, next) => {
      // Context7 Pattern: Extract API version from header or URL
      const versionHeader = req.get('API-Version');
      const versionFromUrl = req.originalUrl.match(/\/v(\d+)\//);

      req.apiVersion = versionHeader ||
                      (versionFromUrl ? versionFromUrl[1] : '1');

      this.logger.debug('API version detected', {
        requestId: req.id,
        version: req.apiVersion,
        source: versionHeader ? 'header' : 'url'
      });

      // Context7 Pattern: Add version to response headers
      res.set('API-Version', req.apiVersion);

      next();
    };
  }

  // Context7 Pattern: Private helper methods

  /**
   * Validate request data against schema
   */
  validateRequestData(req, schema) {
    const errors = [];

    // Context7 Pattern: Validate different parts of request
    if (schema.body && req.body) {
      const bodyErrors = this.validateAgainstSchema(req.body, schema.body, 'body');
      errors.push(...bodyErrors);
    }

    if (schema.query && req.query) {
      const queryErrors = this.validateAgainstSchema(req.query, schema.query, 'query');
      errors.push(...queryErrors);
    }

    if (schema.params && req.params) {
      const paramErrors = this.validateAgainstSchema(req.params, schema.params, 'params');
      errors.push(...paramErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate data against schema
   */
  validateAgainstSchema(data, schema, location) {
    const errors = [];

    // Context7 Pattern: Basic validation logic
    for (const [field, rules] of Object.entries(schema)) {
      if (rules.required && !data[field]) {
        errors.push(`${location}.${field} is required`);
      }

      if (data[field] && rules.type && typeof data[field] !== rules.type) {
        errors.push(`${location}.${field} must be of type ${rules.type}`);
      }

      if (data[field] && rules.minLength && data[field].length < rules.minLength) {
        errors.push(`${location}.${field} must be at least ${rules.minLength} characters`);
      }

      if (data[field] && rules.maxLength && data[field].length > rules.maxLength) {
        errors.push(`${location}.${field} must not exceed ${rules.maxLength} characters`);
      }

      if (data[field] && rules.pattern && typeof data[field] === 'string') {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(data[field])) {
          errors.push(`${location}.${field} must match pattern ${rules.pattern}`);
        }
      }
    }

    return errors;
  }

  /**
   * Sanitize object by removing potentially dangerous content
   */
  sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      // Context7 Pattern: Sanitize keys and values
      const sanitizedKey = this.sanitizeString(key);

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string by removing potentially dangerous content
   */
  sanitizeString(str) {
    if (typeof str !== 'string') {
      return str;
    }

    // Context7 Pattern: Remove potentially dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Parse size string to bytes
   */
  parseSize(size) {
    const units = {
      b: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024
    };

    const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/);
    if (!match) {
      return parseInt(size) || 0;
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }
}

module.exports = { RequestMiddleware };
