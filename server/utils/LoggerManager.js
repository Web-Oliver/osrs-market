/**
 * 📊 Logger Manager - Context7 Optimized
 *
 * Context7 Pattern: Centralized Logger Management with WebSocket Integration
 * - Manages Logger instances and WebSocket streaming
 * - Provides structured logging with real-time streaming
 * - Integrates with WebSocketLoggingService for live console output
 * - Supports filtering, buffering, and log aggregation
 * - SOLID architecture with single responsibility for log coordination
 */

const { Logger } = require('./Logger');
const { WebSocketLoggingService } = require('../services/WebSocketLoggingService');

class LoggerManager {
  constructor() {
    this.loggers = new Map();
    this.webSocketService = null;
    this.isInitialized = false;
    this.logQueue = [];
    this.maxQueueSize = 1000;
    this.processingQueue = false;

    // Create system logger
    this.systemLogger = new Logger('LoggerManager');

    this.systemLogger.info('📊 Logger Manager initialized');
  }

  /**
   * Context7 Pattern: Initialize WebSocket logging service
   */
  async initializeWebSocketLogging(server, options = {}) {
    try {
      if (this.webSocketService) {
        this.systemLogger.warn('WebSocket logging service already initialized');
        return;
      }

      this.webSocketService = new WebSocketLoggingService(server, options);

      // Start processing queued logs
      this.startLogProcessing();

      this.isInitialized = true;

      this.systemLogger.info('✅ WebSocket logging service initialized successfully');
    } catch (error) {
      this.systemLogger.error('❌ Failed to initialize WebSocket logging service', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get or create logger instance
   */
  getLogger(moduleName, options = {}) {
    if (!this.loggers.has(moduleName)) {
      const logger = new Logger(moduleName);
      const enhancedLogger = this.enhanceLogger(logger, moduleName);
      this.loggers.set(moduleName, enhancedLogger);
    }

    return this.loggers.get(moduleName);
  }

  /**
   * Context7 Pattern: Enhance logger with WebSocket streaming
   */
  enhanceLogger(logger, moduleName) {
    const originalMethods = {
      info: logger.info.bind(logger),
      debug: logger.debug.bind(logger),
      warn: logger.warn.bind(logger),
      error: logger.error.bind(logger),
      fatal: logger.fatal.bind(logger)
    };

    // Override logging methods to include WebSocket streaming
    logger.info = (message, meta = {}) => {
      originalMethods.info(message, meta);
      this.streamLog('info', moduleName, message, meta);
    };

    logger.debug = (message, meta = {}) => {
      originalMethods.debug(message, meta);
      this.streamLog('debug', moduleName, message, meta);
    };

    logger.warn = (message, meta = {}) => {
      originalMethods.warn(message, meta);
      this.streamLog('warn', moduleName, message, meta);
    };

    logger.error = (message, error = null, meta = {}) => {
      originalMethods.error(message, error, meta);
      this.streamLog('error', moduleName, message, { error, ...meta });
    };

    logger.fatal = (message, error = null, meta = {}) => {
      originalMethods.fatal(message, error, meta);
      this.streamLog('fatal', moduleName, message, { error, ...meta });
    };

    // Add custom streaming methods
    logger.stream = (level, message, meta = {}) => {
      this.streamLog(level, moduleName, message, meta);
    };

    logger.trading = (action, itemId, result, meta = {}) => {
      const message = `Trading: ${action} for item ${itemId}`;
      const tradingMeta = {
        ...meta,
        itemId,
        action,
        result,
        category: 'trading'
      };

      logger.info(message, tradingMeta);
      this.streamLog('info', moduleName, message, tradingMeta);
    };

    logger.aiDecision = (decision, confidence, reasoning, meta = {}) => {
      const message = `AI Decision: ${decision} (confidence: ${confidence})`;
      const aiMeta = {
        ...meta,
        decision,
        confidence,
        reasoning,
        category: 'ai'
      };

      logger.info(message, aiMeta);
      this.streamLog('info', moduleName, message, aiMeta);
    };

    logger.marketData = (event, itemId, priceData, meta = {}) => {
      const message = `Market Data: ${event} for item ${itemId}`;
      const marketMeta = {
        ...meta,
        itemId,
        event,
        priceData,
        category: 'market'
      };

      logger.info(message, marketMeta);
      this.streamLog('info', moduleName, message, marketMeta);
    };

    return logger;
  }

  /**
   * Context7 Pattern: Stream log entry
   */
  streamLog(level, service, message, meta = {}) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        service: service,
        message: message,
        meta: meta,
        traceId: this.generateTraceId(),
        processId: process.pid
      };

      // Add to queue for processing
      this.logQueue.push(logEntry);

      // Maintain queue size
      if (this.logQueue.length > this.maxQueueSize) {
        this.logQueue.shift();
      }

      // Process queue if not already processing
      if (!this.processingQueue) {
        setImmediate(() => this.processLogQueue());
      }
    } catch (error) {
      this.systemLogger.error('❌ Error streaming log', error);
    }
  }

  /**
   * Context7 Pattern: Process log queue
   */
  async processLogQueue() {
    if (this.processingQueue || this.logQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      // Process logs in batches
      const batchSize = 10;
      const logsToProcess = this.logQueue.splice(0, batchSize);

      for (const logEntry of logsToProcess) {
        if (this.webSocketService) {
          this.webSocketService.streamLog(logEntry);
        }
      }

      // If more logs in queue, schedule next processing
      if (this.logQueue.length > 0) {
        setImmediate(() => this.processLogQueue());
      }
    } catch (error) {
      this.systemLogger.error('❌ Error processing log queue', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Context7 Pattern: Start log processing
   */
  startLogProcessing() {
    if (this.processingQueue) {
      return;
    }

    // Process queue every 100ms
    this.logProcessingInterval = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.processLogQueue();
      }
    }, 100);
  }

