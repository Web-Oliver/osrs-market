import type { TechnicalIndicators, MarketSignal, FlippingOpportunity } from '../types/trading'
import type { PriceData } from '../types'

export class TradingAnalysisService {
  
  static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1]
      if (change > 0) {
        gains += change
      } else {
        losses += Math.abs(change)
      }
    }
    
    let avgGain = gains / period
    let avgLoss = losses / period
    
    // Calculate RSI for remaining periods using smoothed averages
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      const gain = change > 0 ? change : 0
      const loss = change < 0 ? Math.abs(change) : 0
      
      avgGain = ((avgGain * (period - 1)) + gain) / period
      avgLoss = ((avgLoss * (period - 1)) + loss) / period
    }
    
    if (avgLoss === 0) return 100
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }
  
  static calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0
    if (prices.length === 1) return prices[0]
    
    const multiplier = 2 / (period + 1)
    let ema = prices[0]
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
  }
  
  static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices.reduce((a, b) => a + b, 0) / prices.length
    
    const recentPrices = prices.slice(-period)
    return recentPrices.reduce((a, b) => a + b, 0) / period
  }
  
  static calculateMACD(prices: number[]): { line: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const macdLine = ema12 - ema26
    
    // For signal line, we'd need to calculate EMA of MACD line over time
    // Simplified version - using current MACD as approximation
    const signalLine = macdLine * 0.8 // Simplified signal calculation
    const histogram = macdLine - signalLine
    
    return {
      line: macdLine,
      signal: signalLine,
      histogram: histogram
    }
  }
  
  static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
    const sma = this.calculateSMA(prices, period)
    
    if (prices.length < period) {
      return {
        upper: sma,
        middle: sma,
        lower: sma
      }
    }
    
    const recentPrices = prices.slice(-period)
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    }
  }
  
  static calculateTechnicalIndicators(prices: number[]): TechnicalIndicators {
    const rsi = this.calculateRSI(prices)
    const macd = this.calculateMACD(prices)
    const bollinger = this.calculateBollingerBands(prices)
    const ema12 = this.calculateEMA(prices, 12)
    const ema26 = this.calculateEMA(prices, 26)
    const sma20 = this.calculateSMA(prices, 20)
    
    return {
      rsi,
      macd,
      bollinger,
      ema12,
      ema26,
      sma20
    }
  }
  
  static generateMarketSignal(indicators: TechnicalIndicators, priceData: PriceData): MarketSignal {
    const signals: Array<{ type: 'BUY' | 'SELL' | 'HOLD'; weight: number }> = []
    
    // RSI signals
    if (indicators.rsi < 30) {
      signals.push({ type: 'BUY', weight: 0.3 })
    } else if (indicators.rsi > 70) {
      signals.push({ type: 'SELL', weight: 0.3 })
    } else {
      signals.push({ type: 'HOLD', weight: 0.1 })
    }
    
    // MACD signals
    if (indicators.macd.histogram > 0 && indicators.macd.line > indicators.macd.signal) {
      signals.push({ type: 'BUY', weight: 0.25 })
    } else if (indicators.macd.histogram < 0) {
      signals.push({ type: 'SELL', weight: 0.25 })
    } else {
      signals.push({ type: 'HOLD', weight: 0.1 })
    }
    
    // Bollinger Bands signals
    const high = priceData.high || 0
    const low = priceData.low || 0
    const currentPrice = (high + low) / 2
    if (currentPrice < indicators.bollinger.lower) {
      signals.push({ type: 'BUY', weight: 0.2 })
    } else if (currentPrice > indicators.bollinger.upper) {
      signals.push({ type: 'SELL', weight: 0.2 })
    } else {
      signals.push({ type: 'HOLD', weight: 0.1 })
    }
    
    // Calculate weighted signal
    const buyWeight = signals.filter(s => s.type === 'BUY').reduce((sum, s) => sum + s.weight, 0)
    const sellWeight = signals.filter(s => s.type === 'SELL').reduce((sum, s) => sum + s.weight, 0)
    const holdWeight = signals.filter(s => s.type === 'HOLD').reduce((sum, s) => sum + s.weight, 0)
    
    let dominantSignal: 'BUY' | 'SELL' | 'HOLD'
    let strength: number
    
    if (buyWeight > sellWeight && buyWeight > holdWeight) {
      dominantSignal = 'BUY'
      strength = buyWeight
    } else if (sellWeight > holdWeight) {
      dominantSignal = 'SELL'
      strength = sellWeight
    } else {
      dominantSignal = 'HOLD'
      strength = holdWeight
    }
    
    // Calculate confidence based on signal consistency
    const totalWeight = buyWeight + sellWeight + holdWeight
    const confidence = Math.max(buyWeight, sellWeight, holdWeight) / totalWeight
    
    return {
      type: dominantSignal,
      strength,
      indicators,
      confidence,
      timestamp: Date.now()
    }
  }
  
  static identifyFlippingOpportunity(
    itemId: number,
    itemName: string,
    priceData: PriceData,
    volume: number = 1000,
    minProfitMargin: number = 5
  ): FlippingOpportunity | null {
    const { high, low } = priceData
    
    if (!high || !low || high <= low) return null
    
    const spreadGP = high - low
    const spreadPercentage = (spreadGP / low) * 100
    
    if (spreadPercentage < minProfitMargin) return null
    
    // Estimate risk level based on spread and volatility
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    if (spreadPercentage > 20) {
      riskLevel = 'HIGH'
    } else if (spreadPercentage > 10) {
      riskLevel = 'MEDIUM'
    } else {
      riskLevel = 'LOW'
    }
    
    // Estimate time to flip based on volume and spread
    const timeToFlip = Math.max(5, Math.min(120, 60 / Math.log(volume + 1)))
    
    // Calculate ROI (simplified)
    const roi = (spreadGP / low) * 100
    
    return {
      itemId,
      itemName,
      buyPrice: low,
      sellPrice: high,
      spreadPercentage,
      profitGP: spreadGP,
      riskLevel,
      volume,
      timeToFlip,
      roi
    }
  }
  
  static calculateSpreadPercentage(high: number | null, low: number | null): number {
    if (!high || !low || low === 0) return 0
    return ((high - low) / low) * 100
  }
  
  static isProfitableFlip(spreadPercentage: number, minMargin: number = 5): boolean {
    return spreadPercentage >= minMargin
  }
}