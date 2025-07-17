/**
 * ⚠️ Error Middleware - Context7 Optimized
 * 
 * Context7 Pattern: Error Handling Middleware
 * - Centralized error handling
 * - Proper error logging and monitoring
 * - Graceful error responses
 * - Security-conscious error disclosure
 * - Performance impact monitoring
 */

const { Logger } = require('../utils/Logger');
const { ApiResponse } = require('../utils/ApiResponse');
const { ErrorClassifier } = require('../utils/ErrorClassifier');
const { NotificationService } = require('../utils/NotificationService');

class ErrorMiddleware {
  constructor() {
    this.logger = new Logger('ErrorMiddleware');
    this.errorClassifier = new ErrorClassifier();
    this.notificationService = new NotificationService();
    
    // Context7 Pattern: Bind methods to preserve context
    this.handleError = this.handleError.bind(this);
    this.handleNotFound = this.handleNotFound.bind(this);
    this.handleValidationError = this.handleValidationError.bind(this);
    this.handleDatabaseError = this.handleDatabaseError.bind(this);
    this.handleAsyncError = this.handleAsyncError.bind(this);
  }

  /**
   * Context7 Pattern: Main error handling middleware
   */
  handleError(err, req, res, next) {
    try {
      // Context7 Pattern: Classify error for appropriate handling
      const errorInfo = this.errorClassifier.classify(err);
      
      // Context7 Pattern: Log error with context
      this.logError(err, req, errorInfo);
      
      // Context7 Pattern: Send notifications for critical errors
      if (errorInfo.severity === 'critical') {
        this.notificationService.sendCriticalErrorAlert(err, req);
      }
      
      // Context7 Pattern: Generate appropriate response
      const response = this.generateErrorResponse(err, req, errorInfo);
      
      // Context7 Pattern: Set appropriate HTTP status code
      const statusCode = this.getStatusCode(err, errorInfo);
      
      // Context7 Pattern: Send error response
      return ApiResponse.error(res, response.message, response.details, statusCode);
    } catch (handlerError) {
      // Context7 Pattern: Fallback error handling
      this.logger.error('Error handler itself failed', handlerError, {
        originalError: err.message,
        requestId: req.id
      });
      
      return ApiResponse.error(res, 'Internal server error', null, 500);
    }
  }

  /**
   * Context7 Pattern: 404 Not Found handler
   */
  handleNotFound(req, res, next) {
    this.logger.warn('Route not found', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return ApiResponse.notFound(res, 'Resource not found', {
      method: req.method,
      url: req.originalUrl,
      availableEndpoints: this.getAvailableEndpoints(),
      suggestion: 'Please check the URL and try again'
    });
  }

  /**
   * Context7 Pattern: Validation error handler
   */
  handleValidationError(err, req, res, next) {
    this.logger.warn('Validation error', {
      requestId: req.id,
      error: err.message,
      details: err.details,
      method: req.method,
      url: req.originalUrl
    });

    return ApiResponse.badRequest(res, 'Validation failed', {
      errors: err.details || err.errors || [],
      fields: err.fields || [],
      suggestion: 'Please check the request data and try again'
    });
  }

  /**
   * Context7 Pattern: Database error handler
   */
  handleDatabaseError(err, req, res, next) {
    this.logger.error('Database error', err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      body: this.sanitizeForLog(req.body)
    });

    // Context7 Pattern: Don't expose database details to client
    if (process.env.NODE_ENV === 'production') {
      return ApiResponse.error(res, 'Database operation failed', null, 500);
    } else {
      return ApiResponse.error(res, 'Database operation failed', {
        error: err.message,
        code: err.code,
        details: err.details
      }, 500);
    }
  }

  /**
   * Context7 Pattern: Async error wrapper
   */
  handleAsyncError(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Context7 Pattern: Rate limit error handler
   */
  handleRateLimitError(err, req, res, next) {
    this.logger.warn('Rate limit exceeded', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      limit: err.limit,
      remaining: err.remaining,
      resetTime: err.resetTime
    });

    return ApiResponse.rateLimit(res, 'Too many requests', {
      limit: err.limit,
      remaining: err.remaining,
      resetTime: err.resetTime,
      retryAfter: err.retryAfter,
      suggestion: 'Please wait before making another request'
    });
  }

  /**
   * Context7 Pattern: Authentication error handler
   */
  handleAuthError(err, req, res, next) {
    this.logger.warn('Authentication error', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      error: err.message
    });

