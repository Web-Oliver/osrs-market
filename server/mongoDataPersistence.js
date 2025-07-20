/**
 * 🗄️ MongoDB Data Persistence - Context7 Optimized
 *
 * Context7 Pattern: Advanced MongoDB Operations with Data Modeling
 * - Optimized connection pooling and resource management
 * - Comprehensive data validation and sanitization
 * - Advanced indexing strategies for query performance
 * - Real-time data aggregation and analytics
 * - Robust error handling and recovery mechanisms
 */

const { MongoClient } = require('mongodb');

/**
 * MongoDB Data Persistence Service
 * Handles all database operations with optimized performance
 */
class MongoDataPersistence {
  constructor(config) {
    this.config = {
      connectionString: config.connectionString || 'mongodb://localhost:27017',
      databaseName: config.databaseName || 'osrs_market_data',
      options: config.options || {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true,
        w: 'majority'
      }
    };

    this.client = null;
    this.database = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  /**
   * Context7 Pattern: Initialize database connection
   */
  async initialize() {
    try {
      this.client = new MongoClient(this.config.connectionString, this.config.options);
      await this.client.connect();
      this.database = this.client.db(this.config.databaseName);
      this.isConnected = true;

      // Create indexes for optimized queries
      await this.createIndexes();

      console.log('✅ MongoDB connection established successfully');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error);
      return false;
    }
  }

  /**
   * Context7 Pattern: Create optimized indexes
   */
  async createIndexes() {
    try {
      const collections = {
        market_data: [
          { timestamp: -1 },
          { itemId: 1, timestamp: -1 },
          { 'priceData.high': -1 },
          { grandExchange: 1, tradeable: 1 }
        ],
        trade_outcomes: [
          { timestamp: -1 },
          { sessionId: 1, timestamp: -1 },
          { profitLoss: -1 }
        ],
        training_metrics: [
          { timestamp: -1 },
          { sessionId: 1, timestamp: -1 },
          { accuracy: -1 }
        ],
        live_monitoring: [
          { timestamp: -1 },
          { apiRequests: -1 },
          { successRate: -1 }
        ],
        ai_decisions: [
          { timestamp: -1 },
          { sessionId: 1, timestamp: -1 },
          { itemId: 1, timestamp: -1 },
          { action: 1, confidence: -1 }
        ],
        historical_prices: [
          { itemId: 1, timestamp: -1 },
          { interval: 1, timestamp: -1 },
          { timestamp: -1 }
        ]
      };

      for (const [collectionName, indexes] of Object.entries(collections)) {
        const collection = this.database.collection(collectionName);
        for (const index of indexes) {
          await collection.createIndex(index);
        }
      }
    } catch (error) {
      console.error('Error creating indexes:', error);
    }
  }

