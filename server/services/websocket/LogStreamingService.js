/**
 * 📊 Log Streaming Service - SOLID Compliant
 *
 * Single Responsibility: Handles log message streaming and filtering
 * - Manages log message buffering and distribution
 * - Implements log filtering by level and service
 * - Handles message formatting and serialization
 * - Provides real-time log delivery to clients
 */

const { BaseService } = require('../BaseService');

class LogStreamingService extends BaseService {
  constructor(connectionManager, options = {}) {
    super('LogStreamingService', {
      enableCache: false,
      enableMongoDB: false
    });

    this.connectionManager = connectionManager;
    this.options = {
      maxBufferSize: options.maxBufferSize || 1000,
      maxMessageSize: options.maxMessageSize || 1024 * 1024,
      logLevels: options.logLevels || ['info', 'warn', 'error', 'debug'],
      services: options.services || [],
      ...options
    };

    this.logBuffer = [];
    this.messageQueue = [];
    this.isProcessing = false;
  }

  /**
   * Stream a log message to connected clients
   */
  streamLog(logEntry) {
    try {
      // Validate and format the log entry
      const formattedEntry = this.formatLogEntry(logEntry);
      
      if (!this.shouldStreamLog(formattedEntry)) {
        return;
      }

      // Add to buffer for new clients
      this.addToBuffer(formattedEntry);

      // Send to all subscribed clients
      this.sendToClients(formattedEntry);

    } catch (error) {
      this.logger.error('Failed to stream log entry', {
        error: error.message,
        logEntry: this.sanitizeLogEntry(logEntry)
      });
    }
  }

