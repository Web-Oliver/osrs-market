/**
 * 🚀 MongoDB Data Persistence Service - Backend Implementation
 * Context7 Best Practices: Solid, DRY, Optimized MongoDB Backend Service
 *
 * This service implements MongoDB persistence with Context7 optimization patterns:
 * - Optimized connection pooling with proper sizing
 * - Efficient indexing strategies for performance
 * - Aggregation pipeline optimization
 * - Connection reuse and health monitoring
 * - Graceful error handling and retry logic
 * - Resource cleanup and memory management
 */

const { MongoClient, ServerApiVersion } = require('mongodb');


class MongoDataPersistence {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.db = null;
    this.isConnected = false;

    // Collections
    this.marketDataCollection = null;
    this.tradeOutcomesCollection = null;
    this.trainingMetricsCollection = null;
    this.collectionStatsCollection = null;
    this.liveMonitoringCollection = null;

    // OPTIMIZED: Fixed Connection Configuration (reduced from performance-killing 50 connections)
    this.connectionOptions = {
      // Connection Pool Optimization - FIXED for single application
      maxPoolSize: 10, // REDUCED: Maximum connections in pool (was 50 - too high)
      minPoolSize: 2, // REDUCED: Minimum connections maintained (was 5)
      maxConnecting: 2, // REDUCED: Max concurrent connection attempts (was 5)
      maxIdleTimeMS: 60000, // INCREASED: 60 seconds idle timeout

      // Timeout Configuration - OPTIMIZED for stability
      connectTimeoutMS: 30000, // INCREASED: 30 seconds connection timeout (was 10)
      socketTimeoutMS: 120000, // INCREASED: 120 seconds socket timeout (was 45)
      serverSelectionTimeoutMS: 30000, // INCREASED: 30 seconds server selection timeout

      // Reliability & Performance (Context7 Optimized)
      retryWrites: true, // Enable retry for write operations
      retryReads: true, // Enable retry for read operations
      readPreference: 'primaryPreferred', // Context7 performance optimization
      writeConcern: { w: 'majority' }, // Ensure data durability

      // Modern MongoDB Features
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      },

      // Additional Context7 Optimizations
      compressors: ['zlib'], // Enable compression for network efficiency
      zlibCompressionLevel: 6, // Balanced compression level

