import type { ItemPrice } from '../types'
import type { NeuralNetworkConfig, AdaptiveLearningConfig } from '../types/aiTrading'
import { OSRSDataCollector, type CollectionConfig } from './dataCollector'
import { AITradingOrchestrator } from './aiTradingOrchestrator'

export interface AutoTrainingConfig {
  dataCollection: CollectionConfig
  neuralNetwork: NeuralNetworkConfig
  adaptiveLearning: AdaptiveLearningConfig
  training: {
    enableAutoTraining: boolean
    trainingInterval: number // milliseconds
    minDataPoints: number
    batchProcessingSize: number
    continuousLearning: boolean
  }
  itemSelection: {
    enableSmartFiltering: boolean
    volumeThreshold: number
    priceRangeMin: number
    priceRangeMax: number
    spreadThreshold: number
    maxItemsToTrade: number
  }
}

export class AutoTrainingService {
  private dataCollector: OSRSDataCollector
  private aiOrchestrator: AITradingOrchestrator
  private config: AutoTrainingConfig
  private isRunning: boolean = false
  private trainingIntervalId: NodeJS.Timeout | null = null
  private sessionId: string | null = null

  constructor(config: AutoTrainingConfig) {
    this.config = config
    this.dataCollector = new OSRSDataCollector(config.dataCollection)
    this.aiOrchestrator = new AITradingOrchestrator(
      config.neuralNetwork,
      config.adaptiveLearning
    )
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Auto training service already running')
      return
    }

    console.log('Starting automated AI training service...')
    this.isRunning = true

    // Start data collection
    await this.dataCollector.startCollection()

    // Start AI training session
    this.sessionId = this.aiOrchestrator.startLearningSession()

    // Set up automated training loop
    if (this.config.training.enableAutoTraining) {
      this.trainingIntervalId = setInterval(async () => {
        try {
          await this.performTrainingCycle()
        } catch (error) {
          console.error('Error in training cycle:', error)
        }
      }, this.config.training.trainingInterval)
    }

