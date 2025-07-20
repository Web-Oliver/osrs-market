/**
 * 🚨 Error Handling Strategy Pattern - Context7 Pattern
 *
 * Open/Closed Principle Implementation:
 * - Open for extension with new error types
 * - Closed for modification of core error handling logic
 * - Eliminates hard-coded switch statements
 * - Supports dynamic error classification and handling
 *
 * SOLID Principles Applied:
 * - OCP: Extensible without modifying existing code
 * - SRP: Single responsibility for error classification
 * - ISP: Focused interfaces for error handling
 */

/**
 * Base Error Handler Strategy
 */
class ErrorHandlerStrategy {
  /**
   * Check if this handler can handle the error
   * @param {Error} error - The error to check
   * @returns {boolean} Whether this handler can handle the error
   */
  canHandle(error) {
    throw new Error('canHandle method must be implemented');
  }

  /**
   * Get HTTP status code for the error
   * @param {Error} error - The error
   * @returns {number} HTTP status code
   */
  getStatusCode(error) {
    throw new Error('getStatusCode method must be implemented');
  }

  /**
   * Get error category
   * @param {Error} error - The error
   * @returns {string} Error category
   */
  getCategory(error) {
    throw new Error('getCategory method must be implemented');
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - The error
   * @returns {string} User-friendly message
   */
  getUserMessage(error) {
    return 'An unexpected error occurred';
  }

  /**
   * Determine if error details should be logged
   * @param {Error} error - The error
   * @returns {boolean} Whether to log details
   */
  shouldLogDetails(error) {
    return true;
  }
}

/**
 * Validation Error Handler
 */
class ValidationErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'ValidationError' ||
           error.message?.includes('validation') ||
           error.message?.includes('invalid') ||
           error.message?.includes('required');
  }

  getStatusCode() {
    return 400;
  }

  getCategory() {
    return 'validation';
  }

  getUserMessage(error) {
    return `Validation failed: ${error.message}`;
  }

  shouldLogDetails() {
    return false; // Validation errors don't need detailed logging
  }
}

/**
 * Authentication Error Handler
 */
class AuthenticationErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'AuthenticationError' ||
           error.message?.includes('authentication') ||
           error.message?.includes('unauthorized') ||
           error.status === 401;
  }

  getStatusCode() {
    return 401;
  }

  getCategory() {
    return 'authentication';
  }

  getUserMessage() {
    return 'Authentication required';
  }

  shouldLogDetails() {
    return true;
  }
}

/**
 * Authorization Error Handler
 */
class AuthorizationErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'AuthorizationError' ||
           error.message?.includes('authorization') ||
           error.message?.includes('forbidden') ||
           error.status === 403;
  }

  getStatusCode() {
    return 403;
  }

  getCategory() {
    return 'authorization';
  }

  getUserMessage() {
    return 'Access denied';
  }
}

/**
 * Not Found Error Handler
 */
class NotFoundErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'NotFoundError' ||
           error.message?.includes('not found') ||
           error.message?.includes('does not exist') ||
           error.status === 404;
  }

  getStatusCode() {
    return 404;
  }

  getCategory() {
    return 'not_found';
  }

  getUserMessage(error) {
    return 'Resource not found';
  }

  shouldLogDetails() {
    return false;
  }
}

/**
 * Rate Limit Error Handler
 */
class RateLimitErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'RateLimitError' ||
           error.message?.includes('rate limit') ||
           error.message?.includes('too many requests') ||
           error.status === 429;
  }

  getStatusCode() {
    return 429;
  }

  getCategory() {
    return 'rate_limit';
  }

  getUserMessage() {
    return 'Too many requests. Please try again later.';
  }
}

/**
 * Timeout Error Handler
 */
class TimeoutErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'TimeoutError' ||
           error.code === 'ETIMEDOUT' ||
           error.message?.includes('timeout') ||
           error.status === 408;
  }

  getStatusCode() {
    return 408;
  }

  getCategory() {
    return 'timeout';
  }

  getUserMessage() {
    return 'Request timeout. Please try again.';
  }
}

/**
 * Database Error Handler
 */
class DatabaseErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'MongoError' ||
           error.name === 'DatabaseError' ||
           error.message?.includes('database') ||
           error.message?.includes('connection') ||
           error.code === 11000; // Duplicate key error
  }

  getStatusCode() {
    return 500;
  }

  getCategory() {
    return 'database';
  }

  getUserMessage() {
    return 'Database error occurred';
  }

  shouldLogDetails() {
    return true;
  }
}

/**
 * Service Unavailable Error Handler
 */
class ServiceUnavailableErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.name === 'ServiceUnavailableError' ||
           error.message?.includes('service unavailable') ||
           error.message?.includes('temporarily unavailable') ||
           error.status === 503;
  }

  getStatusCode() {
    return 503;
  }

  getCategory() {
    return 'service_unavailable';
  }

  getUserMessage() {
    return 'Service temporarily unavailable';
  }
}

/**
 * External API Error Handler
 */
class ExternalAPIErrorHandler extends ErrorHandlerStrategy {
  canHandle(error) {
    return error.message?.includes('OSRS Wiki API') ||
           error.message?.includes('external API') ||
           error.message?.includes('upstream');
  }

  getStatusCode() {
    return 502;
  }

  getCategory() {
    return 'external_api';
  }

  getUserMessage() {
    return 'External service error';
  }
}

/**
 * Default Error Handler (catch-all)
 */
class DefaultErrorHandler extends ErrorHandlerStrategy {
  canHandle() {
    return true; // Always handles as fallback
  }

  getStatusCode() {
    return 500;
  }

  getCategory() {
    return 'internal_server_error';
  }

  getUserMessage() {
    return 'An unexpected error occurred';
  }
}

/**
 * Error Handler Manager - Manages strategy selection
 */
class ErrorHandlerManager {
  constructor() {
    this.handlers = [
      new ValidationErrorHandler(),
      new AuthenticationErrorHandler(),
      new AuthorizationErrorHandler(),
      new NotFoundErrorHandler(),
      new RateLimitErrorHandler(),
      new TimeoutErrorHandler(),
      new DatabaseErrorHandler(),
      new ServiceUnavailableErrorHandler(),
      new ExternalAPIErrorHandler(),
      new DefaultErrorHandler() // Must be last as catch-all
    ];
  }

  /**
   * Add a new error handler
   * @param {ErrorHandlerStrategy} handler - The handler to add
   */
  addHandler(handler) {
    // Insert before default handler
    this.handlers.splice(-1, 0, handler);
  }

  /**
   * Get appropriate handler for error
   * @param {Error} error - The error to handle
   * @returns {ErrorHandlerStrategy} The handler
   */
  getHandler(error) {
    return this.handlers.find(handler => handler.canHandle(error));
  }

  /**
   * Handle error and return formatted response
   * @param {Error} error - The error to handle
   * @returns {Object} Formatted error response
   */
  handleError(error) {
    const handler = this.getHandler(error);

    return {
      status: handler.getStatusCode(error),
      category: handler.getCategory(error),
      message: handler.getUserMessage(error),
      shouldLog: handler.shouldLogDetails(error),
      timestamp: new Date().toISOString(),
      handlerType: handler.constructor.name
    };
  }
}

module.exports = {
  ErrorHandlerStrategy,
  ErrorHandlerManager,
  ValidationErrorHandler,
  AuthenticationErrorHandler,
  AuthorizationErrorHandler,
  NotFoundErrorHandler,
  RateLimitErrorHandler,
  TimeoutErrorHandler,
  DatabaseErrorHandler,
  ServiceUnavailableErrorHandler,
  ExternalAPIErrorHandler,
  DefaultErrorHandler
};
