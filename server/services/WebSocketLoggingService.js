/**
 * 🔌 WebSocket Logging Service - SOLID Refactored
 *
 * SOLID Principles Applied:
 * - SRP: Delegates responsibilities to specialized services
 * - OCP: Open for extension via composition
 * - DIP: Depends on abstractions for connection and streaming management
 * 
 * Responsibilities:
 * - Orchestrates WebSocket server and log streaming
 * - Provides high-level API for log distribution
 * - Manages service lifecycle and cleanup
 */

const WebSocket = require('ws');
const { BaseService } = require('./BaseService');
const { WebSocketConnectionManager } = require('./websocket/WebSocketConnectionManager');
const { LogStreamingService } = require('./websocket/LogStreamingService');
const { WebSocketMessageBroadcaster } = require('./websocket/WebSocketMessageBroadcaster');

class WebSocketLoggingService extends BaseService {
  constructor(server, options = {}) {
    super('WebSocketLoggingService', {
      enableCache: false,
      enableMongoDB: false
    });

    this.server = server;
    this.options = {
      port: options.port || 3002,
      path: options.path || '/logs',
      maxClients: options.maxClients || 50,
      heartbeatInterval: options.heartbeatInterval || 30000,
      maxMessageSize: options.maxMessageSize || 1024 * 1024,
      logLevels: options.logLevels || ['info', 'warn', 'error', 'debug'],
      services: options.services || [],
      ...options
    };

    // SOLID: Composition over inheritance - delegate to specialized services
    this.connectionManager = new WebSocketConnectionManager({
      maxClients: this.options.maxClients,
      heartbeatInterval: this.options.heartbeatInterval
    });

    this.logStreamer = new LogStreamingService(this.connectionManager, {
      maxBufferSize: 1000,
      maxMessageSize: this.options.maxMessageSize,
      logLevels: this.options.logLevels,
      services: this.options.services
    });

    this.broadcaster = new WebSocketMessageBroadcaster(this.connectionManager, {
      maxQueueSize: 1000,
      batchSize: 10
    });

    this.wss = null;
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
   * SOLID: Initialize WebSocket server - delegates connection management
   */
  initializeWebSocketServer() {
    this.execute(async() => {
      this.wss = new WebSocket.Server({
        port: this.options.port,
        path: this.options.path,
        maxPayload: this.options.maxMessageSize
      });

      this.wss.on('connection', (ws, request) => {
        // SOLID: Delegate connection handling to ConnectionManager
        const clientId = this.connectionManager.registerClient(ws, request);
        
        if (clientId) {
          this.handleClientMessages(clientId, ws);
          this.sendWelcomeMessage(clientId);
        }
      });

      this.wss.on('error', (error) => {
        this.logger.error('WebSocket server error', { error: error.message });
      });

      this.wss.on('close', () => {
        this.logger.info('WebSocket server closed');
      });

      // SOLID: Delegate heartbeat to ConnectionManager
      this.connectionManager.startHeartbeat();
      this.isRunning = true;

      this.logger.info('✅ WebSocket server initialized successfully', {
        port: this.options.port,
        path: this.options.path
      });
    }, 'operation', { logSuccess: false });
  }

  /**
   * SOLID: Handle client messages - simplified orchestration
   */
  handleClientMessages(clientId, ws) {
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        this.processClientMessage(clientId, data);
      } catch (error) {
        this.logger.error('Invalid message from client', {
          clientId,
          error: error.message
        });
      }
    });
  }

  /**
   * SOLID: Send welcome message to new client
   */
  sendWelcomeMessage(clientId) {
    const welcomeMessage = {
      type: 'connection',
      status: 'connected',
      clientId: clientId,
      serverTime: new Date().toISOString(),
      filters: {
        levels: this.options.logLevels,
        services: this.options.services
      }
    };

    this.broadcaster.sendToClient(clientId, welcomeMessage);
    this.logStreamer.sendHistoricalLogs(clientId);
  }

  /**
   * SOLID: Process client message - delegates to appropriate handlers
   */
  processClientMessage(clientId, data) {
    switch (data.type) {
    case 'filter':
    case 'subscribe':
      this.logStreamer.subscribeClient(clientId, data.filters || data.subscription);
      break;
    case 'ping':
      this.broadcaster.sendToClient(clientId, { 
        type: 'pong', 
        timestamp: Date.now() 
      });
      break;
    case 'unsubscribe':
      this.logStreamer.unsubscribeClient(clientId);
      break;
    case 'request_buffer':
      this.logStreamer.sendHistoricalLogs(clientId, data.filters);
      break;
    default:
      this.logger.warn('Unknown message type received', {
        clientId,
        type: data.type
      });
    }
  }

  // =================================================================
  // PUBLIC API METHODS - SOLID Compliant
  // =================================================================

  /**
   * Stream a log entry to connected clients
   */
  streamLog(logEntry) {
    this.logStreamer.streamLog(logEntry);
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message, options = {}) {
    return this.broadcaster.broadcastToAll(message, options);
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message, options = {}) {
    return this.broadcaster.sendToClient(clientId, message, options);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connections: this.connectionManager.getConnectionStats(),
      streaming: this.logStreamer.getStreamingStats(),
      broadcasting: this.broadcaster.getBroadcastStats(),
      server: {
        isRunning: this.isRunning,
        port: this.options.port,
        path: this.options.path
      }
    };
  }

  /**
   * Shutdown the WebSocket service
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down WebSocket Logging Service...');

      // Stop accepting new connections
      this.isRunning = false;

      // Close all client connections
      this.connectionManager.closeAll();

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Clear resources
      this.logStreamer.clearBuffer();
      this.broadcaster.clearQueue();

      this.logger.info('✅ WebSocket Logging Service shutdown complete');

    } catch (error) {
      this.logger.error('Error during WebSocket service shutdown', {
        error: error.message
      });
    }
  }

}

module.exports = { WebSocketLoggingService };
