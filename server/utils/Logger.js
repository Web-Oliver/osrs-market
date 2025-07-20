/**
 * 📝 Logger - Context7 Optimized
 *
 * Context7 Pattern: Centralized Logging System
 * - Structured logging with context
 * - Multiple log levels and formats
 * - Performance monitoring integration
 * - Error tracking and alerting
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');

class Logger {
  constructor(module = 'Application') {
    this.module = module;
    this.logger = this.createWinstonLogger();
  }

  /**
   * Context7 Pattern: Create Winston logger instance
   */
  createWinstonLogger() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    const logFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.json(),
      format.printf(({ timestamp, level, message, module, ...meta }) => {
        const logEntry = {
          timestamp,
          level: level.toUpperCase(),
          module,
          message
        };

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
          logEntry.meta = meta;
        }

        return JSON.stringify(logEntry);
      })
    );

    const logger = createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: { module: this.module },
      transports: []
    });

    // Console transport for development
    if (!isProduction) {
      logger.add(new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple(),
          format.printf(({ timestamp, level, message, module, ...meta }) => {
            let logLine = `${timestamp} [${level}] ${module}: ${message}`;

            // Add metadata in development
            if (Object.keys(meta).length > 0) {
              logLine += `\n${JSON.stringify(meta, null, 2)}`;
            }

            return logLine;
          })
        )
      }));
    }

    // File transports for production
    if (isProduction) {
      // Combined log file
      logger.add(new transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 10
      }));

      // Error log file
      logger.add(new transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 10
      }));
    }

    return logger;
  }

  /**
   * Context7 Pattern: Info level logging
   */
  info(message, meta = {}) {
    this.logger.info(message, this.enrichMeta(meta));
  }

  /**
   * Context7 Pattern: Debug level logging
   */
  debug(message, meta = {}) {
    this.logger.debug(message, this.enrichMeta(meta));
  }

  /**
   * Context7 Pattern: Warning level logging
   */
  warn(message, meta = {}) {
    this.logger.warn(message, this.enrichMeta(meta));
  }

  /**
   * Context7 Pattern: Error level logging
   */
  error(message, error = null, meta = {}) {
    const errorMeta = this.enrichMeta(meta);

    if (error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      };
    }

    this.logger.error(message, errorMeta);
  }

  /**
   * Context7 Pattern: Fatal level logging
   */
  fatal(message, error = null, meta = {}) {
    const errorMeta = this.enrichMeta(meta);

    if (error) {
      errorMeta.error = {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      };
    }

    this.logger.error(`[FATAL] ${message}`, errorMeta);
  }

  /**
   * Context7 Pattern: Performance logging
   */
  performance(operation, duration, meta = {}) {
    this.logger.info(`Performance: ${operation}`, this.enrichMeta({
      ...meta,
      duration: `${duration}ms`,
      operation
    }));
  }

  /**
   * Context7 Pattern: API request logging
   */
  apiRequest(method, url, statusCode, duration, meta = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info';

    this.logger[level](`API Request: ${method} ${url}`, this.enrichMeta({
      ...meta,
      method,
      url,
      statusCode,
      duration: `${duration}ms`
    }));
  }

  /**
   * Context7 Pattern: Database operation logging
   */
  database(operation, collection, duration, meta = {}) {
    this.logger.debug(`Database: ${operation} on ${collection}`, this.enrichMeta({
      ...meta,
      operation,
      collection,
      duration: `${duration}ms`
    }));
  }

  /**
   * Context7 Pattern: Security event logging
   */
  security(event, severity, meta = {}) {
    const message = `Security: ${event}`;
    const enrichedMeta = this.enrichMeta({
      ...meta,
      event,
      severity,
      timestamp: new Date().toISOString()
    });

    if (severity === 'high' || severity === 'critical') {
      this.logger.error(message, enrichedMeta);
    } else {
      this.logger.warn(message, enrichedMeta);
    }
  }

  /**
   * Context7 Pattern: Business logic logging
   */
  business(event, data, meta = {}) {
    this.logger.info(`Business: ${event}`, this.enrichMeta({
      ...meta,
      event,
      data
    }));
  }

  /**
   * Context7 Pattern: Cache operation logging
   */
  cache(operation, key, hit, meta = {}) {
    this.logger.debug(`Cache: ${operation} - ${key}`, this.enrichMeta({
      ...meta,
      operation,
      key,
      hit
    }));
  }

  /**
   * Context7 Pattern: External service logging
   */
  external(service, operation, success, duration, meta = {}) {
    const level = success ? 'info' : 'warn';

    this.logger[level](`External: ${service} ${operation}`, this.enrichMeta({
      ...meta,
      service,
      operation,
      success,
      duration: `${duration}ms`
    }));
  }

  /**
   * Context7 Pattern: Enrich metadata with context
   */
  enrichMeta(meta) {
    return {
      ...meta,
      timestamp: new Date().toISOString(),
      process: process.pid,
      memory: this.getMemoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Context7 Pattern: Get memory usage information
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`
    };
  }

  /**
   * Context7 Pattern: Create child logger with additional context
   */
  child(additionalContext) {
    const childLogger = new Logger(this.module);
    const originalEnrichMeta = childLogger.enrichMeta.bind(childLogger);

    childLogger.enrichMeta = (meta) => {
      return originalEnrichMeta({
        ...additionalContext,
        ...meta
      });
    };

    return childLogger;
  }

  /**
   * Context7 Pattern: Log request lifecycle
   */
  requestStart(requestId, method, url, meta = {}) {
    this.info(`Request started: ${method} ${url}`, this.enrichMeta({
      ...meta,
      requestId,
      method,
      url,
      phase: 'start'
    }));
  }

  /**
   * Context7 Pattern: Log request completion
   */
  requestEnd(requestId, method, url, statusCode, duration, meta = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info';

    this.logger[level](`Request completed: ${method} ${url}`, this.enrichMeta({
      ...meta,
      requestId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      phase: 'end'
    }));
  }

  /**
   * Context7 Pattern: Log application startup
   */
  startup(service, version, port, meta = {}) {
    this.info(`Application started: ${service} v${version}`, this.enrichMeta({
      ...meta,
      service,
      version,
      port,
      nodeVersion: process.version,
      platform: process.platform
    }));
  }

  /**
   * Context7 Pattern: Log application shutdown
   */
  shutdown(service, reason, meta = {}) {
    this.info(`Application shutdown: ${service}`, this.enrichMeta({
      ...meta,
      service,
      reason,
      uptime: process.uptime()
    }));
  }

  /**
   * Context7 Pattern: Log configuration changes
   */
  config(key, value, meta = {}) {
    this.info(`Configuration: ${key} updated`, this.enrichMeta({
      ...meta,
      key,
      value: this.sanitizeConfigValue(key, value)
    }));
  }

  /**
   * Context7 Pattern: Sanitize sensitive configuration values
   */
  sanitizeConfigValue(key, value) {
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'connectionString'];

    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      return '[REDACTED]';
    }

    return value;
  }

  /**
   * Context7 Pattern: Get logger instance
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Context7 Pattern: Set log level
   */
  setLevel(level) {
    this.logger.level = level;
  }

  /**
   * Context7 Pattern: Add transport
   */
  addTransport(transport) {
    this.logger.add(transport);
  }

  /**
   * Context7 Pattern: Remove transport
   */
  removeTransport(transport) {
    this.logger.remove(transport);
  }
}

module.exports = { Logger };
