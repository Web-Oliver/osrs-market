import type { 
  MarketState, 
  TradingAction, 
  AgentMemory, 
  NeuralNetworkConfig, 
  ModelPrediction,
  RewardFunction
} from '../types/aiTrading'

export class NeuralTradingAgent {
  private config: NeuralNetworkConfig
  private memory: AgentMemory[] = []
  private onlineNetwork: number[][] = []
  private targetNetwork: number[][] = []
  private epsilon: number
  private totalSteps: number = 0
  private totalEpisodes: number = 0

  constructor(config: NeuralNetworkConfig) {
    this.config = config
    this.epsilon = config.epsilon
    this.initializeNetworks()
  }

  private initializeNetworks(): void {
    // Initialize neural network weights (simplified implementation)
    // In a real implementation, you'd use TensorFlow.js or similar
    this.onlineNetwork = this.createNetwork()
    this.targetNetwork = this.createNetwork()
    this.updateTargetNetwork()
  }

  private createNetwork(): number[][] {
    const layers = [this.config.inputSize, ...this.config.hiddenLayers, this.config.outputSize]
    const network: number[][] = []

    for (let i = 0; i < layers.length - 1; i++) {
      const weights: number[] = []
      const connectionCount = layers[i] * layers[i + 1]
      
      for (let j = 0; j < connectionCount; j++) {
        // Xavier initialization
        weights.push((Math.random() - 0.5) * 2 * Math.sqrt(6 / (layers[i] + layers[i + 1])))
      }
      network.push(weights)
    }

    return network
  }

  public predict(state: MarketState): ModelPrediction {
    const stateVector = this.encodeState(state)
    const qValues = this.forwardPass(this.onlineNetwork, stateVector)
    
    // Epsilon-greedy action selection
    let action: TradingAction
    let confidence: number

    if (Math.random() < this.epsilon) {
      // Exploration: random action
      action = this.getRandomAction(state.itemId)
      confidence = this.epsilon
    } else {
      // Exploitation: best Q-value action
      action = this.getBestAction(state.itemId, qValues)
      confidence = 1 - this.epsilon
    }

    const expectedReturn = Math.max(...qValues)
    const riskAssessment = this.calculateRisk(state, action)

    return {
      action,
      qValues,
      confidence,
      expectedReturn,
      riskAssessment
    }
  }

  private encodeState(state: MarketState): number[] {
    // Normalize state values to [0, 1] range
    return [
      state.price / 10000000, // Normalize price (assuming max 10M GP)
      state.volume / 1000, // Normalize volume
      state.spread / 100, // Normalize spread percentage
      state.volatility / 10, // Normalize volatility
      (state.rsi - 50) / 50, // Normalize RSI to [-1, 1]
      state.macd / 1000, // Normalize MACD
      state.trend === 'UP' ? 1 : state.trend === 'DOWN' ? -1 : 0,
      (Date.now() - state.timestamp) / (24 * 60 * 60 * 1000) // Time decay (days)
    ]
  }

  private forwardPass(network: number[][], input: number[]): number[] {
    let current = [...input]
    
    for (let layerIndex = 0; layerIndex < network.length; layerIndex++) {
      const weights = network[layerIndex]
      const inputSize = current.length
      const outputSize = weights.length / inputSize
      const nextLayer: number[] = []

      for (let i = 0; i < outputSize; i++) {
        let sum = 0
        for (let j = 0; j < inputSize; j++) {
          sum += current[j] * weights[i * inputSize + j]
        }
        // ReLU activation for hidden layers, linear for output
        nextLayer.push(layerIndex < network.length - 1 ? Math.max(0, sum) : sum)
      }
      current = nextLayer
    }

    return current
  }

  private getRandomAction(itemId: number): TradingAction {
    const actions = ['BUY', 'SELL', 'HOLD'] as const
    const actionType = actions[Math.floor(Math.random() * actions.length)]
    
    return {
      type: actionType,
      itemId,
      quantity: Math.floor(Math.random() * 100) + 1,
      price: Math.floor(Math.random() * 1000000) + 1000,
      confidence: Math.random(),
      reason: 'Random exploration'
    }
  }

  private getBestAction(itemId: number, qValues: number[]): TradingAction {
    const actionIndex = qValues.indexOf(Math.max(...qValues))
    const actions = ['BUY', 'SELL', 'HOLD'] as const
    
    return {
      type: actions[actionIndex] || 'HOLD',
      itemId,
      quantity: Math.floor(Math.abs(qValues[actionIndex]) * 10) + 1,
      price: Math.floor(Math.abs(qValues[actionIndex]) * 100000) + 1000,
      confidence: Math.max(...qValues) / (Math.max(...qValues) + Math.abs(Math.min(...qValues)) + 1),
      reason: `Q-value based decision (${qValues[actionIndex].toFixed(3)})`
    }
  }

  private calculateRisk(state: MarketState, action: TradingAction): number {
    let risk = 0

    // Volatility risk
    risk += state.volatility * 0.3

    // Spread risk
    risk += state.spread * 0.2

    // Action size risk
    risk += (action.quantity / 100) * 0.2

    // Market condition risk
    if (state.trend === 'DOWN' && action.type === 'BUY') risk += 0.3
    if (state.trend === 'UP' && action.type === 'SELL') risk += 0.3

    return Math.min(1, Math.max(0, risk))
  }

