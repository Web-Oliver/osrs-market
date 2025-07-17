import type { 
  MarketState, 
  TradingAction, 
  TrainingMetrics, 
  LearningSession,
  AdaptiveLearningConfig,
  NeuralNetworkConfig
} from '../types/aiTrading'
import type { ItemPrice } from '../types'
import { NeuralTradingAgent } from './neuralTradingAgent'
import { TradeOutcomeTracker } from './tradeOutcomeTracker'
import { TradingAnalysisService } from './tradingAnalysis'

export class AITradingOrchestrator {
  private agent: NeuralTradingAgent
  private outcomeTracker: TradeOutcomeTracker
  private currentSession: LearningSession | null = null
  private trainingMetrics: TrainingMetrics[] = []
  private adaptiveConfig: AdaptiveLearningConfig
  private lastModelUpdate: number = Date.now()

  constructor(
    networkConfig: NeuralNetworkConfig,
    adaptiveConfig: AdaptiveLearningConfig
  ) {
    this.agent = new NeuralTradingAgent(networkConfig)
    this.outcomeTracker = new TradeOutcomeTracker()
    this.adaptiveConfig = adaptiveConfig
  }

  public startLearningSession(): string {
    const sessionId = `session_${Date.now()}`
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      episodeCount: 0,
      totalTrades: 0,
      totalProfit: 0,
      bestReward: -Infinity,
      finalEpsilon: this.agent.getModelStats().epsilon,
      modelVersion: '1.0',
      status: 'TRAINING'
    }

