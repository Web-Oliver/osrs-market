/**
 * 🏗️ Base Controller - Context7 Optimized Architecture
 *
 * Context7 Pattern: Base class implementing common controller patterns
 * - Single Responsibility: Common controller functionality
 * - Open/Closed: Open for extension, closed for modification
 * - DRY: Eliminates repetitive patterns across all controllers
 * - Standardized error handling and method binding
 * - Consistent logging and response patterns
 */

const { Logger } = require('../utils/Logger');
const { ApiResponse } = require('../utils/ApiResponse');
const { EndpointFactory } = require('../utils/EndpointFactory');
const { ParameterParser } = require('../utils/ParameterParser');
const { ErrorHandler } = require('../middleware/ErrorHandler');
const { AppConstants } = require('../config/AppConstants');


class BaseController {
  constructor(controllerName) {
    if (!controllerName) {
      throw new Error('Controller name is required for BaseController');
    }

    this.logger = new Logger(controllerName);
    this.controllerName = controllerName;

    // Initialize endpoint factory for creating standardized endpoints
    this.endpointFactory = new EndpointFactory(controllerName);

    // Automatically bind all methods to preserve 'this' context
    this.bindMethods();
  }

  /**
   * Context7 Pattern: Auto-bind all controller methods
   * Eliminates repetitive binding code in each controller
   */
  bindMethods() {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(method => {
        return method !== 'constructor' &&
               method !== 'bindMethods' &&
               method !== 'handleError' &&
               method !== 'validateAndExecute' &&
               typeof this[method] === 'function';
      });

    methods.forEach(method => {
      this[method] = this[method].bind(this);
    });
  }

  /**
   * Context7 Pattern: Standardized error handling
   * SOLID Principle: Single responsibility for error handling
   * @param {Error} error - The error that occurred
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @param {Object} context - Additional context for logging
   */
  handleError(error, req, res, next, context = {}) {
    const errorContext = {
      controller: this.controllerName,
      method: req?.route?.stack?.[0]?.name || 'unknown',
      url: req?.url,
      userAgent: req?.headers?.['user-agent'],
      ip: req?.ip,
      ...context
    };

    // Error handling moved to centralized manager - context: operation

    // Don't call next() if response already sent
    if (res.headersSent) {
      return;
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
      return ApiResponse.badRequest(res, 'Validation failed', error.message);
    }

    if (error.name === 'UnauthorizedError') {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    if (error.statusCode) {
      return ApiResponse.error(res, error.message, error.details, error.statusCode);
    }

    // Default server error
    ApiResponse.internalServerError(res, 'An unexpected error occurred');
  }

  /**
   * Context7 Pattern: Validate request and execute handler
   * SOLID Principle: Open/closed - extensible validation pattern
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   * @param {Function} validator - Validation function
   * @param {Function} handler - Business logic handler
   */
  async validateAndExecute(req, res, next, validator, handler) {
    try {
      // Validate request if validator provided
      if (validator) {
        const validationResult = validator(req);
        if (!validationResult.isValid) {
          return ApiResponse.badRequest(res, 'Validation failed', validationResult.errors);
        }
      }

      // Execute handler
      await handler(req, res, next);
    } catch (error) {
      this.handleError(error, req, res, next);
    }
  }

  /**
   * Context7 Pattern: Async method wrapper with error handling
   * Eliminates try-catch boilerplate in controller methods
   * @param {Function} handler - Async handler function
   * @returns {Function} Wrapped handler with error handling
   */
  asyncHandler(handler) {
    return async(req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        this.handleError(error, req, res, next);
      }
    };
  }

  /**
   * Context7 Pattern: Success response helper
   * Standardizes successful responses across controllers
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {Object} meta - Additional metadata
   */
  sendSuccess(res, data, message = 'Success', meta = {}) {
    return ApiResponse.success(res, data, message, meta);
  }

  /**
   * Context7 Pattern: Error response helper
   * Standardizes error responses across controllers
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {*} details - Error details
   * @param {number} statusCode - HTTP status code
   */
  sendError(res, message, details = null, statusCode = 500) {
    return ApiResponse.error(res, message, details, statusCode);
  }

  // =============================================================================
  // ENDPOINT FACTORY METHODS - DRY Endpoint Creation
  // =============================================================================

  /**
   * Context7 Pattern: Create standard GET endpoint
   * Eliminates 90% of repetitive endpoint code
   * @param {Function} serviceMethod - Service method to call
   * @param {Object} options - Endpoint configuration
   * @returns {Function} Express endpoint handler
   */
  createGetEndpoint(serviceMethod, options = {}) {
    return this.endpointFactory.createStandardGetEndpoint(
      serviceMethod.bind(this),
      options
    );
  }

  /**
   * Context7 Pattern: Create paginated GET endpoint
   * Standardized pagination handling
   */
  createPaginatedEndpoint(serviceMethod, options = {}) {
    return this.endpointFactory.createPaginatedEndpoint(
      serviceMethod.bind(this),
      options
    );
  }

  /**
   * Context7 Pattern: Create POST endpoint
   * Standardized POST handling with validation
   */
  createPostEndpoint(serviceMethod, options = {}) {
    return this.endpointFactory.createStandardPostEndpoint(
      serviceMethod.bind(this),
      options
    );
  }

  /**
   * Context7 Pattern: Create DELETE endpoint
   * Standardized DELETE handling
   */
  createDeleteEndpoint(serviceMethod, options = {}) {
    return this.endpointFactory.createStandardDeleteEndpoint(
      serviceMethod.bind(this),
      options
    );
  }

