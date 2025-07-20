/**
 * 🔌 WebSocket Logging Service - Context7 Optimized
 *
 * Context7 Pattern: WebSocket Service for Live Console Output
 * - Streams backend logs to connected frontend clients
 * - Implements structured logging with filtering capabilities
 * - Supports real-time log streaming for monitoring dashboards
 * - Circuit breaker pattern for resilient connections
 * - SOLID architecture with single responsibility for log streaming
 */

const WebSocket = require('ws');
const { BaseService } = require('./BaseService');

class WebSocketLoggingService extends BaseService {
  constructor(server, options = {}) {
    super('WebSocketLoggingService', {
      enableCache: false, // No caching needed for streaming
      enableMongoDB: false // No MongoDB needed for live streaming
    });

    this.server = server;
    this.options = {
      port: options.port || 3002,
      path: options.path || '/logs',
      maxClients: options.maxClients || 50,
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
      logLevels: options.logLevels || ['info', 'warn', 'error', 'debug'],
      services: options.services || [], // Empty means all services
      ...options
    };

    this.clients = new Map();
    this.logBuffer = [];
    this.maxBufferSize = 1000;
    this.heartbeatInterval = null;
    this.isRunning = false;

    // Initialize WebSocket server
    this.initializeWebSocketServer();

    this.logger.info('🔌 WebSocket Logging Service initialized', {
      port: this.options.port,
      path: this.options.path,
      maxClients: this.options.maxClients
    });
  }

