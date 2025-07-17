/**
 * 🤖 AI Trading Orchestrator Service - Context7 Optimized
 * 
 * Context7 Pattern: Service Layer for AI Trading Orchestration
 * - Manages AI trading sessions and learning cycles
 * - Orchestrates neural trading agents and outcome tracking
 * - Handles adaptive learning and model updates
 * - DRY principles with reusable trading patterns
 * - SOLID architecture with single responsibility
 */

const { Logger } = require('../utils/Logger');
const { NeuralTradingAgentService } = require('./NeuralTradingAgentService');
const { TradeOutcomeTrackerService } = require('./TradeOutcomeTrackerService');
const { TradingAnalysisService } = require('./TradingAnalysisService');
const { mongoDataPersistence } = require('./mongoDataPersistence');

class AITradingOrchestratorService {
  constructor(networkConfig, adaptiveConfig) {
    this.logger = new Logger('AITradingOrchestrator');
    this.agent = new NeuralTradingAgentService(networkConfig);
    this.outcomeTracker = new TradeOutcomeTrackerService();
    this.tradingAnalysis = new TradingAnalysisService();
    this.persistence = mongoDataPersistence;
    
    this.currentSession = null;
    this.trainingMetrics = [];
    this.adaptiveConfig = adaptiveConfig || {
      enableOnlineLearning: true,
      learningFrequency: 10,
      performanceThreshold: 0.6,
      explorationBoost: true
    };
    this.lastModelUpdate = Date.now();

    this.logger.info('🤖 AI Trading Orchestrator initialized', {
      networkConfig,
      adaptiveConfig: this.adaptiveConfig
    });
  }

  /**
   * Context7 Pattern: Start learning session
   */
  startLearningSession() {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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
    };

    this.logger.info('🚀 Learning session started', {
      sessionId,
      timestamp: new Date().toISOString()
    });

