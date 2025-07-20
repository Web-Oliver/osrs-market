/**
 * 🧠 Neural Trading Agent Service - Context7 Optimized
 *
 * Context7 Pattern: Service Layer for Neural Network Trading Agent
 * - Implements Deep Q-Network (DQN) for trading decisions
 * - Handles neural network prediction and training
 * - Manages experience replay and epsilon-greedy exploration
 * - DRY principles with reusable neural network patterns
 * - SOLID architecture with single responsibility
 */

const { BaseService } = require('./BaseService');

class NeuralTradingAgentService extends BaseService {
  constructor(config) {
    super('NeuralTradingAgentService', {
      enableCache: true,
      cachePrefix: 'neural_trading_agent',
      cacheTTL: 300, // 5 minutes for neural predictions
      enableMongoDB: true // Store training data and model states
    });

    this.config = config || {
      inputSize: 8,
      hiddenLayers: [64, 32],
      outputSize: 3, // BUY, SELL, HOLD
      learningRate: 0.001,
      epsilon: 1.0,
      epsilonMin: 0.01,
      epsilonDecay: 0.995,
      gamma: 0.95,
      memorySize: 10000,
      batchSize: 32,
      tau: 0.001
    };

    this.memory = [];
    this.onlineNetwork = [];
    this.targetNetwork = [];
    this.epsilon = this.config.epsilon;
    this.totalSteps = 0;
    this.totalEpisodes = 0;

    this.initializeNetworks();

    this.logger.info('🧠 Neural Trading Agent initialized', {
      config: this.config,
      networkArchitecture: `${this.config.inputSize} -> ${this.config.hiddenLayers.join(' -> ')} -> ${this.config.outputSize}`
    });
  }

