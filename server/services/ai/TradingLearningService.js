/**
 * 📚 Trading Learning Service - SOLID Optimized
 *
 * Single Responsibility Principle:
 * - ONLY handles AI model learning and adaptation
 * - Model training, updates, and performance tracking
 * - Learning feedback loop management
 *
 * Extracted from AITradingOrchestratorService to eliminate God Class
 */

const { BaseService } = require('../BaseService');

class TradingLearningService extends BaseService {
  constructor(dependencies = {}) {
    super('TradingLearningService', {
      enableCache: false, // Learning should not be cached
      enableMongoDB: true
    });

    // Dependency injection
    this.aiModel = dependencies.aiModel;
    this.outcomeTracker = dependencies.outcomeTracker;
    this.sessionService = dependencies.sessionService;

    // Learning configuration
    this.learningConfig = {
      enableOnlineLearning: true,
      learningFrequency: 10, // Learn every 10 trades
      performanceThreshold: 0.6,
      explorationBoost: true,
      batchSize: 32,
      maxMemorySize: 10000,
      ...dependencies.learningConfig
    };

    // Learning state
    this.learningMemory = [];
    this.lastLearningUpdate = Date.now();
    this.learningMetrics = {
      totalUpdates: 0,
      averageLoss: 0,
      averageReward: 0,
      lastUpdateTime: null
    };

    this.logger.info('Trading Learning Service initialized', {
      learningConfig: this.learningConfig
    });
  }

  /**
   * Record trade outcome for learning
   */
  recordTradeOutcome(decision, actualOutcome) {
    this.execute(async() => {
      const experience = {
        // State (input features)
        state: decision.features,

        // Action taken
        action: this.encodeAction(decision.action),

        // Reward received
        reward: this.calculateReward(decision, actualOutcome),

        // Next state (after trade)
        nextState: actualOutcome.newMarketState || decision.features,

        // Whether episode is done
        done: actualOutcome.tradeClosed || false,

        // Metadata
        timestamp: new Date(),
        itemId: decision.itemId,
        expectedReturn: decision.expectedReturn,
        actualReturn: actualOutcome.actualReturn,
        confidence: decision.confidence
      };

      // Add to learning memory
      this.learningMemory.push(experience);

      // Trim memory if too large
      if (this.learningMemory.length > this.learningConfig.maxMemorySize) {
        this.learningMemory = this.learningMemory.slice(-this.learningConfig.maxMemorySize);
      }

      this.logger.debug('Recorded trade outcome for learning', {
        itemId: decision.itemId,
        reward: experience.reward,
        memorySize: this.learningMemory.length
      });

      // Trigger learning if conditions met
      if (this.shouldTriggerLearning()) {
        this.triggerLearningUpdate();
      }

      return experience;
    }, 'operation', { logSuccess: false });
  }

  /**
   * Calculate reward for trade outcome
   */
  calculateReward(decision, actualOutcome) {
    let reward = 0;

    // Primary reward: actual profit/loss
    if (actualOutcome.actualProfit !== undefined) {
      // Normalize profit to [-1, 1] range
      const profitNormalized = Math.tanh(actualOutcome.actualProfit / 1000000); // Normalize by 1M
      reward += profitNormalized * 10; // Scale up
    }

    // Accuracy bonus: how close prediction was to reality
    if (actualOutcome.actualReturn !== undefined && decision.expectedReturn !== undefined) {
      const accuracyError = Math.abs(actualOutcome.actualReturn - decision.expectedReturn);
      const accuracyBonus = Math.max(0, 1 - accuracyError) * 2; // Max 2 points for accuracy
      reward += accuracyBonus;
    }

    // Time efficiency bonus: faster trades get slight bonus
    if (actualOutcome.tradeDuration) {
      const timeBonus = Math.max(0, 1 - (actualOutcome.tradeDuration / (24 * 60 * 60 * 1000))) * 0.5; // Max 0.5 for same-day trades
      reward += timeBonus;
    }

    // Risk management: penalty for high-risk trades that failed
    if (actualOutcome.actualProfit < 0 && decision.riskScore > 60) {
      const riskPenalty = (decision.riskScore - 60) / 40 * 2; // Up to 2 point penalty
      reward -= riskPenalty;
    }

    // Confidence calibration: reward well-calibrated confidence
    if (actualOutcome.wasSuccessful !== undefined) {
      const confidenceCalibration = actualOutcome.wasSuccessful ? decision.confidence : (1 - decision.confidence);
      reward += confidenceCalibration * 1; // Max 1 point for calibration
    }

    return Math.max(-10, Math.min(10, reward)); // Clamp between -10 and +10
  }