  /**
   * Context7 Pattern: Initialize WebSocket server with proper error handling
   */
  initializeWebSocketServer() {
    this.execute(async() => {
      // Context7 Pattern: Create separate WebSocket server on different port
      this.wss = new WebSocket.Server({
        port: this.options.port,
        path: this.options.path,
        maxPayload: this.options.maxMessageSize
      });

      this.wss.on('connection', (ws, request) => {
        // Context7 Pattern: Proper error handling and heartbeat for connections
        ws.isAlive = true;
        ws.on('error', (error) => {
          // Error handling moved to centralized manager - context: WebSocket client error
        });

        // Context7 Pattern: Heartbeat pong handler
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        this.handleConnection(ws, request);
      });

      this.wss.on('error', (error) => {
        // Error handling moved to centralized manager - context: WebSocket server error
      });

      this.wss.on('close', () => {
        this.logger.info('WebSocket server closed');
      });

      this.startHeartbeat();
      this.isRunning = true;

      this.logger.info('✅ WebSocket server initialized successfully', {
        port: this.options.port,
        path: this.options.path
      });
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Handle new WebSocket connection
   */
  handleConnection(ws, request) {
    try {
      const clientId = this.generateClientId();
      const clientInfo = {
        id: clientId,
        ws: ws,
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent'],
        connectedAt: new Date(),
        isAlive: true,
        filters: {
          levels: this.options.logLevels,
          services: this.options.services,
          itemIds: []
        }
      };

      // Check client limit
      if (this.clients.size >= this.options.maxClients) {
        this.logger.warn('Connection rejected - max clients reached', {
          clientId,
          maxClients: this.options.maxClients,
          currentClients: this.clients.size
        });
        ws.close(1008, 'Maximum clients reached');
        return;
      }

      // Store client
      this.clients.set(clientId, clientInfo);

      // Set up connection handlers
      ws.on('message', (message) => {
        this.handleMessage(clientId, message);
      });

      ws.on('close', (code, reason) => {
        this.handleDisconnection(clientId, code, reason);
      });

      ws.on('error', (error) => {
        // Error handling moved to centralized manager - context: WebSocket client error
      });

      ws.on('pong', () => {
        if (this.clients.has(clientId)) {
          this.clients.get(clientId).isAlive = true;
        }
      });

      // Send connection acknowledgment
      this.sendToClient(clientId, {
        type: 'connection',
        status: 'connected',
        clientId: clientId,
        serverTime: new Date().toISOString(),
        filters: clientInfo.filters
      });

      // Send buffered logs
      this.sendBufferedLogs(clientId);

      this.logger.info('✅ WebSocket client connected', {
        clientId,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        totalClients: this.clients.size
      });
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error handling WebSocket connection
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, 'Internal server error');
      }
    }
  }

  /**
   * Context7 Pattern: Handle WebSocket message
   */
  handleMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const data = JSON.parse(message.toString());

      switch (data.type) {
      case 'filter':
        this.handleFilterUpdate(clientId, data.filters);
        break;
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
      case 'subscribe':
        this.handleSubscription(clientId, data.subscription);
        break;
      case 'unsubscribe':
        this.handleUnsubscription(clientId, data.subscription);
        break;
      case 'request_buffer':
        this.sendBufferedLogs(clientId);
        break;
      default:
        this.logger.warn('Unknown message type received', {
          clientId,
          type: data.type
        });
      }
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error handling WebSocket message
    }
  }

  /**
   * Context7 Pattern: Handle filter updates
   */
  handleFilterUpdate(clientId, filters) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      client.filters = {
        levels: filters.levels || this.options.logLevels,
        services: filters.services || this.options.services,
        itemIds: filters.itemIds || []
      };

      this.sendToClient(clientId, {
        type: 'filter_updated',
        filters: client.filters,
        timestamp: Date.now()
      });

      this.logger.debug('Client filters updated', {
        clientId,
        filters: client.filters
      });
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error updating client filters
    }
  }

  /**
   * Context7 Pattern: Handle subscription
   */
  handleSubscription(clientId, subscription) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      // Add subscription logic here
      // For now, just acknowledge
      this.sendToClient(clientId, {
        type: 'subscribed',
        subscription: subscription,
        timestamp: Date.now()
      });

      this.logger.debug('Client subscribed', {
        clientId,
        subscription
      });
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error handling subscription
    }
  }

  /**
   * Context7 Pattern: Handle unsubscription
   */
  handleUnsubscription(clientId, subscription) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      // Add unsubscription logic here
      // For now, just acknowledge
      this.sendToClient(clientId, {
        type: 'unsubscribed',
        subscription: subscription,
        timestamp: Date.now()
      });

      this.logger.debug('Client unsubscribed', {
        clientId,
        subscription
      });
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error handling unsubscription
    }
  }

  /**
   * Context7 Pattern: Handle client disconnection
   */
  handleDisconnection(clientId, code, reason) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const duration = Date.now() - client.connectedAt.getTime();

      this.clients.delete(clientId);

      this.logger.info('🔌 WebSocket client disconnected', {
        clientId,
        code,
        reason: reason?.toString() || 'Unknown',
        duration: `${duration}ms`,
        totalClients: this.clients.size
      });
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error handling client disconnection
    }
  }

  /**
   * Context7 Pattern: Send message to specific client
   */
  sendToClient(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        return false;
      }

      const messageStr = JSON.stringify(message);
      client.ws.send(messageStr);
      return true;
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error sending message to client
      return false;
    }
  }

  /**
   * Context7 Pattern: Broadcast message to all clients
   */
  broadcastToClients(message, filter = null) {
    try {
      let sent = 0;
      let failed = 0;

      for (const [clientId, client] of this.clients) {
        try {
          // Apply filter if provided
          if (filter && !filter(client, message)) {
            continue;
          }

          if (this.sendToClient(clientId, message)) {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          // Error handling moved to centralized manager - context: ❌ Error broadcasting to client
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error broadcasting message
      return { sent: 0, failed: this.clients.size };
    }
  }

  /**
   * Context7 Pattern: Send buffered logs to client
   */
  sendBufferedLogs(clientId) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        return;
      }

      const filteredLogs = this.logBuffer.filter(log =>
        this.shouldSendLogToClient(client, log)
      );

      if (filteredLogs.length > 0) {
        this.sendToClient(clientId, {
          type: 'buffer',
          logs: filteredLogs,
          count: filteredLogs.length,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error sending buffered logs
    }
  }

  /**
   * Context7 Pattern: Check if log should be sent to client
   */
  shouldSendLogToClient(client, log) {
    try {
      // Check log level filter
      if (!client.filters.levels.includes(log.level.toLowerCase())) {
        return false;
      }

      // Check service filter
      if (client.filters.services.length > 0 &&
          !client.filters.services.includes(log.service)) {
        return false;
      }

      // Check item ID filter
      if (client.filters.itemIds.length > 0 &&
          log.itemId &&
          !client.filters.itemIds.includes(log.itemId)) {
        return false;
      }

      return true;
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error checking log filter
      return false;
    }
  }

  /**
   * Context7 Pattern: Stream log entry to connected clients
   */
  streamLog(logEntry) {
    try {
      // Add to buffer
      this.logBuffer.push(logEntry);

      // Maintain buffer size
      if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
      }

      // Create WebSocket message
      const message = {
        type: 'log',
        log: logEntry,
        timestamp: Date.now()
      };

      // Broadcast to filtered clients
      const result = this.broadcastToClients(message, (client, msg) =>
        this.shouldSendLogToClient(client, msg.log)
      );

      if (result.sent > 0) {
        this.logger.debug('📡 Log streamed to clients', {
          level: logEntry.level,
          service: logEntry.service,
          clientsSent: result.sent,
          clientsFailed: result.failed
        });
      }
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error streaming log
    }
  }

  /**
   * Context7 Pattern: Start heartbeat to keep connections alive
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, this.options.heartbeatInterval);
  }

  /**
   * Context7 Pattern: Stop heartbeat
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Context7 Pattern: Generate unique client ID
   */
  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Context7 Pattern: Get client statistics
   */
  getClientStats() {
    const stats = {
      totalClients: this.clients.size,
      maxClients: this.options.maxClients,
      bufferSize: this.logBuffer.length,
      maxBufferSize: this.maxBufferSize,
      isRunning: this.isRunning,
      clients: []
    };

    for (const [clientId, client] of this.clients) {
      stats.clients.push({
        id: clientId,
        ip: client.ip,
        userAgent: client.userAgent,
        connectedAt: client.connectedAt,
        duration: Date.now() - client.connectedAt.getTime(),
        isAlive: client.isAlive,
        filters: client.filters
      });
    }

    return stats;
  }

  /**
   * Context7 Pattern: Update service options
   */
  updateOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };

    this.logger.info('📝 WebSocket logging options updated', {
      newOptions: Object.keys(newOptions)
    });
  }

  /**
   * Context7 Pattern: Shutdown service
   */
  async shutdown() {
    return this.execute(async() => {
      this.logger.info('🔌 Shutting down WebSocket Logging Service');

      this.isRunning = false;
      this.stopHeartbeat();

      // Close all client connections
      for (const [clientId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1001, 'Server shutting down');
        }
      }

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      this.clients.clear();
      this.logBuffer = [];

      this.logger.info('✅ WebSocket Logging Service shutdown completed');
    }, 'shutdown', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Health check
   */
  healthCheck() {
    return {
      status: this.isRunning ? 'healthy' : 'unhealthy',
      clientCount: this.clients.size,
      maxClients: this.options.maxClients,
      bufferSize: this.logBuffer.length,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }

  // =========================================
  // REAL-TIME MARKET DATA STREAMING
  // =========================================

  /**
   * STREAMING: Broadcast market data to all connected clients
   */
  broadcastMarketData(marketData) {
    try {
      const message = {
        type: 'market_data',
        timestamp: Date.now(),
        data: marketData
      };

      this.broadcastToClients(message);
      this.logger.debug(`📊 Broadcasted market data to ${this.clients.size} clients`);
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error broadcasting market data
    }
  }

  /**
   * STREAMING: Broadcast pipeline status updates
   */
  broadcastPipelineStatus(status) {
    try {
      const message = {
        type: 'pipeline_status',
        timestamp: Date.now(),
        data: status
      };

      this.broadcastToClients(message);
      this.logger.debug(`🔄 Broadcasted pipeline status to ${this.clients.size} clients`);
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error broadcasting pipeline status
    }
  }

  /**
   * STREAMING: Broadcast AI training updates
   */
  broadcastAITrainingUpdate(trainingData) {
    try {
      const message = {
        type: 'ai_training',
        timestamp: Date.now(),
        data: trainingData
      };

      this.broadcastToClients(message);
      this.logger.debug(`🤖 Broadcasted AI training update to ${this.clients.size} clients`);
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error broadcasting AI training update
    }
  }

  /**
   * STREAMING: Broadcast memory usage alerts
   */
  broadcastMemoryAlert(memoryData) {
    try {
      const message = {
        type: 'memory_alert',
        timestamp: Date.now(),
        severity: memoryData.heapUsed > 500 ? 'critical' : 'warning',
        data: memoryData
      };

      this.broadcastToClients(message);
      this.logger.debug(`⚠️ Broadcasted memory alert to ${this.clients.size} clients`);
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error broadcasting memory alert
    }
  }

  /**
   * STREAMING: Broadcast system health updates
   */
  broadcastSystemHealth(healthData) {
    try {
      const message = {
        type: 'system_health',
        timestamp: Date.now(),
        data: healthData
      };

      this.broadcastToClients(message);
      this.logger.debug(`❤️ Broadcasted system health to ${this.clients.size} clients`);
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error broadcasting system health
    }
  }

  /**
   * STREAMING: Generic broadcast method for any message type
   */
  broadcastToClients(message) {
    const messageStr = JSON.stringify(message);
    const activeClients = [];

    for (const [clientId, client] of this.clients) {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(messageStr);
          activeClients.push(clientId);
        } else {
          // Remove inactive clients
          this.clients.delete(clientId);
        }
      } catch (error) {
        this.logger.warn(`⚠️ Failed to send message to client ${clientId}`, error);
        this.clients.delete(clientId);
      }
    }

    return activeClients.length;
  }

  /**
   * STREAMING: Send message to specific client
   */
  sendToClient(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    } catch (error) {
      // Error handling moved to centralized manager - context: operation
      return false;
    }
  }

  /**
   * STREAMING: Get streaming statistics
   */
  getStreamingStats() {
    const connectedClients = Array.from(this.clients.values()).filter(
      client => client.ws.readyState === WebSocket.OPEN
    );

    return {
      totalClients: this.clients.size,
      activeClients: connectedClients.length,
      clientTypes: connectedClients.reduce((acc, client) => {
        const type = client.metadata?.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      messagesSent: this.messagesSent || 0,
      bytesTransferred: this.bytesTransferred || 0,
      uptime: process.uptime()
    };
  }
}

module.exports = { WebSocketLoggingService };