  /**
   * Context7 Pattern: Initialize neural networks
   */
  initializeNetworks() {
    this.execute(async() => {
      this.onlineNetwork = this.createNetwork();
      this.targetNetwork = this.createNetwork();
      this.updateTargetNetwork();

      this.logger.debug('✅ Neural networks initialized successfully');
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Create neural network with Xavier initialization
   */
  createNetwork() {
    const layers = [this.config.inputSize, ...this.config.hiddenLayers, this.config.outputSize];
    const network = [];

    for (let i = 0; i < layers.length - 1; i++) {
      const weights = [];
      const connectionCount = layers[i] * layers[i + 1];

      for (let j = 0; j < connectionCount; j++) {
        // Xavier initialization
        weights.push((Math.random() - 0.5) * 2 * Math.sqrt(6 / (layers[i] + layers[i + 1])));
      }
      network.push(weights);
    }

    return network;
  }

  /**
   * Context7 Pattern: Predict trading action from market state
   */
  predict(state) {
    this.execute(async() => {
      const stateVector = this.encodeState(state);
      const qValues = this.forwardPass(this.onlineNetwork, stateVector);

      let action;
      let confidence;

      if (Math.random() < this.epsilon) {
        // Exploration: random action
        action = this.getRandomAction(state.itemId);
        confidence = this.epsilon;
      } else {
        // Exploitation: best Q-value action
        action = this.getBestAction(state.itemId, qValues);
        confidence = 1 - this.epsilon;
      }

      const expectedReturn = Math.max(...qValues);
      const riskAssessment = this.calculateRisk(state, action);

      this.logger.debug('🎯 Trading prediction generated', {
        itemId: state.itemId,
        actionType: action.type,
        confidence: confidence.toFixed(3),
        expectedReturn: expectedReturn.toFixed(3),
        riskAssessment: riskAssessment.toFixed(3)
      });

      return {
        action,
        qValues,
        confidence,
        expectedReturn,
        riskAssessment
      };
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Encode market state to neural network input
   */
  encodeState(state) {
    // Normalize state values to [0, 1] range for neural network
    return [
      state.price / 10000000, // Normalize price (assuming max 10M GP)
      state.volume / 1000, // Normalize volume
      state.spread / 100, // Normalize spread percentage
      state.volatility / 10, // Normalize volatility
      (state.rsi - 50) / 50, // Normalize RSI to [-1, 1]
      state.macd / 1000, // Normalize MACD
      state.trend === 'UP' ? 1 : state.trend === 'DOWN' ? -1 : 0,
      (Date.now() - state.timestamp) / (24 * 60 * 60 * 1000) // Time decay (days)
    ];
  }

  /**
   * Context7 Pattern: Forward pass through neural network
   */
  forwardPass(network, input) {
    let current = [...input];

    for (let layerIndex = 0; layerIndex < network.length; layerIndex++) {
      const weights = network[layerIndex];
      const inputSize = current.length;
      const outputSize = weights.length / inputSize;
      const nextLayer = [];

      for (let i = 0; i < outputSize; i++) {
        let sum = 0;
        for (let j = 0; j < inputSize; j++) {
          sum += current[j] * weights[i * inputSize + j];
        }
        // ReLU activation for hidden layers, linear for output
        nextLayer.push(layerIndex < network.length - 1 ? Math.max(0, sum) : sum);
      }
      current = nextLayer;
    }

    return current;
  }

  /**
   * Context7 Pattern: Generate random action for exploration
   */
  getRandomAction(itemId) {
    const actions = ['BUY', 'SELL', 'HOLD'];
    const actionType = actions[Math.floor(Math.random() * actions.length)];

    return {
      type: actionType,
      itemId,
      quantity: Math.floor(Math.random() * 100) + 1,
      price: Math.floor(Math.random() * 1000000) + 1000,
      confidence: Math.random(),
      reason: 'Random exploration'
    };
  }

  /**
   * Context7 Pattern: Generate best action based on Q-values
   */
  getBestAction(itemId, qValues) {
    const actionIndex = qValues.indexOf(Math.max(...qValues));
    const actions = ['BUY', 'SELL', 'HOLD'];

    return {
      type: actions[actionIndex] || 'HOLD',
      itemId,
      quantity: Math.floor(Math.abs(qValues[actionIndex]) * 10) + 1,
      price: Math.floor(Math.abs(qValues[actionIndex]) * 100000) + 1000,
      confidence: Math.max(...qValues) / (Math.max(...qValues) + Math.abs(Math.min(...qValues)) + 1),
      reason: `Q-value based decision (${qValues[actionIndex].toFixed(3)})`
    };
  }

  /**
   * Context7 Pattern: Calculate risk assessment for action
   */
  calculateRisk(state, action) {
    let risk = 0;

    // Volatility risk
    risk += state.volatility * 0.3;

    // Spread risk
    risk += state.spread * 0.2;

    // Action size risk
    risk += (action.quantity / 100) * 0.2;

    // Market condition risk
    if (state.trend === 'DOWN' && action.type === 'BUY') {
      risk += 0.3;
    }
    if (state.trend === 'UP' && action.type === 'SELL') {
      risk += 0.3;
    }

    return Math.min(1, Math.max(0, risk));
  }

  /**
   * Context7 Pattern: Memorize experience for replay
   */
  memorizeExperience(experience) {
    this.memory.push(experience);

    // Keep memory within bounds
    if (this.memory.length > this.config.memorySize) {
      this.memory.shift();
    }

    this.logger.debug('🧠 Experience memorized', {
      memorySize: this.memory.length,
      reward: experience.reward.toFixed(3),
      action: experience.action.type
    });
  }

  /**
   * Context7 Pattern: Train neural network on batch
   */
  trainOnBatch() {
    if (this.memory.length < this.config.batchSize) {
      return 0;
    }

    this.execute(async() => {
      const batch = this.sampleBatch();
      let totalLoss = 0;

      for (const experience of batch) {
        const currentQ = this.forwardPass(this.onlineNetwork, this.encodeState(experience.state));
        const nextQ = this.forwardPass(this.targetNetwork, this.encodeState(experience.nextState));

        // Bellman equation: Q(s,a) = r + γ * max(Q(s',a'))
        const targetValue = experience.reward +
          (experience.done ? 0 : this.config.gamma * Math.max(...nextQ));

        const actionIndex = this.getActionIndex(experience.action);
        const currentValue = currentQ[actionIndex];

        const loss = Math.pow(targetValue - currentValue, 2);
        totalLoss += loss;

        // Gradient descent update (simplified)
        this.updateWeights(experience, targetValue, currentValue);
      }

      // Update epsilon
      this.updateEpsilon();

      // Update target network periodically
      if (this.totalSteps % Math.floor(1 / this.config.tau) === 0) {
        this.updateTargetNetwork();
      }

      this.totalSteps++;
      const averageLoss = totalLoss / batch.length;

      this.logger.debug('🎓 Training batch completed', {
        batchSize: batch.length,
        averageLoss: averageLoss.toFixed(6),
        epsilon: this.epsilon.toFixed(3),
        totalSteps: this.totalSteps
      });

      return averageLoss;
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Load model from JSON
   */
  loadModel(modelData) {
    this.execute(async() => {
      const data = JSON.parse(modelData);
      this.config = data.config;
      this.onlineNetwork = data.onlineNetwork;
      this.targetNetwork = data.onlineNetwork.map(layer => [...layer]);
      this.epsilon = data.epsilon;
      this.totalSteps = data.totalSteps;
      this.totalEpisodes = data.totalEpisodes || 0;

      this.logger.info('📁 Model loaded successfully', {
        version: data.version,
        epsilon: this.epsilon,
        totalSteps: this.totalSteps
      });
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Get network architecture info
   */
  getNetworkInfo() {
    return {
      architecture: `${this.config.inputSize} -> ${this.config.hiddenLayers.join(' -> ')} -> ${this.config.outputSize}`,
      totalParameters: this.calculateTotalParameters(),
      config: this.config
    };
  }

  /**
   * Context7 Pattern: Calculate total network parameters
   */
  calculateTotalParameters() {
    const layers = [this.config.inputSize, ...this.config.hiddenLayers, this.config.outputSize];
    let totalParams = 0;

    for (let i = 0; i < layers.length - 1; i++) {
      totalParams += layers[i] * layers[i + 1];
    }

    return totalParams;
  }

  /**
   * Context7 Pattern: Reset agent for new training
   */
  reset() {
    this.memory = [];
    this.epsilon = this.config.epsilon;
    this.totalSteps = 0;
    this.totalEpisodes = 0;
    this.initializeNetworks();

    this.logger.info('🔄 Neural agent reset successfully');
  }

  /**
   * Context7 Pattern: Get memory statistics
   */
  getMemoryStats() {
    if (this.memory.length === 0) {
      return {
        size: 0,
        capacity: this.config.memorySize,
        averageReward: 0,
        rewardRange: { min: 0, max: 0 }
      };
    }

    const rewards = this.memory.map(exp => exp.reward);
    const averageReward = rewards.reduce((a, b) => a + b, 0) / rewards.length;
    const minReward = Math.min(...rewards);
    const maxReward = Math.max(...rewards);

    return {
      size: this.memory.length,
      capacity: this.config.memorySize,
      averageReward,
      rewardRange: { min: minReward, max: maxReward }
    };
  }
}

module.exports = { NeuralTradingAgentService };