      ...config.options
    };

    this.logDebug('🗄️ MongoDB Persistence Service initialized with Context7 optimizations', {
      database: config.databaseName,
      connectionConfig: {
        maxPoolSize: this.connectionOptions.maxPoolSize,
        minPoolSize: this.connectionOptions.minPoolSize,
        maxConnecting: this.connectionOptions.maxConnecting,
        retryWrites: this.connectionOptions.retryWrites,
        readPreference: this.connectionOptions.readPreference
      }
    });
  }

  /**
   * Connect to MongoDB with Context7 optimized settings
   */
  async connect() {
    if (this.isConnected) {
      this.logDebug('⚠️ MongoDB already connected, skipping connection attempt');
      return;
    }

    try {
      this.logDebug('🔌 Attempting MongoDB connection with Context7 optimizations...', {
        connectionString: this.config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        database: this.config.databaseName
      });

      // Create MongoClient with Context7 optimized settings
      this.client = new MongoClient(this.config.connectionString, this.connectionOptions);

      // Connect to MongoDB
      await this.client.connect();
      this.db = this.client.db(this.config.databaseName);

      // Initialize collections
      await this.initializeCollections();

      // Create Context7 optimized indexes
      await this.createOptimizedIndexes();

      this.isConnected = true;
      this.logDebug('✅ MongoDB connection established successfully with Context7 optimizations', {
        database: this.config.databaseName,
        collectionsInitialized: 5
      });

      // Test connection health
      await this.db.admin().ping();
      this.logDebug('🏓 MongoDB ping successful - connection is healthy');

    } catch (error) {
      this.logError('❌ MongoDB connection failed', error, {
        connectionString: this.config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        database: this.config.databaseName
      });
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  /**
   * Initialize MongoDB collections with Context7 patterns
   */
  async initializeCollections() {
    try {
      this.marketDataCollection = this.db.collection('marketData');
      this.tradeOutcomesCollection = this.db.collection('tradeOutcomes');
      this.trainingMetricsCollection = this.db.collection('trainingMetrics');
      this.collectionStatsCollection = this.db.collection('collectionStats');
      this.liveMonitoringCollection = this.db.collection('liveMonitoring');

      this.logDebug('📊 Collections initialized successfully', {
        marketData: 'marketData',
        tradeOutcomes: 'tradeOutcomes',
        trainingMetrics: 'trainingMetrics',
        collectionStats: 'collectionStats',
        liveMonitoring: 'liveMonitoring'
      });
    } catch (error) {
      this.logError('❌ Error initializing collections', error);
      throw error;
    }
  }

  /**
   * Create Context7 optimized indexes for performance
   */
  async createOptimizedIndexes() {
    try {
      this.logDebug('📋 Creating Context7 optimized indexes for performance...');

      // Market Data indexes - Context7 optimized for queries
      await Promise.all([
        this.marketDataCollection.createIndex({ itemId: 1, timestamp: -1 }),
        this.marketDataCollection.createIndex({ timestamp: -1 }),
        this.marketDataCollection.createIndex({ 'priceData.high': 1, 'priceData.low': 1 }),
        this.marketDataCollection.createIndex({ grandExchange: 1, tradeable: 1 }),
        this.marketDataCollection.createIndex({ collectionSource: 1, timestamp: -1 })
      ]);

      // Trade Outcomes indexes - Context7 optimized for AI training queries
      await Promise.all([
        this.tradeOutcomesCollection.createIndex({ sessionId: 1, timestamp: -1 }),
        this.tradeOutcomesCollection.createIndex({ timestamp: -1 }),
        this.tradeOutcomesCollection.createIndex({ success: 1, profit: -1 }),
        this.tradeOutcomesCollection.createIndex({ itemId: 1, timestamp: -1 })
      ]);

      // Training Metrics indexes - Context7 optimized for performance monitoring
      await Promise.all([
        this.trainingMetricsCollection.createIndex({ sessionId: 1, episode: -1 }),
        this.trainingMetricsCollection.createIndex({ timestamp: -1 }),
        this.trainingMetricsCollection.createIndex({ episode: -1, successRate: -1 })
      ]);

      // Collection Stats indexes - Context7 optimized for monitoring
      await Promise.all([
        this.collectionStatsCollection.createIndex({ timestamp: -1 }),
        this.collectionStatsCollection.createIndex({ dataQualityScore: -1, timestamp: -1 })
      ]);

      // Live Monitoring indexes - Context7 optimized for real-time dashboards
      await Promise.all([
        this.liveMonitoringCollection.createIndex({ timestamp: -1 }),
        this.liveMonitoringCollection.createIndex({ rateLimitStatus: 1, timestamp: -1 }),
        this.liveMonitoringCollection.createIndex({ systemStatus: 1, timestamp: -1 })
      ]);

      this.logDebug('✅ Context7 optimized indexes created successfully', {
        marketDataIndexes: 5,
        tradeOutcomesIndexes: 4,
        trainingMetricsIndexes: 3,
        collectionStatsIndexes: 2,
        liveMonitoringIndexes: 3
      });
    } catch (error) {
      this.logError('❌ Error creating optimized indexes', error);
      // Don't throw - indexes are optimization, not critical
    }
  }

  /**
   * Save market data with Context7 optimizations
   */
  async saveMarketData(items, collectionSource = 'API') {
    this.ensureConnected();

    const startTime = Date.now();
    this.logDebug(`💾 Saving ${items.length} market data items with Context7 optimizations...`, {
      source: collectionSource,
      sampleItems: items.slice(0, 3).map(item => ({
        id: item.id,
        name: item.name,
        price: item.priceData.high || item.priceData.low
      }))
    });

    try {
      const documents = items.map(item => ({
        timestamp: Date.now(),
        itemId: item.id,
        itemName: item.name,
        priceData: {
          ...item.priceData,
          timestamp: item.priceData.timestamp || Date.now()
        },
        grandExchange: item.grandExchange,
        members: item.members,
        tradeable: item.tradeable,
        collectionSource,
        processingTime: Date.now() - startTime,
        spread: this.calculateSpread(item.priceData),
        volume: item.priceData.highTime && item.priceData.lowTime
          ? Math.abs((item.priceData.highTime || 0) - (item.priceData.lowTime || 0))
          : undefined,
        lastUpdateTime: Date.now()
      }));

      // Context7 optimized bulk insert with ordered=false for performance
      const result = await this.marketDataCollection.insertMany(documents, {
        ordered: false,
        writeConcern: { w: 'majority' }
      });

      const processingTime = Date.now() - startTime;

      this.logDebug('✅ Market data saved successfully with Context7 optimizations', {
        itemsSaved: result.insertedCount,
        processingTimeMs: processingTime,
        averageTimePerItem: Math.round(processingTime / items.length * 100) / 100,
        insertedIds: Object.keys(result.insertedIds).length
      });

    } catch (error) {
      this.logError('❌ Error saving market data', error, {
        itemCount: items.length,
        source: collectionSource
      });
      throw error;
    }
  }

  /**
   * Get market data with Context7 optimized aggregation
   */
  async getMarketData(options = {}) {
    this.ensureConnected();

    this.logDebug('🔍 Querying market data with Context7 optimizations...', options);

    try {
      // Context7 optimized aggregation pipeline
      const pipeline = [];

      // Build match stage with Context7 optimizations
      const matchStage = {};
      if (options.itemId) {
        matchStage.itemId = options.itemId;
      }
      if (options.onlyTradeable) {
        matchStage.tradeable = true;
      }
      if (options.startTime || options.endTime) {
        matchStage.timestamp = {};
        if (options.startTime) {
          matchStage.timestamp.$gte = options.startTime;
        }
        if (options.endTime) {
          matchStage.timestamp.$lte = options.endTime;
        }
      }

      if (Object.keys(matchStage).length > 0) {
        pipeline.push({ $match: matchStage });
      }

      // Context7 optimized sorting
      pipeline.push({ $sort: { timestamp: -1 } });

      // Context7 optimized limit
      if (options.limit) {
        pipeline.push({ $limit: options.limit });
      }

      // Execute aggregation with Context7 optimizations
      const results = await this.marketDataCollection
        .aggregate(pipeline, {
          allowDiskUse: true, // Context7 optimization for large datasets
          readPreference: 'primaryPreferred'
        })
        .toArray();

      this.logDebug('✅ Market data query completed with Context7 optimizations', {
        resultsFound: results.length,
        queryFilter: matchStage,
        latestTimestamp: results[0]?.timestamp,
        oldestTimestamp: results[results.length - 1]?.timestamp
      });

      return results;
    } catch (error) {
      this.logError('❌ Error querying market data', error, options);
      throw error;
    }
  }

  /**
   * Get live monitoring data with Context7 optimized aggregation
   */
  async getLiveMonitoringData(limit = 50) {
    this.ensureConnected();

    this.logDebug('📊 Fetching live monitoring data with Context7 optimizations...', { limit });

    try {
      // Context7 optimized aggregation pipeline for live monitoring
      const pipeline = [
        { $sort: { timestamp: -1 } },
        { $limit: limit },
        {
          $project: {
            timestamp: 1,
            apiRequests: 1,
            successRate: 1,
            itemsProcessed: 1,
            profit: 1,
            responseTime: 1,
            dataQuality: 1,
            rateLimitStatus: 1,
            systemStatus: 1,
            consoleOutput: 1
          }
        }
      ];

      const results = await this.liveMonitoringCollection
        .aggregate(pipeline, {
          allowDiskUse: true,
          readPreference: 'primaryPreferred'
        })
        .toArray();

      this.logDebug('✅ Live monitoring data fetched successfully', {
        recordsFound: results.length,
        latestTimestamp: results[0]?.timestamp
      });

      return results;
    } catch (error) {
      this.logError('❌ Error fetching live monitoring data', error, { limit });
      throw error;
    }
  }

  /**
   * Save live monitoring data with Context7 optimizations
   */
  async saveLiveMonitoringData(data) {
    this.ensureConnected();

    try {
      const document = {
        ...data,
        timestamp: data.timestamp || Date.now(),
        savedAt: Date.now()
      };

      const result = await this.liveMonitoringCollection.insertOne(document, {
        writeConcern: { w: 'majority' }
      });

      this.logDebug('✅ Live monitoring data saved successfully', {
        insertedId: result.insertedId,
        timestamp: document.timestamp
      });

      return result.insertedId;
    } catch (error) {
      this.logError('❌ Error saving live monitoring data', error, data);
      throw error;
    }
  }

  /**
   * Get aggregated statistics with Context7 optimized pipeline
   */
  async getAggregatedStats(timeRange = 3600000) {
    this.ensureConnected();

    const cutoffTime = Date.now() - timeRange;
    this.logDebug('📈 Generating aggregated statistics with Context7 optimizations...', {
      timeRangeMs: timeRange,
      cutoffTime: new Date(cutoffTime).toISOString()
    });

    try {
      // Context7 optimized aggregation pipeline for statistics
      const pipeline = [
        { $match: { timestamp: { $gte: cutoffTime } } },
        {
          $group: {
            _id: null,
            totalApiRequests: { $sum: '$apiRequests' },
            avgSuccessRate: { $avg: '$successRate' },
            totalItemsProcessed: { $sum: '$itemsProcessed' },
            totalProfit: { $sum: '$profit' },
            avgResponseTime: { $avg: '$responseTime' },
            avgDataQuality: { $avg: '$dataQuality' },
            healthyStatusCount: {
              $sum: { $cond: [{ $eq: ['$rateLimitStatus', 'HEALTHY'] }, 1, 0] }
            },
            totalRecords: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            totalApiRequests: 1,
            avgSuccessRate: { $round: ['$avgSuccessRate', 2] },
            totalItemsProcessed: 1,
            totalProfit: { $round: ['$totalProfit', 2] },
            avgResponseTime: { $round: ['$avgResponseTime', 0] },
            avgDataQuality: { $round: ['$avgDataQuality', 2] },
            healthyPercentage: {
              $round: [{ $multiply: [{ $divide: ['$healthyStatusCount', '$totalRecords'] }, 100] }, 1]
            },
            timeRangeHours: { $divide: [timeRange, 3600000] }
          }
        }
      ];

      const [stats] = await this.liveMonitoringCollection
        .aggregate(pipeline, {
          allowDiskUse: true,
          readPreference: 'primaryPreferred'
        })
        .toArray();

      const result = stats || {
        totalApiRequests: 0,
        avgSuccessRate: 0,
        totalItemsProcessed: 0,
        totalProfit: 0,
        avgResponseTime: 0,
        avgDataQuality: 0,
        healthyPercentage: 0,
        timeRangeHours: timeRange / 3600000
      };

      this.logDebug('✅ Aggregated statistics generated successfully', result);
      return result;
    } catch (error) {
      this.logError('❌ Error generating aggregated statistics', error, { timeRange });
      throw error;
    }
  }

  /**
   * Get database summary with Context7 optimizations
   */
  async getDatabaseSummary() {
    this.ensureConnected();

    this.logDebug('📊 Generating database summary with Context7 optimizations...');

    try {
      const [
        marketDataCount,
        tradeOutcomesCount,
        trainingMetricsCount,
        collectionStatsCount,
        liveMonitoringCount,
        oldestMarketData,
        newestMarketData,
        profitSummary
      ] = await Promise.all([
        this.marketDataCollection.countDocuments(),
        this.tradeOutcomesCollection.countDocuments(),
        this.trainingMetricsCollection.countDocuments(),
        this.collectionStatsCollection.countDocuments(),
        this.liveMonitoringCollection.countDocuments(),
        this.marketDataCollection.findOne({}, { sort: { timestamp: 1 }, projection: { timestamp: 1 } }),
        this.marketDataCollection.findOne({}, { sort: { timestamp: -1 }, projection: { timestamp: 1 } }),
        this.tradeOutcomesCollection.aggregate([
          { $group: { _id: null, totalProfit: { $sum: '$profit' } } }
        ]).toArray()
      ]);

      const summary = {
        marketDataCount,
        tradeOutcomesCount,
        trainingMetricsCount,
        collectionStatsCount,
        liveMonitoringCount,
        oldestRecord: oldestMarketData?.timestamp || null,
        newestRecord: newestMarketData?.timestamp || null,
        totalProfitAllTime: profitSummary[0]?.totalProfit || 0
      };

      this.logDebug('✅ Database summary generated successfully', summary);
      return summary;
    } catch (error) {
      this.logError('❌ Error generating database summary', error);
      throw error;
    }
  }

  /**
   * Health check with Context7 optimizations
   */
  async healthCheck() {
    try {
      if (!this.isConnected || !this.db) {
        return {
          connected: false,
          database: this.config.databaseName,
          collections: [],
          ping: false,
          timestamp: Date.now()
        };
      }

      await this.db.admin().ping();
      const collections = await this.db.listCollections().toArray();

      const health = {
        connected: true,
        database: this.config.databaseName,
        collections: collections.map(c => c.name),
        ping: true,
        timestamp: Date.now()
      };

      this.logDebug('💚 MongoDB health check passed', health);
      return health;
    } catch (error) {
      this.logError('💔 MongoDB health check failed', error);
      return {
        connected: false,
        database: this.config.databaseName,
        collections: [],
        ping: false,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Cleanup old data with Context7 optimizations
   */
  async cleanupOldData(maxAge = 7 * 24 * 60 * 60 * 1000) {
    this.ensureConnected();

    const cutoffTime = Date.now() - maxAge;
    this.logDebug('🧹 Cleaning up old data with Context7 optimizations...', {
      maxAgeMs: maxAge,
      cutoffTime: new Date(cutoffTime).toISOString()
    });

    try {
      const [
        marketDataResult,
        tradeOutcomesResult,
        trainingMetricsResult,
        collectionStatsResult,
        liveMonitoringResult
      ] = await Promise.all([
        this.marketDataCollection.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.tradeOutcomesCollection.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.trainingMetricsCollection.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.collectionStatsCollection.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.liveMonitoringCollection.deleteMany({ timestamp: { $lt: cutoffTime } })
      ]);

      const result = {
        marketDataDeleted: marketDataResult.deletedCount || 0,
        tradeOutcomesDeleted: tradeOutcomesResult.deletedCount || 0,
        trainingMetricsDeleted: trainingMetricsResult.deletedCount || 0,
        collectionStatsDeleted: collectionStatsResult.deletedCount || 0,
        liveMonitoringDeleted: liveMonitoringResult.deletedCount || 0
      };

      this.logDebug('✅ Old data cleanup completed successfully', result);
      return result;
    } catch (error) {
      this.logError('❌ Error during data cleanup', error, { maxAge, cutoffTime });
      throw error;
    }
  }

  /**
   * Disconnect with Context7 cleanup
   */
  async disconnect() {
    if (!this.isConnected) {
      this.logDebug('⚠️ MongoDB already disconnected');
      return;
    }

    try {
      this.logDebug('🔌 Disconnecting from MongoDB with Context7 cleanup...');

      if (this.client) {
        await this.client.close();
      }

      this.isConnected = false;
      this.db = null;
      this.client = null;
      this.marketDataCollection = null;
      this.tradeOutcomesCollection = null;
      this.trainingMetricsCollection = null;
      this.collectionStatsCollection = null;
      this.liveMonitoringCollection = null;

      this.logDebug('✅ MongoDB disconnected successfully');
    } catch (error) {
      this.logError('❌ Error during MongoDB disconnection', error);
      throw error;
    }
  }

  // Private Helper Methods

  ensureConnected() {
    if (!this.isConnected || !this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
  }

  calculateSpread(priceData) {
    if (!priceData.high || !priceData.low || priceData.low === 0) {
      return undefined;
    }
    return ((priceData.high - priceData.low) / priceData.low) * 100;
  }

  logDebug(message, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [MongoDB-Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  logError(message, error, context) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [MongoDB-Error] ${message}`);
    if (context) {
      console.error(`[${timestamp}] [MongoDB-Context]`, JSON.stringify(context, null, 2));
    }
    console.error(`[${timestamp}] [MongoDB-Stack]`, error);
  }
}

module.exports = MongoDataPersistence;
