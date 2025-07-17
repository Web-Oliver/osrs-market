import { MongoClient, Db, Collection, type MongoClientOptions } from 'mongodb'
import type { ItemPrice, PriceData } from '../types'
import type { TradeOutcome, TrainingMetrics, MarketState } from '../types/aiTrading'

export interface DatabaseConfig {
  connectionString: string
  databaseName: string
  options?: MongoClientOptions
}

export interface MarketDataDocument {
  _id?: string
  timestamp: number
  itemId: number
  itemName: string
  priceData: PriceData
  grandExchange: boolean
  members: boolean
  tradeable: boolean
  collectionSource: 'API' | 'MANUAL'
  processingTime: number
  spread?: number
  volume?: number
  lastUpdateTime?: number
}

export interface TradeOutcomeDocument extends TradeOutcome {
  _id?: string
  timestamp: number
  sessionId: string
  aiModelVersion?: string
  marketConditions?: MarketState
}

export interface TrainingMetricsDocument extends TrainingMetrics {
  _id?: string
  timestamp: number
  sessionId: string
  modelConfiguration?: any
  systemLoad?: number
  memoryUsage?: number
}

export interface DataCollectionStatsDocument {
  _id?: string
  timestamp: number
  totalItems: number
  apiCalls: number
  successfulCalls: number
  failedCalls: number
  averageResponseTime: number
  errorRate: number
  memoryUsageBytes: number
  processingTimeMs: number
  dataQualityScore: number
}

export class MongoDataPersistence {
  private client: MongoClient
  private db: Db | null = null
  private isConnected: boolean = false
  private config: DatabaseConfig
  
  // Collections
  private marketDataCollection: Collection<MarketDataDocument> | null = null
  private tradeOutcomesCollection: Collection<TradeOutcomeDocument> | null = null
  private trainingMetricsCollection: Collection<TrainingMetricsDocument> | null = null
  private collectionStatsCollection: Collection<DataCollectionStatsDocument> | null = null

  constructor(config: DatabaseConfig) {
    this.config = config
    this.client = new MongoClient(config.connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      writeConcern: { w: 'majority' },
      ...config.options
    })

