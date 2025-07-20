/**
 * 📋 Trade Outcome Tracker Service - Context7 Optimized
 *
 * Context7 Pattern: Service Layer for Trade Outcome Tracking
 * - Tracks trade lifecycle from initiation to completion
 * - Calculates performance metrics and analytics
 * - Provides trade outcome analysis and reporting
 * - DRY principles with reusable tracking patterns
 * - SOLID architecture with single responsibility
 */

const { BaseService } = require('./BaseService');

class TradeOutcomeTrackerService extends BaseService {
  constructor() {
    super('TradeOutcomeTrackerService', {
      enableCache: true,
      cachePrefix: 'trade_outcome',
      cacheTTL: 300, // 5 minutes for trade outcomes
      enableMongoDB: true // Store trade outcomes
    });

    this.activeTrades = new Map();
    this.completedTrades = [];
    this.performanceMetrics = {
      totalTrades: 0,
      successfulTrades: 0,
      totalProfit: 0,
      totalLoss: 0,
      maxDrawdown: 0,
      currentDrawdown: 0,
      peakProfit: 0
    };

    this.logger.info('📋 Trade Outcome Tracker initialized');
  }

  /**
   * Context7 Pattern: Start tracking a new trade
   */
  startTrade(tradeId, action, marketState) {
    this.execute(async() => {
      const trade = {
        id: tradeId,
        action,
        marketState,
        startTime: Date.now(),
        status: 'ACTIVE',
        initialPrice: marketState.price,
        initialRisk: this.calculateInitialRisk(action, marketState)
      };

      this.activeTrades.set(tradeId, trade);

      this.logger.debug('🚀 Trade started', {
        tradeId,
        actionType: action.type,
        itemId: action.itemId,
        initialPrice: marketState.price,
        initialRisk: trade.initialRisk.toFixed(3)
      });

      return trade;
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Get trade analytics by market condition
   */
  getTradeAnalyticsByMarketCondition() {
    this.execute(async() => {
      const analytics = {
        byTrend: { UP: [], DOWN: [], FLAT: [] },
        byRSI: { oversold: [], overbought: [], neutral: [] },
        byVolatility: { low: [], medium: [], high: [] },
        bySpread: { tight: [], medium: [], wide: [] }
      };

      for (const trade of this.completedTrades) {
        const { initialMarketState } = trade;

        // By trend
        analytics.byTrend[initialMarketState.trend].push(trade);

        // By RSI
        if (initialMarketState.rsi < 30) {
          analytics.byRSI.oversold.push(trade);
        } else if (initialMarketState.rsi > 70) {
          analytics.byRSI.overbought.push(trade);
        } else {
          analytics.byRSI.neutral.push(trade);
        }

        // By volatility
        if (initialMarketState.volatility < 2) {
          analytics.byVolatility.low.push(trade);
        } else if (initialMarketState.volatility > 5) {
          analytics.byVolatility.high.push(trade);
        } else {
          analytics.byVolatility.medium.push(trade);
        }

        // By spread
        if (initialMarketState.spread < 5) {
          analytics.bySpread.tight.push(trade);
        } else if (initialMarketState.spread > 15) {
          analytics.bySpread.wide.push(trade);
        } else {
          analytics.bySpread.medium.push(trade);
        }
      }

      // Calculate success rates for each condition
      const result = {};
      for (const [category, conditions] of Object.entries(analytics)) {
        result[category] = {};
        for (const [condition, trades] of Object.entries(conditions)) {
          if (trades.length > 0) {
            const successfulTrades = trades.filter(t => t.success).length;
            const avgProfit = trades.reduce((sum, t) => sum + t.profit, 0) / trades.length;

            result[category][condition] = {
              totalTrades: trades.length,
              successfulTrades,
              successRate: (successfulTrades / trades.length) * 100,
              averageProfit: avgProfit,
              totalProfit: trades.reduce((sum, t) => sum + t.profit, 0)
            };
          }
        }
      }

      this.logger.debug('📊 Trade analytics by market condition calculated', {
        trendAnalysis: Object.keys(result.byTrend || {}).length,
        rsiAnalysis: Object.keys(result.byRSI || {}).length,
        volatilityAnalysis: Object.keys(result.byVolatility || {}).length,
        spreadAnalysis: Object.keys(result.bySpread || {}).length
      });

      return result;
    }, 'operation', { logSuccess: false });
  }

  /**
   * Context7 Pattern: Get all trade outcomes
   */
  getAllOutcomes() {
    return [...this.completedTrades];
  }

  /**
   * Context7 Pattern: Get active trades
   */
  getActiveTrades() {
    return Array.from(this.activeTrades.values());
  }

  /**
   * Context7 Pattern: Get outcomes count
   */
  getOutcomesCount() {
    return this.completedTrades.length;
  }

  /**
   * Context7 Pattern: Get trade statistics
   */
  getStats() {
    const activeTrades = this.activeTrades.size;
    const completedTrades = this.completedTrades.length;
    const totalTrades = activeTrades + completedTrades;

    return {
      activeTrades,
      completedTrades,
      totalTrades,
      currentPerformance: this.performanceMetrics,
      recentPerformance: this.calculatePerformanceMetrics(24 * 60 * 60 * 1000) // Last 24 hours
    };
  }

  /**
   * Context7 Pattern: Get trade by ID
   */
  getTradeById(tradeId) {
    // Check active trades first
    const activeTrade = this.activeTrades.get(tradeId);
    if (activeTrade) {
      return { ...activeTrade, status: 'ACTIVE' };
    }

    // Check completed trades
    const completedTrade = this.completedTrades.find(t => t.id === tradeId);
    if (completedTrade) {
      return { ...completedTrade, status: 'COMPLETED' };
    }

    return null;
  }

  /**
   * Context7 Pattern: Cancel active trade
   */
  cancelTrade(tradeId) {
    this.execute(async() => {
      const trade = this.activeTrades.get(tradeId);
      if (!trade) {
        this.logger.warn('⚠️ Attempted to cancel non-existent trade', { tradeId });
        return false;
      }

      this.activeTrades.delete(tradeId);

      // Add to completed trades as cancelled
      const cancelledOutcome = {
        ...trade,
        endTime: Date.now(),
        duration: Date.now() - trade.startTime,
        finalPrice: trade.initialPrice,
        success: false,
        profit: -25, // Cancellation fee
        status: 'CANCELLED'
      };

      this.completedTrades.push(cancelledOutcome);
      this.updatePerformanceMetrics(cancelledOutcome);

      this.logger.info('❌ Trade cancelled', { tradeId });
      return true;
    }, 'operation', { logSuccess: false });
  }
}

module.exports = { TradeOutcomeTrackerService };
