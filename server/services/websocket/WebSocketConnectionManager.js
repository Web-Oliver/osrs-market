/**
 * 🔗 WebSocket Connection Manager - SOLID Compliant
 *
 * Single Responsibility: Manages WebSocket client connections
 * - Handles client connection/disconnection lifecycle
 * - Maintains client registry and metadata
 * - Implements heartbeat monitoring
 * - Provides connection state management
 */

const { BaseService } = require('../BaseService');

class WebSocketConnectionManager extends BaseService {
  constructor(options = {}) {
    super('WebSocketConnectionManager', {
      enableCache: false,
      enableMongoDB: false
    });

    this.options = {
      maxClients: options.maxClients || 50,
      heartbeatInterval: options.heartbeatInterval || 30000,
      ...options
    };

    this.clients = new Map();
    this.heartbeatInterval = null;
  }

  /**
   * Register a new WebSocket client
   */
  registerClient(ws, request) {
    if (this.clients.size >= this.options.maxClients) {
      this.logger.warn('Maximum client limit reached, rejecting connection', {
        currentClients: this.clients.size,
        maxClients: this.options.maxClients
      });
      ws.close(1013, 'Server overloaded');
      return null;
    }

    const clientId = this.generateClientId();
    const clientInfo = {
      id: clientId,
      ws,
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true,
      ip: this.getClientIP(request),
      userAgent: request.headers['user-agent'],
      subscriptions: new Set(),
      messageCount: 0
    };

    this.clients.set(clientId, clientInfo);

    // Set up client event handlers
    ws.isAlive = true;
    ws.on('pong', () => {
      clientInfo.isAlive = true;
      clientInfo.lastPing = new Date();
    });

    ws.on('close', () => {
      this.unregisterClient(clientId);
    });

    ws.on('error', (error) => {
      this.logger.error('Client WebSocket error', {
        clientId,
        error: error.message
      });
      this.unregisterClient(clientId);
    });

    this.logger.info('Client connected', {
      clientId,
      totalClients: this.clients.size,
      ip: clientInfo.ip
    });

    return clientId;
  }

  /**
   * Unregister a WebSocket client
   */
  unregisterClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.logger.info('Client disconnected', {
        clientId,
        connectedDuration: Date.now() - client.connectedAt.getTime(),
        totalClients: this.clients.size
      });
    }
  }

  /**
   * Get client by ID
   */
  getClient(clientId) {
    return this.clients.get(clientId);
  }

  /**
   * Get all active clients
   */
  getActiveClients() {
    return Array.from(this.clients.values()).filter(client => 
      client.ws.readyState === 1 && client.isAlive
    );
  }

  /**
   * Start heartbeat monitoring
   */
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.options.heartbeatInterval);

    this.logger.debug('Heartbeat monitoring started', {
      interval: this.options.heartbeatInterval
    });
  }

  /**
   * Stop heartbeat monitoring
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Perform heartbeat check on all clients
   */
  performHeartbeat() {
    const deadClients = [];

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState !== 1) {
        deadClients.push(clientId);
        return;
      }

      if (!client.isAlive) {
        this.logger.debug('Client failed heartbeat, terminating', { clientId });
        client.ws.terminate();
        deadClients.push(clientId);
        return;
      }

      client.isAlive = false;
      client.ws.ping();
    });

    // Remove dead clients
    deadClients.forEach(clientId => {
      this.unregisterClient(clientId);
    });

    if (deadClients.length > 0) {
      this.logger.debug('Heartbeat completed', {
        removedClients: deadClients.length,
        activeClients: this.clients.size
      });
    }
  }

  /**
   * Add subscription for a client
   */
  addSubscription(clientId, subscription) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(subscription);
      return true;
    }
    return false;
  }

  /**
   * Remove subscription for a client
   */
  removeSubscription(clientId, subscription) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(subscription);
      return true;
    }
    return false;
  }

  /**
   * Get client connection statistics
   */
  getConnectionStats() {
    const activeClients = this.getActiveClients();
    
    return {
      totalClients: this.clients.size,
      activeClients: activeClients.length,
      maxClients: this.options.maxClients,
      uptimeSeconds: this.heartbeatInterval ? 
        Math.floor((Date.now() - this.startTime) / 1000) : 0,
      clientDetails: activeClients.map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        messageCount: client.messageCount,
        subscriptions: Array.from(client.subscriptions),
        ip: client.ip
      }))
    };
  }

  /**
   * Close all connections
   */
  closeAll() {
    this.stopHeartbeat();
    
    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === 1) {
        client.ws.close(1001, 'Server shutting down');
      }
    });
    
    this.clients.clear();
    
    this.logger.info('All WebSocket connections closed');
  }

  // Private methods

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getClientIP(request) {
    return request.headers['x-forwarded-for'] || 
           request.headers['x-real-ip'] || 
           request.connection.remoteAddress ||
           'unknown';
  }
}

module.exports = { WebSocketConnectionManager };