    return sessionId;
  }

  /**
   * Context7 Pattern: Process market data for trading decisions
   */
  async processMarketData(items) {
    try {
      const actions = [];
      const startTime = Date.now();

      this.logger.debug('📊 Processing market data for trading decisions', {
        itemCount: items.length,
        sessionId: this.currentSession?.id
      });

      for (const item of items) {
        const marketState = this.convertToMarketState(item);
        const prediction = this.agent.predict(marketState);
        
        // Only execute trades with high confidence or during training
        if (prediction.confidence > 0.7 || this.isTraining()) {
          actions.push(prediction.action);
          
          // Simulate trade execution for training
          if (this.isTraining()) {
            await this.simulateTradeExecution(marketState, prediction.action);
          }
        }
      }

      const processingTime = Date.now() - startTime;
      this.logger.info('✅ Market data processed successfully', {
        itemCount: items.length,
        actionsGenerated: actions.length,
        processingTime,
        sessionId: this.currentSession?.id
      });

      return actions;
    } catch (error) {
      this.logger.error('❌ Error processing market data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Convert item price to market state
   */
  convertToMarketState(item) {
    const high = item.priceData.high || 0;
    const low = item.priceData.low || 0;
    const spreadPercentage = this.tradingAnalysis.calculateSpreadPercentage(
      item.priceData.high,
      item.priceData.low
    );

    // Create price history for technical indicators
    const mockPrices = [
      low,
      (low + high) / 2,
      high
    ].filter(p => p > 0);

    const indicators = this.tradingAnalysis.calculateTechnicalIndicators(mockPrices);

    return {
      itemId: item.id,
      price: (high + low) / 2,
      volume: 1000, // Mock volume - in production, this would come from actual data
      spread: spreadPercentage,
      volatility: Math.abs(indicators.rsi - 50) / 5,
      rsi: indicators.rsi,
      macd: indicators.macd.line,
      trend: indicators.macd.line > 0 ? 'UP' : indicators.macd.line < 0 ? 'DOWN' : 'FLAT',
      timestamp: Date.now()
    };
  }

  /**
   * Context7 Pattern: Simulate trade execution for training
   */
  async simulateTradeExecution(marketState, action) {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Start tracking the trade
      this.outcomeTracker.startTrade(tradeId, action, marketState);

      // Simulate market movement and trade completion
      setTimeout(async () => {
        try {
          const success = this.simulateTradeSuccess(marketState, action);
          const finalPrice = this.simulatePriceMovement(marketState, action);
          const newMarketState = { ...marketState, price: finalPrice, timestamp: Date.now() };
          
          const tradeOutcome = this.outcomeTracker.completeTrade(
            tradeId, 
            finalPrice, 
            newMarketState, 
            success
          );
          
          if (tradeOutcome && this.isTraining()) {
            await this.processTradeOutcome(marketState, action, newMarketState, success, tradeOutcome);
          }
        } catch (error) {
          this.logger.error('❌ Error in trade simulation completion', error, { tradeId });
        }
      }, Math.random() * 30000 + 5000); // 5-35 seconds simulation
    } catch (error) {
      this.logger.error('❌ Error starting trade simulation', error, { tradeId });
    }
  }

  /**
   * Context7 Pattern: Process trade outcome for learning
   */
  async processTradeOutcome(marketState, action, newMarketState, success, tradeOutcome) {
    try {
      // Calculate reward and store experience
      const reward = this.agent.calculateReward(
        marketState,
        action,
        newMarketState,
        success,
        tradeOutcome.profit
      );

      this.agent.memorizeExperience({
        state: marketState,
        action,
        reward: reward.totalReward,
        nextState: newMarketState,
        done: true
      });

      // Train the agent
      const loss = this.agent.trainOnBatch();
      await this.updateTrainingMetrics(tradeOutcome, reward.totalReward, loss);

      // Check for adaptive learning
      this.checkAdaptiveLearning();

      // Persist trade outcome to database
      if (this.persistence && this.currentSession) {
        await this.persistence.saveTradeOutcome(tradeOutcome, this.currentSession.id);
      }
    } catch (error) {
      this.logger.error('❌ Error processing trade outcome', error);
    }
  }

  /**
   * Context7 Pattern: Simulate trade success probability
   */
  simulateTradeSuccess(marketState, action) {
    let successProbability = 0.6; // Base success rate

    // Adjust based on market conditions
    if (action.type === 'BUY' && marketState.trend === 'UP') successProbability += 0.2;
    if (action.type === 'SELL' && marketState.trend === 'DOWN') successProbability += 0.2;
    if (action.type === 'HOLD') successProbability = 0.8;

    // Adjust based on technical indicators
    if (marketState.rsi < 30 && action.type === 'BUY') successProbability += 0.15;
    if (marketState.rsi > 70 && action.type === 'SELL') successProbability += 0.15;

    // Adjust based on spread
    if (marketState.spread > 5) successProbability += 0.1;

    return Math.random() < Math.min(0.95, successProbability);
  }

  /**
   * Context7 Pattern: Simulate price movement
   */
  simulatePriceMovement(marketState, action) {
    const basePrice = marketState.price;
    const volatilityFactor = marketState.volatility / 100;
    
    // Random price movement with trend bias
    let movement = (Math.random() - 0.5) * volatilityFactor * basePrice;
    
    // Apply trend bias
    if (marketState.trend === 'UP') movement += basePrice * 0.01;
    if (marketState.trend === 'DOWN') movement -= basePrice * 0.01;

    // Add some action-based movement (market impact)
    if (action.type === 'BUY') movement += basePrice * 0.005;
    if (action.type === 'SELL') movement -= basePrice * 0.005;

    return Math.max(1, Math.round(basePrice + movement));
  }

  /**
   * Context7 Pattern: Update training metrics
   */
  async updateTrainingMetrics(tradeOutcome, reward, loss) {
    try {
      const stats = this.agent.getModelStats();
      const performance = this.outcomeTracker.calculatePerformanceMetrics();

      const metrics = {
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
      };

      this.trainingMetrics.push(metrics);

      // Update current session
      if (this.currentSession) {
        this.currentSession.episodeCount++;
        this.currentSession.totalTrades = performance.totalTrades;
        this.currentSession.totalProfit = performance.totalProfit;
        this.currentSession.bestReward = Math.max(this.currentSession.bestReward, reward);
        this.currentSession.finalEpsilon = stats.epsilon;
      }

      // Keep only last 1000 metrics to manage memory
      if (this.trainingMetrics.length > 1000) {
        this.trainingMetrics = this.trainingMetrics.slice(-1000);
      }

      // Persist training metrics to database
      if (this.persistence && this.currentSession) {
        await this.persistence.saveTrainingMetrics(metrics, this.currentSession.id);
      }
    } catch (error) {
      this.logger.error('❌ Error updating training metrics', error);
    }
  }

  /**
   * Context7 Pattern: Check for adaptive learning
   */
  checkAdaptiveLearning() {
    if (!this.adaptiveConfig.enableOnlineLearning) return;

    const timeSinceUpdate = Date.now() - this.lastModelUpdate;
    const tradesCount = this.outcomeTracker.getOutcomesCount();

    // Check if it's time for adaptive learning
    if (
      tradesCount > 0 && 
      tradesCount % this.adaptiveConfig.learningFrequency === 0 &&
      timeSinceUpdate > 60000 // At least 1 minute between updates
    ) {
      this.performAdaptiveLearning();
    }
  }

  /**
   * Context7 Pattern: Perform adaptive learning
   */
  performAdaptiveLearning() {
    const performance = this.outcomeTracker.calculatePerformanceMetrics(24 * 60 * 60 * 1000); // Last 24 hours
    
    this.logger.info('🧠 Performing adaptive learning', {
      performance: {
        successRate: performance.successRate.toFixed(1) + '%',
        averageProfit: performance.averageProfit.toFixed(0) + ' GP'
      }
    });

    // Adjust exploration if performance is below threshold
    if (performance.successRate < this.adaptiveConfig.performanceThreshold) {
      const currentStats = this.agent.getModelStats();
      if (currentStats.epsilon < 0.3) {
        this.logger.info('📈 Performance below threshold, increasing exploration');
        // In a real implementation, you'd adjust the agent's epsilon
      }
    }

    // Retrain with recent data if exploration boost is enabled
    if (this.adaptiveConfig.explorationBoost && performance.successRate > 80) {
      this.logger.info('🎯 High performance detected, focusing on exploitation');
      // In a real implementation, you'd reduce epsilon and retrain
    }

    this.lastModelUpdate = Date.now();
  }

  /**
   * Context7 Pattern: Get training progress
   */
  getTrainingProgress() {
    return {
      session: this.currentSession,
      recentMetrics: this.trainingMetrics.slice(-50), // Last 50 metrics
      performance: this.outcomeTracker.calculatePerformanceMetrics(),
      modelStats: this.agent.getModelStats()
    };
  }

  /**
   * Context7 Pattern: Finish learning session
   */
  async finishLearningSession() {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.currentSession.status = 'COMPLETED';
      
      this.logger.info('🏁 Learning session finished', {
        sessionId: this.currentSession.id,
        duration: this.currentSession.endTime - this.currentSession.startTime,
        totalTrades: this.currentSession.totalTrades,
        totalProfit: this.currentSession.totalProfit
      });

      // Persist final session state
      if (this.persistence) {
        try {
          await this.persistence.saveLearningSession(this.currentSession);
        } catch (error) {
          this.logger.error('❌ Error saving learning session', error);
        }
      }
    }
  }

  /**
   * Context7 Pattern: Pause learning session
   */
  pauseLearningSession() {
    if (this.currentSession) {
      this.currentSession.status = 'PAUSED';
      this.logger.info('⏸️ Learning session paused', {
        sessionId: this.currentSession.id
      });
    }
  }

  /**
   * Context7 Pattern: Resume learning session
   */
  resumeLearningSession() {
    if (this.currentSession) {
      this.currentSession.status = 'TRAINING';
      this.logger.info('▶️ Learning session resumed', {
        sessionId: this.currentSession.id
      });
    }
  }

  /**
   * Context7 Pattern: Save model
   */
  saveModel() {
    try {
      const modelData = this.agent.saveModel();
      this.logger.info('💾 Model saved successfully');
      return modelData;
    } catch (error) {
      this.logger.error('❌ Error saving model', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Load model
   */
  loadModel(modelData) {
    try {
      this.agent.loadModel(modelData);
      this.logger.info('📁 Model loaded successfully');
    } catch (error) {
      this.logger.error('❌ Error loading model', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Export training data
   */
  exportTrainingData() {
    try {
      return {
        outcomes: this.outcomeTracker.getAllOutcomes(),
        metrics: this.trainingMetrics,
        model: this.saveModel(),
        session: this.currentSession
      };
    } catch (error) {
      this.logger.error('❌ Error exporting training data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get performance analytics
   */
  getPerformanceAnalytics() {
    return {
      overall: this.outcomeTracker.calculatePerformanceMetrics(),
      byMarketCondition: this.outcomeTracker.getTradeAnalyticsByMarketCondition(),
      recentTrends: this.trainingMetrics.slice(-100),
      modelEvolution: {
        startEpsilon: 1.0,
        currentEpsilon: this.agent.getModelStats().epsilon,
        totalSteps: this.agent.getModelStats().totalSteps
      }
    };
  }

  /**
   * Context7 Pattern: Check if training
   */
  isTraining() {
    return this.currentSession?.status === 'TRAINING';
  }

  /**
   * Context7 Pattern: Set adaptive config
   */
  setAdaptiveConfig(config) {
    this.adaptiveConfig = { ...this.adaptiveConfig, ...config };
    this.logger.info('⚙️ Adaptive config updated', { config });
  }

  /**
   * Context7 Pattern: Get adaptive config
   */
  getAdaptiveConfig() {
    return { ...this.adaptiveConfig };
  }

  /**
   * Context7 Pattern: Get current session
   */
  getCurrentSession() {
    return this.currentSession;
  }

  /**
   * Context7 Pattern: Get system status
   */
  getSystemStatus() {
    return {
      orchestrator: {
        isActive: this.currentSession !== null,
        currentSession: this.currentSession,
        adaptiveConfig: this.adaptiveConfig,
        lastModelUpdate: this.lastModelUpdate
      },
      agent: this.agent.getModelStats(),
      outcomeTracker: this.outcomeTracker.getStats(),
      trainingMetrics: {
        count: this.trainingMetrics.length,
        latest: this.trainingMetrics[this.trainingMetrics.length - 1]
      }
    };
  }
}

module.exports = { AITradingOrchestratorService };