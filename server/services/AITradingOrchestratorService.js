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

const { BaseService } = require('./BaseService');
const { PythonRLClientService } = require('./PythonRLClientService');
const { NeuralTradingAgentService } = require('./NeuralTradingAgentService');
const { TradeOutcomeTrackerService } = require('./TradeOutcomeTrackerService');
const { TradingAnalysisService } = require('./TradingAnalysisService');
const { AIModelMetadata } = require('../models/AIModelMetadata');

// DOMAIN INTEGRATION FOR TRADING
const { ItemRepository } = require('../repositories/ItemRepository');
const { ItemSpecifications } = require('../domain/specifications/ItemSpecifications');
const { ItemDomainService } = require('../domain/services/ItemDomainService');

class AITradingOrchestratorService extends BaseService {
  constructor(networkConfig, adaptiveConfig) {
    super('AITradingOrchestrator', {
      enableCache: true,
      cachePrefix: 'ai_trading',
      cacheTTL: 180, // 3 minutes for AI decisions
      enableMongoDB: true
    });

    // REFACTORED: Use PythonRLClientService for AI operations
    this.pythonRLClient = new PythonRLClientService(networkConfig);

    // Keep legacy agent for fallback compatibility
    this.agent = new NeuralTradingAgentService(networkConfig);
    this.outcomeTracker = new TradeOutcomeTrackerService();
    this.tradingAnalysis = new TradingAnalysisService();

    // ENHANCED: Domain services for trading intelligence
    this.itemRepository = new ItemRepository();
    this.domainService = new ItemDomainService();

    this.currentSession = null;
    this.trainingMetrics = [];
    this.adaptiveConfig = adaptiveConfig || {
      enableOnlineLearning: true,
      learningFrequency: 10,
      performanceThreshold: 0.6,
      explorationBoost: true,
      // ENHANCED: Trading-specific config
      minProfitMargin: 0.05, // 5% minimum profit
      maxItemValue: 2000000000, // 2B max per item (OSRS max cash stack)
      focusOnHighVolume: true
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
        try {
          // Add individual item debugging
          this.logger.debug('🔍 Processing individual item', {
            itemId: item.id,
            itemName: item.name,
            hasPriceData: !!item.priceData,
            hasPriceHistory: !!item.priceHistory,
            priceHistoryLength: item.priceHistory?.length || 0
          });

          const marketState = this.convertToMarketState(item);
          const prediction = await this.predictWithPythonRL(marketState);

          // CRITICAL: Save AI decision to MongoDB for tracking and learning
          if (this.mongoService && this.currentSession) {
            const decision = {
              sessionId: this.currentSession.id,
              itemId: item.id || item.itemId,
              action: prediction.action,
              confidence: prediction.confidence,
              marketState: marketState,
              reasoning: prediction.reasoning || 'Neural network prediction',
              timestamp: Date.now()
            };

            try {
              const decisionId = await this.mongoService.saveAIDecision(decision);
              prediction.decisionId = decisionId; // Track for outcome updates

              this.logger.debug('💾 AI decision saved to database', {
                decisionId,
                itemId: decision.itemId,
                action: decision.action,
                confidence: decision.confidence
              });
            } catch (error) {
              this.logger.error('❌ Failed to save AI decision', error);
            }
          }

          // Only execute trades with high confidence or during training
          if (prediction.confidence > 0.7 || this.isTraining()) {
            actions.push(prediction);

            // Simulate trade execution for training
            if (this.isTraining()) {
              await this.simulateTradeExecution(marketState, prediction);
            }
          }

          this.logger.debug('✅ Successfully processed item', {
            itemId: item.id,
            actionType: prediction.action?.type,
            confidence: prediction.confidence
          });

        } catch (itemError) {
          // Log the error but continue processing other items
          this.logger.error('❌ Failed to process individual item - skipping', itemError, {
            itemId: item.id,
            itemName: item.name,
            errorMessage: itemError.message,
            hasPriceData: !!item.priceData,
            hasPriceHistory: !!item.priceHistory,
            priceHistoryLength: item.priceHistory?.length || 0
          });

          // Continue to next item instead of failing entire operation
          continue;
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
   * Context7 Pattern: Predict using Python RL service with fallback
   */
  async predictWithPythonRL(marketState) {
    try {
      // Try Python RL service first
      const features = this.encodeStateForPython(marketState);
      const pythonPrediction = await this.pythonRLClient.predict(features);

      // Convert Python prediction to expected format
      const prediction = {
        action: this.convertPythonAction(pythonPrediction.action, marketState, pythonPrediction),
        confidence: pythonPrediction.confidence,
        expectedReturn: pythonPrediction.expectedReturn,
        qValues: pythonPrediction.qValues,
        modelVersion: pythonPrediction.modelVersion,
        source: 'python_rl'
      };

      this.logger.debug('🐍 Python RL prediction received', {
        itemId: marketState.itemId,
        action: prediction.action.type,
        confidence: prediction.confidence,
        expectedReturn: prediction.expectedReturn
      });

      return prediction;
    } catch (error) {
      this.logger.warn('⚠️ Python RL service unavailable, falling back to local agent', error);

      try {
        // Fallback to local neural agent
        const localPrediction = this.agent.predict(marketState);
        localPrediction.source = 'local_neural';

        return localPrediction;
      } catch (fallbackError) {
        this.logger.error('❌ Both Python RL and local agent failed, using simple fallback', fallbackError);

        // Simple fallback prediction
        return {
          action: {
            type: 'HOLD',
            itemId: marketState.itemId,
            quantity: 0,
            price: marketState.price,
            confidence: 0.1,
            reason: 'AI services unavailable - holding position'
          },
          confidence: 0.1,
          expectedReturn: 0,
          qValues: [0.1, 0.1, 0.8], // [BUY, SELL, HOLD]
          source: 'fallback'
        };
      }
    }
  }

  /**
   * Context7 Pattern: Encode market state for Python RL service
   */
  encodeStateForPython(marketState) {
    return [
      marketState.price / 10000000, // Normalize price
      marketState.volume / 1000, // Normalize volume
      marketState.spread / 100, // Normalize spread
      marketState.volatility / 10, // Normalize volatility
      (marketState.rsi - 50) / 50, // Normalize RSI to [-1, 1]
      marketState.macd / 1000, // Normalize MACD
      marketState.trend === 'UP' ? 1 : marketState.trend === 'DOWN' ? -1 : 0,
      (Date.now() - marketState.timestamp) / (24 * 60 * 60 * 1000) // Time decay
    ];
  }

  /**
   * Context7 Pattern: Convert Python action to expected format
   */
  convertPythonAction(pythonAction, marketState = null, fullPrediction = null) {
    // Python action can be a number (0=BUY, 1=HOLD, 2=SELL) or an object with type
    let actionType;

    if (typeof pythonAction === 'number') {
      // Convert numeric action to string
      switch (pythonAction) {
      case 0: actionType = 'BUY'; break;
      case 1: actionType = 'HOLD'; break;
      case 2: actionType = 'SELL'; break;
      default: actionType = 'HOLD'; break;
      }
    } else if (typeof pythonAction === 'object') {
      // Handle object format
      actionType = pythonAction.type || pythonAction.action || 'HOLD';
    } else {
      // Handle string format
      actionType = pythonAction || 'HOLD';
    }

    // Use action_name from full prediction if available (fallback response includes this)
    if (fullPrediction && fullPrediction.action_name) {
      actionType = fullPrediction.action_name;
    }

    return {
      type: actionType,
      itemId: (marketState && marketState.itemId) || (pythonAction && pythonAction.itemId) || null,
      quantity: (pythonAction && pythonAction.quantity) || 1,
      price: (pythonAction && pythonAction.price) || (marketState && marketState.currentPrice) || 0,
      confidence: (fullPrediction && fullPrediction.confidence) || (pythonAction && pythonAction.confidence) || 0.5,
      reason: (pythonAction && pythonAction.reason) || 'Python RL prediction'
    };
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

    // Get actual price history for technical indicators
    if (!item.priceHistory || item.priceHistory.length < 3) {
      throw new Error(`Insufficient price history for item ${item.id} - need at least 3 data points for technical analysis`);
    }

    const priceHistory = item.priceHistory.map(point => point.price || point.high || 0).filter(p => p > 0);
    const indicators = this.tradingAnalysis.getTechnicalIndicators(item.priceData, item.priceHistory);

    return {
      itemId: item.id,
      price: (high + low) / 2,
      volume: item.volume || 0, // Use actual volume from item data
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
  async simulateTradeExecution(marketState, prediction) {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Start tracking the trade
      this.outcomeTracker.startTrade(tradeId, prediction.action, marketState);

      // Simulate market movement and trade completion
      setTimeout(async() => {
        try {
          const success = this.simulateTradeSuccess(marketState, prediction.action);
          const finalPrice = this.simulatePriceMovement(marketState, prediction.action);
          const newMarketState = { ...marketState, price: finalPrice, timestamp: Date.now() };

          const tradeOutcome = this.outcomeTracker.completeTrade(
            tradeId,
            finalPrice,
            newMarketState,
            success
          );

          if (tradeOutcome && this.isTraining()) {
            await this.processTradeOutcome(marketState, prediction, newMarketState, success, tradeOutcome);
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
   * Context7 Pattern: Create OpenAI Gym compatible environment data
   */
  createGymEnvironmentData(marketState, historicalData = []) {
    try {
      // Convert to OpenAI Gym format for Python RL service
      const observation = this.encodeStateForPython(marketState);

      // Add historical context if available
      const historyFeatures = historicalData.slice(-10).map(state =>
        this.encodeStateForPython(state)
      );

      // Pad history to fixed size for consistent input
      while (historyFeatures.length < 10) {
        historyFeatures.unshift(new Array(8).fill(0));
      }

      return {
        observation: observation,
        history: historyFeatures,
        action_space: {
          type: 'discrete',
          n: 3, // BUY, SELL, HOLD
          actions: ['BUY', 'SELL', 'HOLD']
        },
        observation_space: {
          type: 'box',
          shape: [8], // 8 features per observation
          low: [-1, 0, 0, 0, -1, -1, -1, 0],
          high: [1, 1, 1, 1, 1, 1, 1, 1]
        },
        reward_range: [-100, 100],
        metadata: {
          itemId: marketState.itemId,
          timestamp: marketState.timestamp,
          sessionId: this.currentSession?.id
        }
      };
    } catch (error) {
      this.logger.error('❌ Error creating Gym environment data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Run simulation episode using Python OpenAI Gym
   */
  async runSimulationEpisode(marketStates, maxSteps = 100) {
    try {
      this.logger.info('🎮 Starting simulation episode', {
        marketStates: marketStates.length,
        maxSteps,
        sessionId: this.currentSession?.id
      });

      const episodeData = {
        observations: [],
        actions: [],
        rewards: [],
        dones: [],
        info: []
      };

      let totalReward = 0;
      let step = 0;
      let currentPortfolioValue = 1000000; // Start with 1M GP

      for (const marketState of marketStates.slice(0, maxSteps)) {
        try {
          // Create OpenAI Gym environment data
          const gymData = this.createGymEnvironmentData(
            marketState,
            episodeData.observations.slice(-10)
          );

          // Get prediction from Python RL service
          const prediction = await this.predictWithPythonRL(marketState);

          // Simulate trade execution
          const tradeResult = await this.simulateTradeForEpisode(
            marketState,
            prediction,
            currentPortfolioValue
          );

          // Calculate reward
          const reward = this.calculateEpisodeReward(
            marketState,
            prediction,
            tradeResult,
            currentPortfolioValue
          );

          // Update portfolio value
          currentPortfolioValue += tradeResult.profitLoss;
          totalReward += reward;

          // Store episode data
          episodeData.observations.push(gymData.observation);
          episodeData.actions.push(this.actionToIndex(prediction.action));
          episodeData.rewards.push(reward);
          episodeData.dones.push(false);
          episodeData.info.push({
            itemId: marketState.itemId,
            tradeResult,
            portfolioValue: currentPortfolioValue,
            prediction: prediction.action
          });

          step++;
        } catch (error) {
          this.logger.error('❌ Error in simulation step', error, { step });
          break;
        }
      }

      // Mark final step as done
      if (episodeData.dones.length > 0) {
        episodeData.dones[episodeData.dones.length - 1] = true;
      }

      // Send episode data to Python RL service for training
      if (episodeData.observations.length > 0) {
        try {
          const trainingData = this.formatEpisodeForTraining(episodeData);
          await this.pythonRLClient.train(trainingData);
        } catch (error) {
          this.logger.warn('⚠️ Failed to send episode data to Python RL service', error);
        }
      }

      const episodeResults = {
        totalSteps: step,
        totalReward,
        averageReward: totalReward / step,
        finalPortfolioValue: currentPortfolioValue,
        portfolioGrowth: ((currentPortfolioValue - 1000000) / 1000000) * 100,
        successRate: episodeData.rewards.filter(r => r > 0).length / episodeData.rewards.length,
        episodeData
      };

      this.logger.info('✅ Simulation episode completed', {
        totalSteps: step,
        totalReward: totalReward.toFixed(2),
        portfolioGrowth: episodeResults.portfolioGrowth.toFixed(2) + '%',
        successRate: (episodeResults.successRate * 100).toFixed(1) + '%'
      });

      return episodeResults;
    } catch (error) {
      this.logger.error('❌ Error running simulation episode', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Simulate trade for episode
   */
  async simulateTradeForEpisode(marketState, prediction, currentPortfolioValue) {
    try {
      const action = prediction.action;
      const confidence = prediction.confidence;

      // Determine trade size based on confidence and portfolio value
      const maxTradeSize = currentPortfolioValue * 0.1; // Max 10% of portfolio
      const tradeSize = Math.min(maxTradeSize, confidence * maxTradeSize);

      let profitLoss = 0;
      let executed = false;

      if (action.type === 'BUY') {
        // Simulate buying at current price and selling at predicted price
        const buyPrice = marketState.price;
        const sellPrice = buyPrice * (1 + (marketState.spread / 100));

        // Calculate potential profit (simplified)
        const quantity = Math.floor(tradeSize / buyPrice);
        if (quantity > 0) {
          profitLoss = quantity * (sellPrice - buyPrice);
          executed = true;
        }
      } else if (action.type === 'SELL') {
        // Simulate selling at current price
        const sellPrice = marketState.price;
        const buyPrice = sellPrice * (1 - (marketState.spread / 100));

        const quantity = Math.floor(tradeSize / sellPrice);
        if (quantity > 0) {
          profitLoss = quantity * (sellPrice - buyPrice);
          executed = true;
        }
      }

      // Add market volatility and execution risk
      if (executed) {
        const volatilityFactor = 1 + (Math.random() - 0.5) * (marketState.volatility / 100);
        const executionRisk = Math.random() > 0.95 ? 0.5 : 1; // 5% chance of partial execution

        profitLoss = profitLoss * volatilityFactor * executionRisk;
      }

      return {
        executed,
        profitLoss,
        tradeSize,
        action: action.type,
        confidence
      };
    } catch (error) {
      this.logger.error('❌ Error simulating trade for episode', error);
      return {
        executed: false,
        profitLoss: 0,
        tradeSize: 0,
        action: 'HOLD',
        confidence: 0
      };
    }
  }

  /**
   * Context7 Pattern: Calculate reward for episode step
   */
  calculateEpisodeReward(marketState, prediction, tradeResult, currentPortfolioValue) {
    try {
      let reward = 0;

      // Primary reward: profit/loss from trade
      if (tradeResult.executed) {
        reward += tradeResult.profitLoss / 10000; // Scale down for neural network
      }

      // Confidence reward: reward high confidence correct predictions
      if (tradeResult.executed && tradeResult.profitLoss > 0) {
        reward += prediction.confidence * 5;
      } else if (tradeResult.executed && tradeResult.profitLoss < 0) {
        reward -= prediction.confidence * 5;
      }

      // Risk management reward: penalize risky trades
      if (tradeResult.tradeSize > currentPortfolioValue * 0.2) {
        reward -= 10; // Penalty for over-sized trades
      }

      // Market condition reward: reward appropriate actions
      if (marketState.trend === 'UP' && prediction.action.type === 'BUY') {
        reward += 2;
      } else if (marketState.trend === 'DOWN' && prediction.action.type === 'SELL') {
        reward += 2;
      } else if (marketState.trend === 'FLAT' && prediction.action.type === 'HOLD') {
        reward += 1;
      }

      // Volatility penalty: reduce reward for high volatility trades
      if (marketState.volatility > 20) {
        reward -= Math.min(5, marketState.volatility / 10);
      }

      return Math.max(-50, Math.min(50, reward)); // Clamp reward
    } catch (error) {
      this.logger.error('❌ Error calculating episode reward', error);
      return 0;
    }
  }

  /**
   * Context7 Pattern: Convert action to index for Python RL
   */
  actionToIndex(action) {
    switch (action.type) {
    case 'BUY': return 0;
    case 'SELL': return 1;
    case 'HOLD': return 2;
    default: return 2;
    }
  }

  /**
   * Context7 Pattern: Format episode data for training
   */
  formatEpisodeForTraining(episodeData) {
    try {
      const trainingData = [];

      for (let i = 0; i < episodeData.observations.length - 1; i++) {
        trainingData.push({
          state: episodeData.observations[i],
          action: episodeData.actions[i],
          reward: episodeData.rewards[i],
          nextState: episodeData.observations[i + 1],
          done: episodeData.dones[i],
          info: episodeData.info[i]
        });
      }

      return trainingData;
    } catch (error) {
      this.logger.error('❌ Error formatting episode for training', error);
      return [];
    }
  }

  /**
   * Context7 Pattern: Process trade outcome for learning
   */
  async processTradeOutcome(marketState, prediction, newMarketState, success, tradeOutcome) {
    try {
      // Calculate reward and store experience
      const reward = this.agent.calculateReward(
        marketState,
        prediction.action,
        newMarketState,
        success,
        tradeOutcome.profit
      );

      // Store experience in Python RL service if available
      if (prediction.source === 'python_rl') {
        try {
          await this.pythonRLClient.memorizeExperience(
            marketState,
            prediction.action,
            reward.totalReward,
            newMarketState,
            true
          );

          this.logger.debug('🐍 Experience stored in Python RL service', {
            itemId: marketState.itemId,
            reward: reward.totalReward,
            action: prediction.action.type
          });
        } catch (error) {
          this.logger.warn('⚠️ Failed to store experience in Python RL service', error);
        }
      }

      // Also store in local agent for fallback
      this.agent.memorizeExperience({
        state: marketState,
        action: prediction.action,
        reward: reward.totalReward,
        nextState: newMarketState,
        done: true
      });

      // Train the appropriate agent
      let loss = 0;
      if (prediction.source === 'python_rl') {
        try {
          // Train Python RL service
          const trainingResult = await this.pythonRLClient.train([{
            state: marketState,
            action: prediction.action,
            reward: reward.totalReward,
            nextState: newMarketState,
            done: true
          }]);

          loss = trainingResult.averageLoss || 0;

          this.logger.debug('🐍 Python RL training completed', {
            episodesTrained: trainingResult.episodesTrained,
            averageLoss: trainingResult.averageLoss,
            averageReward: trainingResult.averageReward
          });
        } catch (error) {
          this.logger.warn('⚠️ Python RL training failed, falling back to local agent', error);
          loss = this.agent.trainOnBatch();
        }
      } else {
        // Train local agent
        loss = this.agent.trainOnBatch();
      }
      await this.updateTrainingMetrics(tradeOutcome, reward.totalReward, loss);

      // Check for adaptive learning
      this.checkAdaptiveLearning();

      // CRITICAL: Update AI decision with outcome and save trade outcome
      if (this.mongoService && this.currentSession) {
        // Update the original AI decision with the outcome
        if (prediction.decisionId) {
          const outcome = {
            success: success,
            profitLoss: tradeOutcome.profit,
            finalPrice: newMarketState.price,
            executionTime: Date.now() - marketState.timestamp,
            reward: reward.totalReward,
            tradeId: tradeOutcome.tradeId
          };

          try {
            await this.mongoService.updateAIDecisionOutcome(prediction.decisionId, outcome);

            this.logger.debug('✅ AI decision outcome updated', {
              decisionId: prediction.decisionId,
              success: success,
              profitLoss: tradeOutcome.profit,
              reward: reward.totalReward
            });
          } catch (error) {
            this.logger.error('❌ Failed to update AI decision outcome', error);
          }
        }

        // Save the trade outcome for historical analysis
        const enhancedTradeOutcome = {
          ...tradeOutcome,
          sessionId: this.currentSession.id,
          decisionId: prediction.decisionId,
          confidence: prediction.confidence,
          marketState: marketState,
          finalMarketState: newMarketState,
          reward: reward.totalReward
        };

        try {
          await this.mongoService.saveTradeOutcome(enhancedTradeOutcome);

          this.logger.debug('✅ Trade outcome saved to database', {
            tradeId: tradeOutcome.tradeId,
            sessionId: this.currentSession.id,
            profitLoss: tradeOutcome.profit
          });
        } catch (error) {
          this.logger.error('❌ Failed to save trade outcome', error);
        }
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
    if (action.type === 'BUY' && marketState.trend === 'UP') {
      successProbability += 0.2;
    }
    if (action.type === 'SELL' && marketState.trend === 'DOWN') {
      successProbability += 0.2;
    }
    if (action.type === 'HOLD') {
      successProbability = 0.8;
    }

    // Adjust based on technical indicators
    if (marketState.rsi < 30 && action.type === 'BUY') {
      successProbability += 0.15;
    }
    if (marketState.rsi > 70 && action.type === 'SELL') {
      successProbability += 0.15;
    }

    // Adjust based on spread
    if (marketState.spread > 5) {
      successProbability += 0.1;
    }

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
    if (marketState.trend === 'UP') {
      movement += basePrice * 0.01;
    }
    if (marketState.trend === 'DOWN') {
      movement -= basePrice * 0.01;
    }

    // Add some action-based movement (market impact)
    if (action.type === 'BUY') {
      movement += basePrice * 0.005;
    }
    if (action.type === 'SELL') {
      movement -= basePrice * 0.005;
    }

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
      if (this.mongoService && this.currentSession) {
        await this.mongoService.saveTrainingMetrics(metrics, this.currentSession.id);
      }
    } catch (error) {
      this.logger.error('❌ Error updating training metrics', error);
    }
  }

  /**
   * Context7 Pattern: Check for adaptive learning
   */
  checkAdaptiveLearning() {
    if (!this.adaptiveConfig.enableOnlineLearning) {
      return;
    }

    const timeSinceUpdate = Date.now() - this.lastModelUpdate;
    const tradesCount = this.outcomeTracker.getOutcomesCount();

    // Check if it's time for adaptive learning
    if (
      tradesCount > 0 &&
      tradesCount % this.adaptiveConfig.learningFrequency === 0 &&
      timeSinceUpdate > 60000 // At least 1 minute between updates
    ) {
      // Run adaptive learning asynchronously to avoid blocking
      this.performAdaptiveLearning().catch(error => {
        this.logger.error('❌ Error in background adaptive learning', error);
      });
    }
  }

  /**
   * Context7 Pattern: Perform adaptive learning with MongoDB analytics
   */
  async performAdaptiveLearning() {
    try {
      // Get performance metrics from MongoDB for comprehensive analysis
      const performance = await this.analyzePerformanceFromDatabase();

      if (!performance) {
        this.logger.warn('⚠️ No performance data available for adaptive learning');
        return;
      }

      this.logger.info('🧠 Performing adaptive learning with database analytics', {
        sessionId: this.currentSession?.id,
        performance: {
          successRate: performance.successRate.toFixed(1) + '%',
          averageProfit: performance.averageProfit.toFixed(0) + ' GP',
          totalDecisions: performance.totalDecisions,
          profitFactor: performance.profitFactor?.toFixed(2)
        }
      });

      // Save learning session data for optimization tracking
      if (this.mongoService && this.currentSession) {
        const learningSession = {
          sessionId: this.currentSession.id,
          timestamp: Date.now(),
          performance: performance,
          adaptiveActions: [],
          modelStats: this.agent.getModelStats()
        };

        // Determine adaptive actions based on performance
        const adaptiveActions = await this.determineAdaptiveActions(performance);
        learningSession.adaptiveActions = adaptiveActions;

        // Apply the adaptive actions
        for (const action of adaptiveActions) {
          await this.applyAdaptiveAction(action);
        }

        // Save the learning session
        await this.mongoService.saveLearningSession(learningSession);

        this.logger.info('✅ Learning session saved with adaptive optimizations', {
          sessionId: this.currentSession.id,
          actionsApplied: adaptiveActions.length
        });
      }

      this.lastModelUpdate = Date.now();
    } catch (error) {
      this.logger.error('❌ Error in adaptive learning', error);
    }
  }

  /**
   * Context7 Pattern: Analyze performance from MongoDB data
   */
  async analyzePerformanceFromDatabase() {
    try {
      if (!this.mongoService || !this.currentSession) {
        return null;
      }

      // Get recent decisions and outcomes for this session
      const recentDecisions = await this.mongoService.getAIDecisions(
        {
          sessionId: this.currentSession.id,
          startTime: Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
        },
        {
          sort: { timestamp: -1 },
          limit: 1000
        }
      );

      if (!recentDecisions || recentDecisions.length === 0) {
        return null;
      }

      // Analyze decision outcomes
      const totalDecisions = recentDecisions.length;
      let successfulDecisions = 0;
      let totalProfit = 0;
      let totalLoss = 0;
      let highConfidenceSuccesses = 0;
      let lowConfidenceSuccesses = 0;

      const actionPerformance = {
        BUY: { total: 0, successful: 0, profit: 0 },
        SELL: { total: 0, successful: 0, profit: 0 },
        HOLD: { total: 0, successful: 0, profit: 0 }
      };

      for (const decision of recentDecisions) {
        if (decision.outcome) {
          const { success, profitLoss } = decision.outcome;

          if (success) {
            successfulDecisions++;
            if (decision.confidence > 0.8) {
              highConfidenceSuccesses++;
            } else {
              lowConfidenceSuccesses++;
            }
          }

          if (profitLoss > 0) {
            totalProfit += profitLoss;
          } else {
            totalLoss += Math.abs(profitLoss);
          }

          // Track action-specific performance
          const actionType = decision.action?.type || 'UNKNOWN';
          if (actionPerformance[actionType]) {
            actionPerformance[actionType].total++;
            if (success) {
              actionPerformance[actionType].successful++;
            }
            actionPerformance[actionType].profit += profitLoss || 0;
          }
        }
      }

      const successRate = (successfulDecisions / totalDecisions) * 100;
      const averageProfit = totalDecisions > 0 ? (totalProfit - totalLoss) / totalDecisions : 0;
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 5 : 1;

      return {
        totalDecisions,
        successfulDecisions,
        successRate,
        averageProfit,
        totalProfit,
        totalLoss,
        profitFactor,
        highConfidenceSuccesses,
        lowConfidenceSuccesses,
        actionPerformance,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('❌ Error analyzing performance from database', error);
      return null;
    }
  }

  /**
   * Context7 Pattern: Determine adaptive actions based on performance
   */
  async determineAdaptiveActions(performance) {
    const actions = [];

    // Poor overall performance - increase exploration
    if (performance.successRate < 50) {
      actions.push({
        type: 'INCREASE_EXPLORATION',
        reason: `Low success rate: ${performance.successRate.toFixed(1)}%`,
        parameters: { epsilonIncrease: 0.1 }
      });
    }

    // High performance but low profit - adjust risk tolerance
    if (performance.successRate > 70 && performance.averageProfit < 1000) {
      actions.push({
        type: 'INCREASE_RISK_TOLERANCE',
        reason: `High success rate but low profit: ${performance.averageProfit.toFixed(0)} GP avg`,
        parameters: { minProfitThreshold: performance.averageProfit * 1.5 }
      });
    }

    // Poor profit factor - improve risk management
    if (performance.profitFactor < 1.2) {
      actions.push({
        type: 'IMPROVE_RISK_MANAGEMENT',
        reason: `Poor profit factor: ${performance.profitFactor.toFixed(2)}`,
        parameters: { stopLossIncrease: 0.05 }
      });
    }

    // Analyze action-specific performance
    for (const [actionType, actionStats] of Object.entries(performance.actionPerformance)) {
      if (actionStats.total > 10) { // Only analyze actions with sufficient data
        const actionSuccessRate = (actionStats.successful / actionStats.total) * 100;

        if (actionSuccessRate < 30) {
          actions.push({
            type: 'REDUCE_ACTION_FREQUENCY',
            reason: `Poor ${actionType} performance: ${actionSuccessRate.toFixed(1)}%`,
            parameters: { actionType, frequencyReduction: 0.3 }
          });
        }
      }
    }

    // High confidence decisions performing poorly
    if (performance.highConfidenceSuccesses < performance.lowConfidenceSuccesses &&
        performance.totalDecisions > 50) {
      actions.push({
        type: 'RECALIBRATE_CONFIDENCE',
        reason: 'High confidence decisions underperforming',
        parameters: { confidenceAdjustment: -0.1 }
      });
    }

    return actions;
  }

  /**
   * Context7 Pattern: Apply adaptive action for learning optimization
   */
  async applyAdaptiveAction(action) {
    try {
      this.logger.info(`🔧 Applying adaptive action: ${action.type}`, {
        reason: action.reason,
        parameters: action.parameters
      });

      switch (action.type) {
      case 'INCREASE_EXPLORATION':
        // Increase exploration rate
        this.adaptiveConfig.explorationBoost = true;
        break;

      case 'INCREASE_RISK_TOLERANCE':
        // Adjust minimum profit threshold
        if (action.parameters.minProfitThreshold) {
          this.adaptiveConfig.minProfitMargin = action.parameters.minProfitThreshold / 100000; // Convert to percentage
        }
        break;

      case 'IMPROVE_RISK_MANAGEMENT':
        // Tighten risk management parameters
        this.adaptiveConfig.maxItemValue = Math.min(
          this.adaptiveConfig.maxItemValue * 0.9,
          1000000000 // Don't go below 1B
        );
        break;

      case 'REDUCE_ACTION_FREQUENCY':
        // This would be implemented in the agent's action selection logic
        this.logger.info(`📉 Noted to reduce ${action.parameters.actionType} frequency`);
        break;

      case 'RECALIBRATE_CONFIDENCE':
        // This would be implemented in the agent's confidence calculation
        this.logger.info('🎯 Noted to recalibrate confidence scoring');
        break;

      default:
        this.logger.warn(`Unknown adaptive action type: ${action.type}`);
      }
    } catch (error) {
      this.logger.error('❌ Error applying adaptive action', error, { action });
    }
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

  // ==========================================
  // ENHANCED TRADING OPPORTUNITY METHODS
  // ==========================================

  /**
   * ENHANCED: Find best trading opportunities using domain intelligence
   */
  async findBestTradingOpportunities(currentPrices, options = {}) {
    try {
      this.logger.info('🔍 Finding best trading opportunities', {
        priceCount: Object.keys(currentPrices).length,
        options
      });

      // Get all tradeable items with business logic
      const tradeableItems = await this.itemRepository.findByIds(
        Object.keys(currentPrices).map(id => parseInt(id))
      );

      const opportunities = [];

      for (const item of tradeableItems) {
        const priceData = currentPrices[item.id.value];
        if (!priceData || !item.market.tradeableOnGE) {
          continue;
        }

        // Skip items over max value
        if (priceData.high > this.adaptiveConfig.maxItemValue) {
          continue;
        }

        // Calculate profit potential
        const spread = priceData.high - priceData.low;
        const spreadPercentage = (spread / priceData.low) * 100;
        const profitMargin = spreadPercentage / 100;

        // Skip if profit margin too low
        if (profitMargin < this.adaptiveConfig.minProfitMargin) {
          continue;
        }

        // Use domain logic for additional insights
        const opportunity = {
          itemId: item.id.value,
          itemName: item.name,
          category: item.getCategory(),

          // Price data
          buyPrice: priceData.low,
          sellPrice: priceData.high,
          spread: spread,
          spreadPercentage: spreadPercentage,
          profitMargin: profitMargin,

          // Business logic insights
          isProfitableAlchemy: item.isProfitableAlchemy(),
          alchemyProfit: item.getAlchemyProfit(),
          membershipTier: item.members ? 'members' : 'f2p',

          // Trading factors
          buyLimit: item.market.buyLimit,
          stackable: item.market.stackable,
          volume: priceData.volume || 0,

          // Risk assessment
          riskScore: this.calculateRiskScore(item, priceData),
          profitPotential: spread * (item.market.buyLimit || 1),

          // AI features for training
          features: this.extractTradingFeatures(item, priceData)
        };

        opportunities.push(opportunity);
      }

      // Sort by profit potential and risk
      opportunities.sort((a, b) => {
        const scoreA = (a.profitPotential / Math.max(a.riskScore, 0.1));
        const scoreB = (b.profitPotential / Math.max(b.riskScore, 0.1));
        return scoreB - scoreA;
      });

      const topOpportunities = opportunities.slice(0, options.limit || 50);

      this.logger.info('💰 Trading opportunities found', {
        totalAnalyzed: tradeableItems.length,
        opportunities: opportunities.length,
        topSelected: topOpportunities.length,
        avgProfitMargin: (opportunities.reduce((sum, op) => sum + op.profitMargin, 0) / opportunities.length * 100).toFixed(2) + '%'
      });

      return {
        opportunities: topOpportunities,
        summary: {
          totalAnalyzed: tradeableItems.length,
          viableOpportunities: opportunities.length,
          avgProfitMargin: opportunities.reduce((sum, op) => sum + op.profitMargin, 0) / opportunities.length,
          categories: this.groupOpportunitiesByCategory(topOpportunities),
          riskDistribution: this.analyzeRiskDistribution(topOpportunities)
        }
      };

    } catch (error) {
      this.logger.error('❌ Error finding trading opportunities', error);
      throw error;
    }
  }

  /**
   * Calculate risk score for trading opportunity
   */
  calculateRiskScore(item, priceData) {
    let risk = 0;

    // High value items are riskier
    if (priceData.high > 1000000) {
      risk += 2;
    } else if (priceData.high > 100000) {
      risk += 1;
    }

    // Members items have smaller market
    if (item.members) {
      risk += 1;
    }

    // Low volume is risky
    if (priceData.volume < 100) {
      risk += 2;
    } else if (priceData.volume < 1000) {
      risk += 1;
    }

    // No buy limit means unlimited buying (good)
    if (!item.market.buyLimit) {
      risk -= 1;
    }

    // Stackable items easier to trade
    if (item.market.stackable) {
      risk -= 0.5;
    }

    return Math.max(0, risk);
  }

  /**
   * Extract features for AI training
   */
  extractTradingFeatures(item, priceData) {
    return {
      // Price features
      priceLevel: this.normalizePriceLevel(priceData.high),
      spreadRatio: (priceData.high - priceData.low) / priceData.high,
      volumeLevel: this.normalizeVolume(priceData.volume || 0),

      // Item features
      membershipFlag: item.members ? 1 : 0,
      stackableFlag: item.market.stackable ? 1 : 0,
      buyLimitLevel: this.normalizeBuyLimit(item.market.buyLimit),

      // Category features (one-hot encoded)
      categoryRunes: item.getCategory() === 'runes' ? 1 : 0,
      categoryWeapons: item.getCategory() === 'weapons' ? 1 : 0,
      categoryArmor: item.getCategory() === 'armor' ? 1 : 0,
      categoryFood: item.getCategory() === 'food' ? 1 : 0,
      categoryPotions: item.getCategory() === 'potions' ? 1 : 0,
      categoryResources: item.getCategory() === 'resources' ? 1 : 0,
      categoryHighValue: item.getCategory() === 'high_value' ? 1 : 0,

      // Business features
      alchemyProfitable: item.isProfitableAlchemy() ? 1 : 0,
      alchemyProfitLevel: this.normalizeAlchemyProfit(item.getAlchemyProfit())
    };
  }

  normalizePriceLevel(price) {
    return Math.min(price / 1000000, 10); // Cap at 10M for normalization
  }

  normalizeVolume(volume) {
    return Math.min(volume / 10000, 5); // Cap at 50k volume
  }

  normalizeBuyLimit(buyLimit) {
    if (!buyLimit) {
      return 5;
    } // Unlimited = max score
    return Math.min(buyLimit / 1000, 5);
  }

  normalizeAlchemyProfit(profit) {
    return Math.max(-1, Math.min(profit / 1000, 5)); // -1k to 5k range
  }

  groupOpportunitiesByCategory(opportunities) {
    const categories = {};
    opportunities.forEach(op => {
      categories[op.category] = (categories[op.category] || 0) + 1;
    });
    return categories;
  }

  analyzeRiskDistribution(opportunities) {
    const distribution = { low: 0, medium: 0, high: 0 };
    opportunities.forEach(op => {
      if (op.riskScore < 1) {
        distribution.low++;
      } else if (op.riskScore < 3) {
        distribution.medium++;
      } else {
        distribution.high++;
      }
    });
    return distribution;
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
      if (this.mongoService) {
        try {
          await this.mongoService.saveLearningSession(this.currentSession);
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
      if (!modelData) {
        throw new Error('Model data is required');
      }

      // Ensure modelData is a string (JSON)
      const modelString = typeof modelData === 'string' ? modelData : JSON.stringify(modelData);

      this.agent.loadModel(modelString);
      this.logger.info('📁 Model loaded successfully');
    } catch (error) {
      this.logger.error('❌ Error loading model', error, {
        modelDataType: typeof modelData,
        modelDataLength: modelData ? modelData.length : 0
      });
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

  // ==========================================
  // AI MODEL METADATA MANAGEMENT
  // ==========================================

  /**
   * Context7 Pattern: Save model with metadata
   */
  async saveModelWithMetadata(modelId, version, description = '') {
    try {
      this.logger.info('💾 Saving model with metadata', {
        modelId,
        version,
        description
      });

      // Save model to Python RL service
      const saveResult = await this.pythonRLClient.saveModel(modelId);

      // Get current performance metrics
      const performance = this.outcomeTracker.calculatePerformanceMetrics();
      const modelStats = this.agent.getModelStats();

      // Get Python RL model metrics if available
      let pythonMetrics = {};
      try {
        pythonMetrics = await this.pythonRLClient.getModelMetrics(modelId);
      } catch (error) {
        this.logger.warn('Could not get Python RL model metrics', error);
      }

      // Create AI model metadata
      const modelMetadata = new AIModelMetadata({
        modelId,
        version,
        description,
        trainingDate: new Date(),
        trainingDuration: this.currentSession ?
          Date.now() - this.currentSession.startTime : 0,
        trainingEpisodes: this.currentSession?.episodeCount || 0,

        performanceMetrics: {
          roi: performance.roi || 0,
          accuracy: performance.accuracy || 0,
          totalProfit: performance.totalProfit || 0,
          winRate: performance.winRate || 0,
          averageProfit: performance.averageProfit || 0,
          maxDrawdown: performance.maxDrawdown || 0,
          sharpeRatio: performance.sharpeRatio || 0,
          totalTrades: performance.totalTrades || 0,
          profitableTrades: performance.profitableTrades || 0,
          averageTradeDuration: performance.averageTradeDuration || 0
        },

        technicalMetrics: {
          modelSize: saveResult.modelSize || 0,
          parameters: modelStats.networkLayers || 0,
          averageLoss: pythonMetrics.averageLoss || 0,
          averageReward: pythonMetrics.averageReward || 0,
          epsilon: modelStats.epsilon || 0,
          learningRate: modelStats.learningRate || 0
        },

        modelConfig: {
          architecture: modelStats.architecture || 'Unknown',
          hyperparameters: {
            epsilon: modelStats.epsilon,
            learningRate: modelStats.learningRate,
            memorySize: modelStats.memoryCapacity,
            batchSize: modelStats.batchSize
          },
          trainingParameters: {
            adaptiveConfig: this.adaptiveConfig,
            trainingEpisodes: this.currentSession?.episodeCount || 0
          }
        },

        storagePath: saveResult.modelPath || `models/${modelId}`,
        storageSize: saveResult.modelSize || 0,

        status: 'testing',
        createdBy: 'ai_trading_orchestrator',
        tags: ['reinforcement_learning', 'osrs_trading', 'neural_network']
      });

      // Save metadata to database
      await modelMetadata.save();

      this.logger.info('✅ Model saved with metadata successfully', {
        modelId,
        version,
        metadataId: modelMetadata._id,
        performanceScore: modelMetadata.calculateEfficiencyScore()
      });

      return {
        success: true,
        modelId,
        version,
        metadataId: modelMetadata._id,
        performanceScore: modelMetadata.calculateEfficiencyScore(),
        saveResult
      };
    } catch (error) {
      this.logger.error('❌ Error saving model with metadata', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Load model with metadata
   */
  async loadModelWithMetadata(modelId) {
    try {
      this.logger.info('📁 Loading model with metadata', { modelId });

      // Find model metadata
      const modelMetadata = await AIModelMetadata.findOne({ modelId })
        .sort({ createdAt: -1 });

      if (!modelMetadata) {
        throw new Error(`Model metadata not found for modelId: ${modelId}`);
      }

      // Load model from Python RL service
      const loadResult = await this.pythonRLClient.loadModel(modelId);

      // Update usage statistics
      await modelMetadata.updateUsageStats({
        totalPredictions: modelMetadata.usageStats.totalPredictions + 1,
        lastUsedAt: new Date()
      });

      this.logger.info('✅ Model loaded with metadata successfully', {
        modelId,
        version: modelMetadata.version,
        metadataId: modelMetadata._id,
        performanceScore: modelMetadata.calculateEfficiencyScore()
      });

      return {
        success: true,
        modelId,
        version: modelMetadata.version,
        metadata: modelMetadata,
        loadResult
      };
    } catch (error) {
      this.logger.error('❌ Error loading model with metadata', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get production model
   */
  async getProductionModel() {
    try {
      const productionModel = await AIModelMetadata.getProductionModel();

      if (!productionModel) {
        this.logger.warn('No production model found');
        return null;
      }

      return {
        modelId: productionModel.modelId,
        version: productionModel.version,
        metadata: productionModel,
        summary: productionModel.getSummary()
      };
    } catch (error) {
      this.logger.error('❌ Error getting production model', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Set model as production
   */
  async setModelAsProduction(modelId) {
    try {
      this.logger.info('🚀 Setting model as production', { modelId });

      // First, archive current production model
      const currentProduction = await AIModelMetadata.getProductionModel();
      if (currentProduction) {
        await currentProduction.archive();
        this.logger.info('Archived previous production model', {
          previousModel: currentProduction.modelId
        });
      }

      // Find the target model
      const targetModel = await AIModelMetadata.findOne({ modelId })
        .sort({ createdAt: -1 });

      if (!targetModel) {
        throw new Error(`Model not found: ${modelId}`);
      }

      // Set as production
      await targetModel.markAsProduction();

      // Load the model into the system
      await this.loadModelWithMetadata(modelId);

      this.logger.info('✅ Model set as production successfully', {
        modelId,
        version: targetModel.version,
        performanceScore: targetModel.calculateEfficiencyScore()
      });

      return {
        success: true,
        modelId,
        version: targetModel.version,
        metadata: targetModel
      };
    } catch (error) {
      this.logger.error('❌ Error setting model as production', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get model performance comparison
   */
  async getModelPerformanceComparison(limit = 10) {
    try {
      const recentModels = await AIModelMetadata.getRecentModels(limit);

      const comparison = recentModels.map(model => ({
        modelId: model.modelId,
        version: model.version,
        status: model.status,
        performanceScore: model.calculateEfficiencyScore(),
        roi: model.performanceMetrics.roi,
        winRate: model.performanceMetrics.winRate,
        totalProfit: model.performanceMetrics.totalProfit,
        totalTrades: model.performanceMetrics.totalTrades,
        createdAt: model.createdAt,
        daysSinceCreation: model.ageInDays
      }));

      // Sort by performance score
      comparison.sort((a, b) => b.performanceScore - a.performanceScore);

      return {
        models: comparison,
        summary: {
          totalModels: comparison.length,
          avgPerformanceScore: comparison.reduce((sum, m) => sum + m.performanceScore, 0) / comparison.length,
          bestPerforming: comparison[0] || null,
          avgRoi: comparison.reduce((sum, m) => sum + m.roi, 0) / comparison.length
        }
      };
    } catch (error) {
      this.logger.error('❌ Error getting model performance comparison', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Update model performance metrics
   */
  async updateModelPerformanceMetrics(modelId, metrics) {
    try {
      const model = await AIModelMetadata.findOne({ modelId })
        .sort({ createdAt: -1 });

      if (!model) {
        throw new Error(`Model not found: ${modelId}`);
      }

      await model.updatePerformanceMetrics(metrics);

      this.logger.info('✅ Model performance metrics updated', {
        modelId,
        version: model.version,
        updatedMetrics: Object.keys(metrics)
      });

      return {
        success: true,
        modelId,
        version: model.version,
        performanceScore: model.calculateEfficiencyScore()
      };
    } catch (error) {
      this.logger.error('❌ Error updating model performance metrics', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get model statistics
   */
  async getModelStatistics() {
    try {
      const statistics = await AIModelMetadata.getModelStatistics();

      return {
        byStatus: statistics,
        totalModels: statistics.reduce((sum, stat) => sum + stat.count, 0),
        avgMetrics: {
          roi: statistics.reduce((sum, stat) => sum + (stat.avgRoi || 0), 0) / statistics.length,
          accuracy: statistics.reduce((sum, stat) => sum + (stat.avgAccuracy || 0), 0) / statistics.length,
          totalProfit: statistics.reduce((sum, stat) => sum + (stat.totalProfit || 0), 0),
          totalTrades: statistics.reduce((sum, stat) => sum + (stat.totalTrades || 0), 0)
        }
      };
    } catch (error) {
      this.logger.error('❌ Error getting model statistics', error);
      throw error;
    }
  }
}

module.exports = { AITradingOrchestratorService };
