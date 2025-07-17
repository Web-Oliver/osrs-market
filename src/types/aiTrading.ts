export interface TradeOutcome {
  id: string
  itemId: number
  itemName: string
  buyPrice: number
  sellPrice: number
  quantity: number
  buyTime: number
  sellTime: number
  profit: number
  profitPercentage: number
  success: boolean
  marketCondition: 'BULLISH' | 'BEARISH' | 'SIDEWAYS'
  timeToComplete: number // minutes
}

export interface MarketState {
  itemId: number
  price: number
  volume: number
  spread: number
  volatility: number
  rsi: number
  macd: number
  trend: 'UP' | 'DOWN' | 'FLAT'
  timestamp: number
}

export interface TradingAction {
  type: 'BUY' | 'SELL' | 'HOLD'
  itemId: number
  quantity: number
  price: number
  confidence: number // 0-1
  reason: string
}

export interface RewardFunction {
  profitReward: number
  timeReward: number
  riskPenalty: number
  spreadReward: number
  totalReward: number
}

export interface AgentMemory {
  state: MarketState
  action: TradingAction
  reward: number
  nextState: MarketState
  done: boolean
}

export interface NeuralNetworkConfig {
  inputSize: number
  hiddenLayers: number[]
  outputSize: number
  learningRate: number
  batchSize: number
  memorySize: number
  epsilon: number
  epsilonDecay: number
  epsilonMin: number
  gamma: number // discount factor
  tau: number // target network update rate
}

export interface TrainingMetrics {
  episode: number
  totalReward: number
  averageReward: number
  epsilon: number
  loss: number
  tradesExecuted: number
  successRate: number
  profitability: number
  portfolioValue: number
  drawdown: number
}

export interface ModelPrediction {
  action: TradingAction
  qValues: number[]
  confidence: number
  expectedReturn: number
  riskAssessment: number
}

export interface LearningSession {
  id: string
  startTime: number
  endTime?: number
  episodeCount: number
  totalTrades: number
  totalProfit: number
  bestReward: number
  finalEpsilon: number
  modelVersion: string
  status: 'TRAINING' | 'COMPLETED' | 'PAUSED' | 'FAILED'
}

export interface AdaptiveLearningConfig {
  enableOnlineLearning: boolean
  learningFrequency: number // trades
  performanceThreshold: number
  adaptationRate: number
  memoryRetention: number // percentage of old memory to keep
  explorationBoost: boolean
}