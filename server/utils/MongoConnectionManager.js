/**
 * 🗄️ MongoDB Connection Manager - Context7 Optimized
 *
 * Context7 Pattern: Singleton connection manager for MongoDB
 * - Single Responsibility: Manages MongoDB connections
 * - Singleton Pattern: Single connection instance across application
 * - DRY: Eliminates duplicate connection logic across services
 * - Dependency Inversion: Abstract database connection details
 * - Open/Closed: Extensible for different MongoDB configurations
 */

const { MongoClient } = require('mongodb');
const { Logger } = require('./Logger');

class MongoConnectionManager {
  constructor() {
    this.client = null;
    this.database = null;
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 2000;
    this.logger = new Logger('MongoConnectionManager');
    
    // Default configuration
    this.config = {
      connectionString: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
      databaseName: process.env.MONGODB_DATABASE || 'osrs_market_data',
      options: {
        maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 10,
        minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 2,
        maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME) || 30000,
        serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_TIMEOUT) || 5000,
        heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQ) || 10000,
        retryWrites: true,
        w: 'majority',
        readPreference: 'primary',
        // Performance optimizations
        bufferMaxEntries: 0,
        bufferCommands: false,
        useUnifiedTopology: true
      }
    };
  }

  /**
   * Context7 Pattern: Get singleton instance
   * Singleton Pattern: Ensures single connection manager instance
   * @returns {MongoConnectionManager} Singleton instance
   */
  static getInstance() {
    if (!MongoConnectionManager.instance) {
      MongoConnectionManager.instance = new MongoConnectionManager();
    }
    return MongoConnectionManager.instance;
  }

  /**
   * Context7 Pattern: Connect to MongoDB with retry logic
   * SOLID Principle: Single responsibility for connection management
   * @param {Object} customConfig - Custom configuration override
   * @returns {Promise<Object>} Database instance
   */
  async connect(customConfig = {}) {
    // Merge custom config with defaults
    const finalConfig = {
      ...this.config,
      ...customConfig,
      options: {
        ...this.config.options,
        ...customConfig.options
      }
    };

    // Return existing connection if available
    if (this.isConnected()) {
      this.logger.debug('Using existing MongoDB connection');
      return this.database;
    }

    // Prevent multiple simultaneous connection attempts
    if (this.isConnecting) {
      this.logger.debug('Connection attempt already in progress, waiting...');
      return await this.waitForConnection();
    }

    this.isConnecting = true;

    try {
      await this.attemptConnection(finalConfig);
      return this.database;
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Context7 Pattern: Attempt connection with retry logic
   * @param {Object} config - Connection configuration
   */
  async attemptConnection(config) {
    while (this.connectionAttempts < this.maxRetries) {
      try {
        this.connectionAttempts++;
        
        this.logger.info(`Attempting MongoDB connection (attempt ${this.connectionAttempts}/${this.maxRetries})`);

        // Create new client
        this.client = new MongoClient(config.connectionString, config.options);
        
        // Connect to MongoDB
        await this.client.connect();
        
        // Test the connection
        await this.client.db(config.databaseName).admin().ping();
        
        // Set database instance
        this.database = this.client.db(config.databaseName);
        
        this.isConnecting = false;
        this.connectionAttempts = 0;
        
        this.logger.info('MongoDB connection established successfully', {
          database: config.databaseName,
          poolSize: config.options.maxPoolSize
        });

        // Set up connection event handlers
        this.setupEventHandlers();
        
        return;

      } catch (error) {
        this.logger.warn(`MongoDB connection attempt ${this.connectionAttempts} failed`, {
          error: error.message,
          attempt: this.connectionAttempts
        });

        if (this.client) {
          try {
            await this.client.close();
          } catch (closeError) {
            this.logger.warn('Error closing failed connection', closeError);
          }
          this.client = null;
        }

        if (this.connectionAttempts >= this.maxRetries) {
          this.isConnecting = false;
          const finalError = new Error(`Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`);
          finalError.originalError = error;
          throw finalError;
        }

        // Wait before retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, this.connectionAttempts - 1);
        this.logger.info(`Retrying MongoDB connection in ${delay}ms...`);
        await this.delay(delay);
      }
    }
  }

  /**
   * Context7 Pattern: Setup MongoDB event handlers
   */
  setupEventHandlers() {
    if (!this.client) return;

    this.client.on('error', (error) => {
      this.logger.error('MongoDB client error', error);
    });

    this.client.on('close', () => {
      this.logger.warn('MongoDB connection closed');
      this.database = null;
    });

    this.client.on('reconnect', () => {
      this.logger.info('MongoDB reconnected');
    });

    this.client.on('timeout', () => {
      this.logger.warn('MongoDB connection timeout');
    });

    this.client.on('serverClosed', () => {
      this.logger.warn('MongoDB server closed connection');
    });
  }

  /**
   * Context7 Pattern: Wait for ongoing connection attempt
   * @returns {Promise<Object>} Database instance
   */
  async waitForConnection(maxWait = 30000) {
    const startTime = Date.now();
    
    while (this.isConnecting && (Date.now() - startTime) < maxWait) {
      await this.delay(100);
    }

    if (this.isConnected()) {
      return this.database;
    }

    throw new Error('Connection timeout waiting for MongoDB connection');
  }

  /**
   * Context7 Pattern: Get database instance
   * @param {string} databaseName - Optional database name override
   * @returns {Object} Database instance
   */
  getDatabase(databaseName = null) {
    if (!this.isConnected()) {
      throw new Error('Not connected to MongoDB. Call connect() first.');
    }

    if (databaseName && databaseName !== this.database.databaseName) {
      return this.client.db(databaseName);
    }

    return this.database;
  }

  /**
   * Context7 Pattern: Get collection instance
   * @param {string} collectionName - Collection name
   * @param {string} databaseName - Optional database name
   * @returns {Object} Collection instance
   */
  getCollection(collectionName, databaseName = null) {
    const db = this.getDatabase(databaseName);
    return db.collection(collectionName);
  }

  /**
   * Context7 Pattern: Check if connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.client && this.database && this.client.topology && this.client.topology.isConnected();
  }

  /**
   * Context7 Pattern: Disconnect from MongoDB
   */
  async disconnect() {
    if (this.client) {
      try {
        await this.client.close();
        this.logger.info('MongoDB connection closed');
      } catch (error) {
        this.logger.error('Error closing MongoDB connection', error);
      } finally {
        this.client = null;
        this.database = null;
        this.isConnecting = false;
        this.connectionAttempts = 0;
      }
    }
  }

  /**
   * Context7 Pattern: Health check for MongoDB connection
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      if (!this.isConnected()) {
        return {
          status: 'unhealthy',
          message: 'Not connected to MongoDB',
          timestamp: new Date().toISOString()
        };
      }

      // Ping the database
      const startTime = Date.now();
      await this.database.admin().ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        database: this.database.databaseName,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Context7 Pattern: Get connection statistics
   * @returns {Object} Connection statistics
   */
  getStats() {
    if (!this.isConnected()) {
      return {
        connected: false,
        connectionAttempts: this.connectionAttempts
      };
    }

    return {
      connected: true,
      database: this.database.databaseName,
      connectionAttempts: this.connectionAttempts,
      serverInfo: this.client.topology?.description
    };
  }

  /**
   * Context7 Pattern: Execute operation with connection retry
   * @param {Function} operation - Operation to execute
   * @param {number} retries - Number of retries
   * @returns {Promise<*>} Operation result
   */
  async withRetry(operation, retries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!this.isConnected()) {
          await this.connect();
        }
        
        return await operation(this.database);
      } catch (error) {
        lastError = error;
        
        this.logger.warn(`Operation failed on attempt ${attempt}/${retries}`, {
          error: error.message,
          attempt
        });

        if (attempt < retries) {
          // Reset connection on certain errors
          if (error.name === 'MongoNetworkError' || error.name === 'MongoServerSelectionError') {
            await this.disconnect();
          }
          
          await this.delay(1000 * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * Utility: Delay function
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Context7 Pattern: Graceful shutdown
   */
  async shutdown() {
    this.logger.info('Shutting down MongoDB connection manager...');
    await this.disconnect();
  }
}

// Export singleton instance
module.exports = { 
  MongoConnectionManager,
  // Convenience method to get singleton instance
  getMongoManager: () => MongoConnectionManager.getInstance()
};