  // =============================================================================
  // PARAMETER PARSING HELPERS - DRY Parameter Handling
  // =============================================================================

  /**
   * Context7 Pattern: Parse standard query parameters
   * Eliminates repetitive parameter parsing
   */
  parseStandardQuery(req) {
    return ParameterParser.parseStandardQuery(req.query);
  }

  /**
   * Context7 Pattern: Parse pagination parameters
   */
  parsePaginationQuery(req) {
    return ParameterParser.parsePaginationQuery(req.query);
  }

  /**
   * Context7 Pattern: Parse time range parameters
   */
  parseTimeRangeQuery(req) {
    return ParameterParser.parseTimeRangeQuery(req.query);
  }

  /**
   * Context7 Pattern: Parse market data parameters
   */
  parseMarketDataQuery(req) {
    return ParameterParser.parseMarketDataQuery(req.query);
  }

  /**
   * Context7 Pattern: Parse trading analysis parameters
   */
  parseTradingAnalysisQuery(req) {
    return ParameterParser.parseTradingAnalysisQuery(req.query);
  }

  /**
   * Context7 Pattern: Parse alert parameters
   */
  parseAlertQuery(req) {
    return ParameterParser.parseAlertQuery(req.query);
  }

  /**
   * Context7 Pattern: Parse export parameters
   */
  parseExportQuery(req) {
    return ParameterParser.parseExportQuery(req.query);
  }

  // =============================================================================
  // SIMPLIFIED ENDPOINT CREATION METHODS
  // =============================================================================

  /**
   * Context7 Pattern: Create market data GET endpoint
   * One-liner for most market data endpoints
   */
  createMarketDataGetEndpoint(serviceMethod, operationName, options = {}) {
    return this.createGetEndpoint(serviceMethod, {
      operationName,
      parseParams: this.parseMarketDataQuery.bind(this),
      ...options
    });
  }

  /**
   * Context7 Pattern: Create trading analysis GET endpoint
   */
  createTradingAnalysisEndpoint(serviceMethod, operationName, options = {}) {
    return this.createGetEndpoint(serviceMethod, {
      operationName,
      parseParams: this.parseTradingAnalysisQuery.bind(this),
      ...options
    });
  }

  /**
   * Context7 Pattern: Create time-based GET endpoint
   */
  createTimeBasedEndpoint(serviceMethod, operationName, options = {}) {
    return this.createGetEndpoint(serviceMethod, {
      operationName,
      parseParams: this.parseTimeRangeQuery.bind(this),
      ...options
    });
  }
  
  /**
   * Context7 Pattern: Validate service exists
   * DRY: Eliminates service validation duplication using existing ErrorHandler
   */
  validateService(service, serviceName, serviceId = null) {
    if (!service) {
      const resource = serviceId ? `${serviceName} (ID: ${serviceId})` : serviceName;
      throw ErrorHandler.createNotFoundError(resource);
    }
    return service;
  }

  /**
   * Context7 Pattern: Validate required parameters
   * DRY: Eliminates parameter validation duplication using existing ErrorHandler
   */
  validateRequiredParams(params, requiredFields) {
    const missingParams = [];
    requiredFields.forEach(field => {
      if (params[field] === undefined || params[field] === null || params[field] === '') {
        missingParams.push(field);
      }
    });
    if (missingParams.length > 0) {
      throw ErrorHandler.createValidationError(
        `Missing required parameter(s): ${missingParams.join(', ')}`,
        { missingParams, providedParams: Object.keys(params) }
      );
    }
    return params;
  }

  /**
   * Context7 Pattern: Validate non-empty array
   * DRY: Eliminates array validation duplication
   */
  validateNonEmptyArray(array, fieldName = 'Array') {
    if (!array || !Array.isArray(array) || array.length === 0) {
      throw ErrorHandler.createValidationError(
        `${fieldName} is required and cannot be empty`,
        { provided: array, expected: 'non-empty array' }
      );
    }
    return array;
  }

  /**
   * Context7 Pattern: Validate database connection
   * DRY: Eliminates database connection validation duplication
   */
  validateDatabaseConnection(connection, serviceName = 'Database') {
    if (!connection) {
      throw ErrorHandler.createError(
        `${serviceName} connection not available`,
        503,
        'Please try again later',
        'DATABASE_UNAVAILABLE'
      );
    }
    return connection;
  }

  /**
   * Context7 Pattern: Validate pagination parameters
   * DRY: Eliminates pagination parsing duplication
   * Uses existing ErrorHandler.createValidationError
   */
  validatePagination(query, defaultLimit = 50, maxLimit = 500) {
    const limit = query.limit ? parseInt(query.limit) : defaultLimit;
    const page = query.page ? parseInt(query.page) : 1;
    
    if (isNaN(limit) || limit < 1) {
      throw ErrorHandler.createValidationError(
        'Invalid limit parameter: must be a positive integer',
        { provided: query.limit, expected: 'positive integer' }
      );
    }
    
    if (limit > maxLimit) {
      throw ErrorHandler.createValidationError(
        `Limit too large: maximum allowed is ${maxLimit}`,
        { provided: limit, maximum: maxLimit }
      );
    }
    
    if (isNaN(page) || page < 1) {
      throw ErrorHandler.createValidationError(
        'Invalid page parameter: must be a positive integer',
        { provided: query.page, expected: 'positive integer' }
      );
    }
    
    return {
      limit,
      page,
      offset: (page - 1) * limit,
      maxLimit
    };
  }
}

module.exports = { BaseController };
