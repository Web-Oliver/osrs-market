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
    try {
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
    } catch (error) {
      this.logger.error('❌ Error starting trade', error, { tradeId });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Complete a trade and calculate outcome
   */
  completeTrade(tradeId, finalPrice, finalMarketState, success) {
    try {
      const activeTrade = this.activeTrades.get(tradeId);
      if (!activeTrade) {
        this.logger.warn('⚠️ Attempted to complete non-existent trade', { tradeId });
        return null;
      }

      const duration = Date.now() - activeTrade.startTime;
      const profit = this.calculateProfit(activeTrade, finalPrice, success);
      const outcome = this.calculateOutcome(activeTrade, finalPrice, finalMarketState, success, profit);

      // Move from active to completed
      this.activeTrades.delete(tradeId);
      this.completedTrades.push(outcome);

      // Update performance metrics
      this.updatePerformanceMetrics(outcome);

      this.logger.info('✅ Trade completed', {
        tradeId,
        success,
        profit: profit.toFixed(2),
        duration: duration.toFixed(0) + 'ms',
        finalPrice,
        profitMargin: ((profit / activeTrade.initialPrice) * 100).toFixed(2) + '%'
      });

      return outcome;
    } catch (error) {
      this.logger.error('❌ Error completing trade', error, { tradeId });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Calculate initial risk assessment
   */
  calculateInitialRisk(action, marketState) {
    let risk = 0;

    // Base risk from action type
    switch (action.type) {
    case 'BUY':
      risk += 0.3;
      break;
    case 'SELL':
      risk += 0.3;
      break;
    case 'HOLD':
      risk += 0.1;
      break;
    }

    // Market volatility risk
    risk += (marketState.volatility / 100) * 0.3;

    // Spread risk
    risk += (marketState.spread / 100) * 0.2;

    // Trend risk
    if (marketState.trend === 'DOWN' && action.type === 'BUY') {
      risk += 0.2;
    }
    if (marketState.trend === 'UP' && action.type === 'SELL') {
      risk += 0.2;
    }

    // RSI risk
    if (marketState.rsi > 70 && action.type === 'BUY') {
      risk += 0.1;
    }
    if (marketState.rsi < 30 && action.type === 'SELL') {
      risk += 0.1;
    }

    return Math.min(1, Math.max(0, risk));
  }

  /**
   * Context7 Pattern: Calculate trade profit/loss
   */
  calculateProfit(trade, finalPrice, success) {
    if (!success) {
      return -50;
    } // Fixed loss for failed trades

    const { action, initialPrice } = trade;
    let profit = 0;

    switch (action.type) {
    case 'BUY':
      // Profit if price goes up
      profit = (finalPrice - initialPrice) * action.quantity;
      break;
    case 'SELL':
      // Profit if price goes down
      profit = (initialPrice - finalPrice) * action.quantity;
      break;
    case 'HOLD':
      // Small profit for holding (avoiding bad trades)
      profit = 10;
      break;
    }

    // Apply trading fees (simplified)
    const fees = Math.abs(profit) * 0.01; // 1% fee
    profit -= fees;

    return profit;
  }

  /**
   * Context7 Pattern: Calculate comprehensive trade outcome
   */
  calculateOutcome(trade, finalPrice, finalMarketState, success, profit) {
    const duration = Date.now() - trade.startTime;
    const priceChange = finalPrice - trade.initialPrice;
    const priceChangePercent = (priceChange / trade.initialPrice) * 100;

    return {
      id: trade.id,
      action: trade.action,
      initialMarketState: trade.marketState,
      finalMarketState,
      startTime: trade.startTime,
      endTime: Date.now(),
      duration,
      initialPrice: trade.initialPrice,
      finalPrice,
      priceChange,
      priceChangePercent,
      success,
      profit,
      profitMargin: (profit / trade.initialPrice) * 100,
      initialRisk: trade.initialRisk,
      actualRisk: success ? 0 : 1,
      riskRewardRatio: profit > 0 ? profit / Math.abs(profit) : 0,
      efficiency: profit / (duration / 1000), // Profit per second
      timestamp: Date.now()
    };
  }

  /**
   * Context7 Pattern: Update performance metrics
   */
  updatePerformanceMetrics(outcome) {
    try {
      this.performanceMetrics.totalTrades++;

      if (outcome.success) {
        this.performanceMetrics.successfulTrades++;
      }

      if (outcome.profit > 0) {
        this.performanceMetrics.totalProfit += outcome.profit;
        this.performanceMetrics.peakProfit = Math.max(this.performanceMetrics.peakProfit, this.performanceMetrics.totalProfit);
        this.performanceMetrics.currentDrawdown = 0;
      } else {
        this.performanceMetrics.totalLoss += Math.abs(outcome.profit);
        this.performanceMetrics.currentDrawdown += Math.abs(outcome.profit);
        this.performanceMetrics.maxDrawdown = Math.max(this.performanceMetrics.maxDrawdown, this.performanceMetrics.currentDrawdown);
      }

      this.logger.debug('📊 Performance metrics updated', {
        totalTrades: this.performanceMetrics.totalTrades,
        successRate: (this.performanceMetrics.successfulTrades / this.performanceMetrics.totalTrades * 100).toFixed(1) + '%',
        totalProfit: this.performanceMetrics.totalProfit.toFixed(2),
        currentDrawdown: this.performanceMetrics.currentDrawdown.toFixed(2)
      });
    } catch (error) {
      this.logger.error('❌ Error updating performance metrics', error);
    }
  }

  /**
   * Context7 Pattern: Calculate performance metrics for a time period
   */
  calculatePerformanceMetrics(timeRange = null) {
    try {
      let trades = this.completedTrades;

      if (timeRange) {
        const cutoff = Date.now() - timeRange;
        trades = trades.filter(trade => trade.timestamp >= cutoff);
      }

      if (trades.length === 0) {
        return {
          totalTrades: 0,
          successfulTrades: 0,
          successRate: 0,
          totalProfit: 0,
          totalLoss: 0,
          netProfit: 0,
          averageProfit: 0,
          averageLoss: 0,
          maxDrawdown: 0,
          profitFactor: 0,
          sharpeRatio: 0,
          winRate: 0,
          averageDuration: 0,
          bestTrade: null,
          worstTrade: null
        };
      }

      const totalTrades = trades.length;
      const successfulTrades = trades.filter(t => t.success).length;
      const successRate = (successfulTrades / totalTrades) * 100;

      const profits = trades.filter(t => t.profit > 0).map(t => t.profit);
      const losses = trades.filter(t => t.profit < 0).map(t => Math.abs(t.profit));

      const totalProfit = profits.reduce((sum, p) => sum + p, 0);
      const totalLoss = losses.reduce((sum, l) => sum + l, 0);
      const netProfit = totalProfit - totalLoss;

      const averageProfit = profits.length > 0 ? totalProfit / profits.length : 0;
      const averageLoss = losses.length > 0 ? totalLoss / losses.length : 0;
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

      const allProfits = trades.map(t => t.profit);
      const avgReturn = allProfits.reduce((sum, p) => sum + p, 0) / allProfits.length;
      const variance = allProfits.reduce((sum, p) => sum + Math.pow(p - avgReturn, 2), 0) / allProfits.length;
      const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;

      const winRate = (profits.length / totalTrades) * 100;
      const averageDuration = trades.reduce((sum, t) => sum + t.duration, 0) / trades.length;

      const bestTrade = trades.reduce((best, current) =>
        current.profit > best.profit ? current : best
      );
      const worstTrade = trades.reduce((worst, current) =>
        current.profit < worst.profit ? current : worst
      );

      // Calculate running drawdown
      let runningProfit = 0;
      let maxRunningProfit = 0;
      let maxDrawdown = 0;

      for (const trade of trades) {
        runningProfit += trade.profit;
        maxRunningProfit = Math.max(maxRunningProfit, runningProfit);
        const currentDrawdown = maxRunningProfit - runningProfit;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }

      const metrics = {
        totalTrades,
        successfulTrades,
        successRate,
        totalProfit,
        totalLoss,
        netProfit,
        averageProfit,
        averageLoss,
        maxDrawdown,
        profitFactor,
        sharpeRatio,
        winRate,
        averageDuration,
        bestTrade,
        worstTrade
      };

      this.logger.debug('📊 Performance metrics calculated', {
        totalTrades,
        successRate: successRate.toFixed(1) + '%',
        netProfit: netProfit.toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2)
      });

      return metrics;
    } catch (error) {
      this.logger.error('❌ Error calculating performance metrics', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get trade analytics by market condition
   */
  getTradeAnalyticsByMarketCondition() {
    try {
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
    } catch (error) {
      this.logger.error('❌ Error calculating trade analytics by market condition', error);
      throw error;
    }
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
    try {
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
    } catch (error) {
      this.logger.error('❌ Error cancelling trade', error, { tradeId });
      return false;
    }
  }

  /**
   * Context7 Pattern: Reset all tracking data
   */
  reset() {
    this.activeTrades.clear();
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

    this.logger.info('🔄 Trade outcome tracker reset');
  }

  /**
   * Context7 Pattern: Export trade data
   */
  exportTradeData() {
    return {
      activeTrades: Array.from(this.activeTrades.values()),
      completedTrades: this.completedTrades,
      performanceMetrics: this.performanceMetrics,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Context7 Pattern: Import trade data
   */
  importTradeData(data) {
    try {
      if (data.activeTrades) {
        this.activeTrades.clear();
        data.activeTrades.forEach(trade => {
          this.activeTrades.set(trade.id, trade);
        });
      }

      if (data.completedTrades) {
        this.completedTrades = data.completedTrades;
      }

      if (data.performanceMetrics) {
        this.performanceMetrics = data.performanceMetrics;
      }

      this.logger.info('📥 Trade data imported successfully', {
        activeTrades: this.activeTrades.size,
        completedTrades: this.completedTrades.length
      });
    } catch (error) {
      this.logger.error('❌ Error importing trade data', error);
      throw error;
    }
  }
}

module.exports = { TradeOutcomeTrackerService };