    this.logDebug('🗄️ MongoDB Persistence Service initialized', {
      database: config.databaseName,
      connectionConfig: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        retryWrites: true
      }
    })
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      this.logDebug('⚠️ MongoDB already connected, skipping connection attempt')
      return
    }

    try {
      this.logDebug('🔌 Attempting MongoDB connection...', {
        connectionString: this.config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        database: this.config.databaseName
      })

      await this.client.connect()
      this.db = this.client.db(this.config.databaseName)
      
      // Initialize collections
      this.marketDataCollection = this.db.collection<MarketDataDocument>('marketData')
      this.tradeOutcomesCollection = this.db.collection<TradeOutcomeDocument>('tradeOutcomes')
      this.trainingMetricsCollection = this.db.collection<TrainingMetricsDocument>('trainingMetrics')
      this.collectionStatsCollection = this.db.collection<DataCollectionStatsDocument>('collectionStats')

      // Create indexes for optimal performance
      await this.createIndexes()

      this.isConnected = true
      this.logDebug('✅ MongoDB connection established successfully', {
        database: this.config.databaseName,
        collectionsInitialized: 4
      })

      // Test connection with ping
      await this.db.admin().ping()
      this.logDebug('🏓 MongoDB ping successful - connection is healthy')

    } catch (error) {
      this.logError('❌ MongoDB connection failed', error, {
        connectionString: this.config.connectionString.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        database: this.config.databaseName
      })
      throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      this.logDebug('⚠️ MongoDB already disconnected')
      return
    }

    try {
      this.logDebug('🔌 Disconnecting from MongoDB...')
      await this.client.close()
      this.isConnected = false
      this.db = null
      this.marketDataCollection = null
      this.tradeOutcomesCollection = null
      this.trainingMetricsCollection = null
      this.collectionStatsCollection = null
      this.logDebug('✅ MongoDB disconnected successfully')
    } catch (error) {
      this.logError('❌ Error during MongoDB disconnection', error)
      throw error
    }
  }

  private async createIndexes(): Promise<void> {
    try {
      this.logDebug('📋 Creating MongoDB indexes for optimal performance...')

      // Market Data indexes
      await this.marketDataCollection!.createIndex({ itemId: 1, timestamp: -1 })
      await this.marketDataCollection!.createIndex({ timestamp: -1 })
      await this.marketDataCollection!.createIndex({ 'priceData.high': 1, 'priceData.low': 1 })
      await this.marketDataCollection!.createIndex({ grandExchange: 1, tradeable: 1 })

      // Trade Outcomes indexes
      await this.tradeOutcomesCollection!.createIndex({ sessionId: 1, timestamp: -1 })
      await this.tradeOutcomesCollection!.createIndex({ timestamp: -1 })
      await this.tradeOutcomesCollection!.createIndex({ successful: 1, profitAmount: -1 })

      // Training Metrics indexes
      await this.trainingMetricsCollection!.createIndex({ sessionId: 1, episode: -1 })
      await this.trainingMetricsCollection!.createIndex({ timestamp: -1 })

      // Collection Stats indexes
      await this.collectionStatsCollection!.createIndex({ timestamp: -1 })

      this.logDebug('✅ MongoDB indexes created successfully', {
        marketDataIndexes: 4,
        tradeOutcomesIndexes: 3,
        trainingMetricsIndexes: 2,
        collectionStatsIndexes: 1
      })
    } catch (error) {
      this.logError('❌ Error creating MongoDB indexes', error)
      // Don't throw - indexes are optimization, not critical
    }
  }

  // Market Data Operations
  public async saveMarketData(items: ItemPrice[], collectionSource: 'API' | 'MANUAL' = 'API'): Promise<void> {
    this.ensureConnected()
    
    const startTime = Date.now()
    this.logDebug(`💾 Saving ${items.length} market data items to MongoDB...`, {
      source: collectionSource,
      sampleItems: items.slice(0, 3).map(item => ({
        id: item.id,
        name: item.name,
        price: item.priceData.high || item.priceData.low
      }))
    })

    try {
      const documents: MarketDataDocument[] = items.map(item => ({
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
      }))

      const result = await this.marketDataCollection!.insertMany(documents, { ordered: false })
      const processingTime = Date.now() - startTime

      this.logDebug('✅ Market data saved successfully', {
        itemsSaved: result.insertedCount,
        processingTimeMs: processingTime,
        averageTimePerItem: Math.round(processingTime / items.length * 100) / 100,
        insertedIds: Object.keys(result.insertedIds).length
      })

    } catch (error) {
      this.logError('❌ Error saving market data to MongoDB', error, {
        itemCount: items.length,
        source: collectionSource
      })
      throw error
    }
  }

  public async getMarketData(
    options: {
      itemId?: number
      startTime?: number
      endTime?: number
      limit?: number
      onlyTradeable?: boolean
    } = {}
  ): Promise<MarketDataDocument[]> {
    this.ensureConnected()
    
    this.logDebug('🔍 Querying market data from MongoDB...', options)

    try {
      const query: any = {}
      
      if (options.itemId) query.itemId = options.itemId
      if (options.onlyTradeable) query.tradeable = true
      if (options.startTime || options.endTime) {
        query.timestamp = {}
        if (options.startTime) query.timestamp.$gte = options.startTime
        if (options.endTime) query.timestamp.$lte = options.endTime
      }

      const cursor = this.marketDataCollection!
        .find(query)
        .sort({ timestamp: -1 })
      
      if (options.limit) cursor.limit(options.limit)
      
      const results = await cursor.toArray()
      
      this.logDebug('✅ Market data query completed', {
        resultsFound: results.length,
        queryFilter: query,
        latestTimestamp: results[0]?.timestamp,
        oldestTimestamp: results[results.length - 1]?.timestamp
      })

      return results
    } catch (error) {
      this.logError('❌ Error querying market data from MongoDB', error, options)
      throw error
    }
  }

  // Trade Outcomes Operations
  public async saveTradeOutcome(outcome: TradeOutcome, sessionId: string): Promise<void> {
    this.ensureConnected()
    
    this.logDebug('💰 Saving trade outcome to MongoDB...', {
      sessionId,
      itemId: outcome.itemId,
      success: outcome.success,
      profit: outcome.profit
    })

    try {
      const document: TradeOutcomeDocument = {
        ...outcome,
        timestamp: Date.now(),
        sessionId,
        aiModelVersion: 'DDQN-v1.0'
      }

      const result = await this.tradeOutcomesCollection!.insertOne(document)
      
      this.logDebug('✅ Trade outcome saved successfully', {
        insertedId: result.insertedId,
        sessionId,
        outcomeType: outcome.success ? 'PROFIT' : 'LOSS'
      })

    } catch (error) {
      this.logError('❌ Error saving trade outcome to MongoDB', error, { sessionId, outcome })
      throw error
    }
  }

  public async getTradeOutcomes(sessionId?: string, limit: number = 1000): Promise<TradeOutcomeDocument[]> {
    this.ensureConnected()
    
    this.logDebug('📊 Querying trade outcomes from MongoDB...', { sessionId, limit })

    try {
      const query = sessionId ? { sessionId } : {}
      const results = await this.tradeOutcomesCollection!
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray()

      this.logDebug('✅ Trade outcomes query completed', {
        resultsFound: results.length,
        sessionId,
        successfulTrades: results.filter(r => r.success).length,
        totalProfit: results.reduce((sum, r) => sum + (r.profit || 0), 0)
      })

      return results
    } catch (error) {
      this.logError('❌ Error querying trade outcomes from MongoDB', error, { sessionId, limit })
      throw error
    }
  }

  // Training Metrics Operations
  public async saveTrainingMetrics(metrics: TrainingMetrics, sessionId: string): Promise<void> {
    this.ensureConnected()
    
    this.logDebug('📈 Saving training metrics to MongoDB...', {
      sessionId,
      episode: metrics.episode,
      successRate: metrics.successRate,
      totalReward: metrics.totalReward
    })

    try {
      const document: TrainingMetricsDocument = {
        ...metrics,
        timestamp: Date.now(),
        sessionId,
        systemLoad: this.getSystemLoad(),
        memoryUsage: this.getMemoryUsage()
      }

      const result = await this.trainingMetricsCollection!.insertOne(document)
      
      this.logDebug('✅ Training metrics saved successfully', {
        insertedId: result.insertedId,
        episode: metrics.episode,
        sessionId
      })

    } catch (error) {
      this.logError('❌ Error saving training metrics to MongoDB', error, { sessionId, metrics })
      throw error
    }
  }

  public async getTrainingMetrics(sessionId?: string, limit: number = 1000): Promise<TrainingMetricsDocument[]> {
    this.ensureConnected()
    
    this.logDebug('📊 Querying training metrics from MongoDB...', { sessionId, limit })

    try {
      const query = sessionId ? { sessionId } : {}
      const results = await this.trainingMetricsCollection!
        .find(query)
        .sort({ episode: -1 })
        .limit(limit)
        .toArray()

      this.logDebug('✅ Training metrics query completed', {
        resultsFound: results.length,
        sessionId,
        latestEpisode: results[0]?.episode,
        averageSuccessRate: results.length > 0 
          ? results.reduce((sum, r) => sum + (r.successRate || 0), 0) / results.length 
          : 0
      })

      return results
    } catch (error) {
      this.logError('❌ Error querying training metrics from MongoDB', error, { sessionId, limit })
      throw error
    }
  }

  // Collection Statistics
  public async saveCollectionStats(stats: Omit<DataCollectionStatsDocument, '_id' | 'timestamp'>): Promise<void> {
    this.ensureConnected()
    
    this.logDebug('📊 Saving collection statistics to MongoDB...', {
      totalItems: stats.totalItems,
      successRate: ((stats.successfulCalls / stats.apiCalls) * 100).toFixed(1) + '%',
      dataQuality: stats.dataQualityScore
    })

    try {
      const document: DataCollectionStatsDocument = {
        ...stats,
        timestamp: Date.now()
      }

      const result = await this.collectionStatsCollection!.insertOne(document)
      
      this.logDebug('✅ Collection statistics saved successfully', {
        insertedId: result.insertedId,
        totalItems: stats.totalItems,
        errorRate: (stats.errorRate * 100).toFixed(1) + '%'
      })

    } catch (error) {
      this.logError('❌ Error saving collection statistics to MongoDB', error, { stats })
      throw error
    }
  }

  // Utility Methods
  public async getDataBaseSummary(): Promise<{
    marketDataCount: number
    tradeOutcomesCount: number
    trainingMetricsCount: number
    collectionStatsCount: number
    oldestRecord: number | null
    newestRecord: number | null
    totalProfitAllTime: number
  }> {
    this.ensureConnected()
    
    this.logDebug('📊 Generating database summary...')

    try {
      const [
        marketDataCount,
        tradeOutcomesCount,
        trainingMetricsCount,
        collectionStatsCount,
        oldestMarketData,
        newestMarketData,
        profitSummary
      ] = await Promise.all([
        this.marketDataCollection!.countDocuments(),
        this.tradeOutcomesCollection!.countDocuments(),
        this.trainingMetricsCollection!.countDocuments(),
        this.collectionStatsCollection!.countDocuments(),
        this.marketDataCollection!.findOne({}, { sort: { timestamp: 1 }, projection: { timestamp: 1 } }),
        this.marketDataCollection!.findOne({}, { sort: { timestamp: -1 }, projection: { timestamp: 1 } }),
        this.tradeOutcomesCollection!.aggregate([
          { $group: { _id: null, totalProfit: { $sum: '$profit' } } }
        ]).toArray()
      ])

      const summary = {
        marketDataCount,
        tradeOutcomesCount,
        trainingMetricsCount,
        collectionStatsCount,
        oldestRecord: oldestMarketData?.timestamp || null,
        newestRecord: newestMarketData?.timestamp || null,
        totalProfitAllTime: profitSummary[0]?.totalProfit || 0
      }

      this.logDebug('✅ Database summary generated', summary)
      return summary

    } catch (error) {
      this.logError('❌ Error generating database summary', error)
      throw error
    }
  }

  public async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<{
    marketDataDeleted: number
    tradeOutcomesDeleted: number
    trainingMetricsDeleted: number
    collectionStatsDeleted: number
  }> {
    this.ensureConnected()
    
    const cutoffTime = Date.now() - maxAge
    this.logDebug('🧹 Cleaning up old data...', {
      maxAgeMs: maxAge,
      cutoffTime: new Date(cutoffTime).toISOString()
    })

    try {
      const [
        marketDataResult,
        tradeOutcomesResult,
        trainingMetricsResult,
        collectionStatsResult
      ] = await Promise.all([
        this.marketDataCollection!.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.tradeOutcomesCollection!.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.trainingMetricsCollection!.deleteMany({ timestamp: { $lt: cutoffTime } }),
        this.collectionStatsCollection!.deleteMany({ timestamp: { $lt: cutoffTime } })
      ])

      const result = {
        marketDataDeleted: marketDataResult.deletedCount || 0,
        tradeOutcomesDeleted: tradeOutcomesResult.deletedCount || 0,
        trainingMetricsDeleted: trainingMetricsResult.deletedCount || 0,
        collectionStatsDeleted: collectionStatsResult.deletedCount || 0
      }

      this.logDebug('✅ Old data cleanup completed', result)
      return result

    } catch (error) {
      this.logError('❌ Error during data cleanup', error, { maxAge, cutoffTime })
      throw error
    }
  }

  // Export data for backup/analysis
  public async exportAllData(): Promise<{
    marketData: MarketDataDocument[]
    tradeOutcomes: TradeOutcomeDocument[]
    trainingMetrics: TrainingMetricsDocument[]
    collectionStats: DataCollectionStatsDocument[]
    exportTimestamp: number
  }> {
    this.ensureConnected()
    
    this.logDebug('📤 Exporting all database data...')

    try {
      const [marketData, tradeOutcomes, trainingMetrics, collectionStats] = await Promise.all([
        this.marketDataCollection!.find({}).toArray(),
        this.tradeOutcomesCollection!.find({}).toArray(),
        this.trainingMetricsCollection!.find({}).toArray(),
        this.collectionStatsCollection!.find({}).toArray()
      ])

      const exportData = {
        marketData,
        tradeOutcomes,
        trainingMetrics,
        collectionStats,
        exportTimestamp: Date.now()
      }

      this.logDebug('✅ Data export completed', {
        marketDataCount: marketData.length,
        tradeOutcomesCount: tradeOutcomes.length,
        trainingMetricsCount: trainingMetrics.length,
        collectionStatsCount: collectionStats.length,
        totalRecords: marketData.length + tradeOutcomes.length + trainingMetrics.length + collectionStats.length
      })

      return exportData

    } catch (error) {
      this.logError('❌ Error exporting data', error)
      throw error
    }
  }

  // Private Helper Methods
  private ensureConnected(): void {
    if (!this.isConnected || !this.db) {
      throw new Error('MongoDB not connected. Call connect() first.')
    }
  }

  private calculateSpread(priceData: PriceData): number | undefined {
    if (!priceData.high || !priceData.low || priceData.low === 0) return undefined
    return ((priceData.high - priceData.low) / priceData.low) * 100
  }

  private getSystemLoad(): number {
    // Simple approximation - in production you'd use proper system monitoring
    return Math.random() * 100
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    return 0
  }

  private logDebug(message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [MongoDB-Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  private logError(message: string, error: any, context?: any): void {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [MongoDB-Error] ${message}`)
    if (context) console.error(`[${timestamp}] [MongoDB-Context]`, JSON.stringify(context, null, 2))
    console.error(`[${timestamp}] [MongoDB-Stack]`, error)
  }

  // Health check method
  public async healthCheck(): Promise<{
    connected: boolean
    database: string
    collections: string[]
    ping: boolean
    timestamp: number
  }> {
    try {
      if (!this.isConnected || !this.db) {
        return {
          connected: false,
          database: this.config.databaseName,
          collections: [],
          ping: false,
          timestamp: Date.now()
        }
      }

      await this.db.admin().ping()
      const collections = await this.db.listCollections().toArray()

      const health = {
        connected: true,
        database: this.config.databaseName,
        collections: collections.map(c => c.name),
        ping: true,
        timestamp: Date.now()
      }

      this.logDebug('💚 MongoDB health check passed', health)
      return health

    } catch (error) {
      this.logError('💔 MongoDB health check failed', error)
      return {
        connected: false,
        database: this.config.databaseName,
        collections: [],
        ping: false,
        timestamp: Date.now()
      }
    }
  }
}