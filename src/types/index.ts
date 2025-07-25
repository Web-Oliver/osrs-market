export interface OSRSItem {
  id: number
  name: string
  description?: string
  icon?: string
  members: boolean
  tradeable: boolean
  stackable: boolean
  noted: boolean
  highalch?: number
  lowalch?: number
  cost?: number
  grandExchange: boolean
}

export interface PriceData {
  high: number | null
  highTime?: number
  low: number | null
  lowTime?: number
  timestamp?: number
}

export interface ItemPrice extends OSRSItem {
  priceData: PriceData
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

// Re-export AI trading types
export type {
  TradeOutcome,
  MarketState,
  TradingAction,
  RewardFunction,
  AgentMemory,
  NeuralNetworkConfig,
  TrainingMetrics,
  ModelPrediction,
  LearningSession,
  AdaptiveLearningConfig
} from './aiTrading'