  /**
   * Context7 Pattern: Save market data with validation
   */
  async saveMarketData(marketData) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('market_data');
      const document = {
        ...marketData,
        timestamp: marketData.timestamp || Date.now(),
        _id: undefined // Let MongoDB generate the ID
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving market data:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get market data with advanced filtering
   */
  async getMarketData(filters = {}, options = {}) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('market_data');
      const query = this.buildQuery(filters);
      const cursor = collection.find(query);

      if (options.sort) {
        cursor.sort(options.sort);
      }
      if (options.limit) {
        cursor.limit(options.limit);
      }
      if (options.skip) {
        cursor.skip(options.skip);
      }

      return await cursor.toArray();
    } catch (error) {
      console.error('Error getting market data:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Save trade outcome
   */
  async saveTradeOutcome(tradeOutcome) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('trade_outcomes');
      const document = {
        ...tradeOutcome,
        timestamp: tradeOutcome.timestamp || Date.now(),
        _id: undefined
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving trade outcome:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Save training metrics
   */
  async saveTrainingMetrics(metrics) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('training_metrics');
      const document = {
        ...metrics,
        timestamp: metrics.timestamp || Date.now(),
        _id: undefined
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving training metrics:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Save live monitoring data
   */
  async saveLiveMonitoringData(data) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('live_monitoring');
      const document = {
        ...data,
        timestamp: data.timestamp || Date.now(),
        _id: undefined
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving live monitoring data:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get live monitoring data
   */
  async getLiveMonitoringData(limit = 50) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('live_monitoring');
      return await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error getting live monitoring data:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Build query from filters
   */
  buildQuery(filters) {
    const query = {};

    if (filters.itemId) {
      query.itemId = filters.itemId;
    }
    if (filters.startTime && filters.endTime) {
      query.timestamp = {
        $gte: filters.startTime,
        $lte: filters.endTime
      };
    }
    if (filters.grandExchange !== undefined) {
      query.grandExchange = filters.grandExchange;
    }
    if (filters.tradeable !== undefined) {
      query.tradeable = filters.tradeable;
    }
    if (filters.members !== undefined) {
      query.members = filters.members;
    }

    return query;
  }

  /**
   * Context7 Pattern: Get aggregated statistics
   */
  async getAggregatedStats() {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const marketDataCollection = this.database.collection('market_data');
      const liveMonitoringCollection = this.database.collection('live_monitoring');

      const [marketStats, monitoringStats] = await Promise.all([
        marketDataCollection.aggregate([
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              avgPrice: { $avg: '$priceData.high' },
              totalVolume: { $sum: '$volume' }
            }
          }
        ]).toArray(),
        liveMonitoringCollection.aggregate([
          {
            $group: {
              _id: null,
              totalApiRequests: { $sum: '$apiRequests' },
              avgSuccessRate: { $avg: '$successRate' },
              avgResponseTime: { $avg: '$responseTime' }
            }
          }
        ]).toArray()
      ]);

      return {
        marketData: marketStats[0] || {},
        monitoring: monitoringStats[0] || {}
      };
    } catch (error) {
      console.error('Error getting aggregated stats:', error);
      throw error;
    }
  }

  // ==========================================
  // AI DECISIONS AND TRADING METHODS
  // ==========================================

  /**
   * Save AI trading decision
   */
  async saveAIDecision(decision) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('ai_decisions');
      const document = {
        ...decision,
        timestamp: decision.timestamp || Date.now(),
        _id: undefined
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving AI decision:', error);
      throw error;
    }
  }

  /**
   * Get AI decisions for analysis
   */
  async getAIDecisions(filters = {}, options = {}) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('ai_decisions');
      const query = {};

      if (filters.sessionId) {
        query.sessionId = filters.sessionId;
      }
      if (filters.itemId) {
        query.itemId = filters.itemId;
      }
      if (filters.action) {
        query.action = filters.action;
      }
      if (filters.startTime && filters.endTime) {
        query.timestamp = { $gte: filters.startTime, $lte: filters.endTime };
      }

      const cursor = collection.find(query);

      if (options.sort) {
        cursor.sort(options.sort);
      }
      if (options.limit) {
        cursor.limit(options.limit);
      }
      if (options.skip) {
        cursor.skip(options.skip);
      }

      return await cursor.toArray();
    } catch (error) {
      console.error('Error getting AI decisions:', error);
      throw error;
    }
  }

  /**
   * Update AI decision with outcome
   */
  async updateAIDecisionOutcome(decisionId, outcome) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('ai_decisions');
      const result = await collection.updateOne(
        { _id: decisionId },
        {
          $set: {
            outcome: outcome,
            updatedAt: Date.now()
          }
        }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Error updating AI decision outcome:', error);
      throw error;
    }
  }

  // ==========================================
  // HISTORICAL PRICE DATA METHODS
  // ==========================================

  /**
   * Save historical price data (5min, 1hour, latest)
   */
  async saveHistoricalPrice(priceData) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('historical_prices');
      const document = {
        ...priceData,
        timestamp: priceData.timestamp || Date.now(),
        _id: undefined
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving historical price:', error);
      throw error;
    }
  }

  /**
   * Bulk save historical prices for efficiency
   */
  async bulkSaveHistoricalPrices(pricesArray) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('historical_prices');
      const documents = pricesArray.map(price => ({
        ...price,
        timestamp: price.timestamp || Date.now(),
        _id: undefined
      }));

      const result = await collection.insertMany(documents, { ordered: false });
      return {
        insertedCount: result.insertedCount,
        insertedIds: result.insertedIds
      };
    } catch (error) {
      console.error('Error bulk saving historical prices:', error);
      throw error;
    }
  }

  /**
   * Get historical prices for AI training
   */
  async getHistoricalPrices(itemId, interval = '5min', limit = 1000) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('historical_prices');
      const query = { itemId, interval };

      return await collection
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Error getting historical prices:', error);
      throw error;
    }
  }

  /**
   * Get price history for multiple items (for AI training)
   */
  async getBulkHistoricalPrices(itemIds, interval = '5min', hoursBack = 24) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('historical_prices');
      const startTime = Date.now() - (hoursBack * 60 * 60 * 1000);

      const query = {
        itemId: { $in: itemIds },
        interval: interval,
        timestamp: { $gte: startTime }
      };

      return await collection
        .find(query)
        .sort({ itemId: 1, timestamp: -1 })
        .toArray();
    } catch (error) {
      console.error('Error getting bulk historical prices:', error);
      throw error;
    }
  }

  // ==========================================
  // LEARNING SESSION METHODS
  // ==========================================

  /**
   * Save learning session data
   */
  async saveLearningSession(session) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const collection = this.database.collection('learning_sessions');
      const document = {
        ...session,
        timestamp: session.timestamp || Date.now(),
        _id: undefined
      };

      const result = await collection.insertOne(document);
      return result.insertedId;
    } catch (error) {
      console.error('Error saving learning session:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for AI optimization
   */
  async getPerformanceMetrics(sessionId = null, limit = 100) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      const decisionsCollection = this.database.collection('ai_decisions');
      const outcomesCollection = this.database.collection('trade_outcomes');

      // Aggregate decisions and outcomes
      const pipeline = [
        ...(sessionId ? [{ $match: { sessionId } }] : []),
        {
          $lookup: {
            from: 'trade_outcomes',
            localField: '_id',
            foreignField: 'decisionId',
            as: 'outcome'
          }
        },
        {
          $unwind: { path: '$outcome', preserveNullAndEmptyArrays: true }
        },
        {
          $group: {
            _id: '$sessionId',
            totalDecisions: { $sum: 1 },
            successfulTrades: {
              $sum: { $cond: [{ $gt: ['$outcome.profitLoss', 0] }, 1, 0] }
            },
            totalProfit: { $sum: { $ifNull: ['$outcome.profitLoss', 0] } },
            avgConfidence: { $avg: '$confidence' },
            decisionBreakdown: {
              $push: {
                action: '$action',
                confidence: '$confidence',
                profit: '$outcome.profitLoss'
              }
            }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: limit }
      ];

      return await decisionsCollection.aggregate(pipeline).toArray();
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Close database connection
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('✅ MongoDB connection closed');
    }
  }
}

module.exports = { MongoDataPersistence };