    console.log(`Started learning session: ${sessionId}`)
    return sessionId
  }

  public async processMarketData(items: ItemPrice[]): Promise<TradingAction[]> {
    const actions: TradingAction[] = []

    for (const item of items) {
      const marketState = this.convertToMarketState(item)
      const prediction = this.agent.predict(marketState)
      
      // Only execute trades with high confidence or during training
      if (prediction.confidence > 0.7 || this.isTraining()) {
        actions.push(prediction.action)
        
        // Simulate trade execution for training
        if (this.isTraining()) {
          await this.simulateTradeExecution(marketState, prediction.action)
        }
      }
    }

    return actions
  }

  private convertToMarketState(item: ItemPrice): MarketState {
    const high = item.priceData.high || 0
    const low = item.priceData.low || 0
    const spreadPercentage = TradingAnalysisService.calculateSpreadPercentage(
      item.priceData.high,
      item.priceData.low
    )

    // Mock technical indicators (in real implementation, calculate from historical data)
    const mockPrices = [
      low,
      (low + high) / 2,
      high
    ].filter(p => p > 0)

    const indicators = TradingAnalysisService.calculateTechnicalIndicators(mockPrices)

    return {
      itemId: item.id,
      price: (high + low) / 2,
      volume: 1000, // Mock volume
      spread: spreadPercentage,
      volatility: Math.abs(indicators.rsi - 50) / 5, // Derive volatility from RSI
      rsi: indicators.rsi,
      macd: indicators.macd.line,
      trend: indicators.macd.line > 0 ? 'UP' : indicators.macd.line < 0 ? 'DOWN' : 'FLAT',
      timestamp: Date.now()
    }
  }

  private async simulateTradeExecution(
    marketState: MarketState,
    action: TradingAction
  ): Promise<void> {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Start tracking the trade
    this.outcomeTracker.startTrade(tradeId, action, marketState)

    // Simulate market movement and trade completion
    setTimeout(() => {
      const success = this.simulateTradeSuccess(marketState, action)
      const finalPrice = this.simulatePriceMovement(marketState, action)
      const newMarketState = { ...marketState, price: finalPrice, timestamp: Date.now() }
      
      const tradeOutcome = this.outcomeTracker.completeTrade(tradeId, finalPrice, newMarketState, success)
      
      if (tradeOutcome && this.isTraining()) {
        // Calculate reward and store experience
        const reward = this.agent.calculateReward(
          marketState,
          action,
          newMarketState,
          success,
          tradeOutcome.profit
        )

        this.agent.memorizeExperience({
          state: marketState,
          action,
          reward: reward.totalReward,
          nextState: newMarketState,
          done: true
        })

        // Train the agent
        const loss = this.agent.trainOnBatch()
        this.updateTrainingMetrics(tradeOutcome, reward.totalReward, loss)

        // Check for adaptive learning
        this.checkAdaptiveLearning()
      }
    }, Math.random() * 30000 + 5000) // 5-35 seconds simulation
  }

  private simulateTradeSuccess(marketState: MarketState, action: TradingAction): boolean {
    let successProbability = 0.6 // Base success rate

    // Adjust based on market conditions
    if (action.type === 'BUY' && marketState.trend === 'UP') successProbability += 0.2
    if (action.type === 'SELL' && marketState.trend === 'DOWN') successProbability += 0.2
    if (action.type === 'HOLD') successProbability = 0.8

    // Adjust based on technical indicators
    if (marketState.rsi < 30 && action.type === 'BUY') successProbability += 0.15
    if (marketState.rsi > 70 && action.type === 'SELL') successProbability += 0.15

    // Adjust based on spread
    if (marketState.spread > 5) successProbability += 0.1

    return Math.random() < Math.min(0.95, successProbability)
  }

  private simulatePriceMovement(marketState: MarketState, action: TradingAction): number {
    const basePrice = marketState.price
    const volatilityFactor = marketState.volatility / 100
    
    // Random price movement with trend bias
    let movement = (Math.random() - 0.5) * volatilityFactor * basePrice
    
    // Apply trend bias
    if (marketState.trend === 'UP') movement += basePrice * 0.01
    if (marketState.trend === 'DOWN') movement -= basePrice * 0.01

    // Add some action-based movement (market impact)
    if (action.type === 'BUY') movement += basePrice * 0.005
    if (action.type === 'SELL') movement -= basePrice * 0.005

    return Math.max(1, Math.round(basePrice + movement))
  }

  private updateTrainingMetrics(_tradeOutcome: any, reward: number, loss: number): void {
    const stats = this.agent.getModelStats()
    const performance = this.outcomeTracker.calculatePerformanceMetrics()

    const metrics: TrainingMetrics = {
      episode: this.currentSession?.episodeCount || 0,
      totalReward: reward,
      averageReward: performance.averageProfit,
      epsilon: stats.epsilon,
      loss,
      tradesExecuted: performance.totalTrades,
      successRate: performance.successRate,
      profitability: performance.totalProfit,
      portfolioValue: 1000000 + performance.totalProfit, // Starting with 1M GP
      drawdown: performance.maxDrawdown
    }

    this.trainingMetrics.push(metrics)

    // Update current session
    if (this.currentSession) {
      this.currentSession.episodeCount++
      this.currentSession.totalTrades = performance.totalTrades
      this.currentSession.totalProfit = performance.totalProfit
      this.currentSession.bestReward = Math.max(this.currentSession.bestReward, reward)
      this.currentSession.finalEpsilon = stats.epsilon
    }

    // Keep only last 1000 metrics to manage memory
    if (this.trainingMetrics.length > 1000) {
      this.trainingMetrics = this.trainingMetrics.slice(-1000)
    }
  }

  private checkAdaptiveLearning(): void {
    if (!this.adaptiveConfig.enableOnlineLearning) return

    const timeSinceUpdate = Date.now() - this.lastModelUpdate
    const tradesCount = this.outcomeTracker.getOutcomesCount()

    // Check if it's time for adaptive learning
    if (
      tradesCount > 0 && 
      tradesCount % this.adaptiveConfig.learningFrequency === 0 &&
      timeSinceUpdate > 60000 // At least 1 minute between updates
    ) {
      this.performAdaptiveLearning()
    }
  }

  private performAdaptiveLearning(): void {
    const performance = this.outcomeTracker.calculatePerformanceMetrics(24 * 60 * 60 * 1000) // Last 24 hours
    
    console.log('Performing adaptive learning...')
    console.log(`Recent performance: ${performance.successRate.toFixed(1)}% success rate, ${performance.averageProfit.toFixed(0)} GP avg profit`)

    // Adjust exploration if performance is below threshold
    if (performance.successRate < this.adaptiveConfig.performanceThreshold) {
      // Increase exploration
      const currentStats = this.agent.getModelStats()
      if (currentStats.epsilon < 0.3) {
        console.log('Performance below threshold, increasing exploration')
        // In a real implementation, you'd adjust the agent's epsilon
      }
    }

    // Retrain with recent data if exploration boost is enabled
    if (this.adaptiveConfig.explorationBoost && performance.successRate > 80) {
      console.log('High performance detected, focusing on exploitation')
      // In a real implementation, you'd reduce epsilon and retrain
    }

    this.lastModelUpdate = Date.now()
  }

  public getTrainingProgress(): {
    session: LearningSession | null
    recentMetrics: TrainingMetrics[]
    performance: any
    modelStats: any
  } {
    return {
      session: this.currentSession,
      recentMetrics: this.trainingMetrics.slice(-50), // Last 50 metrics
      performance: this.outcomeTracker.calculatePerformanceMetrics(),
      modelStats: this.agent.getModelStats()
    }
  }

  public finishLearningSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now()
      this.currentSession.status = 'COMPLETED'
      console.log(`Finished learning session: ${this.currentSession.id}`)
    }
  }

  public pauseLearningSession(): void {
    if (this.currentSession) {
      this.currentSession.status = 'PAUSED'
      console.log(`Paused learning session: ${this.currentSession.id}`)
    }
  }

  public resumeLearningSession(): void {
    if (this.currentSession) {
      this.currentSession.status = 'TRAINING'
      console.log(`Resumed learning session: ${this.currentSession.id}`)
    }
  }

  public saveModel(): string {
    return this.agent.saveModel()
  }

  public loadModel(modelData: string): void {
    this.agent.loadModel(modelData)
  }

  public exportTrainingData(): {
    outcomes: any[]
    metrics: TrainingMetrics[]
    model: string
  } {
    return {
      outcomes: this.outcomeTracker.getAllOutcomes(),
      metrics: this.trainingMetrics,
      model: this.saveModel()
    }
  }

  public getPerformanceAnalytics() {
    return {
      overall: this.outcomeTracker.calculatePerformanceMetrics(),
      byMarketCondition: this.outcomeTracker.getTradeAnalyticsByMarketCondition(),
      recentTrends: this.trainingMetrics.slice(-100),
      modelEvolution: {
        startEpsilon: 1.0,
        currentEpsilon: this.agent.getModelStats().epsilon,
        totalSteps: this.agent.getModelStats().totalSteps
      }
    }
  }

  private isTraining(): boolean {
    return this.currentSession?.status === 'TRAINING'
  }

  public setAdaptiveConfig(config: Partial<AdaptiveLearningConfig>): void {
    this.adaptiveConfig = { ...this.adaptiveConfig, ...config }
  }

  public getAdaptiveConfig(): AdaptiveLearningConfig {
    return { ...this.adaptiveConfig }
  }
}