  /**
   * Context7 Pattern: Stop log processing
   */
  stopLogProcessing() {
    if (this.logProcessingInterval) {
      clearInterval(this.logProcessingInterval);
      this.logProcessingInterval = null;
    }
  }

  /**
   * Context7 Pattern: Generate trace ID
   */
  generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Context7 Pattern: Get system statistics
   */
  getSystemStats() {
    const stats = {
      loggersCount: this.loggers.size,
      queueSize: this.logQueue.length,
      maxQueueSize: this.maxQueueSize,
      processingQueue: this.processingQueue,
      isInitialized: this.isInitialized,
      webSocketStats: null,
      loggers: Array.from(this.loggers.keys())
    };

    if (this.webSocketService) {
      stats.webSocketStats = this.webSocketService.getClientStats();
    }

    return stats;
  }

  /**
   * Context7 Pattern: Configure log streaming
   */
  configureStreaming(options) {
    this.maxQueueSize = options.maxQueueSize || this.maxQueueSize;

    if (this.webSocketService) {
      this.webSocketService.updateOptions(options);
    }

    this.systemLogger.info('📝 Log streaming configured', {
      options: Object.keys(options)
    });
  }

  /**
   * Context7 Pattern: Broadcast system message
   */
  broadcastSystemMessage(message, level = 'info', meta = {}) {
    const systemMessage = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'system',
      message: message,
      meta: {
        ...meta,
        category: 'system',
        broadcast: true
      },
      traceId: this.generateTraceId(),
      processId: process.pid
    };

    if (this.webSocketService) {
      this.webSocketService.broadcastToClients({
        type: 'system',
        message: systemMessage,
        timestamp: Date.now()
      });
    }

    this.systemLogger[level](message, meta);
  }

  /**
   * Context7 Pattern: Stream trading session update
   */
  streamTradingSession(sessionId, update, meta = {}) {
    const message = `Trading Session: ${sessionId} - ${update.type}`;
    const sessionMeta = {
      ...meta,
      sessionId,
      update,
      category: 'trading_session'
    };

    if (this.webSocketService) {
      this.webSocketService.broadcastToClients({
        type: 'trading_session',
        sessionId,
        update,
        meta: sessionMeta,
        timestamp: Date.now()
      });
    }

    this.systemLogger.info(message, sessionMeta);
  }

  /**
   * Context7 Pattern: Stream AI training progress
   */
  streamAITrainingProgress(progress, meta = {}) {
    const message = `AI Training: Episode ${progress.episode} - Reward: ${progress.reward}`;
    const progressMeta = {
      ...meta,
      progress,
      category: 'ai_training'
    };

    if (this.webSocketService) {
      this.webSocketService.broadcastToClients({
        type: 'ai_training',
        progress,
        meta: progressMeta,
        timestamp: Date.now()
      });
    }

    this.systemLogger.info(message, progressMeta);
  }

  /**
   * Context7 Pattern: Stream market analysis
   */
  streamMarketAnalysis(analysis, meta = {}) {
    const message = `Market Analysis: ${analysis.type} - ${analysis.itemCount} items`;
    const analysisMeta = {
      ...meta,
      analysis,
      category: 'market_analysis'
    };

    if (this.webSocketService) {
      this.webSocketService.broadcastToClients({
        type: 'market_analysis',
        analysis,
        meta: analysisMeta,
        timestamp: Date.now()
      });
    }

    this.systemLogger.info(message, analysisMeta);
  }

  /**
   * Context7 Pattern: Create context logger
   */
  createContextLogger(moduleName, context = {}) {
    const baseLogger = this.getLogger(moduleName);

    return {
      ...baseLogger,
      info: (message, meta = {}) => baseLogger.info(message, { ...context, ...meta }),
      debug: (message, meta = {}) => baseLogger.debug(message, { ...context, ...meta }),
      warn: (message, meta = {}) => baseLogger.warn(message, { ...context, ...meta }),
      error: (message, error = null, meta = {}) => baseLogger.error(message, error, { ...context, ...meta }),
      fatal: (message, error = null, meta = {}) => baseLogger.fatal(message, error, { ...context, ...meta }),
      trading: (action, itemId, result, meta = {}) => baseLogger.trading(action, itemId, result, { ...context, ...meta }),
      aiDecision: (decision, confidence, reasoning, meta = {}) => baseLogger.aiDecision(decision, confidence, reasoning, { ...context, ...meta }),
      marketData: (event, itemId, priceData, meta = {}) => baseLogger.marketData(event, itemId, priceData, { ...context, ...meta })
    };
  }

  /**
   * Context7 Pattern: Flush all logs
   */
  async flushLogs() {
    try {
      await this.processLogQueue();
      this.systemLogger.info('✅ All logs flushed successfully');
    } catch (error) {
      this.systemLogger.error('❌ Error flushing logs', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Shutdown logger manager
   */
  async shutdown() {
    try {
      this.systemLogger.info('📊 Shutting down Logger Manager');

      // Flush remaining logs
      await this.flushLogs();

      // Stop processing
      this.stopLogProcessing();

      // Shutdown WebSocket service
      if (this.webSocketService) {
        await this.webSocketService.shutdown();
      }

      // Clear loggers
      this.loggers.clear();
      this.logQueue = [];

      this.systemLogger.info('✅ Logger Manager shutdown completed');
    } catch (error) {
      this.systemLogger.error('❌ Error shutting down Logger Manager', error);
      throw error;
    }
  }
}

// Create singleton instance
const loggerManager = new LoggerManager();

module.exports = { LoggerManager, loggerManager };
