/**
 * 🏭 Error Factory - Context7 Optimized
 *
 * Context7 Pattern: Factory Pattern for Error Creation
 * - SOLID: Single Responsibility Principle (SRP) - ONLY error creation and standardization
 * - DRY: Eliminates duplicate error creation patterns across controllers
 * - Factory Pattern: Centralized creation of standardized error objects
 * - Consistent error structure and categorization
 * - Type-safe error creation with validation
 */

const { AppConstants } = require('../config/AppConstants');
const { Logger } = require('./Logger');

class ErrorFactory {
  constructor() {
    this.logger = new Logger('ErrorFactory');
  }

  /**
   * Context7 Pattern: Create standardized error with metadata
   * SOLID: Single responsibility for error object creation
   * DRY: Eliminates repeated error creation logic
   */
  static createError(message, statusCode, category, details = null, context = null) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.category = category;
    error.details = details;
    error.context = context;
    error.timestamp = Date.now();
    error.errorId = this.generateErrorId();
    
    return error;
  }

  /**
   * Context7 Pattern: Resource not found error
   * DRY: Eliminates "not found" error duplication (14+ occurrences)
   */
  static notFound(resource, identifier = null, context = null) {
    const message = identifier 
      ? `${resource} with ID '${identifier}' not found`
      : `${resource} not found`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.NOT_FOUND,
      AppConstants.ERRORS.CATEGORIES.NOT_FOUND,
      { resource, identifier },
      context
    );
  }

  /**
   * Context7 Pattern: Service not available error
   * DRY: Eliminates service unavailable duplication (14+ occurrences)
   */
  static serviceNotFound(serviceName, serviceId = null, context = null) {
    const message = serviceId
      ? `${serviceName} service with ID '${serviceId}' not found or unavailable`
      : `${serviceName} service not found or unavailable`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.NOT_FOUND,
      AppConstants.ERRORS.CATEGORIES.NOT_FOUND,
      { serviceName, serviceId, type: 'service' },
      context
    );
  }

  /**
   * Context7 Pattern: Trading session not found error
   * DRY: Eliminates session not found duplication (8+ occurrences in AI trading)
   */
  static tradingSessionNotFound(sessionId, context = null) {
    return this.createError(
      `Trading session '${sessionId}' not found`,
      AppConstants.ERRORS.STATUS_CODES.NOT_FOUND,
      AppConstants.ERRORS.CATEGORIES.NOT_FOUND,
      { sessionId, type: 'trading_session' },
      context
    );
  }

  /**
   * Context7 Pattern: Training session not found error
   * DRY: Eliminates training session not found duplication (6+ occurrences)
   */
  static trainingSessionNotFound(sessionId, context = null) {
    return this.createError(
      `Training session '${sessionId}' not found`,
      AppConstants.ERRORS.STATUS_CODES.NOT_FOUND,
      AppConstants.ERRORS.CATEGORIES.NOT_FOUND,
      { sessionId, type: 'training_session' },
      context
    );
  }

  /**
   * Context7 Pattern: Bad request with parameter validation
   * DRY: Eliminates parameter validation error duplication (12+ occurrences)
   */
  static badRequest(message, field = null, value = null, context = null) {
    const details = field ? { field, value, type: 'validation' } : { type: 'bad_request' };
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST,
      AppConstants.ERRORS.CATEGORIES.VALIDATION,
      details,
      context
    );
  }

  /**
   * Context7 Pattern: Missing required parameters error
   * DRY: Eliminates required parameter error duplication (12+ occurrences)
   */
  static missingRequiredParameters(missingParams, context = null) {
    const paramList = Array.isArray(missingParams) ? missingParams : [missingParams];
    const message = `Missing required parameter(s): ${paramList.join(', ')}`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST,
      AppConstants.ERRORS.CATEGORIES.VALIDATION,
      { missingParams: paramList, type: 'required_parameters' },
      context
    );
  }

  /**
   * Context7 Pattern: Invalid parameter format error
   * DRY: Eliminates parameter format validation duplication
   */
  static invalidParameter(paramName, value, expectedFormat, context = null) {
    const message = `Invalid parameter '${paramName}': expected ${expectedFormat}, got '${value}'`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST,
      AppConstants.ERRORS.CATEGORIES.VALIDATION,
      { paramName, value, expectedFormat, type: 'invalid_parameter' },
      context
    );
  }

  /**
   * Context7 Pattern: Invalid item ID error
   * DRY: Eliminates item ID validation duplication (used in multiple controllers)
   */
  static invalidItemId(itemId, context = null) {
    const message = `Invalid item ID '${itemId}': must be between ${AppConstants.OSRS.MIN_ITEM_ID} and ${AppConstants.OSRS.MAX_ITEM_ID}`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST,
      AppConstants.ERRORS.CATEGORIES.VALIDATION,
      { 
        itemId, 
        minId: AppConstants.OSRS.MIN_ITEM_ID, 
        maxId: AppConstants.OSRS.MAX_ITEM_ID,
        type: 'invalid_item_id' 
      },
      context
    );
  }

  /**
   * Context7 Pattern: Database connection error
   * DRY: Eliminates database connection error duplication (4+ occurrences)
   */
  static databaseUnavailable(operation = null, context = null) {
    const message = operation 
      ? `Database connection not available for operation: ${operation}`
      : 'Database connection not available';
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.SERVICE_UNAVAILABLE,
      AppConstants.ERRORS.CATEGORIES.DATABASE,
      { operation, type: 'database_unavailable' },
      context
    );
  }

  /**
   * Context7 Pattern: External API error
   * DRY: Eliminates external API error duplication
   */
  static externalApiError(apiName, statusCode = null, apiMessage = null, context = null) {
    const message = `External API error from ${apiName}${apiMessage ? `: ${apiMessage}` : ''}`;
    
    return this.createError(
      message,
      statusCode || AppConstants.ERRORS.STATUS_CODES.BAD_GATEWAY,
      AppConstants.ERRORS.CATEGORIES.EXTERNAL_API,
      { apiName, originalStatusCode: statusCode, originalMessage: apiMessage, type: 'external_api' },
      context
    );
  }

  /**
   * Context7 Pattern: Rate limit exceeded error
   * DRY: Eliminates rate limit error duplication
   */
  static rateLimitExceeded(limit, window, context = null) {
    const message = `Rate limit exceeded: ${limit} requests per ${window}ms window`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.TOO_MANY_REQUESTS,
      AppConstants.ERRORS.CATEGORIES.RATE_LIMIT,
      { limit, window, type: 'rate_limit' },
      context
    );
  }

  /**
   * Context7 Pattern: Unauthorized access error
   * DRY: Eliminates authorization error duplication
   */
  static unauthorized(resource = null, action = null, context = null) {
    const message = resource && action 
      ? `Unauthorized to ${action} ${resource}`
      : 'Unauthorized access';
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.UNAUTHORIZED,
      AppConstants.ERRORS.CATEGORIES.AUTHENTICATION,
      { resource, action, type: 'unauthorized' },
      context
    );
  }

  /**
   * Context7 Pattern: Forbidden action error
   * DRY: Eliminates forbidden error duplication
   */
  static forbidden(resource = null, action = null, context = null) {
    const message = resource && action 
      ? `Forbidden to ${action} ${resource}`
      : 'Forbidden action';
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.FORBIDDEN,
      AppConstants.ERRORS.CATEGORIES.AUTHORIZATION,
      { resource, action, type: 'forbidden' },
      context
    );
  }

  /**
   * Context7 Pattern: Conflict error (duplicate resources)
   * DRY: Eliminates conflict error duplication
   */
  static conflict(resource, identifier, context = null) {
    const message = `${resource} with identifier '${identifier}' already exists`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.CONFLICT,
      AppConstants.ERRORS.CATEGORIES.VALIDATION,
      { resource, identifier, type: 'conflict' },
      context
    );
  }

  /**
   * Context7 Pattern: Internal server error with context
   * DRY: Eliminates internal error duplication
   */
  static internalError(operation, originalError = null, context = null) {
    const message = `Internal error during ${operation}`;
    
    const error = this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.INTERNAL_SERVER_ERROR,
      AppConstants.ERRORS.CATEGORIES.SERVER_ERROR,
      { 
        operation, 
        originalMessage: originalError?.message,
        originalStack: originalError?.stack,
        type: 'internal_error' 
      },
      context
    );

    // Log internal errors for monitoring
    const logger = new Logger('ErrorFactory');
    logger.error('Internal error created', originalError || new Error(message), {
      operation,
      errorId: error.errorId,
      context
    });

    return error;
  }

  /**
   * Context7 Pattern: Validation error with multiple field errors
   * DRY: Eliminates validation error duplication
   */
  static validationError(fieldErrors, context = null) {
    const message = `Validation failed for ${Object.keys(fieldErrors).length} field(s)`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.UNPROCESSABLE_ENTITY,
      AppConstants.ERRORS.CATEGORIES.VALIDATION,
      { fieldErrors, type: 'validation_error' },
      context
    );
  }

  /**
   * Context7 Pattern: Timeout error
   * DRY: Eliminates timeout error duplication
   */
  static timeout(operation, timeoutMs, context = null) {
    const message = `Operation '${operation}' timed out after ${timeoutMs}ms`;
    
    return this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.GATEWAY_TIMEOUT,
      AppConstants.ERRORS.CATEGORIES.SERVER_ERROR,
      { operation, timeoutMs, type: 'timeout' },
      context
    );
  }

  // Helper Methods

  /**
   * Generate unique error ID for tracking
   */
  static generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Context7 Pattern: Create error from validation result
   * Helper for BaseValidator integration
   */
  static fromValidationResult(validationResult, context = null) {
    if (validationResult.isValid) {
      throw new Error('Cannot create error from valid validation result');
    }

    const fieldErrors = {};
    validationResult.errors.forEach(error => {
      const field = error.split(' ')[0];
      fieldErrors[field] = error;
    });

    return this.validationError(fieldErrors, context);
  }

  /**
   * Context7 Pattern: Enhance existing error with factory metadata
   * For wrapping third-party errors with standardized format
   */
  static enhance(originalError, category = null, context = null) {
    const enhanced = new Error(originalError.message);
    enhanced.statusCode = originalError.statusCode || AppConstants.ERRORS.STATUS_CODES.INTERNAL_SERVER_ERROR;
    enhanced.category = category || AppConstants.ERRORS.CATEGORIES.SERVER_ERROR;
    enhanced.details = { 
      originalName: originalError.name,
      originalCode: originalError.code,
      type: 'enhanced_error'
    };
    enhanced.context = context;
    enhanced.timestamp = Date.now();
    enhanced.errorId = this.generateErrorId();
    enhanced.originalError = originalError;
    enhanced.stack = originalError.stack;

    return enhanced;
  }

  /**
   * Context7 Pattern: Create error with retry information
   * For operations that can be retried
   */
  static retryableError(message, operation, retryAfter = null, context = null) {
    const error = this.createError(
      message,
      AppConstants.ERRORS.STATUS_CODES.SERVICE_UNAVAILABLE,
      AppConstants.ERRORS.CATEGORIES.SERVER_ERROR,
      { 
        operation, 
        retryable: true, 
        retryAfter,
        type: 'retryable_error'
      },
      context
    );

    if (retryAfter) {
      error.retryAfter = retryAfter;
    }

    return error;
  }
}

module.exports = { ErrorFactory };