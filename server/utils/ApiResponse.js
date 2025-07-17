/**
 * 📤 API Response - Context7 Optimized
 * 
 * Context7 Pattern: Standardized API Response System
 * - Consistent response format across all endpoints
 * - HTTP status code management
 * - Error handling and success responses
 * - Performance metrics integration
 */

class ApiResponse {
  constructor() {
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Powered-By': 'Context7-OSRS-Market-Backend',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    };
  }

  /**
   * Context7 Pattern: Success response (200)
   */
  static success(res, data = null, message = 'Success', meta = {}) {
    return ApiResponse.send(res, {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 200);
  }

  /**
   * Context7 Pattern: Created response (201)
   */
  static created(res, data = null, message = 'Resource created successfully', meta = {}) {
    return ApiResponse.send(res, {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 201);
  }

  /**
   * Context7 Pattern: No content response (204)
   */
  static noContent(res, meta = {}) {
    res.status(204);
    ApiResponse.setHeaders(res, meta);
    return res.end();
  }

  /**
   * Context7 Pattern: Bad request response (400)
   */
  static badRequest(res, message = 'Bad request', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'BAD_REQUEST',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 400);
  }

  /**
   * Context7 Pattern: Unauthorized response (401)
   */
  static unauthorized(res, message = 'Unauthorized', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'UNAUTHORIZED',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 401);
  }

  /**
   * Context7 Pattern: Forbidden response (403)
   */
  static forbidden(res, message = 'Forbidden', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'FORBIDDEN',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 403);
  }

  /**
   * Context7 Pattern: Not found response (404)
   */
  static notFound(res, message = 'Resource not found', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'NOT_FOUND',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 404);
  }

  /**
   * Context7 Pattern: Method not allowed response (405)
   */
  static methodNotAllowed(res, message = 'Method not allowed', allowedMethods = [], meta = {}) {
    res.set('Allow', allowedMethods.join(', '));
    
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'METHOD_NOT_ALLOWED',
        message,
        details: {
          allowedMethods
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 405);
  }

  /**
   * Context7 Pattern: Conflict response (409)
   */
  static conflict(res, message = 'Conflict', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'CONFLICT',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 409);
  }

  /**
   * Context7 Pattern: Validation error response (422)
   */
  static validationError(res, message = 'Validation failed', errors = [], meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message,
        details: {
          errors
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 422);
  }

  /**
   * Context7 Pattern: Rate limit exceeded response (429)
   */
  static rateLimit(res, message = 'Rate limit exceeded', details = null, meta = {}) {
    // Set rate limit headers
    if (details && details.retryAfter) {
      res.set('Retry-After', details.retryAfter);
    }
    
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'RATE_LIMIT_EXCEEDED',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 429);
  }

  /**
   * Context7 Pattern: Internal server error response (500)
   */
  static error(res, message = 'Internal server error', details = null, statusCode = 500, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message,
        details: process.env.NODE_ENV === 'production' ? null : details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, statusCode);
  }

  /**
   * Context7 Pattern: Service unavailable response (503)
   */
  static serviceUnavailable(res, message = 'Service temporarily unavailable', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'SERVICE_UNAVAILABLE',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 503);
  }

  /**
   * Context7 Pattern: Gateway timeout response (504)
   */
  static timeout(res, message = 'Request timeout', details = null, meta = {}) {
    return ApiResponse.send(res, {
      success: false,
      error: {
        type: 'TIMEOUT',
        message,
        details
      },
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 504);
  }

  /**
   * Context7 Pattern: Custom response with status code
   */
  static custom(res, statusCode, data, message = null, meta = {}) {
    const isSuccess = statusCode >= 200 && statusCode < 300;
    
    const response = {
      success: isSuccess,
      ...(isSuccess ? { data } : { error: data }),
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    if (message) {
      response.message = message;
    }

    return ApiResponse.send(res, response, statusCode);
  }

  /**
   * Context7 Pattern: Paginated response
   */
  static paginated(res, data, pagination, message = 'Success', meta = {}) {
    return ApiResponse.send(res, {
      success: true,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        total: pagination.total || 0,
        pages: Math.ceil((pagination.total || 0) / (pagination.limit || 20))
      },
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    }, 200);
  }

  /**
   * Context7 Pattern: Health check response
   */
  static health(res, status, checks = {}, meta = {}) {
    const statusCode = status === 'healthy' ? 200 : 503;
    
    return ApiResponse.send(res, {
      success: status === 'healthy',
      status,
      checks,
      meta: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...meta
      }
    }, statusCode);
  }

  /**
   * Context7 Pattern: Stream response for Server-Sent Events
   */
  static stream(res, meta = {}) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      ...ApiResponse.getCustomHeaders(meta)
    });

    return res;
  }

  /**
   * Context7 Pattern: Send Server-Sent Event
   */
  static sendEvent(res, event, data, id = null) {
    if (id) {
      res.write(`id: ${id}\n`);
    }
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Context7 Pattern: Main send method
   */
  static send(res, data, statusCode = 200, headers = {}) {
    // Set status code
    res.status(statusCode);
    
    // Set headers
    ApiResponse.setHeaders(res, { headers });
    
    // Send response
    return res.json(data);
  }

  /**
   * Context7 Pattern: Set response headers
   */
  static setHeaders(res, meta = {}) {
    const instance = new ApiResponse();
    const headers = {
      ...instance.defaultHeaders,
      ...ApiResponse.getCustomHeaders(meta)
    };

    Object.entries(headers).forEach(([key, value]) => {
      res.set(key, value);
    });
  }

  /**
   * Context7 Pattern: Get custom headers from meta
   */
  static getCustomHeaders(meta = {}) {
    const customHeaders = {};
    
    // Add request ID if present
    if (meta.requestId) {
      customHeaders['X-Request-ID'] = meta.requestId;
    }
    
    // Add response time if present
    if (meta.responseTime) {
      customHeaders['X-Response-Time'] = `${meta.responseTime}ms`;
    }
    
    // Add rate limit headers if present
    if (meta.rateLimit) {
      customHeaders['X-RateLimit-Limit'] = meta.rateLimit.limit;
      customHeaders['X-RateLimit-Remaining'] = meta.rateLimit.remaining;
      customHeaders['X-RateLimit-Reset'] = meta.rateLimit.reset;
    }
    
    // Add API version if present
    if (meta.apiVersion) {
      customHeaders['X-API-Version'] = meta.apiVersion;
    }
    
    // Add additional headers from meta
    if (meta.headers) {
      Object.assign(customHeaders, meta.headers);
    }
    
    return customHeaders;
  }

  /**
   * Context7 Pattern: Format error for logging
   */
  static formatErrorForLogging(error, req = null) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
      timestamp: new Date().toISOString()
    };

    if (req) {
      errorInfo.request = {
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };
    }

    return errorInfo;
  }

  /**
   * Context7 Pattern: Validate response data
   */
  static validateResponseData(data) {
    try {
      JSON.stringify(data);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Context7 Pattern: Sanitize sensitive data for response
   */
  static sanitizeData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sensitiveFields = ['password', 'secret', 'token', 'key', 'connectionString'];
    const sanitized = Array.isArray(data) ? [] : {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = ApiResponse.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

module.exports = { ApiResponse };