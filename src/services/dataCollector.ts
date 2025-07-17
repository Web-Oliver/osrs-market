import type { OSRSItem, ItemPrice, PriceData } from '../types'
import { MongoDataPersistence, type DatabaseConfig } from './mongoDataPersistence'
import { APIRateLimiter } from './apiRateLimiter'
import { SmartItemSelector } from './smartItemSelector'

export interface CollectionConfig {
  updateInterval: number // milliseconds
  maxRetries: number
  enableTimeseriesData: boolean
  enableMapping: boolean
  enableHistoricalData: boolean
  enablePersistence: boolean
  persistence?: {
    type: 'mongodb' | 'file'
    config: DatabaseConfig | { filePath: string }
  }
  itemFilters: {
    minPrice?: number
    maxPrice?: number
    membersOnly?: boolean
    tradeable?: boolean
    grandExchange?: boolean
    categories?: string[]
  }
  dataRetention: {
    maxAge: number // milliseconds
    maxRecords: number
  }
}

export interface CollectedData {
  timestamp: number
  items: ItemPrice[]
  metadata: OSRSItem[]
  timeseriesData: Map<number, PriceData[]>
  marketSummary: {
    totalItems: number
    activeItems: number
    averagePrice: number
    totalVolume: number
    priceSpread: number
  }
}

export class OSRSDataCollector {
  private config: CollectionConfig
  private collectedData: CollectedData[] = []
  private isCollecting: boolean = false
  private intervalId: NodeJS.Timeout | null = null
  private persistence: MongoDataPersistence | null = null
  private rateLimiter: APIRateLimiter
  private itemSelector: SmartItemSelector
  private readonly baseUrl = 'https://prices.runescape.wiki/api/v1/osrs'
  private collectionStats = {
    totalApiCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    totalItems: 0,
    startTime: Date.now(),
    responseTime: [] as number[]
  }

  constructor(config: CollectionConfig) {
    this.config = config
    
    // Initialize API rate limiter for respectful usage
    this.rateLimiter = new APIRateLimiter({
      maxRequestsPerMinute: 30,    // Conservative rate limiting
      maxRequestsPerHour: 1000,    // 1000 requests per hour max
      maxConcurrentRequests: 3,    // Only 3 concurrent requests
      respectfulDelayMs: 1000      // Always wait 1 second between requests
    })
    
    // Initialize smart item selector to focus on profitable items
    this.itemSelector = new SmartItemSelector({
      enablePresetItems: true,
      enableTrendingDiscovery: false,  // Disabled to avoid API spam
      maxItemsToTrack: 100,            // Only track 100 items instead of 3000+
      minimumValueThreshold: 5000      // 5k GP minimum
    })
    
    this.initializePersistence()
    this.logDebug('🔧 OSRS Data Collector initialized', {
      updateInterval: config.updateInterval,
      enablePersistence: config.enablePersistence,
      persistenceType: config.persistence?.type,
      retries: config.maxRetries,
      filters: config.itemFilters,
      itemsToTrack: this.itemSelector.getSelectedItems().length,
      rateLimitingEnabled: true
    })
  }

  private async initializePersistence(): Promise<void> {
    if (!this.config.enablePersistence || !this.config.persistence) {
      this.logDebug('📊 Persistence disabled - data will be stored in memory only')
      return
    }

    if (this.config.persistence.type === 'mongodb') {
      try {
        this.persistence = new MongoDataPersistence(this.config.persistence.config as DatabaseConfig)
        await this.persistence.connect()
        this.logDebug('✅ MongoDB persistence initialized successfully')
      } catch (error) {
        this.logError('❌ Failed to initialize MongoDB persistence', error)
        this.logDebug('⚠️ Falling back to memory-only storage')
      }
    }
  }

