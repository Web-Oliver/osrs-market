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
  async connect() {
    return this.errorManager.handleAsync(async () => {
await this.attemptConnection(finalConfig);
      return this.database;
    }, 'connect', { logSuccess: true });
  } databaseName - Optional database name override
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
    return this.errorManager.handleAsync(async () => {
await this.client.close();
        this.logger.info('MongoDB connection closed');
    }, 'disconnect', { logSuccess: true });
  } ms - Milliseconds to delay
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