  /**
   * Encode action to numerical format for AI model
   */
  encodeAction(action) {
    const actionMap = {
      'buy': 0,
      'sell': 1,
      'hold': 2
    };
    return actionMap[action] || 2;
  }

  /**
   * Check if learning update should be triggered
   */
  shouldTriggerLearning() {
    if (!this.learningConfig.enableOnlineLearning) {
      return false;
    }

    // Check if enough experiences accumulated
    if (this.learningMemory.length < this.learningConfig.batchSize) {
      return false;
    }

    // Check if enough trades since last update
    const tradesSinceUpdate = this.learningMemory.length -
      (this.lastLearningMemorySize || 0);

    if (tradesSinceUpdate < this.learningConfig.learningFrequency) {
      return false;
    }

    // Check time since last update (don't update too frequently)
    const timeSinceUpdate = Date.now() - this.lastLearningUpdate;
    if (timeSinceUpdate < TimeConstants.FIVE_MINUTES) { // Minimum 5 minutes between updates
      return false;
    }

    return true;
  }

  /**
   * Trigger learning update
   */
  async triggerLearningUpdate() {
    return this.execute(async() => {
      this.logger.info('Triggering learning update', {
        memorySize: this.learningMemory.length,
        batchSize: this.learningConfig.batchSize
      });

      // Sample batch from memory
      const batch = this.sampleLearningBatch();

      // Update AI model
      const learningResult = await this.updateAIModel(batch);

      // Update learning metrics
      this.updateLearningMetrics(learningResult);

      // Update tracking variables
      this.lastLearningUpdate = Date.now();
      this.lastLearningMemorySize = this.learningMemory.length;

      this.logger.info('Learning update completed', {
        batchSize: batch.length,
        loss: learningResult.loss,
        averageReward: learningResult.averageReward
      });

      return learningResult;
    }, 'triggerLearningUpdate', { logSuccess: true });
  }

  /**
   * Sample batch from learning memory
   */
  sampleLearningBatch() {
    const batchSize = Math.min(this.learningConfig.batchSize, this.learningMemory.length);

    // Use recent experiences with some random sampling
    const recentCount = Math.floor(batchSize * 0.8); // 80% recent
    const randomCount = batchSize - recentCount;

    const batch = [];

    // Add recent experiences
    const recentExperiences = this.learningMemory.slice(-recentCount);
    batch.push(...recentExperiences);

    // Add random experiences from history
    for (let i = 0; i < randomCount; i++) {
      const randomIndex = Math.floor(Math.random() * (this.learningMemory.length - recentCount));
      batch.push(this.learningMemory[randomIndex]);
    }

    return batch;
  }

  /**
   * Update AI model with learning batch
   */
  async updateAIModel() {
    return this.execute(async() => {
      // Prepare training data
      const states = batch.map(exp => exp.state);
      const actions = batch.map(exp => exp.action);
      const rewards = batch.map(exp => exp.reward);
      const nextStates = batch.map(exp => exp.nextState);
      const dones = batch.map(exp => exp.done);

      // Call AI model training
      const result = await this.aiModel.train({
        states,
        actions,
        rewards,
        nextStates,
        dones
      });

      return {
        loss: result.loss || 0,
        averageReward: rewards.reduce((a, b) => a + b, 0) / rewards.length,
        batchSize: batch.length,
        modelVersion: result.version || 'unknown',
        updateTime: new Date()
      };
    }, 'updateAIModel', { logSuccess: true });
  }

  /**
   * Clear learning memory
   */
  clearLearningMemory() {
    const previousSize = this.learningMemory.length;
    this.learningMemory = [];

    this.logger.info(`Cleared learning memory (${previousSize} experiences)`);
    return previousSize;
  }

  /**
   * Export learning data for analysis
   */
  exportLearningData() {
    return {
      experiences: this.learningMemory,
      metrics: this.learningMetrics,
      config: this.learningConfig,
      exportTime: new Date()
    };
  }
}

module.exports = { TradingLearningService };
