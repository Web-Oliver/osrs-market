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
  // Python AI integration fields
  python_action_code?: number // 0=BUY, 1=SELL, 2=HOLD
  python_model_id?: string
  prediction_time_ms?: number
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

// Python AI Service Integration Types
export interface PythonAiPrediction {
  action: number
  action_name: string
  confidence: number
  expected_return?: number
  q_values?: number[]
  model_id: string
  prediction_time_ms: number
  processed_features: number
}

export interface PythonAiTrainingSession {
  session_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  algorithm: string
  total_timesteps: number
  current_timestep: number
  learning_rate: number
  progress: number
  created_at: string
  updated_at: string
}

export interface PythonAiModelInfo {
  model_id: string
  model_name: string
  algorithm: string
  version: string
  status: 'production' | 'testing' | 'archived'
  training_date: string
  performance_metrics: {
    total_trades?: number
    success_rate?: number
    avg_profit?: number
    sharpe_ratio?: number
  }
  file_size_bytes: number
  created_at: string
  updated_at: string
}

export interface PythonAiHealth {
  status: 'healthy' | 'unhealthy' | 'degraded'
  version: string
  uptime: number
  memory_usage: {
    rss: number
    heap_used: number
    heap_total: number
  }
  model_loaded: boolean
  active_sessions: number
}

export interface EnhancedTrainingMetrics extends TrainingMetrics {
  // Python AI specific metrics
  python_session_id?: string
  algorithm?: string
  timesteps_completed?: number
  model_version?: string
  training_time_ms?: number
  memory_usage?: number
  gpu_utilization?: number
}

export interface EnhancedModelPrediction extends ModelPrediction {
  // Python AI specific prediction data
  python_model_id?: string
  processed_features?: number
  prediction_time_ms?: number
  action_name?: string
  feature_engineering_applied?: boolean
}