    return ApiResponse.unauthorized(res, 'Authentication failed', {
      error: err.message,
      suggestion: 'Please provide valid authentication credentials'
    });
  }

  /**
   * Context7 Pattern: Authorization error handler
   */
  handleAuthorizationError(err, req, res, next) {
    this.logger.warn('Authorization error', {
      requestId: req.id,
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      error: err.message,
      requiredRole: err.requiredRole,
      userRole: err.userRole
    });

    return ApiResponse.forbidden(res, 'Access denied', {
      error: err.message,
      suggestion: 'You do not have permission to access this resource'
    });
  }

  /**
   * Context7 Pattern: Timeout error handler
   */
  handleTimeoutError(err, req, res, next) {
    this.logger.warn('Request timeout', {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      timeout: err.timeout,
      duration: Date.now() - req.startTime
    });

    return ApiResponse.timeout(res, 'Request timeout', {
      timeout: err.timeout,
      suggestion: 'The request took too long to complete. Please try again.'
    });
  }

  /**
   * Context7 Pattern: Service unavailable error handler
   */
  handleServiceUnavailableError(err, req, res, next) {
    this.logger.error('Service unavailable', err, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      service: err.service
    });

    return ApiResponse.serviceUnavailable(res, 'Service temporarily unavailable', {
      service: err.service,
      suggestion: 'Please try again later'
    });
  }

  /**
   * Context7 Pattern: Unhandled promise rejection handler
   */
  handleUnhandledRejection(reason, promise) {
    this.logger.error('Unhandled promise rejection', reason, {
      promise: promise.toString(),
      stack: reason.stack
    });

    // Context7 Pattern: Send critical alert
    this.notificationService.sendCriticalErrorAlert(reason, null);

    // Context7 Pattern: Don't exit process in production
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }

  /**
   * Context7 Pattern: Uncaught exception handler
   */
  handleUncaughtException(err) {
    this.logger.error('Uncaught exception', err, {
      stack: err.stack
    });

    // Context7 Pattern: Send critical alert
    this.notificationService.sendCriticalErrorAlert(err, null);

    // Context7 Pattern: Graceful shutdown
    process.exit(1);
  }

  // Context7 Pattern: Private helper methods

  /**
   * Log error with appropriate level and context
   */
  logError(err, req, errorInfo) {
    const logData = {
      requestId: req.id,
      error: err.message,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: this.sanitizeForLog(req.body),
      query: req.query,
      params: req.params,
      severity: errorInfo.severity,
      category: errorInfo.category,
      timestamp: new Date().toISOString()
    };

    // Context7 Pattern: Log with appropriate level
    switch (errorInfo.severity) {
      case 'critical':
        this.logger.error('Critical error occurred', err, logData);
        break;
      case 'high':
        this.logger.error('High severity error', err, logData);
        break;
      case 'medium':
        this.logger.warn('Medium severity error', logData);
        break;
      case 'low':
        this.logger.info('Low severity error', logData);
        break;
      default:
        this.logger.error('Unknown severity error', err, logData);
    }
  }

  /**
   * Generate appropriate error response
   */
  generateErrorResponse(err, req, errorInfo) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Context7 Pattern: Different responses for production vs development
    if (isProduction) {
      return {
        message: this.getProductionErrorMessage(errorInfo),
        details: this.getProductionErrorDetails(errorInfo)
      };
    } else {
      return {
        message: err.message || 'An error occurred',
        details: {
          error: err.message,
          stack: err.stack,
          code: err.code,
          severity: errorInfo.severity,
          category: errorInfo.category
        }
      };
    }
  }

  /**
   * Get HTTP status code for error
   */
  getStatusCode(err, errorInfo) {
    // Context7 Pattern: Map error types to status codes
    if (err.statusCode) return err.statusCode;
    if (err.status) return err.status;
    
    switch (errorInfo.category) {
      case 'validation':
        return 400;
      case 'authentication':
        return 401;
      case 'authorization':
        return 403;
      case 'not_found':
        return 404;
      case 'rate_limit':
        return 429;
      case 'timeout':
        return 408;
      case 'service_unavailable':
        return 503;
      case 'database':
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Get production-safe error message
   */
  getProductionErrorMessage(errorInfo) {
    const messages = {
      validation: 'Invalid request data',
      authentication: 'Authentication failed',
      authorization: 'Access denied',
      not_found: 'Resource not found',
      rate_limit: 'Too many requests',
      timeout: 'Request timeout',
      service_unavailable: 'Service temporarily unavailable',
      database: 'Database operation failed',
      default: 'Internal server error'
    };

    return messages[errorInfo.category] || messages.default;
  }

  /**
   * Get production-safe error details
   */
  getProductionErrorDetails(errorInfo) {
    if (errorInfo.category === 'validation') {
      return {
        suggestion: 'Please check the request data and try again'
      };
    }
    
    return null;
  }

  /**
   * Sanitize data for logging
   */
  sanitizeForLog(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Context7 Pattern: Remove sensitive data from logs
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Get available endpoints for 404 responses
   */
  getAvailableEndpoints() {
    return [
      'GET /api/health',
      'GET /api/live-monitoring',
      'POST /api/live-monitoring',
      'GET /api/aggregated-stats',
      'GET /api/system-status',
      'GET /api/efficiency-metrics',
      'GET /api/market-data',
      'POST /api/market-data',
      'POST /api/cleanup'
    ];
  }
}

module.exports = { ErrorMiddleware };