    console.log('Auto training service started successfully')
  }

  public stop(): void {
    if (!this.isRunning) return

    console.log('Stopping auto training service...')

    // Stop data collection
    this.dataCollector.stopCollection()

    // Stop training loop
    if (this.trainingIntervalId) {
      clearInterval(this.trainingIntervalId)
      this.trainingIntervalId = null
    }

    // Finish training session
    if (this.sessionId) {
      this.aiOrchestrator.finishLearningSession()
      this.sessionId = null
    }

    this.isRunning = false
    console.log('Auto training service stopped')
  }

  private async performTrainingCycle(): Promise<void> {
    console.log('Performing automated training cycle...')

    const latestData = this.dataCollector.getLatestData()
    if (!latestData) {
      console.log('No data available for training')
      return
    }

    // Check if we have enough data points
    if (latestData.items.length < this.config.training.minDataPoints) {
      console.log(`Insufficient data points: ${latestData.items.length}/${this.config.training.minDataPoints}`)
      return
    }

    // Filter and select relevant items for training
    const selectedItems = this.selectTrainingItems(latestData.items)
    
    if (selectedItems.length === 0) {
      console.log('No suitable items found for training')
      return
    }

    console.log(`Processing ${selectedItems.length} items for AI training`)

    // Process items in batches to avoid overwhelming the system
    const batchSize = this.config.training.batchProcessingSize
    for (let i = 0; i < selectedItems.length; i += batchSize) {
      const batch = selectedItems.slice(i, i + batchSize)
      
      try {
        await this.aiOrchestrator.processMarketData(batch)
        
        // Small delay between batches to prevent API rate limiting
        await this.delay(1000)
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error)
      }
    }

    // Generate training report
    this.generateTrainingReport()
  }

  private selectTrainingItems(items: ItemPrice[]): ItemPrice[] {
    if (!this.config.itemSelection.enableSmartFiltering) {
      return items.slice(0, this.config.itemSelection.maxItemsToTrade)
    }

    const filtered = items.filter(item => {
      // Price range filter
      const avgPrice = ((item.priceData.high || 0) + (item.priceData.low || 0)) / 2
      if (avgPrice < this.config.itemSelection.priceRangeMin) return false
      if (avgPrice > this.config.itemSelection.priceRangeMax) return false

      // Spread threshold filter
      const high = item.priceData.high || 0
      const low = item.priceData.low || 0
      if (high === 0 || low === 0) return false
      
      const spreadPercentage = ((high - low) / low) * 100
      if (spreadPercentage < this.config.itemSelection.spreadThreshold) return false

      // Must be tradeable on Grand Exchange
      if (!item.grandExchange) return false

      return true
    })

    // Sort by trading potential (spread percentage desc)
    const sorted = filtered.sort((a, b) => {
      const spreadA = this.calculateSpread(a)
      const spreadB = this.calculateSpread(b)
      return spreadB - spreadA
    })

    return sorted.slice(0, this.config.itemSelection.maxItemsToTrade)
  }

  private calculateSpread(item: ItemPrice): number {
    const high = item.priceData.high || 0
    const low = item.priceData.low || 0
    if (low === 0) return 0
    return ((high - low) / low) * 100
  }

  private generateTrainingReport(): void {
    const progress = this.aiOrchestrator.getTrainingProgress()
    const analytics = this.aiOrchestrator.getPerformanceAnalytics()
    const collectorStats = this.dataCollector.getStats()

    console.log('=== Training Cycle Report ===')
    console.log(`Data Collection: ${collectorStats.totalCollections} collections, ${collectorStats.lastCollection}`)
    
    if (progress?.session) {
      console.log(`Training Session: ${progress.session.id}`)
      console.log(`Episodes: ${progress.session.episodeCount}`)
      console.log(`Total Trades: ${progress.session.totalTrades}`)
      console.log(`Total Profit: ${progress.session.totalProfit.toFixed(2)} GP`)
    }

    if (analytics?.overall) {
      console.log(`Success Rate: ${analytics.overall.successRate.toFixed(1)}%`)
      console.log(`Average Profit: ${analytics.overall.averageProfit.toFixed(2)} GP`)
      console.log(`Profit Factor: ${analytics.overall.profitFactor.toFixed(2)}`)
    }

    console.log('===========================')
  }

  public getStatus() {
    const dataCollectorStats = this.dataCollector.getStats()
    const trainingProgress = this.aiOrchestrator.getTrainingProgress()
    const analytics = this.aiOrchestrator.getPerformanceAnalytics()

    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      dataCollection: {
        status: dataCollectorStats.isCollecting ? 'ACTIVE' : 'STOPPED',
        totalCollections: dataCollectorStats.totalCollections,
        lastCollection: dataCollectorStats.lastCollection,
        memoryUsage: dataCollectorStats.memoryUsage
      },
      training: {
        session: trainingProgress?.session,
        metrics: trainingProgress?.recentMetrics?.slice(-10) || [],
        performance: trainingProgress?.performance,
        modelStats: trainingProgress?.modelStats
      },
      analytics: analytics
    }
  }

  public async exportFullReport(): Promise<string> {
    const status = this.getStatus()
    const marketMetrics = this.dataCollector.getMarketMetrics()
    const trainingData = this.aiOrchestrator.exportTrainingData()

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      status,
      marketMetrics,
      trainingData: {
        totalOutcomes: trainingData.outcomes.length,
        totalMetrics: trainingData.metrics.length,
        model: 'EXPORTED_SEPARATELY' // Too large for report
      },
      systemHealth: {
        dataQuality: this.assessDataQuality(),
        trainingEfficiency: this.assessTrainingEfficiency(),
        recommendations: this.generateRecommendations()
      }
    }

    return JSON.stringify(report, null, 2)
  }

  private assessDataQuality(): string {
    const latestData = this.dataCollector.getLatestData()
    if (!latestData) return 'NO_DATA'

    const validItems = latestData.items.filter(item => 
      item.priceData.high && item.priceData.low
    ).length

    const dataQualityRatio = validItems / latestData.items.length
    
    if (dataQualityRatio > 0.9) return 'EXCELLENT'
    if (dataQualityRatio > 0.7) return 'GOOD'
    if (dataQualityRatio > 0.5) return 'FAIR'
    return 'POOR'
  }

  private assessTrainingEfficiency(): string {
    const analytics = this.aiOrchestrator.getPerformanceAnalytics()
    if (!analytics?.overall) return 'NO_DATA'

    const successRate = analytics.overall.successRate
    const profitFactor = analytics.overall.profitFactor

    if (successRate > 80 && profitFactor > 2) return 'EXCELLENT'
    if (successRate > 60 && profitFactor > 1.5) return 'GOOD'
    if (successRate > 40 && profitFactor > 1) return 'FAIR'
    return 'POOR'
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const analytics = this.aiOrchestrator.getPerformanceAnalytics()

    if (analytics?.overall) {
      if (analytics.overall.successRate < 50) {
        recommendations.push('Consider increasing exploration rate (epsilon)')
        recommendations.push('Review item selection criteria')
      }

      if (analytics.overall.profitFactor < 1) {
        recommendations.push('Adjust risk management parameters')
        recommendations.push('Focus on higher spread items')
      }

      if (analytics.overall.averageProfit < 1000) {
        recommendations.push('Consider increasing minimum price thresholds')
        recommendations.push('Target higher value items')
      }
    }

    const dataQuality = this.assessDataQuality()
    if (dataQuality === 'POOR' || dataQuality === 'FAIR') {
      recommendations.push('Improve data collection filters')
      recommendations.push('Increase data collection frequency')
    }

    return recommendations
  }

  public updateConfig(newConfig: Partial<AutoTrainingConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update data collector config
    if (newConfig.dataCollection) {
      this.dataCollector.updateConfig(newConfig.dataCollection)
    }

    // Update AI orchestrator config
    if (newConfig.adaptiveLearning) {
      this.aiOrchestrator.setAdaptiveConfig(newConfig.adaptiveLearning)
    }

    console.log('Auto training configuration updated')
  }

  public getConfig(): AutoTrainingConfig {
    return { ...this.config }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public async manualTriggerTraining(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Auto training service is not running')
    }

    console.log('Manually triggering training cycle...')
    await this.performTrainingCycle()
  }

  public saveModel(): string | null {
    return this.aiOrchestrator.saveModel()
  }

  public loadModel(modelData: string): void {
    this.aiOrchestrator.loadModel(modelData)
  }

  public getHistoricalData(itemId?: number, timeRange?: number) {
    return this.dataCollector.getHistoricalData(itemId, timeRange)
  }

  public getItemTimeseries(itemId: number) {
    return this.dataCollector.getItemTimeseries(itemId)
  }
}