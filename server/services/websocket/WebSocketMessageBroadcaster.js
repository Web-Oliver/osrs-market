/**
 * 📢 WebSocket Message Broadcaster - SOLID Compliant
 *
 * Single Responsibility: Handles WebSocket message broadcasting
 * - Manages message distribution to multiple clients
 * - Implements selective broadcasting with filters
 * - Handles message queuing and delivery confirmation
 * - Provides broadcast analytics and monitoring
 */

const { BaseService } = require('../BaseService');

class WebSocketMessageBroadcaster extends BaseService {
  constructor(connectionManager, options = {}) {
    super('WebSocketMessageBroadcaster', {
      enableCache: false,
      enableMongoDB: false
    });

    this.connectionManager = connectionManager;
    this.options = {
      maxQueueSize: options.maxQueueSize || 1000,
      batchSize: options.batchSize || 10,
      deliveryTimeout: options.deliveryTimeout || 5000,
      retryAttempts: options.retryAttempts || 3,
      ...options
    };

    this.messageQueue = [];
    this.deliveryStats = {
      sent: 0,
      failed: 0,
      queued: 0
    };
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message, options = {}) {
    const activeClients = this.connectionManager.getActiveClients();
    
    if (activeClients.length === 0) {
      this.logger.debug('No active clients for broadcast');
      return { sent: 0, failed: 0 };
    }

    return this.broadcastToClients(activeClients.map(c => c.id), message, options);
  }

  /**
   * Broadcast message to specific clients
   */
  broadcastToClients(clientIds, message, options = {}) {
    const results = { sent: 0, failed: 0, errors: [] };
    
    if (!Array.isArray(clientIds)) {
      clientIds = [clientIds];
    }

    const formattedMessage = this.formatMessage(message, options);

    clientIds.forEach(clientId => {
      try {
        const success = this.sendToClient(clientId, formattedMessage, options);
        if (success) {
          results.sent++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          clientId,
          error: error.message
        });
        
        this.logger.debug('Failed to broadcast to client', {
          clientId,
          error: error.message
        });
      }
    });

    this.updateDeliveryStats(results);

    this.logger.debug('Broadcast completed', {
      targetClients: clientIds.length,
      sent: results.sent,
      failed: results.failed,
      messageType: formattedMessage.type
    });

