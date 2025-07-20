/**
 * ⚠️ Error Handler Middleware - Context7 Optimized
 *
 * Context7 Pattern: Centralized error handling middleware
 * - Single Responsibility: Error handling and response formatting
 * - Open/Closed: Extensible error handling strategies
 * - DRY: Eliminates duplicate error handling across controllers
 * - Strategy Pattern: Different error handling strategies for different error types
 * - Consistent error responses across the entire application
 */

const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class ErrorHandler {
  constructor() {
    this.logger = new Logger('ErrorHandler');
  }

  /**
   * Context7 Pattern: Main error handling middleware
   * SOLID Principle: Single responsibility for error handling
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static handle(error, req, res, next) {
    const errorHandler = new ErrorHandler();
    
    // Don't handle if response already sent
    if (res.headersSent) {
      return next(error);
    }

    // Log error with context
    errorHandler.logError(error, req);

    // Determine error type and respond accordingly
    const errorResponse = errorHandler.categorizeError(error, req);
    
    // Send appropriate response
    return errorHandler.sendErrorResponse(res, errorResponse);
  }

  /**
   * Context7 Pattern: Log error with comprehensive context
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   */
  logError(error, req) {
    const errorContext = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: this.sanitizeBody(req.body),
      userAgent: req.headers?.['user-agent'],
      ip: req.ip || req.connection?.remoteAddress,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    // Log different levels based on error type
    if (error.statusCode && error.statusCode < 500) {
      this.logger.warn('Client error occurred', error, errorContext);
    } else {
      this.logger.error('Server error occurred', error, errorContext);
    }
  }

  /**
   * Context7 Pattern: Categorize and format error response
   * Strategy Pattern: Different handling strategies for different error types
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @returns {Object} Standardized error response
   */
  categorizeError(error, req) {
    // Validation errors
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return {
        statusCode: 400,
        message: 'Validation failed',
        details: error.details || error.message,
        type: 'VALIDATION_ERROR'
      };
    }

    // Authentication errors
    if (error.name === 'UnauthorizedError' || error.statusCode === 401) {
      return {
        statusCode: 401,
        message: 'Authentication required',
        details: 'Please provide valid authentication credentials',
        type: 'AUTHENTICATION_ERROR'
      };
    }

    // Authorization errors
    if (error.name === 'ForbiddenError' || error.statusCode === 403) {
      return {
        statusCode: 403,
        message: 'Access forbidden',
        details: 'You do not have permission to access this resource',
        type: 'AUTHORIZATION_ERROR'
      };
    }

    // Not found errors
    if (error.name === 'NotFoundError' || error.statusCode === 404) {
      return {
        statusCode: 404,
        message: 'Resource not found',
        details: error.message || 'The requested resource was not found',
        type: 'NOT_FOUND_ERROR'
      };
    }

    // Rate limiting errors
    if (error.name === 'TooManyRequestsError' || error.statusCode === 429) {
      return {
        statusCode: 429,
        message: 'Too many requests',
        details: 'Please slow down your requests',
        type: 'RATE_LIMIT_ERROR'
      };
    }

    // MongoDB/Database errors
    if (error.name === 'MongoError' || error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
      return {
        statusCode: 503,
        message: 'Database service unavailable',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later',
        type: 'DATABASE_ERROR'
      };
    }

    // Duplicate key errors (MongoDB)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return {
        statusCode: 409,
        message: 'Resource already exists',
        details: `A record with this ${field} already exists`,
        type: 'DUPLICATE_ERROR'
      };
    }

    // Cast errors (MongoDB ObjectId)
    if (error.name === 'CastError') {
      return {
        statusCode: 400,
        message: 'Invalid resource identifier',
        details: 'The provided ID is not valid',
        type: 'INVALID_ID_ERROR'
      };
    }

    // JSON parsing errors
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return {
        statusCode: 400,
        message: 'Invalid JSON format',
        details: 'Request body contains invalid JSON',
        type: 'JSON_PARSE_ERROR'
      };
    }

    // Multer file upload errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: 413,
        message: 'File too large',
        details: 'The uploaded file exceeds the maximum size limit',
        type: 'FILE_SIZE_ERROR'
      };
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        message: 'Invalid token',
        details: 'The provided authentication token is invalid',
        type: 'TOKEN_ERROR'
      };
    }

    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        message: 'Token expired',
        details: 'The authentication token has expired',
        type: 'TOKEN_EXPIRED_ERROR'
      };
    }

    // Timeout errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return {
        statusCode: 504,
        message: 'Request timeout',
        details: 'The request took too long to process',
        type: 'TIMEOUT_ERROR'
      };
    }

    // Custom application errors with statusCode
    if (error.statusCode) {
      return {
        statusCode: error.statusCode,
        message: error.message || 'An error occurred',
        details: error.details || null,
        type: error.type || 'APPLICATION_ERROR'
      };
    }

    // Default server error
    return {
      statusCode: 500,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred',
      type: 'INTERNAL_ERROR'
    };
  }

  /**
   * Context7 Pattern: Send formatted error response
   * @param {Object} res - Express response object
   * @param {Object} errorResponse - Formatted error response
   */
  sendErrorResponse(res, errorResponse) {
    const { statusCode, message, details, type } = errorResponse;

    return ApiResponse.error(res, message, details, statusCode, {
      errorType: type,
      timestamp: new Date().toISOString(),
      requestId: res.locals.requestId || null
    });
  }

  /**
   * Context7 Pattern: Sanitize request body for logging
   * Removes sensitive information from logs
   * @param {Object} body - Request body
   * @returns {Object} Sanitized body
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'cookie',
      'session'
    ];

    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Context7 Pattern: 404 Not Found handler
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static notFound(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    error.type = 'ROUTE_NOT_FOUND';
    next(error);
  }

  /**
   * Context7 Pattern: Async error wrapper
   * Catches async errors and passes them to error handler
   * @param {Function} fn - Async function to wrap
   * @returns {Function} Wrapped function
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Context7 Pattern: Create custom application error
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} details - Additional error details
   * @param {string} type - Error type
   * @returns {Error} Custom error
   */
  static createError(message, statusCode = 500, details = null, type = 'APPLICATION_ERROR') {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.details = details;
    error.type = type;
    return error;
  }

  /**
   * Context7 Pattern: Request timeout middleware
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Function} Express middleware
   */
  static timeout(timeout = 30000) {
    return (req, res, next) => {
      const timer = setTimeout(() => {
        if (!res.headersSent) {
          const error = ErrorHandler.createError(
            'Request timeout',
            504,
            'The request took too long to process',
            'TIMEOUT_ERROR'
          );
          next(error);
        }
      }, timeout);

      res.on('finish', () => clearTimeout(timer));
      res.on('close', () => clearTimeout(timer));
      
      next();
    };
  }
}

module.exports = { ErrorHandler };