import { useState, useCallback } from 'react'
import type { FlippingOpportunity, MarketSignal, TradingPerformance } from '../types/trading'
import type { ItemPrice } from '../types'
import { useAITradingBackend } from './useAITradingBackend'

export function useMarketAnalysis() {
  const [opportunities, setOpportunities] = useState<FlippingOpportunity[]>([])
  const [signals, setSignals] = useState<Map<number, MarketSignal>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use the backend API hook
  const backend = useAITradingBackend()

  const analyzeItems = useCallback(async (items: ItemPrice[]) => {
    setLoading(true)
    setError(null)
    
    try {
      // Generate trading signals using the backend
      const tradingSignals = await backend.generateTradingSignals(items)
      
      if (tradingSignals.length > 0) {
        const newOpportunities: FlippingOpportunity[] = []
        const newSignals = new Map<number, MarketSignal>()
        
        for (const signal of tradingSignals) {
          // Convert backend trading signal to frontend format
          const marketSignal: MarketSignal = {
            type: signal.signal.type,
            strength: signal.signal.strength,
            confidence: signal.signal.confidence,
            timestamp: signal.signal.timestamp,
            indicators: signal.indicators,
            recommendation: signal.signal.type === 'BUY' ? 'BUY' : 
                           signal.signal.type === 'SELL' ? 'SELL' : 'HOLD',
            priceTarget: signal.flippingOpportunity?.buyPrice || 0,
            stopLoss: signal.flippingOpportunity?.sellPrice || 0,
            volume: signal.flippingOpportunity?.expectedVolume || 0
          }
          
          newSignals.set(signal.itemId, marketSignal)
          
          // Convert flipping opportunity if available
          if (signal.flippingOpportunity) {
            const opportunity: FlippingOpportunity = {
              itemId: signal.itemId,
              itemName: signal.itemName,
              buyPrice: signal.flippingOpportunity.buyPrice,
              sellPrice: signal.flippingOpportunity.sellPrice,
              potentialProfit: signal.flippingOpportunity.potentialProfit,
              roi: signal.flippingOpportunity.roi,
              riskLevel: signal.flippingOpportunity.riskLevel,
              marketCap: signal.flippingOpportunity.marketCap,
              volume: signal.flippingOpportunity.expectedVolume,
              spread: signal.flippingOpportunity.spread,
              volatility: signal.analysis.volatility,
              trendStrength: signal.analysis.trendStrength,
              timeToFlip: signal.flippingOpportunity.timeToFlip,
              competition: signal.flippingOpportunity.competition,
              lastUpdated: signal.signal.timestamp
            }
            
            newOpportunities.push(opportunity)
          }
        }
        
        // Sort opportunities by profit potential
        newOpportunities.sort((a, b) => b.roi - a.roi)
        
        setOpportunities(newOpportunities)
        setSignals(newSignals)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed')
    } finally {
      setLoading(false)
    }
  }, [backend])

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

  const calculatePortfolioMetrics = useCallback((positions: Array<{
    unrealizedPnL: number;
    [key: string]: unknown;
  }>): TradingPerformance => {
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
    loading: loading || backend.isLoading,
    error: error || backend.error,
    analyzeItems,
    getTopOpportunities,
    getSignalForItem,
    filterOpportunitiesByRisk,
    calculatePortfolioMetrics,
    
    // Additional methods from backend
    clearError: () => {
      setError(null)
      backend.clearError()
    }
  }
}