/**
 * 🏭 Endpoint Factory - Context7 Optimized
 *
 * Context7 Pattern: Factory for creating standardized endpoints
 * - Single Responsibility: Creates endpoint handlers
 * - DRY: Eliminates repetitive endpoint patterns
 * - Factory Pattern: Creates endpoint handlers dynamically
 * - Template Method: Standardized endpoint flow
 */

const { Logger } = require('./Logger');


class EndpointFactory {
  constructor(controllerName) {
    this.controllerName = controllerName;
    this.logger = new Logger(`${controllerName}`);
  }

  /**
   * Context7 Pattern: Create standard GET endpoint
   * Eliminates repetitive GET endpoint patterns
   * @param {Function} serviceMethod - Service method to call
   * @param {Object} options - Endpoint configuration
   * @returns {Function} Express endpoint handler
   */
  createStandardGetEndpoint(serviceMethod, options = {}) {
    const {
      operationName = 'operation',
      parseParams = this.parseStandardParams.bind(this),
      validator = null,
      responseFormatter = this.standardResponseFormatter.bind(this),
      logSuccessData = (result) => ({ resultCount: Array.isArray(result) ? result.length : 1 })
    } = options;

    return async(req, res, next) => {
      try {
        // Standardized request logging
        this.logger.info(`Starting ${operationName}`, {
          query: req.query,
          params: req.params,
          requestId: req.id,
          ip: req.ip
        });

        // Validation if provided
        if (validator) {
          const validation = validator(req);
          if (!validation.isValid) {
            this.logger.warn(`${operationName} validation failed`, {
              errors: validation.errors,
              requestId: req.id
            });
            return res.status(400).json({
              success: false,
              message: 'Validation failed',
              errors: validation.errors
            });
          }
        }

        // Parse parameters
        const parsedParams = parseParams(req);

        // Execute service method
        const result = await serviceMethod(parsedParams);

        // Log success
        this.logger.info(`${operationName} completed successfully`, {
          ...logSuccessData(result),
          params: parsedParams,
          requestId: req.id
        });

        // Format and send response
        const formattedResponse = responseFormatter(result, `${operationName} completed successfully`);
        return res.json(formattedResponse);

      } catch (error) {
        // Error handling moved to centralized manager - context: operation
        next(error);
      }
    };
  }

  /**
   * Context7 Pattern: Create paginated GET endpoint
   * Standardized pagination handling
   */
  createPaginatedEndpoint(serviceMethod, options = {}) {
    const defaultOptions = {
      ...options,
      parseParams: this.parsePaginatedParams.bind(this),
      responseFormatter: this.paginatedResponseFormatter.bind(this),
      logSuccessData: (result) => ({
        resultCount: result.data?.length || 0,
        totalCount: result.total,
        page: result.page,
        limit: result.limit
      })
    };

    return this.createStandardGetEndpoint(serviceMethod, defaultOptions);
  }

  /**
   * Context7 Pattern: Create POST endpoint
   * Standardized POST handling with validation
   */
  createStandardPostEndpoint(serviceMethod, options = {}) {
    const {
      operationName = 'create operation',
      parseBody = this.parseStandardBody.bind(this),
      validator = null,
      responseFormatter = this.createdResponseFormatter.bind(this)
    } = options;

    return async(req, res, next) => {
      try {
        this.logger.info(`Starting ${operationName}`, {
          bodyKeys: Object.keys(req.body || {}),
          requestId: req.id,
          ip: req.ip
        });

        // Validation
        if (validator) {
          const validation = validator(req);
          if (!validation.isValid) {
            this.logger.warn(`${operationName} validation failed`, {
              errors: validation.errors,
              requestId: req.id
            });
            return res.status(400).json({
              success: false,
              message: 'Validation failed',
              errors: validation.errors
            });
          }
        }

        // Parse body
        const parsedBody = parseBody(req);

        // Execute service method
        const result = await serviceMethod(parsedBody);

        this.logger.info(`${operationName} completed successfully`, {
          resultId: result.id || result._id,
          requestId: req.id
        });

        const formattedResponse = responseFormatter(result, `${operationName} completed successfully`);
        return res.status(201).json(formattedResponse);

      } catch (error) {
        // Error handling moved to centralized manager - context: operation
        next(error);
      }
    };
  }

  /**
   * Context7 Pattern: Create DELETE endpoint
   * Standardized DELETE handling
   */
  createStandardDeleteEndpoint(serviceMethod, options = {}) {
    const {
      operationName = 'delete operation',
      resourceIdParam = 'id',
      responseFormatter = this.deletedResponseFormatter.bind(this)
    } = options;

    return async(req, res, next) => {
      try {
        const resourceId = req.params[resourceIdParam];

        this.logger.info(`Starting ${operationName}`, {
          resourceId,
          requestId: req.id
        });

        const result = await serviceMethod(resourceId);

        this.logger.info(`${operationName} completed successfully`, {
          resourceId,
          requestId: req.id
        });

        const formattedResponse = responseFormatter(result, `${operationName} completed successfully`);
        return res.json(formattedResponse);

      } catch (error) {
        // Error handling moved to centralized manager - context: operation
        next(error);
      }
    };
  }

  // Parameter Parsing Methods

  parseStandardParams(req) {
    const { limit, sortBy, sortOrder, ...otherParams } = req.query;
    return {
      limit: limit ? parseInt(limit) : undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
      ...otherParams
    };
  }

  parsePaginatedParams(req) {
    const { page = 1, limit = 50, sortBy, sortOrder, ...filters } = req.query;
    return {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      filters
    };
  }

  parseTimeRangeParams(req) {
    const { startTime, endTime, timeRange, ...otherParams } = req.query;
    return {
      startTime: startTime ? parseInt(startTime) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined,
      timeRange: timeRange ? parseInt(timeRange) : undefined,
      ...otherParams
    };
  }

  parseStandardBody(req) {
    return {
      ...req.body,
      metadata: {
        clientIp: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id,
        timestamp: Date.now()
      }
    };
  }

  // Response Formatters

  standardResponseFormatter(data, message) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }

  paginatedResponseFormatter(result, message) {
    return {
      success: true,
      message,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: Math.ceil(result.total / result.limit)
      },
      timestamp: new Date().toISOString()
    };
  }

  createdResponseFormatter(data, message) {
    return {
      success: true,
      message,
      data,
      created: true,
      timestamp: new Date().toISOString()
    };
  }

  deletedResponseFormatter(result, message) {
    return {
      success: true,
      message,
      deleted: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Context7 Pattern: Create endpoint with custom flow
   * For complex endpoints that don't fit standard patterns
   */
  createCustomEndpoint(handler, options = {}) {
    const { operationName = 'custom operation' } = options;

    return async(req, res, next) => {
      try {
        this.logger.info(`Starting ${operationName}`, {
          query: req.query,
          params: req.params,
          requestId: req.id
        });

        const result = await handler(req, res, next);

        this.logger.info(`${operationName} completed successfully`, {
          requestId: req.id
        });

        return result;

      } catch (error) {
        // Error handling moved to centralized manager - context: operation
        next(error);
      }
    };
  }
}

module.exports = { EndpointFactory };