  public async startCollection(): Promise<void> {
    if (this.isCollecting) {
      this.logDebug('⚠️ Data collection already in progress - skipping start request')
      return
    }

    this.isCollecting = true
    this.collectionStats.startTime = Date.now()
    
    this.logDebug('🚀 Starting OSRS data collection...', {
      interval: this.config.updateInterval,
      persistence: this.persistence ? 'MongoDB' : 'Memory-only',
      filters: this.config.itemFilters
    })

    try {
      // Initialize persistence if not already done
      if (this.config.enablePersistence && !this.persistence) {
        await this.initializePersistence()
      }

      // Initial data collection
      this.logDebug('📊 Performing initial data collection...')
      await this.collectData()

      // Set up recurring collection
      this.intervalId = setInterval(async () => {
        try {
          await this.collectData()
        } catch (error) {
          this.logError('❌ Error during scheduled data collection', error)
          this.collectionStats.failedCalls++
        }
      }, this.config.updateInterval)

      this.logDebug('✅ Data collection started successfully', {
        intervalMs: this.config.updateInterval,
        nextCollection: new Date(Date.now() + this.config.updateInterval).toISOString()
      })
    } catch (error) {
      this.isCollecting = false
      this.logError('❌ Failed to start data collection', error)
      throw error
    }
  }

  public stopCollection(): void {
    this.logDebug('🛑 Stopping data collection...', {
      totalCollections: this.collectionStats.totalApiCalls,
      uptime: Date.now() - this.collectionStats.startTime,
      successRate: this.collectionStats.totalApiCalls > 0 
        ? (this.collectionStats.successfulCalls / this.collectionStats.totalApiCalls * 100).toFixed(1) + '%'
        : '0%'
    })

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isCollecting = false
    
    this.logDebug('✅ Data collection stopped successfully')
  }

