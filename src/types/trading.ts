export interface TechnicalIndicators {
  rsi: number
  macd: {
    line: number
    signal: number
    histogram: number
  }
  bollinger: {
    upper: number
    middle: number
    lower: number
  }
  ema12: number
  ema26: number
  sma20: number
}

export interface MarketSignal {
  type: 'BUY' | 'SELL' | 'HOLD'
  strength: number // 0-1
  indicators: TechnicalIndicators
  confidence: number // 0-1
  timestamp: number
}

export interface FlippingOpportunity {
  itemId: number
  itemName: string
  buyPrice: number
  sellPrice: number
  spreadPercentage: number
  profitGP: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  volume: number
  timeToFlip: number // estimated minutes
  roi: number // return on investment percentage
}

export interface TradingStrategy {
  id: string
  name: string
  description: string
  targetItems: number[]
  minProfitMargin: number
  maxRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  capitalRequirement: number
  expectedDailyROI: number
}

export interface PortfolioPosition {
  itemId: number
  itemName: string
  quantity: number
  averageBuyPrice: number
  currentPrice: number
  unrealizedPnL: number
  realizedPnL: number
  holdingPeriod: number // days
}

export interface TradingPerformance {
  totalTrades: number
  winRate: number
  totalProfit: number
  averageProfitPerTrade: number
  roi: number
  sharpeRatio: number
  maxDrawdown: number
  profitFactor: number
}

export interface MarketWatch {
  itemId: number
  itemName: string
  targetBuyPrice: number
  targetSellPrice: number
  alertEnabled: boolean
  strategy: string
  createdAt: number
}

export interface PriceAlert {
  id: string
  itemId: number
  itemName: string
  alertType: 'PRICE_DROP' | 'PRICE_RISE' | 'SPREAD_OPPORTUNITY'
  targetPrice: number
  currentPrice: number
  triggered: boolean
  createdAt: number
  triggeredAt?: number
}