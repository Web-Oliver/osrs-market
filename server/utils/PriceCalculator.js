/**
 * 💰 Price Calculator - Context7 Optimized (Legacy Support)
 * 
 * Context7 Pattern: Legacy Price Analysis and Calculation System
 * - REFACTORED: Now uses FinancialMetricsCalculator for raw calculations
 * - Provides backward compatibility for existing code
 * - Maintains existing API while delegating to FinancialMetricsCalculator
 * - Profit margin calculations (with GE tax integration)
 * - Market volatility analysis
 * - Trading volume analysis
 * - Price trend calculations
 * - Technical indicators
 */

const { 
  calculateProfitAfterTax, 
  calculateProfitPercentageAfterTax, 
  calculateGETax,
  calculateNetSellPrice,
  isTaxFree,
  GE_TAX_RATE,
  GE_TAX_THRESHOLD_GP 
} = require('./marketConstants');

const { FinancialMetricsCalculator } = require('./FinancialMetricsCalculator');

class PriceCalculator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes cache
    this.metricsCalculator = new FinancialMetricsCalculator();
  }

  /**
   * Context7 Pattern: Calculate profit margin (with GE tax) - Legacy wrapper
   */
  calculateProfitMargin(item) {
    if (!item.priceData || !item.priceData.high || !item.priceData.low) {
      return 0;
    }
    
    // Convert item format to rawData format for FinancialMetricsCalculator
    const rawData = {
      itemId: item.itemId || 0,
      highPrice: item.priceData.high,
      lowPrice: item.priceData.low,
      volume: item.volume || 0,
      timestamp: Date.now(),
      interval: 'latest',
      source: 'legacy_price_calculator'
    };
    
    try {
      const metrics = this.metricsCalculator.calculateAllMetrics(rawData);
      return metrics.marginPercent || 0;
    } catch (error) {
      // Fallback to original calculation
      const buyPrice = item.priceData.low;
      const sellPrice = item.priceData.high;
      const profitAfterTax = calculateProfitAfterTax(buyPrice, sellPrice);
      return buyPrice > 0 ? (profitAfterTax / buyPrice) * 100 : 0;
    }
  }

  /**
   * Context7 Pattern: Calculate gross profit margin (before tax)
   */
  calculateGrossProfitMargin(item) {
    if (!item.priceData || !item.priceData.high || !item.priceData.low) {
      return 0;
    }
    
    const buyPrice = item.priceData.low;
    const sellPrice = item.priceData.high;
    const grossProfit = sellPrice - buyPrice;
    
    // Calculate gross margin as percentage of buy price
    return buyPrice > 0 ? (grossProfit / buyPrice) * 100 : 0;
  }

  /**
   * Context7 Pattern: Calculate profit breakdown including tax details
   */
  calculateProfitBreakdown(item) {
    if (!item.priceData || !item.priceData.high || !item.priceData.low) {
      return {
        buyPrice: 0,
        sellPrice: 0,
        grossProfit: 0,
        taxAmount: 0,
        netProfit: 0,
        grossMarginPercent: 0,
        netMarginPercent: 0,
        isTaxFree: false
      };
    }
    
    const buyPrice = item.priceData.low;
    const sellPrice = item.priceData.high;
    const grossProfit = sellPrice - buyPrice;
    const taxAmount = calculateGETax(sellPrice);
    const netProfit = calculateProfitAfterTax(buyPrice, sellPrice);
    const grossMarginPercent = buyPrice > 0 ? (grossProfit / buyPrice) * 100 : 0;
    const netMarginPercent = buyPrice > 0 ? (netProfit / buyPrice) * 100 : 0;
    
    return {
      buyPrice,
      sellPrice,
      grossProfit,
      taxAmount,
      netProfit,
      grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
      netMarginPercent: Math.round(netMarginPercent * 100) / 100,
      isTaxFree: isTaxFree(sellPrice)
    };
  }

  /**
   * Context7 Pattern: Calculate volatility - Legacy wrapper
   */
  calculateVolatility(item) {
    if (!item.priceData || !item.priceData.high || !item.priceData.low) {
      return 0;
    }
    
    // Convert item format to rawData format for FinancialMetricsCalculator
    const rawData = {
      itemId: item.itemId || 0,
      highPrice: item.priceData.high,
      lowPrice: item.priceData.low,
      volume: item.volume || 0,
      timestamp: Date.now(),
      interval: 'latest',
      source: 'legacy_price_calculator'
    };
    
    try {
      const metrics = this.metricsCalculator.calculateAllMetrics(rawData);
      return metrics.volatility || 0;
    } catch (error) {
      // Fallback to original calculation
      const high = item.priceData.high;
      const low = item.priceData.low;
      const midPrice = (high + low) / 2;
      
      if (midPrice === 0) return 0;
      
      const volatility = ((high - low) / midPrice) * 100;
      return Math.round(volatility * 100) / 100;
    }
  }

  /**
   * Context7 Pattern: Calculate trading volume
   */
  calculateTradingVolume(item) {
    if (!item.volume) {
      return 0;
    }
    
    const volume = typeof item.volume === 'number' ? item.volume : 0;
    const priceData = item.priceData;
    
    if (!priceData || !priceData.high) {
      return volume;
    }
    
    // Calculate volume-weighted average price impact
    const avgPrice = (priceData.high + priceData.low) / 2;
    const volumeScore = Math.min(100, (volume / 1000) * 10); // Normalize to 0-100
    
    return {
      volume,
      volumeScore,
      avgPrice,
      volumeValue: volume * avgPrice
    };
  }

  /**
   * Context7 Pattern: Calculate price change
   */
  calculatePriceChange(item, period = '24h') {
    if (!item.priceHistory || item.priceHistory.length < 2) {
      this.logger.warn('Insufficient price history for price change calculation', {
        itemId: item.itemId,
        period
      });
      return {
        absolute: 0,
        percentage: 0,
        direction: 'unknown'
      };
    }
    
    const currentPrice = item.priceData?.high || 0;
    const previousPrice = this.getPreviousPrice(item.priceHistory, period);
    
    if (previousPrice === 0) return {
      absolute: 0,
      percentage: 0,
      direction: 'unknown'
    };
    
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    return {
      absolute: change,
      percentage: Math.round(changePercent * 100) / 100,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  }

  /**
   * Context7 Pattern: Calculate trend
   */
  calculateTrend(item) {
    const priceChange = this.calculatePriceChange(item);
    const volatility = this.calculateVolatility(item);
    const volume = this.calculateTradingVolume(item);
    
    // Determine trend based on multiple factors
    let trend = 'stable';
    let strength = 0;
    
    if (priceChange.percentage > 5) {
      trend = 'bullish';
      strength = Math.min(100, Math.abs(priceChange.percentage) * 10);
    } else if (priceChange.percentage < -5) {
      trend = 'bearish';
      strength = Math.min(100, Math.abs(priceChange.percentage) * 10);
    } else {
      strength = 100 - Math.abs(priceChange.percentage) * 10;
    }
    
    // Adjust strength based on volatility
    if (volatility > 20) {
      strength *= 0.8; // High volatility reduces trend strength
    }
    
    return {
      direction: trend,
      strength: Math.round(strength),
      confidence: this.calculateTrendConfidence(priceChange, volatility, volume)
    };
  }

  /**
   * Context7 Pattern: Generate recommendation
   */
  generateRecommendation(item) {
    const profitMargin = this.calculateProfitMargin(item);
    const volatility = this.calculateVolatility(item);
    const trend = this.calculateTrend(item);
    const volume = this.calculateTradingVolume(item);
    
    let recommendation = 'hold';
    let confidence = 0;
    let reasoning = [];
    
    // Profit margin analysis
    if (profitMargin > 20) {
      recommendation = 'buy';
      confidence += 30;
      reasoning.push('High profit margin opportunity');
    } else if (profitMargin < 5) {
      recommendation = 'sell';
      confidence += 20;
      reasoning.push('Low profit margin');
    }
    
    // Trend analysis
    if (trend.direction === 'bullish' && trend.strength > 60) {
      recommendation = 'buy';
      confidence += 25;
      reasoning.push('Strong bullish trend');
    } else if (trend.direction === 'bearish' && trend.strength > 60) {
      recommendation = 'sell';
      confidence += 25;
      reasoning.push('Strong bearish trend');
    }
    
    // Volatility analysis
    if (volatility > 30) {
      confidence -= 20;
      reasoning.push('High volatility increases risk');
    } else if (volatility < 10) {
      confidence += 10;
      reasoning.push('Low volatility provides stability');
    }
    
    // Volume analysis
    const volumeData = typeof volume === 'object' ? volume : { volumeScore: 0 };
    if (volumeData.volumeScore > 50) {
      confidence += 15;
      reasoning.push('High trading volume indicates liquidity');
    }
    
    // Normalize confidence
    confidence = Math.max(0, Math.min(100, confidence));
    
    return {
      action: recommendation,
      confidence: Math.round(confidence),
      reasoning,
      riskLevel: this.calculateRiskLevel(profitMargin, volatility, trend),
      expectedReturn: this.calculateExpectedReturn(profitMargin, trend, volatility)
    };
  }

  /**
   * Context7 Pattern: Calculate moving average
   */
  calculateMovingAverage(history, index, period = 5) {
    if (!Array.isArray(history) || index < period - 1) {
      return null;
    }
    
    const startIndex = Math.max(0, index - period + 1);
    const endIndex = index + 1;
    const slice = history.slice(startIndex, endIndex);
    
    const sum = slice.reduce((acc, item) => {
      const price = item.priceData?.high || 0;
      return acc + price;
    }, 0);
    
    return sum / slice.length;
  }

  /**
   * Context7 Pattern: Calculate RSI (Relative Strength Index)
   */
  calculateRSI(history, index, period = 14) {
    if (!Array.isArray(history) || index < period) {
      return null;
    }
    
    const prices = history.slice(index - period, index + 1).map(item => item.priceData?.high || 0);
    const changes = [];
    
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const gains = changes.filter(change => change > 0);
    const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss));
    
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return Math.round(rsi * 100) / 100;
  }

  /**
   * Context7 Pattern: Calculate MACD
   */
  calculateMACD(history, index, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!Array.isArray(history) || index < slowPeriod) {
      return null;
    }
    
    const prices = history.slice(Math.max(0, index - slowPeriod), index + 1).map(item => item.priceData?.high || 0);
    
    if (prices.length < slowPeriod) {
      return null;
    }
    
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    
    const macdLine = fastEMA - slowEMA;
    
    return {
      macd: Math.round(macdLine * 100) / 100,
      signal: 0, // Simplified - would need more history for accurate signal line
      histogram: Math.round(macdLine * 100) / 100
    };
  }

  /**
   * Context7 Pattern: Calculate support level
   */
  calculateSupport(history, index, lookback = 20) {
    if (!Array.isArray(history) || index < lookback) {
      return null;
    }
    
    const recentPrices = history.slice(Math.max(0, index - lookback), index + 1);
    const lows = recentPrices.map(item => item.priceData?.low || 0).filter(price => price > 0);
    
    if (lows.length === 0) return null;
    
    const sortedLows = lows.sort((a, b) => a - b);
    const supportLevel = sortedLows[Math.floor(sortedLows.length * 0.2)]; // 20th percentile
    
    return Math.round(supportLevel * 100) / 100;
  }

  /**
   * Context7 Pattern: Calculate resistance level
   */
  calculateResistance(history, index, lookback = 20) {
    if (!Array.isArray(history) || index < lookback) {
      return null;
    }
    
    const recentPrices = history.slice(Math.max(0, index - lookback), index + 1);
    const highs = recentPrices.map(item => item.priceData?.high || 0).filter(price => price > 0);
    
    if (highs.length === 0) return null;
    
    const sortedHighs = highs.sort((a, b) => b - a);
    const resistanceLevel = sortedHighs[Math.floor(sortedHighs.length * 0.2)]; // 80th percentile
    
    return Math.round(resistanceLevel * 100) / 100;
  }

  /**
   * Context7 Pattern: Calculate trend direction
   */
  calculateTrendDirection(history, index, period = 10) {
    if (!Array.isArray(history) || index < period) {
      return 'unknown';
    }
    
    const recentPrices = history.slice(Math.max(0, index - period), index + 1);
    const prices = recentPrices.map(item => item.priceData?.high || 0);
    
    if (prices.length < 2) return 'unknown';
    
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'sideways';
  }

  /**
   * Context7 Pattern: Calculate trading score
   */
  calculateTradingScore(item, options = {}) {
    const profitMargin = this.calculateProfitMargin(item);
    const volatility = this.calculateVolatility(item);
    const volume = this.calculateTradingVolume(item);
    const trend = this.calculateTrend(item);
    
    let score = 0;
    
    // Profit margin score (0-40 points)
    score += Math.min(40, profitMargin * 2);
    
    // Trend score (0-30 points)
    if (trend.direction === 'bullish') {
      score += Math.min(30, trend.strength * 0.3);
    } else if (trend.direction === 'bearish') {
      score += Math.min(15, trend.strength * 0.15);
    }
    
    // Volume score (0-20 points)
    const volumeData = typeof volume === 'object' ? volume : { volumeScore: 0 };
    score += Math.min(20, volumeData.volumeScore * 0.2);
    
    // Volatility penalty (subtract up to 10 points)
    if (volatility > 20) {
      score -= Math.min(10, (volatility - 20) * 0.5);
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Context7 Pattern: Calculate profitability
   */
  calculateProfitability(summary) {
    if (!summary || !summary.totalProfit || !summary.totalVolume) {
      return 0;
    }
    
    const profitPerUnit = summary.totalProfit / summary.totalVolume;
    const profitMargin = summary.totalProfit / (summary.totalVolume * (summary.avgPrice || 1));
    
    return {
      profitPerUnit: Math.round(profitPerUnit * 100) / 100,
      profitMargin: Math.round(profitMargin * 10000) / 100, // Convert to percentage
      totalProfit: summary.totalProfit,
      efficiency: Math.min(100, profitMargin * 100)
    };
  }

  /**
   * Context7 Pattern: Calculate market health
   */
  calculateMarketHealth(summary) {
    let healthScore = 0;
    let factors = 0;
    
    // Volume health
    if (summary.totalVolume > 0) {
      const volumeHealth = Math.min(100, (summary.totalVolume / 10000) * 100);
      healthScore += volumeHealth;
      factors++;
    }
    
    // Price stability
    if (summary.maxPrice && summary.minPrice && summary.avgPrice) {
      const priceRange = summary.maxPrice - summary.minPrice;
      const stability = Math.max(0, 100 - (priceRange / summary.avgPrice) * 100);
      healthScore += stability;
      factors++;
    }
    
    // Liquidity (number of unique items)
    if (summary.uniqueItemsCount) {
      const liquidityScore = Math.min(100, (summary.uniqueItemsCount / 100) * 100);
      healthScore += liquidityScore;
      factors++;
    }
    
    const avgHealth = factors > 0 ? healthScore / factors : 0;
    
    return {
      score: Math.round(avgHealth),
      rating: this.getHealthRating(avgHealth),
      factors: {
        volume: summary.totalVolume || 0,
        stability: summary.maxPrice && summary.minPrice ? 
          ((summary.maxPrice - summary.minPrice) / summary.avgPrice) * 100 : 0,
        liquidity: summary.uniqueItemsCount || 0
      }
    };
  }

  /**
   * Context7 Pattern: Categorize item
   */
  categorizeItem(item) {
    const profitMargin = this.calculateProfitMargin(item);
    const volatility = this.calculateVolatility(item);
    const volume = this.calculateTradingVolume(item);
    
    if (profitMargin > 25 && volatility < 15) {
      return 'stable_profit';
    } else if (profitMargin > 15 && volatility > 25) {
      return 'high_risk_high_reward';
    } else if (profitMargin < 5 && volatility < 10) {
      return 'low_profit_stable';
    } else if (volatility > 30) {
      return 'highly_volatile';
    } else if (typeof volume === 'object' && volume.volumeScore > 70) {
      return 'high_volume';
    } else {
      return 'general';
    }
  }

  // Helper methods

  /**
   * Calculate exponential moving average
   */
  calculateEMA(prices, period) {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  /**
   * Get previous price from actual price history
   */
  getPreviousPrice(priceHistory, period) {
    if (!priceHistory || priceHistory.length < 2) {
      return 0;
    }
    
    const now = Date.now();
    let targetTime;
    
    switch (period) {
      case '1h':
        targetTime = now - (60 * 60 * 1000);
        break;
      case '24h':
        targetTime = now - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        targetTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        targetTime = now - (24 * 60 * 60 * 1000);
    }
    
    // Find the closest price point to the target time
    const previousPricePoint = priceHistory.find(point => 
      point.timestamp <= targetTime
    );
    
    return previousPricePoint ? previousPricePoint.priceData?.high || 0 : 0;
  }

  /**
   * Calculate trend confidence
   */
  calculateTrendConfidence(priceChange, volatility, volume) {
    let confidence = 50; // Base confidence
    
    // Price change impact
    confidence += Math.min(25, Math.abs(priceChange.percentage) * 2);
    
    // Volatility impact (high volatility reduces confidence)
    confidence -= Math.min(20, volatility);
    
    // Volume impact
    const volumeData = typeof volume === 'object' ? volume : { volumeScore: 0 };
    confidence += Math.min(15, volumeData.volumeScore * 0.15);
    
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Calculate risk level
   */
  calculateRiskLevel(profitMargin, volatility, trend) {
    let riskScore = 0;
    
    // Volatility risk
    riskScore += Math.min(40, volatility);
    
    // Trend risk
    if (trend.direction === 'bearish') {
      riskScore += Math.min(30, trend.strength * 0.3);
    }
    
    // Profit margin risk (low margins = higher risk)
    if (profitMargin < 10) {
      riskScore += 20;
    }
    
    if (riskScore > 60) return 'high';
    if (riskScore > 30) return 'medium';
    return 'low';
  }

  /**
   * Calculate expected return
   */
  calculateExpectedReturn(profitMargin, trend, volatility) {
    let expectedReturn = profitMargin;
    
    // Trend adjustment
    if (trend.direction === 'bullish') {
      expectedReturn += trend.strength * 0.1;
    } else if (trend.direction === 'bearish') {
      expectedReturn -= trend.strength * 0.1;
    }
    
    // Volatility adjustment
    expectedReturn *= (1 - volatility / 200); // Reduce return for high volatility
    
    return Math.round(expectedReturn * 100) / 100;
  }

  /**
   * Get health rating
   */
  getHealthRating(score) {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'critical';
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}

module.exports = { PriceCalculator };