  public memorizeExperience(experience: AgentMemory): void {
    this.memory.push(experience)
    
    // Keep memory within bounds
    if (this.memory.length > this.config.memorySize) {
      this.memory.shift()
    }
  }

  public trainOnBatch(): number {
    if (this.memory.length < this.config.batchSize) {
      return 0
    }

    // Sample random batch from memory
    const batch = this.sampleBatch()
    let totalLoss = 0

    for (const experience of batch) {
      const currentQ = this.forwardPass(this.onlineNetwork, this.encodeState(experience.state))
      const nextQ = this.forwardPass(this.targetNetwork, this.encodeState(experience.nextState))
      
      // Bellman equation: Q(s,a) = r + γ * max(Q(s',a'))
      const targetValue = experience.reward + 
        (experience.done ? 0 : this.config.gamma * Math.max(...nextQ))
      
      const actionIndex = this.getActionIndex(experience.action)
      const currentValue = currentQ[actionIndex]
      
      const loss = Math.pow(targetValue - currentValue, 2)
      totalLoss += loss

      // Gradient descent update (simplified)
      this.updateWeights(experience, targetValue, currentValue)
    }

    // Update epsilon
    this.updateEpsilon()
    
    // Update target network periodically
    if (this.totalSteps % Math.floor(1 / this.config.tau) === 0) {
      this.updateTargetNetwork()
    }

    this.totalSteps++
    return totalLoss / batch.length
  }

  private sampleBatch(): AgentMemory[] {
    const batch: AgentMemory[] = []
    const batchSize = Math.min(this.config.batchSize, this.memory.length)
    
    for (let i = 0; i < batchSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.memory.length)
      batch.push(this.memory[randomIndex])
    }
    
    return batch
  }

  private getActionIndex(action: TradingAction): number {
    switch (action.type) {
      case 'BUY': return 0
      case 'SELL': return 1
      case 'HOLD': return 2
      default: return 2
    }
  }

  private updateWeights(_experience: AgentMemory, targetValue: number, currentValue: number): void {
    // Simplified gradient descent (in real implementation, use automatic differentiation)
    const error = targetValue - currentValue
    const learningRate = this.config.learningRate
    
    // Update weights based on error (simplified backpropagation)
    for (let layerIndex = 0; layerIndex < this.onlineNetwork.length; layerIndex++) {
      for (let weightIndex = 0; weightIndex < this.onlineNetwork[layerIndex].length; weightIndex++) {
        this.onlineNetwork[layerIndex][weightIndex] += learningRate * error * 0.01
      }
    }
  }

  private updateEpsilon(): void {
    this.epsilon = Math.max(
      this.config.epsilonMin,
      this.epsilon * this.config.epsilonDecay
    )
  }

  private updateTargetNetwork(): void {
    // Copy weights from online network to target network
    this.targetNetwork = this.onlineNetwork.map(layer => [...layer])
  }

  public calculateReward(
    previousState: MarketState,
    action: TradingAction,
    currentState: MarketState,
    tradeExecuted: boolean,
    profit?: number
  ): RewardFunction {
    let profitReward = 0
    let timeReward = 0
    let riskPenalty = 0
    let spreadReward = 0

    if (tradeExecuted && profit !== undefined) {
      // Primary reward: actual profit
      profitReward = profit / 1000 // Scale down for neural network

      // Time efficiency reward
      const timeDiff = currentState.timestamp - previousState.timestamp
      timeReward = Math.max(0, 10 - timeDiff / (60 * 1000)) // Reward faster trades

      // Risk penalty
      const risk = this.calculateRisk(previousState, action)
      riskPenalty = -risk * 5

      // Spread capture reward
      if (action.type === 'BUY' && profit > 0) {
        spreadReward = Math.min(5, previousState.spread * 0.1)
      }
    } else {
      // Holding or failed trade penalties/rewards
      if (action.type === 'HOLD') {
        // Small positive reward for holding in uncertain conditions
        timeReward = previousState.volatility > 5 ? 1 : -0.5
      } else {
        // Penalty for failed trades
        profitReward = -2
      }
    }

    const totalReward = profitReward + timeReward + riskPenalty + spreadReward

    return {
      profitReward,
      timeReward,
      riskPenalty,
      spreadReward,
      totalReward
    }
  }

  public getModelStats() {
    return {
      epsilon: this.epsilon,
      memorySize: this.memory.length,
      totalSteps: this.totalSteps,
      totalEpisodes: this.totalEpisodes,
      networkLayers: this.config.hiddenLayers.length + 2,
      learningRate: this.config.learningRate
    }
  }

  public saveModel(): string {
    // In a real implementation, you'd serialize the model properly
    return JSON.stringify({
      config: this.config,
      onlineNetwork: this.onlineNetwork,
      epsilon: this.epsilon,
      totalSteps: this.totalSteps,
      version: Date.now().toString()
    })
  }

  public loadModel(modelData: string): void {
    try {
      const data = JSON.parse(modelData)
      this.config = data.config
      this.onlineNetwork = data.onlineNetwork
      this.targetNetwork = data.onlineNetwork.map((layer: number[]) => [...layer])
      this.epsilon = data.epsilon
      this.totalSteps = data.totalSteps
    } catch (error) {
      console.error('Failed to load model:', error)
    }
  }
}