    return results;
  }

  /**
   * Broadcast to clients matching filters
   */
  broadcastToFiltered(message, filters = {}, options = {}) {
    const matchingClients = this.filterClients(filters);
    
    if (matchingClients.length === 0) {
      this.logger.debug('No clients match broadcast filters', { filters });
      return { sent: 0, failed: 0 };
    }

    return this.broadcastToClients(
      matchingClients.map(c => c.id), 
      message, 
      options
    );
  }

  /**
   * Send message to a specific client
   */
  sendToClient(clientId, message, options = {}) {
    const client = this.connectionManager.getClient(clientId);
    
    if (!client) {
      this.logger.debug('Client not found for message delivery', { clientId });
      return false;
    }

    if (client.ws.readyState !== 1) {
      this.logger.debug('Client WebSocket not ready', { 
        clientId, 
        readyState: client.ws.readyState 
      });
      return false;
    }

    try {
      const serializedMessage = JSON.stringify(message);
      
      // Check message size limits
      if (options.maxSize && serializedMessage.length > options.maxSize) {
        this.logger.warn('Message too large for delivery', {
          clientId,
          messageSize: serializedMessage.length,
          maxSize: options.maxSize
        });
        return false;
      }

      client.ws.send(serializedMessage);
      client.messageCount++;

      this.logger.debug('Message sent to client', {
        clientId,
        messageType: message.type,
        messageSize: serializedMessage.length
      });

      return true;

    } catch (error) {
      this.logger.error('Failed to send message to client', {
        clientId,
        error: error.message,
        messageType: message.type
      });
      return false;
    }
  }

  /**
   * Queue message for later delivery
   */
  queueMessage(message, targets, options = {}) {
    if (this.messageQueue.length >= this.options.maxQueueSize) {
      this.logger.warn('Message queue full, dropping oldest messages', {
        queueSize: this.messageQueue.length,
        maxSize: this.options.maxQueueSize
      });
      
      // Remove oldest messages
      this.messageQueue.splice(0, this.options.batchSize);
    }

    const queueItem = {
      id: this.generateMessageId(),
      message: this.formatMessage(message, options),
      targets,
      options,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: options.retryAttempts || this.options.retryAttempts
    };

    this.messageQueue.push(queueItem);
    this.deliveryStats.queued++;

    this.logger.debug('Message queued for delivery', {
      messageId: queueItem.id,
      targets: Array.isArray(targets) ? targets.length : 1,
      queueSize: this.messageQueue.length
    });

    return queueItem.id;
  }

  /**
   * Process queued messages
   */
  processQueue() {
    if (this.messageQueue.length === 0) {
      return;
    }

    const batch = this.messageQueue.splice(0, this.options.batchSize);
    
    batch.forEach(item => {
      try {
        let result;
        
        if (typeof item.targets === 'string') {
          // Single client
          result = this.sendToClient(item.targets, item.message, item.options);
          result = { sent: result ? 1 : 0, failed: result ? 0 : 1 };
        } else if (Array.isArray(item.targets)) {
          // Multiple clients
          result = this.broadcastToClients(item.targets, item.message, item.options);
        } else {
          // Filtered broadcast
          result = this.broadcastToFiltered(item.message, item.targets, item.options);
        }

        if (result.failed > 0 && item.attempts < item.maxAttempts) {
          // Retry failed deliveries
          item.attempts++;
          this.messageQueue.push(item);
          
          this.logger.debug('Message queued for retry', {
            messageId: item.id,
            attempt: item.attempts,
            failed: result.failed
          });
        } else {
          this.deliveryStats.queued--;
        }

      } catch (error) {
        this.logger.error('Failed to process queued message', {
          messageId: item.id,
          error: error.message
        });
        this.deliveryStats.queued--;
      }
    });

    this.logger.debug('Queue batch processed', {
      processed: batch.length,
      remaining: this.messageQueue.length
    });
  }

  /**
   * Get broadcasting statistics
   */
  getBroadcastStats() {
    const activeClients = this.connectionManager.getActiveClients();
    
    return {
      connectedClients: activeClients.length,
      queuedMessages: this.messageQueue.length,
      deliveryStats: { ...this.deliveryStats },
      averageMessageSize: this.calculateAverageMessageSize(),
      options: {
        maxQueueSize: this.options.maxQueueSize,
        batchSize: this.options.batchSize,
        deliveryTimeout: this.options.deliveryTimeout
      }
    };
  }

  /**
   * Clear message queue
   */
  clearQueue() {
    const clearedCount = this.messageQueue.length;
    this.messageQueue = [];
    this.deliveryStats.queued = 0;
    
    this.logger.info('Message queue cleared', {
      clearedMessages: clearedCount
    });
  }

  // Private methods

  formatMessage(message, options = {}) {
    return {
      id: options.messageId || this.generateMessageId(),
      type: message.type || 'message',
      data: message.data || message,
      timestamp: new Date().toISOString(),
      source: options.source || 'broadcaster',
      priority: options.priority || 'normal'
    };
  }

  filterClients(filters) {
    const activeClients = this.connectionManager.getActiveClients();
    
    return activeClients.filter(client => {
      // IP filter
      if (filters.ip && client.ip !== filters.ip) {
        return false;
      }

      // Subscription filter
      if (filters.subscriptions && filters.subscriptions.length > 0) {
        const hasMatchingSubscription = filters.subscriptions.some(sub =>
          client.subscriptions.has(sub)
        );
        if (!hasMatchingSubscription) {
          return false;
        }
      }

      // Connection time filter
      if (filters.connectedSince) {
        if (client.connectedAt < filters.connectedSince) {
          return false;
        }
      }

      // User agent filter
      if (filters.userAgent) {
        if (!client.userAgent || !client.userAgent.includes(filters.userAgent)) {
          return false;
        }
      }

      return true;
    });
  }

  updateDeliveryStats(results) {
    this.deliveryStats.sent += results.sent;
    this.deliveryStats.failed += results.failed;
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateAverageMessageSize() {
    // This would require tracking message sizes over time
    // For now, return a placeholder
    return 0;
  }
}

module.exports = { WebSocketMessageBroadcaster };