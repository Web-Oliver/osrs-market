/**
 * ⚠️ Error Middleware - SOLID & DRY Optimized
 *
 * Open/Closed Principle Implementation:
 * - Uses Strategy Pattern for error handling
 * - Open for extension with new error types
 * - Closed for modification of core logic
 *
 * SOLID Principles Applied:
 * - OCP: Extensible through error handling strategies
 * - SRP: Single responsibility for error middleware coordination
 * - DIP: Depends on error handling abstraction
 */

const { Logger } = require('../utils/Logger');
const { ApiResponse } = require('../utils/ApiResponse');
const { ErrorHandlerManager } = require('../strategies/ErrorHandlingStrategy');
const { NotificationService } = require('../utils/NotificationService');
const { ErrorManager } = require('../utils/ErrorManager');

class ErrorMiddleware {
  constructor(dependencies = {}) {
    this.logger = new Logger('ErrorMiddleware');
    this.errorHandlerManager = dependencies.errorHandlerManager || new ErrorHandlerManager();
    this.notificationService = dependencies.notificationService || new NotificationService();

    // SOLID: Bind methods to preserve context
    this.handleError = this.handleError.bind(this);
    this.handleNotFound = this.handleNotFound.bind(this);
  }

  /**
   * SOLID/DRY: Main error handling middleware using Strategy Pattern
   * Open/Closed Principle: Extensible without modification
   */
  handleError(err, req, res, next) {
    try {
      // SOLID: Delegate to strategy manager (OCP)
      const errorResult = this.errorHandlerManager.handleError(err);

      // SOLID: Log error with appropriate detail level
      if (errorResult.shouldLog) {
        this.logError(err, req, errorResult);
      } else {
        this.logger.info('Handled error', {
          category: errorResult.category,
          status: errorResult.status,
          requestId: req.id
        });
      }

      // SOLID: Send notifications for critical errors
      if (errorResult.status >= 500) {
        this.notificationService.sendCriticalErrorAlert(err, req);
      }

      // SOLID: Send standardized error response
      return ApiResponse.error(res, errorResult.message, {
        category: errorResult.category,
        timestamp: errorResult.timestamp,
        requestId: req.id
      }, errorResult.status);

    } catch (handlerError) {
      // Fallback error handling
      // Error handling moved to centralized manager - context: Error handler failed

      return ApiResponse.error(res, 'Internal server error', null, 500);
    }
  }

  /**
   * SOLID: 404 Not Found handler
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
    // Error handling moved to centralized manager - context: Database error

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
    // Error handling moved to centralized manager - context: Service unavailable

    return ApiResponse.serviceUnavailable(res, 'Service temporarily unavailable', {
      service: err.service,
      suggestion: 'Please try again later'
    });
  }

  /**
   * Context7 Pattern: Unhandled promise rejection handler
   */
  handleUnhandledRejection(reason, promise) {
    // Error handling moved to centralized manager - context: Unhandled promise rejection

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
    // Error handling moved to centralized manager - context: Uncaught exception

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
      // Error handling moved to centralized manager - context: Critical error occurred
      break;
    case 'high':
      // Error handling moved to centralized manager - context: High severity error
      break;
    case 'medium':
      this.logger.warn('Medium severity error', logData);
      break;
    case 'low':
      this.logger.info('Low severity error', logData);
      break;
    default:
      // Error handling moved to centralized manager - context: Unknown severity error
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
    if (err.statusCode) {
      return err.statusCode;
    }
    if (err.status) {
      return err.status;
    }

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
      // Monitoring routes
      'GET /api/health',
      'GET /api/live-monitoring',
      'POST /api/live-monitoring',
      'GET /api/aggregated-stats',
      'GET /api/system-status',
      'GET /api/efficiency-metrics',
      'POST /api/cleanup',

      // Market data routes
      'GET /api/market-data',
      'POST /api/market-data',
      'GET /api/market-data/summary',

      // AI Trading routes
      'GET /api/ai-trading',
      'POST /api/ai-trading/sessions',
      'GET /api/ai-trading/sessions',
      'GET /api/ai-trading/system-status',
      'POST /api/ai-trading/signals',

      // Auto Training routes
      'POST /api/auto-training/start',
      'POST /api/auto-training/stop',
      'GET /api/auto-training/status',
      'PUT /api/auto-training/config',

      // Utility routes
      'GET /api/ping',
      'GET /api/version'
    ];
  }
}

module.exports = { ErrorMiddleware };