  private async collectData(): Promise<void> {
    const startTime = Date.now()
    const collectionId = `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.logDebug('📊 Starting data collection cycle', {
      collectionId,
      timestamp: new Date(startTime).toISOString(),
      cycle: this.collectionStats.totalApiCalls + 1
    })

    try {
      this.collectionStats.totalApiCalls++

      // Step 1: Collect latest prices
      this.logDebug('💰 Fetching latest prices from RuneScape Wiki API...')
      const latestPrices = await this.fetchLatestPrices()
      this.logDebug('✅ Latest prices fetched successfully', {
        totalItems: latestPrices.length,
        sampleItems: latestPrices.slice(0, 5).map(item => ({
          id: item.id,
          high: item.priceData.high,
          low: item.priceData.low
        }))
      })
      
      // Step 2: Collect item mapping if enabled
      let itemMapping: OSRSItem[] = []
      if (this.config.enableMapping) {
        this.logDebug('🗺️ Fetching item mapping data...')
        itemMapping = await this.fetchItemMapping()
        this.logDebug('✅ Item mapping fetched', { mappedItems: itemMapping.length })
        
        // Enhance price data with mapping information
        this.enhanceItemsWithMapping(latestPrices, itemMapping)
      }

      // Step 3: Collect timeseries data if enabled
      const timeseriesData = new Map<number, PriceData[]>()
      if (this.config.enableTimeseriesData) {
        this.logDebug('📈 Fetching timeseries data for smart-selected items...')
        
        // Use smart item selector for timeseries collection (focus on Tier S items)
        const tierBreakdown = this.itemSelector.getItemsByTier()
        const timeseriesItemIds = [
          ...tierBreakdown.tierS.slice(0, 15),  // Top 15 Tier S items
          ...tierBreakdown.tierA.slice(0, 10)   // Top 10 Tier A items
        ]
        
        // Filter to items that actually have price data
        const itemsForTimeseries = latestPrices.filter(item => 
          timeseriesItemIds.includes(item.id)
        )
        
        let timeseriesCollected = 0
        
        this.logDebug('🎯 Smart timeseries collection setup', {
          tierSItems: tierBreakdown.tierS.length,
          tierAItems: tierBreakdown.tierA.length,
          timeseriesTargets: timeseriesItemIds.length,
          availableItems: itemsForTimeseries.length
        })
        
        for (const item of itemsForTimeseries) {
          try {
            const timeseries = await this.fetchTimeseriesData(item.id)
            if (timeseries.length > 0) {
              timeseriesData.set(item.id, timeseries)
              timeseriesCollected++
            }
            // Rate limiting handled by APIRateLimiter - no additional delay needed
          } catch (error) {
            this.logDebug(`⚠️ Failed to fetch timeseries for item ${item.id}`, { error: error instanceof Error ? error.message : 'Unknown error' })
          }
        }
        
        this.logDebug('✅ Timeseries data collection completed', {
          requested: itemsForTimeseries.length,
          collected: timeseriesCollected,
          totalDataPoints: Array.from(timeseriesData.values()).reduce((sum, arr) => sum + arr.length, 0)
        })
      }

      // Step 4: Apply filters
      this.logDebug('🔍 Applying data filters...', {
        beforeFilters: latestPrices.length,
        filters: this.config.itemFilters
      })
      const filteredItems = this.applyFilters(latestPrices)
      this.logDebug('✅ Filters applied', {
        afterFilters: filteredItems.length,
        filtered: latestPrices.length - filteredItems.length,
        filterRate: ((latestPrices.length - filteredItems.length) / latestPrices.length * 100).toFixed(1) + '%'
      })

      // Step 5: Generate market summary
      this.logDebug('📊 Generating market summary...')
      const marketSummary = this.generateMarketSummary(filteredItems)
      this.logDebug('✅ Market summary generated', marketSummary)

      // Step 6: Store collected data
      const collectedData: CollectedData = {
        timestamp: startTime,
        items: filteredItems,
        metadata: itemMapping,
        timeseriesData,
        marketSummary
      }

      // Store in memory
      this.collectedData.push(collectedData)
      this.collectionStats.totalItems += filteredItems.length

      // Step 7: Persist to database if enabled
      if (this.persistence && filteredItems.length > 0) {
        this.logDebug('💾 Persisting data to MongoDB...', {
          itemCount: filteredItems.length,
          hasTimeseries: timeseriesData.size > 0
        })
        
        try {
          await this.persistence.saveMarketData(filteredItems, 'API')
          
          // Save collection statistics
          const stats = {
            totalItems: this.collectionStats.totalItems,
            apiCalls: this.collectionStats.totalApiCalls,
            successfulCalls: this.collectionStats.successfulCalls + 1, // This call will be successful
            failedCalls: this.collectionStats.failedCalls,
            averageResponseTime: this.collectionStats.responseTime.length > 0 
              ? this.collectionStats.responseTime.reduce((a, b) => a + b, 0) / this.collectionStats.responseTime.length 
              : 0,
            errorRate: this.collectionStats.failedCalls / this.collectionStats.totalApiCalls,
            memoryUsageBytes: this.getMemoryUsage(),
            processingTimeMs: Date.now() - startTime,
            dataQualityScore: this.calculateDataQuality(filteredItems)
          }
          
          await this.persistence.saveCollectionStats(stats)
          this.logDebug('✅ Data persisted to MongoDB successfully')
        } catch (error) {
          this.logError('❌ Failed to persist data to MongoDB', error)
          // Don't throw - continue with memory storage
        }
      }

      // Step 8: Manage data retention
      this.manageDataRetention()

      // Update statistics
      const duration = Date.now() - startTime
      this.collectionStats.responseTime.push(duration)
      this.collectionStats.successfulCalls++
      
      // Keep only last 100 response times
      if (this.collectionStats.responseTime.length > 100) {
        this.collectionStats.responseTime = this.collectionStats.responseTime.slice(-100)
      }

      this.logDebug('🎉 Data collection cycle completed successfully', {
        collectionId,
        durationMs: duration,
        totalItems: filteredItems.length,
        averagePrice: marketSummary.averagePrice,
        priceSpread: marketSummary.priceSpread,
        dataQuality: this.calculateDataQuality(filteredItems),
        memoryUsage: this.estimateMemoryUsage(),
        successRate: (this.collectionStats.successfulCalls / this.collectionStats.totalApiCalls * 100).toFixed(1) + '%'
      })

    } catch (error) {
      this.collectionStats.failedCalls++
      this.logError('❌ Data collection cycle failed', error, {
        collectionId,
        cycle: this.collectionStats.totalApiCalls,
        duration: Date.now() - startTime
      })
      throw error
    }
  }

  private async fetchLatestPrices(): Promise<ItemPrice[]> {
    const response = await this.makeRequest('/latest')
    const data = response.data || {}
    const items: ItemPrice[] = []

    for (const [itemId, priceData] of Object.entries(data)) {
      const id = parseInt(itemId)
      const price = priceData as PriceData

      items.push({
        id,
        name: `Item_${id}`, // Will be resolved from mapping
        members: false, // Will be resolved from mapping
        tradeable: true,
        stackable: false,
        noted: false,
        grandExchange: true,
        priceData: price
      })
    }

    return items
  }

  private async fetchItemMapping(): Promise<OSRSItem[]> {
    try {
      const response = await this.makeRequest('/mapping')
      return Object.values(response) as OSRSItem[]
    } catch (error) {
      console.warn('Failed to fetch item mapping:', error)
      return []
    }
  }

  private async fetchTimeseriesData(itemId: number, interval: string = '5m'): Promise<PriceData[]> {
    try {
      const response = await this.makeRequest(`/timeseries?timestep=${interval}&id=${itemId}`)
      const data = response.data || {}
      const timeseries: PriceData[] = []

      for (const [timestamp, priceData] of Object.entries(data)) {
        timeseries.push({
          ...(priceData as PriceData),
          timestamp: parseInt(timestamp)
        })
      }

      return timeseries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
    } catch (error) {
      console.warn(`Failed to fetch timeseries for item ${itemId}:`, error)
      return []
    }
  }

  private async makeRequest(endpoint: string, retries: number = 0): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`
    
    try {
      this.logDebug('🌐 Making rate-limited API request', {
        url,
        attempt: retries + 1,
        rateLimiterStats: this.rateLimiter.getStats()
      })

      // Use rate limiter for respectful API usage
      const response = await this.rateLimiter.request(url, {
        headers: {
          'User-Agent': 'OSRS-Market-Tracker/1.0 (Educational AI Trading Research)'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      this.logDebug('✅ API request successful', {
        url,
        status: response.status,
        dataKeys: Object.keys(data).length
      })

      return data
    } catch (error) {
      this.logDebug('❌ API request failed', {
        url,
        attempt: retries + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      if (retries < this.config.maxRetries) {
        this.logDebug('⏳ Retrying API request with exponential backoff', {
          nextAttempt: retries + 2,
          maxRetries: this.config.maxRetries,
          delay: 1000 * (retries + 1)
        })
        await this.delay(1000 * (retries + 1)) // Exponential backoff
        return this.makeRequest(endpoint, retries + 1)
      }
      throw error
    }
  }

  private applyFilters(items: ItemPrice[]): ItemPrice[] {
    const startTime = Date.now()
    const filters = this.config.itemFilters
    
    // Step 1: Get smart-selected items (only ~100 items instead of 3000+)
    const selectedItemIds = new Set(this.itemSelector.getSelectedItems())
    
    this.logDebug('🎯 Applying smart item filtering', {
      totalItems: items.length,
      smartSelectedItems: selectedItemIds.size,
      itemTiers: this.itemSelector.getItemsByTier()
    })

    // Step 2: Filter to only smart-selected items first
    const smartFiltered = items.filter(item => selectedItemIds.has(item.id))
    
    this.logDebug('✅ Smart item selection applied', {
      originalItems: items.length,
      smartFiltered: smartFiltered.length,
      reductionPercent: ((items.length - smartFiltered.length) / items.length * 100).toFixed(1)
    })

    // Step 3: Apply additional filters
    const finalFiltered = smartFiltered.filter(item => {
      // Price filters
      if (filters.minPrice && (item.priceData.high || 0) < filters.minPrice) return false
      if (filters.maxPrice && (item.priceData.low || 0) > filters.maxPrice) return false

      // Membership filter
      if (filters.membersOnly !== undefined && item.members !== filters.membersOnly) return false

      // Tradeable filter
      if (filters.tradeable !== undefined && item.tradeable !== filters.tradeable) return false

      // Grand Exchange filter
      if (filters.grandExchange !== undefined && item.grandExchange !== filters.grandExchange) return false

      // Must have valid price data
      if (!item.priceData.high && !item.priceData.low) return false

      return true
    })

    const processingTime = Date.now() - startTime
    this.logDebug('🔍 Filtering completed', {
      originalItems: items.length,
      smartSelected: smartFiltered.length,
      finalFiltered: finalFiltered.length,
      processingTimeMs: processingTime,
      efficiency: `${((finalFiltered.length / items.length) * 100).toFixed(1)}% of original items kept`
    })

    return finalFiltered
  }

  private generateMarketSummary(items: ItemPrice[]) {
    const validItems = items.filter(item => item.priceData.high && item.priceData.low)
    
    if (validItems.length === 0) {
      return {
        totalItems: 0,
        activeItems: 0,
        averagePrice: 0,
        totalVolume: 0,
        priceSpread: 0
      }
    }

    const totalPrice = validItems.reduce((sum, item) => {
      const avgPrice = ((item.priceData.high || 0) + (item.priceData.low || 0)) / 2
      return sum + avgPrice
    }, 0)

    const averagePrice = totalPrice / validItems.length

    const totalSpread = validItems.reduce((sum, item) => {
      const spread = ((item.priceData.high || 0) - (item.priceData.low || 0)) / (item.priceData.low || 1)
      return sum + spread
    }, 0)

    const priceSpread = (totalSpread / validItems.length) * 100

    return {
      totalItems: items.length,
      activeItems: validItems.length,
      averagePrice: Math.round(averagePrice),
      totalVolume: validItems.length * 1000, // Mock volume calculation
      priceSpread: Math.round(priceSpread * 100) / 100
    }
  }

  private manageDataRetention(): void {
    const { maxAge, maxRecords } = this.config.dataRetention
    const now = Date.now()

    // Remove old data by age
    this.collectedData = this.collectedData.filter(data => 
      now - data.timestamp <= maxAge
    )

    // Remove old data by count
    if (this.collectedData.length > maxRecords) {
      this.collectedData = this.collectedData.slice(-maxRecords)
    }
  }

  public getLatestData(): CollectedData | null {
    return this.collectedData.length > 0 
      ? this.collectedData[this.collectedData.length - 1] 
      : null
  }

  public getHistoricalData(itemId?: number, timeRange?: number): CollectedData[] {
    let data = this.collectedData

    // Filter by time range if specified
    if (timeRange) {
      const cutoff = Date.now() - timeRange
      data = data.filter(d => d.timestamp >= cutoff)
    }

    // Filter by item if specified
    if (itemId) {
      data = data.map(d => ({
        ...d,
        items: d.items.filter(item => item.id === itemId)
      })).filter(d => d.items.length > 0)
    }

    return data
  }

  public getItemTimeseries(itemId: number): PriceData[] {
    const allTimeseries: PriceData[] = []

    for (const data of this.collectedData) {
      const timeseries = data.timeseriesData.get(itemId)
      if (timeseries) {
        allTimeseries.push(...timeseries)
      }
    }

    // Remove duplicates and sort by timestamp
    const uniqueTimeseries = allTimeseries.filter((item, index, arr) => 
      index === arr.findIndex(other => other.timestamp === item.timestamp)
    )

    return uniqueTimeseries.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
  }

  public getMarketMetrics() {
    if (this.collectedData.length === 0) return null

    const latest = this.getLatestData()
    if (!latest) return null

    const historical = this.collectedData.slice(-10) // Last 10 collections
    
    return {
      current: latest.marketSummary,
      trends: {
        priceChange: this.calculatePriceChange(historical),
        volumeChange: this.calculateVolumeChange(historical),
        activeItemsChange: this.calculateActiveItemsChange(historical)
      },
      dataQuality: {
        collectionsCount: this.collectedData.length,
        lastUpdate: latest.timestamp,
        uptime: this.isCollecting,
        retentionPeriod: this.config.dataRetention.maxAge
      }
    }
  }

  private calculatePriceChange(historical: CollectedData[]): number {
    if (historical.length < 2) return 0
    
    const latest = historical[historical.length - 1]
    const previous = historical[historical.length - 2]
    
    if (previous.marketSummary.averagePrice === 0) return 0
    
    return ((latest.marketSummary.averagePrice - previous.marketSummary.averagePrice) / 
            previous.marketSummary.averagePrice) * 100
  }

  private calculateVolumeChange(historical: CollectedData[]): number {
    if (historical.length < 2) return 0
    
    const latest = historical[historical.length - 1]
    const previous = historical[historical.length - 2]
    
    if (previous.marketSummary.totalVolume === 0) return 0
    
    return ((latest.marketSummary.totalVolume - previous.marketSummary.totalVolume) / 
            previous.marketSummary.totalVolume) * 100
  }

  private calculateActiveItemsChange(historical: CollectedData[]): number {
    if (historical.length < 2) return 0
    
    const latest = historical[historical.length - 1]
    const previous = historical[historical.length - 2]
    
    return latest.marketSummary.activeItems - previous.marketSummary.activeItems
  }

  public exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV()
    }
    return JSON.stringify(this.collectedData, null, 2)
  }

  private exportToCSV(): string {
    const headers = [
      'timestamp', 'item_id', 'item_name', 'high_price', 'low_price', 
      'high_time', 'low_time', 'members', 'tradeable', 'grand_exchange'
    ]

    const rows = [headers.join(',')]

    for (const data of this.collectedData) {
      for (const item of data.items) {
        rows.push([
          data.timestamp,
          item.id,
          `"${item.name}"`,
          item.priceData.high || '',
          item.priceData.low || '',
          item.priceData.highTime || '',
          item.priceData.lowTime || '',
          item.members,
          item.tradeable,
          item.grandExchange
        ].join(','))
      }
    }

    return rows.join('\n')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public updateConfig(newConfig: Partial<CollectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.logDebug('⚙️ Data collector configuration updated', newConfig)
  }

  /**
   * Update smart item selector configuration
   */
  public updateItemSelectorConfig(config: any): void {
    this.itemSelector.updateConfig(config)
    this.logDebug('🎯 Smart item selector configuration updated', config)
  }

  /**
   * Update rate limiter configuration
   */
  public updateRateLimiterConfig(config: any): void {
    this.rateLimiter.updateConfig(config)
    this.logDebug('🛡️ Rate limiter configuration updated', config)
  }

  public getConfig(): CollectionConfig {
    return { ...this.config }
  }

  public getBasicStats() {
    return {
      isCollecting: this.isCollecting,
      totalCollections: this.collectedData.length,
      dataRetained: this.collectedData.length,
      memoryUsage: this.estimateMemoryUsage(),
      lastCollection: this.collectedData.length > 0 
        ? new Date(this.collectedData[this.collectedData.length - 1].timestamp).toISOString()
        : null
    }
  }

  /**
   * Get comprehensive system status including rate limiting and smart selection
   */
  public getSystemStatus() {
    const rateLimiterStats = this.rateLimiter.getStats()
    const itemSelectorStats = this.itemSelector.getStats()
    const rateLimiterHealth = this.rateLimiter.getHealth()
    
    return {
      dataCollection: {
        isActive: this.isCollecting,
        totalCollections: this.collectionStats.totalApiCalls,
        successfulCalls: this.collectionStats.successfulCalls,
        failedCalls: this.collectionStats.failedCalls,
        successRate: this.collectionStats.totalApiCalls > 0 
          ? ((this.collectionStats.successfulCalls / this.collectionStats.totalApiCalls) * 100).toFixed(1) + '%'
          : '0%',
        uptime: Date.now() - this.collectionStats.startTime,
        averageResponseTime: this.collectionStats.responseTime.length > 0
          ? (this.collectionStats.responseTime.reduce((a, b) => a + b, 0) / this.collectionStats.responseTime.length).toFixed(0) + 'ms'
          : '0ms'
      },
      apiRateLimiting: {
        status: rateLimiterHealth.status,
        message: rateLimiterHealth.message,
        requestsInLastMinute: rateLimiterStats.requestsInLastMinute,
        requestsInLastHour: rateLimiterStats.requestsInLastHour,
        maxRequestsPerMinute: rateLimiterStats.config.maxRequestsPerMinute,
        maxRequestsPerHour: rateLimiterStats.config.maxRequestsPerHour,
        queueLength: rateLimiterStats.queueLength,
        activeRequests: rateLimiterStats.activeRequests,
        isInCooldown: rateLimiterStats.isInCooldown,
        totalRequests: rateLimiterStats.totalRequests,
        successfulRequests: rateLimiterStats.successfulRequests,
        rateLimitedRequests: rateLimiterStats.rateLimitedRequests
      },
      smartItemSelection: {
        totalSelected: itemSelectorStats.totalSelected,
        capacity: itemSelectorStats.capacity,
        utilizationPercent: itemSelectorStats.utilizationPercent.toFixed(1) + '%',
        tierBreakdown: itemSelectorStats.tierBreakdown,
        lastTrendingUpdate: itemSelectorStats.lastTrendingUpdate,
        efficiency: `Tracking ${itemSelectorStats.totalSelected} high-value items instead of 3000+ total OSRS items`
      },
      persistence: {
        enabled: this.config.enablePersistence,
        type: this.config.persistence?.type || 'memory-only',
        mongoConnected: this.persistence !== null
      },
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  /**
   * Get efficiency metrics showing the benefits of smart selection and rate limiting
   */
  public getEfficiencyMetrics() {
    const itemStats = this.itemSelector.getStats()
    const rateLimiterStats = this.rateLimiter.getStats()
    
    // Calculate efficiency gains
    const totalOSRSItems = 3000 // Approximate total OSRS items
    const itemReduction = ((totalOSRSItems - itemStats.totalSelected) / totalOSRSItems * 100)
    const timeReduction = itemReduction // Assume proportional time savings
    const apiCallReduction = itemReduction // Assume proportional API call reduction
    
    return {
      smartSelection: {
        itemsTracked: itemStats.totalSelected,
        totalOSRSItems: totalOSRSItems,
        reductionPercent: itemReduction.toFixed(1) + '%',
        efficiency: `${itemReduction.toFixed(1)}% fewer items to process`,
        focus: 'High-value profitable items only'
      },
      apiUsage: {
        respectfulUsage: true,
        maxRequestsPerMinute: rateLimiterStats.config.maxRequestsPerMinute,
        currentRequestsPerMinute: rateLimiterStats.requestsInLastMinute,
        utilizationPercent: ((rateLimiterStats.requestsInLastMinute / rateLimiterStats.config.maxRequestsPerMinute) * 100).toFixed(1) + '%',
        totalSavedRequests: `Estimated ${apiCallReduction.toFixed(0)}% reduction in API calls`,
        compliance: rateLimiterStats.rateLimitedRequests === 0 ? 'Perfect' : 'Good'
      },
      performance: {
        estimatedTimeReduction: timeReduction.toFixed(1) + '%',
        focusedDataQuality: 'Higher quality due to focus on profitable items',
        reducedMemoryUsage: `${itemReduction.toFixed(1)}% less memory usage`,
        fasterProcessing: 'Faster filtering and analysis with fewer items'
      }
    }
  }

  private estimateMemoryUsage(): string {
    const dataStr = JSON.stringify(this.collectedData)
    const bytes = new Blob([dataStr]).size
    
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // New helper methods for enhanced debugging and MongoDB integration
  private enhanceItemsWithMapping(items: ItemPrice[], mapping: OSRSItem[]): void {
    const mappingById = new Map(mapping.map(item => [item.id, item]))
    
    for (const item of items) {
      const mapped = mappingById.get(item.id)
      if (mapped) {
        item.name = mapped.name
        item.members = mapped.members
        item.tradeable = mapped.tradeable
        item.stackable = mapped.stackable
        item.noted = mapped.noted
        item.description = mapped.description
        item.highalch = mapped.highalch
        item.lowalch = mapped.lowalch
        item.cost = mapped.cost
      }
    }
    
    this.logDebug('✅ Items enhanced with mapping data', {
      totalItems: items.length,
      mappedItems: items.filter(item => item.name !== `Item_${item.id}`).length
    })
  }

  private calculateDataQuality(items: ItemPrice[]): number {
    if (items.length === 0) return 0
    
    const itemsWithBothPrices = items.filter(item => item.priceData.high && item.priceData.low)
    const itemsWithTimestamps = items.filter(item => item.priceData.highTime && item.priceData.lowTime)
    const itemsWithNames = items.filter(item => item.name && !item.name.startsWith('Item_'))
    
    const bothPricesRatio = itemsWithBothPrices.length / items.length
    const timestampsRatio = itemsWithTimestamps.length / items.length
    const namesRatio = itemsWithNames.length / items.length
    
    // Weighted average of quality metrics
    const qualityScore = (bothPricesRatio * 0.5 + timestampsRatio * 0.3 + namesRatio * 0.2) * 100
    
    return Math.round(qualityScore * 100) / 100
  }

  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed
    }
    
    // Browser fallback - estimate based on data size
    const dataStr = JSON.stringify(this.collectedData)
    return new Blob([dataStr]).size
  }

  private logDebug(message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [DataCollector-Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  private logError(message: string, error: any, context?: any): void {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] [DataCollector-Error] ${message}`)
    if (context) console.error(`[${timestamp}] [DataCollector-Context]`, JSON.stringify(context, null, 2))
    console.error(`[${timestamp}] [DataCollector-Stack]`, error)
  }

  // Enhanced stats method with comprehensive debugging information
  public getStats() {
    const uptime = Date.now() - this.collectionStats.startTime
    const averageResponseTime = this.collectionStats.responseTime.length > 0 
      ? this.collectionStats.responseTime.reduce((a, b) => a + b, 0) / this.collectionStats.responseTime.length 
      : 0

    return {
      isCollecting: this.isCollecting,
      totalCollections: this.collectionStats.totalApiCalls,
      successfulCollections: this.collectionStats.successfulCalls,
      failedCollections: this.collectionStats.failedCalls,
      successRate: this.collectionStats.totalApiCalls > 0 
        ? (this.collectionStats.successfulCalls / this.collectionStats.totalApiCalls * 100).toFixed(1) + '%'
        : '0%',
      totalItemsCollected: this.collectionStats.totalItems,
      averageResponseTimeMs: Math.round(averageResponseTime),
      dataRetained: this.collectedData.length,
      memoryUsage: this.estimateMemoryUsage(),
      uptime: this.formatUptime(uptime),
      lastCollection: this.collectedData.length > 0 
        ? new Date(this.collectedData[this.collectedData.length - 1].timestamp).toISOString()
        : null,
      persistence: {
        enabled: this.config.enablePersistence,
        type: this.config.persistence?.type || 'none',
        connected: this.persistence !== null
      },
      configuration: {
        updateInterval: this.config.updateInterval,
        maxRetries: this.config.maxRetries,
        enableTimeseriesData: this.config.enableTimeseriesData,
        enableMapping: this.config.enableMapping,
        filters: this.config.itemFilters
      }
    }
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  // MongoDB integration methods
  public async getPersistenceHealth(): Promise<any> {
    if (!this.persistence) {
      return { enabled: false, connected: false }
    }
    
    try {
      return await this.persistence.healthCheck()
    } catch (error) {
      this.logError('❌ Failed to check persistence health', error)
      return { enabled: true, connected: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  public async exportPersistentData(): Promise<any> {
    if (!this.persistence) {
      throw new Error('Persistence not enabled')
    }
    
    this.logDebug('📤 Exporting all persistent data...')
    try {
      const exportData = await this.persistence.exportAllData()
      this.logDebug('✅ Data export completed', {
        totalRecords: exportData.marketData.length + exportData.tradeOutcomes.length + 
                     exportData.trainingMetrics.length + exportData.collectionStats.length
      })
      return exportData
    } catch (error) {
      this.logError('❌ Failed to export persistent data', error)
      throw error
    }
  }

  public async getDatabaseSummary(): Promise<any> {
    if (!this.persistence) {
      return { enabled: false, summary: null }
    }
    
    try {
      const summary = await this.persistence.getDataBaseSummary()
      this.logDebug('📊 Database summary retrieved', summary)
      return { enabled: true, summary }
    } catch (error) {
      this.logError('❌ Failed to get database summary', error)
      return { enabled: true, summary: null, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  public async cleanupOldPersistentData(maxAge?: number): Promise<any> {
    if (!this.persistence) {
      throw new Error('Persistence not enabled')
    }
    
    this.logDebug('🧹 Cleaning up old persistent data...', { maxAge })
    try {
      const result = await this.persistence.cleanupOldData(maxAge)
      this.logDebug('✅ Cleanup completed', result)
      return result
    } catch (error) {
      this.logError('❌ Failed to cleanup old data', error)
      throw error
    }
  }
}