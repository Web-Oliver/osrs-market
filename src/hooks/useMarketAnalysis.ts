import { useState, useCallback } from 'react'
import type { FlippingOpportunity, MarketSignal, TradingPerformance } from '../types/trading'
import type { ItemPrice } from '../types'
import { TradingAnalysisService } from '../services/tradingAnalysis'

export function useMarketAnalysis() {
  const [opportunities, setOpportunities] = useState<FlippingOpportunity[]>([])
  const [signals, setSignals] = useState<Map<number, MarketSignal>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyzeItems = useCallback(async (items: ItemPrice[]) => {
    setLoading(true)
    setError(null)
    
    try {
      const newOpportunities: FlippingOpportunity[] = []
      const newSignals = new Map<number, MarketSignal>()
      
      for (const item of items) {
        // Identify flipping opportunities
        const opportunity = TradingAnalysisService.identifyFlippingOpportunity(
          item.id,
          item.name,
          item.priceData,
          1000, // mock volume
          5 // min profit margin
        )
        
        if (opportunity) {
          newOpportunities.push(opportunity)
        }
        
        // Generate market signals (simplified - would need historical data)
        const low = item.priceData.low || 0
        const high = item.priceData.high || 0
        const mockPrices = [
          low,
          (low + high) / 2,
          high
        ].filter(price => price > 0)
        
        if (mockPrices.length > 0) {
          const indicators = TradingAnalysisService.calculateTechnicalIndicators(mockPrices)
          const signal = TradingAnalysisService.generateMarketSignal(indicators, item.priceData)
          newSignals.set(item.id, signal)
        }
      }
      
      // Sort opportunities by profit potential
      newOpportunities.sort((a, b) => b.roi - a.roi)
      
      setOpportunities(newOpportunities)
      setSignals(newSignals)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const getTopOpportunities = useCallback((limit: number = 10) => {
    return opportunities
      .filter(opp => opp.riskLevel !== 'HIGH')
      .slice(0, limit)
  }, [opportunities])

  const getSignalForItem = useCallback((itemId: number) => {
    return signals.get(itemId)
  }, [signals])

  const filterOpportunitiesByRisk = useCallback((riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') => {
    return opportunities.filter(opp => opp.riskLevel === riskLevel)
  }, [opportunities])

  const calculatePortfolioMetrics = useCallback((positions: any[]): TradingPerformance => {
    // Simplified calculation - would need real trade history
    const totalTrades = positions.length
    const profitableTrades = positions.filter(p => p.unrealizedPnL > 0).length
    const totalProfit = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0)
    
    return {
      totalTrades,
      winRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
      totalProfit,
      averageProfitPerTrade: totalTrades > 0 ? totalProfit / totalTrades : 0,
      roi: 0, // Would need initial capital
      sharpeRatio: 0, // Would need return variance
      maxDrawdown: 0, // Would need historical equity curve
      profitFactor: 0 // Would need loss data
    }
  }, [])

  return {
    opportunities,
    signals,
    loading,
    error,
    analyzeItems,
    getTopOpportunities,
    getSignalForItem,
    filterOpportunitiesByRisk,
    calculatePortfolioMetrics
  }
}