  /**
   * Send historical logs to a specific client
   */
  sendHistoricalLogs(clientId, filters = {}) {
    const client = this.connectionManager.getClient(clientId);
    if (!client || client.ws.readyState !== 1) {
      return false;
    }

    try {
      const filteredLogs = this.filterLogs(this.logBuffer, filters);
      
      if (filteredLogs.length === 0) {
        return true;
      }

      const message = {
        type: 'historical_logs',
        data: filteredLogs,
        timestamp: new Date().toISOString(),
        count: filteredLogs.length
      };

      this.sendToClient(client, message);
      return true;

    } catch (error) {
      this.logger.error('Failed to send historical logs', {
        clientId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Subscribe client to specific log filters
   */
  subscribeClient(clientId, filters) {
    const subscription = {
      levels: filters.levels || this.options.logLevels,
      services: filters.services || [],
      keywords: filters.keywords || []
    };

    // Store subscription in connection manager
    this.connectionManager.addSubscription(clientId, subscription);

    // Send current buffer matching filters
    this.sendHistoricalLogs(clientId, subscription);

    this.logger.debug('Client subscribed to log stream', {
      clientId,
      subscription
    });

    return true;
  }

  /**
   * Unsubscribe client from log streams
   */
  unsubscribeClient(clientId) {
    this.connectionManager.removeSubscription(clientId, 'logs');
    
    this.logger.debug('Client unsubscribed from log stream', {
      clientId
    });
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats() {
    return {
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.options.maxBufferSize,
      queueSize: this.messageQueue.length,
      isProcessing: this.isProcessing,
      supportedLevels: this.options.logLevels,
      watchedServices: this.options.services
    };
  }

  /**
   * Clear log buffer
   */
  clearBuffer() {
    const clearedCount = this.logBuffer.length;
    this.logBuffer = [];
    
    this.logger.info('Log buffer cleared', {
      clearedEntries: clearedCount
    });
  }

  // Private methods

  formatLogEntry(logEntry) {
    // Ensure required fields exist
    const formatted = {
      timestamp: logEntry.timestamp || new Date().toISOString(),
      level: logEntry.level || 'info',
      service: logEntry.service || 'unknown',
      message: logEntry.message || '',
      data: logEntry.data || {},
      id: logEntry.id || this.generateLogId()
    };

    // Add metadata
    formatted.metadata = {
      hostname: process.env.HOSTNAME || 'localhost',
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    return formatted;
  }

  shouldStreamLog(logEntry) {
    // Check log level
    if (!this.options.logLevels.includes(logEntry.level)) {
      return false;
    }

    // Check service filter (empty means all services)
    if (this.options.services.length > 0 && 
        !this.options.services.includes(logEntry.service)) {
      return false;
    }

    return true;
  }

  addToBuffer(logEntry) {
    this.logBuffer.push(logEntry);

    // Maintain buffer size limit
    if (this.logBuffer.length > this.options.maxBufferSize) {
      const removed = this.logBuffer.splice(0, 
        this.logBuffer.length - this.options.maxBufferSize);
      
      this.logger.debug('Log buffer trimmed', {
        removedEntries: removed.length,
        currentSize: this.logBuffer.length
      });
    }
  }

  sendToClients(logEntry) {
    const activeClients = this.connectionManager.getActiveClients();
    
    if (activeClients.length === 0) {
      return;
    }

    const message = {
      type: 'log_entry',
      data: logEntry,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    let errorCount = 0;

    activeClients.forEach(client => {
      if (this.clientShouldReceiveLog(client, logEntry)) {
        try {
          this.sendToClient(client, message);
          sentCount++;
        } catch (error) {
          errorCount++;
          this.logger.debug('Failed to send log to client', {
            clientId: client.id,
            error: error.message
          });
        }
      }
    });

    this.logger.debug('Log distributed to clients', {
      sentCount,
      errorCount,
      totalClients: activeClients.length
    });
  }

  clientShouldReceiveLog(client, logEntry) {
    if (client.subscriptions.size === 0) {
      return true; // No specific subscriptions = receive all
    }

    for (const subscription of client.subscriptions) {
      if (typeof subscription === 'object') {
        // Check level filter
        if (subscription.levels && 
            !subscription.levels.includes(logEntry.level)) {
          continue;
        }

        // Check service filter
        if (subscription.services && subscription.services.length > 0 &&
            !subscription.services.includes(logEntry.service)) {
          continue;
        }

        // Check keyword filter
        if (subscription.keywords && subscription.keywords.length > 0) {
          const message = logEntry.message.toLowerCase();
          const hasKeyword = subscription.keywords.some(keyword =>
            message.includes(keyword.toLowerCase())
          );
          if (!hasKeyword) {
            continue;
          }
        }

        return true; // Passed all filters
      }
    }

    return false;
  }

  sendToClient(client, message) {
    if (client.ws.readyState !== 1) {
      return;
    }

    const serialized = JSON.stringify(message);
    
    if (serialized.length > this.options.maxMessageSize) {
      this.logger.warn('Message too large for client', {
        clientId: client.id,
        messageSize: serialized.length,
        maxSize: this.options.maxMessageSize
      });
      return;
    }

    client.ws.send(serialized);
    client.messageCount++;
  }

  filterLogs(logs, filters) {
    return logs.filter(log => {
      // Level filter
      if (filters.levels && !filters.levels.includes(log.level)) {
        return false;
      }

      // Service filter
      if (filters.services && filters.services.length > 0 &&
          !filters.services.includes(log.service)) {
        return false;
      }

      // Keyword filter
      if (filters.keywords && filters.keywords.length > 0) {
        const message = log.message.toLowerCase();
        const hasKeyword = filters.keywords.some(keyword =>
          message.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) {
          return false;
        }
      }

      return true;
    });
  }

  generateLogId() {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeLogEntry(logEntry) {
    // Remove potentially sensitive data for error logging
    const sanitized = { ...logEntry };
    
    if (sanitized.data && typeof sanitized.data === 'object') {
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
      sensitiveFields.forEach(field => {
        if (sanitized.data[field]) {
          sanitized.data[field] = '[REDACTED]';
        }
      });
    }

    return sanitized;
  }
}

module.exports = { LogStreamingService };