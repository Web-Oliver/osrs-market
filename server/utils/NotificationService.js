/**
 * 📢 Notification Service - Context7 Optimized
 * 
 * Context7 Pattern: Centralized Notification System
 * - Multiple notification channels
 * - Priority-based routing
 * - Template management
 * - Delivery tracking
 */

class NotificationService {
  constructor() {
    this.channels = {
      console: true,
      email: false,
      webhook: false,
      slack: false
    };
    this.templates = this.initializeTemplates();
    this.queue = [];
    this.history = [];
    this.maxHistory = 100;
  }

  /**
   * Context7 Pattern: Initialize notification templates
   */
  initializeTemplates() {
    return {
      criticalError: {
        subject: '🚨 Critical Error - {{service}}',
        body: 'A critical error occurred in {{service}}:\n\nError: {{error}}\nTime: {{timestamp}}\nRequest: {{requestId}}'
      },
      highError: {
        subject: '⚠️ High Priority Error - {{service}}',
        body: 'A high priority error occurred in {{service}}:\n\nError: {{error}}\nTime: {{timestamp}}'
      },
      systemAlert: {
        subject: '📊 System Alert - {{service}}',
        body: 'System alert from {{service}}:\n\nMessage: {{message}}\nTime: {{timestamp}}'
      },
      performanceAlert: {
        subject: '🐌 Performance Alert - {{service}}',
        body: 'Performance issue detected in {{service}}:\n\nMetric: {{metric}}\nValue: {{value}}\nThreshold: {{threshold}}'
      }
    };
  }

  /**
   * Context7 Pattern: Send critical error alert
   */
  async sendCriticalErrorAlert(error, req = null) {
    const notification = {
      type: 'criticalError',
      priority: 'critical',
      data: {
        service: 'OSRS Market Tracker',
        error: error.message || error.toString(),
        timestamp: new Date().toISOString(),
        requestId: req?.id || 'unknown',
        stack: error.stack
      }
    };

    return this.send(notification);
  }

  /**
   * Context7 Pattern: Send system alert
   */
  async sendSystemAlert(message, data = {}) {
    const notification = {
      type: 'systemAlert',
      priority: 'medium',
      data: {
        service: 'OSRS Market Tracker',
        message,
        timestamp: new Date().toISOString(),
        ...data
      }
    };

    return this.send(notification);
  }

  /**
   * Context7 Pattern: Send performance alert
   */
  async sendPerformanceAlert(metric, value, threshold) {
    const notification = {
      type: 'performanceAlert',
      priority: 'high',
      data: {
        service: 'OSRS Market Tracker',
        metric,
        value,
        threshold,
        timestamp: new Date().toISOString()
      }
    };

    return this.send(notification);
  }

  /**
   * Context7 Pattern: Send notification
   */
  async send(notification) {
    try {
      const processedNotification = this.processNotification(notification);
      
      // Add to queue
      this.queue.push(processedNotification);
      
      // Process queue
      await this.processQueue();
      
      return {
        success: true,
        notificationId: processedNotification.id,
        timestamp: processedNotification.timestamp
      };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Context7 Pattern: Process notification
   */
  processNotification(notification) {
    const processed = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...notification
    };

    // Apply template if available
    if (this.templates[notification.type]) {
      const template = this.templates[notification.type];
      processed.subject = this.applyTemplate(template.subject, notification.data);
      processed.body = this.applyTemplate(template.body, notification.data);
    }

    return processed;
  }

  /**
   * Context7 Pattern: Process notification queue
   */
  async processQueue() {
    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      
      try {
        await this.deliver(notification);
        
        // Add to history
        this.addToHistory(notification, 'delivered');
      } catch (error) {
        console.error('Failed to deliver notification:', error);
        this.addToHistory(notification, 'failed', error.message);
      }
    }
  }

  /**
   * Context7 Pattern: Deliver notification
   */
  async deliver(notification) {
    const deliveryPromises = [];

    // Console delivery
    if (this.channels.console) {
      deliveryPromises.push(this.deliverToConsole(notification));
    }

    // Email delivery
    if (this.channels.email) {
      deliveryPromises.push(this.deliverToEmail(notification));
    }

    // Webhook delivery
    if (this.channels.webhook) {
      deliveryPromises.push(this.deliverToWebhook(notification));
    }

    // Slack delivery
    if (this.channels.slack) {
      deliveryPromises.push(this.deliverToSlack(notification));
    }

    await Promise.all(deliveryPromises);
  }

  /**
   * Context7 Pattern: Deliver to console
   */
  async deliverToConsole(notification) {
    const message = notification.subject || notification.body || 'Notification';
    const priority = notification.priority || 'medium';
    
    switch (priority) {
      case 'critical':
        console.error(`🚨 [CRITICAL] ${message}`);
        break;
      case 'high':
        console.warn(`⚠️ [HIGH] ${message}`);
        break;
      case 'medium':
        console.info(`📊 [MEDIUM] ${message}`);
        break;
      case 'low':
        console.log(`ℹ️ [LOW] ${message}`);
        break;
      default:
        console.log(`📢 [NOTIFICATION] ${message}`);
    }
  }

  /**
   * Context7 Pattern: Deliver to email (placeholder)
   */
  async deliverToEmail(notification) {
    // In a real implementation, this would integrate with an email service
    console.log('📧 Email delivery not implemented:', notification.subject);
  }

  /**
   * Context7 Pattern: Deliver to webhook (placeholder)
   */
  async deliverToWebhook(notification) {
    // In a real implementation, this would make HTTP requests to webhook URLs
    console.log('🔗 Webhook delivery not implemented:', notification.subject);
  }

  /**
   * Context7 Pattern: Deliver to Slack (placeholder)
   */
  async deliverToSlack(notification) {
    // In a real implementation, this would integrate with Slack API
    console.log('💬 Slack delivery not implemented:', notification.subject);
  }

  /**
   * Context7 Pattern: Apply template
   */
  applyTemplate(template, data) {
    let result = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  }

  /**
   * Context7 Pattern: Add to history
   */
  addToHistory(notification, status, error = null) {
    const historyEntry = {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      status,
      timestamp: notification.timestamp,
      deliveredAt: new Date().toISOString(),
      error
    };

    this.history.push(historyEntry);
    
    // Keep history within limits
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Context7 Pattern: Configure channels
   */
  configureChannels(channels) {
    this.channels = { ...this.channels, ...channels };
  }

  /**
   * Context7 Pattern: Add template
   */
  addTemplate(type, template) {
    this.templates[type] = template;
  }

  /**
   * Context7 Pattern: Get notification history
   */
  getHistory(limit = 50) {
    return this.history.slice(-limit);
  }

  /**
   * Context7 Pattern: Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      historyLength: this.history.length,
      channels: this.channels,
      templates: Object.keys(this.templates)
    };
  }

  /**
   * Context7 Pattern: Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Context7 Pattern: Generate unique ID
   */
  generateId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = { NotificationService };