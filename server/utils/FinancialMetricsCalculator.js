/**
 * 📊 Financial Metrics Calculator - Context7 Optimized
 *
 * Context7 Pattern: Centralized Financial Metrics Calculation System
 * - Single responsibility for all raw financial calculations
 * - DRY principle - consolidates duplicate calculation logic
 * - Used by MarketDataService and TradingAnalysisService
 * - Integrates with GE tax system for accurate profit calculations
 * - Supports technical indicators and risk metrics
 *
 * SOLID Principles:
 * - SRP: Single responsibility for metric calculations
 * - OCP: Open for extension with new indicators
 * - DIP: Depends on marketConstants abstraction
 */

const {
  calculateProfitAfterTax,
  calculateGETax,
  calculateNetSellPrice,
  isTaxFree
} = require('./marketConstants');

const { Logger } = require('./Logger');


class FinancialMetricsCalculator {
  constructor() {
    this.logger = new Logger('FinancialMetricsCalculator');
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Context7 Pattern: Calculate all derived metrics for a market snapshot
   *
   * This is the primary method for calculating all financial metrics
   * from raw market data. It returns a comprehensive object with all
   * calculated values that can be stored in MarketPriceSnapshotModel.
   *
   * @param {Object} rawData - Raw market data with itemId, highPrice, lowPrice, volume, etc.
   * @param {Array} historicalData - Optional historical data for trend analysis
   * @returns {Object} Complete set of calculated metrics
   */
  calculateAllMetrics(rawData, historicalData = []) {
    try {
      this.logger.debug('Calculating all metrics for item', {
        itemId: rawData.itemId,
        highPrice: rawData.highPrice,
        lowPrice: rawData.lowPrice,
        volume: rawData.volume
      });

      // Validate input data
      if (!rawData.itemId || !rawData.highPrice || !rawData.lowPrice) {
        throw new Error('Missing required fields: itemId, highPrice, lowPrice');
      }

      if (rawData.highPrice < rawData.lowPrice) {
        throw new Error('High price cannot be less than low price');
      }

      const metrics = {
        // Basic price metrics
        averagePrice: this.calculateAveragePrice(rawData.highPrice, rawData.lowPrice),
        priceSpread: this.calculatePriceSpread(rawData.highPrice, rawData.lowPrice),
        priceSpreadPercent: this.calculatePriceSpreadPercent(rawData.highPrice, rawData.lowPrice),

        // GE Tax calculations
        geTaxAmount: calculateGETax(rawData.highPrice),
        isTaxFree: isTaxFree(rawData.highPrice),
        netSellPrice: calculateNetSellPrice(rawData.highPrice),

        // Profit calculations (with GE tax)
        grossProfitGp: rawData.highPrice - rawData.lowPrice,
        grossProfitPercent: this.calculateGrossProfitPercent(rawData.lowPrice, rawData.highPrice),
        marginGp: calculateProfitAfterTax(rawData.lowPrice, rawData.highPrice),
        marginPercent: calculateProfitPercentageAfterTax(rawData.lowPrice, rawData.highPrice),

        // Volume and liquidity metrics
        volume: rawData.volume || 0,
        volumeScore: this.calculateVolumeScore(rawData.volume || 0),
        liquidityRating: this.calculateLiquidityRating(rawData.volume || 0, rawData.highPrice),

        // Risk metrics
        volatility: this.calculateVolatility(rawData.highPrice, rawData.lowPrice),
        riskScore: this.calculateRiskScore(rawData, historicalData),

        // Trading metrics
        velocity: this.calculateVelocity(rawData.volume || 0, rawData.highPrice, rawData.lowPrice),
        expectedProfitPerHour: this.calculateExpectedProfitPerHour(rawData, historicalData),
        profitPerGeSlot: calculateProfitAfterTax(rawData.lowPrice, rawData.highPrice), // Assuming 1 item per slot

        // Technical indicators (if historical data available)
        ...this.calculateTechnicalIndicators(rawData, historicalData),

        // Market momentum
        momentumScore: this.calculateMomentumScore(rawData, historicalData),

        // Quality metrics
        confidence: this.calculateConfidence(rawData, historicalData),
        dataQuality: this.calculateDataQuality(rawData)
      };

      // Round numerical values to appropriate precision
      Object.keys(metrics).forEach(key => {
        if (typeof metrics[key] === 'number' && !Number.isInteger(metrics[key])) {
          metrics[key] = Math.round(metrics[key] * 100) / 100;
        }
      });

      this.logger.debug('Successfully calculated all metrics', {
        itemId: rawData.itemId,
        marginGp: metrics.marginGp,
        marginPercent: metrics.marginPercent,
        riskScore: metrics.riskScore,
        expectedProfitPerHour: metrics.expectedProfitPerHour
      });

      return metrics;
    } catch (error) {
      // Error handling moved to centralized manager - context: Error calculating metrics
      throw error;
    }
  }

  /**
   * Context7 Pattern: Calculate average price
   */
  calculateAveragePrice(highPrice, lowPrice) {
    return (highPrice + lowPrice) / 2;
  }

  /**
   * Context7 Pattern: Calculate price spread
   */
  calculatePriceSpread(highPrice, lowPrice) {
    return highPrice - lowPrice;
  }

  /**
   * Context7 Pattern: Calculate price spread percentage
   */
  calculatePriceSpreadPercent(highPrice, lowPrice) {
    const average = this.calculateAveragePrice(highPrice, lowPrice);
    return average > 0 ? (this.calculatePriceSpread(highPrice, lowPrice) / average) * 100 : 0;
  }

  /**
   * Context7 Pattern: Calculate gross profit percentage (before tax)
   */
  calculateGrossProfitPercent(buyPrice, sellPrice) {
    const grossProfit = sellPrice - buyPrice;
    return buyPrice > 0 ? (grossProfit / buyPrice) * 100 : 0;
  }

  /**
   * Context7 Pattern: Calculate volume score (0-100)
   */
  calculateVolumeScore(volume) {
    if (volume <= 0) {
      return 0;
    }

    // Logarithmic scale for volume scoring
    const logVolume = Math.log10(volume + 1);
    const maxLogVolume = Math.log10(1000000); // Assume 1M as max reasonable volume

    return Math.min(100, (logVolume / maxLogVolume) * 100);
  }

  /**
   * Context7 Pattern: Calculate liquidity rating
   */
  calculateLiquidityRating(volume, price) {
    if (volume <= 0 || price <= 0) {
      return 'very_low';
    }

    const volumeValue = volume * price;

    if (volumeValue >= 100000000) {
      return 'very_high';
    } // 100M+
    if (volumeValue >= 10000000) {
      return 'high';
    } // 10M+
    if (volumeValue >= 1000000) {
      return 'medium';
    } // 1M+
    if (volumeValue >= 100000) {
      return 'low';
    } // 100K+
    return 'very_low';
  }

  /**
   * Context7 Pattern: Calculate market volatility
   */
  calculateVolatility(highPrice, lowPrice) {
    const average = this.calculateAveragePrice(highPrice, lowPrice);
    if (average === 0) {
      return 0;
    }

    const spread = this.calculatePriceSpread(highPrice, lowPrice);
    return (spread / average) * 100;
  }

  /**
   * Context7 Pattern: Calculate risk score (0-100, higher = riskier)
   */
  calculateRiskScore(rawData, historicalData = []) {
    let riskScore = 0;

    // Volatility risk (0-40 points)
    const volatility = this.calculateVolatility(rawData.highPrice, rawData.lowPrice);
    riskScore += Math.min(40, volatility);

    // Volume risk (0-20 points) - low volume = higher risk
    const volumeScore = this.calculateVolumeScore(rawData.volume || 0);
    riskScore += Math.max(0, 20 - (volumeScore * 0.2));

    // Price level risk (0-20 points) - very high or very low prices = higher risk
    const avgPrice = this.calculateAveragePrice(rawData.highPrice, rawData.lowPrice);
    if (avgPrice > 100000000) {
      riskScore += 15;
    } // Very expensive items
    if (avgPrice < 100) {
      riskScore += 10;
    } // Very cheap items

    // Historical trend risk (0-20 points)
    if (historicalData.length >= 2) {
      const trendRisk = this.calculateTrendRisk(historicalData);
      riskScore += Math.min(20, trendRisk);
    }

    return Math.min(100, riskScore);
  }

  /**
   * Context7 Pattern: Calculate trading velocity
   */
  calculateVelocity(volume, highPrice, lowPrice) {
    if (volume <= 0) {
      return 0;
    }

    const avgPrice = this.calculateAveragePrice(highPrice, lowPrice);
    const volumeValue = volume * avgPrice;

    // Velocity based on volume value turnover
    // Higher volume value = faster trading = higher velocity
    const velocityScore = Math.min(100, Math.log10(volumeValue + 1) * 10);

    return velocityScore;
  }

  /**
   * Context7 Pattern: Calculate expected profit per hour
   */
  calculateExpectedProfitPerHour(rawData, historicalData = []) {
    const marginGp = calculateProfitAfterTax(rawData.lowPrice, rawData.highPrice);
    const velocity = this.calculateVelocity(rawData.volume || 0, rawData.highPrice, rawData.lowPrice);
    const riskScore = this.calculateRiskScore(rawData, historicalData);

    // Base calculation: profit * velocity factor * risk adjustment
    const velocityFactor = velocity / 100; // Convert to 0-1 range
    const riskAdjustment = (100 - riskScore) / 100; // Lower risk = higher multiplier

    const expectedProfit = marginGp * velocityFactor * riskAdjustment;

    // Estimate trades per hour based on volume
    const volumeScore = this.calculateVolumeScore(rawData.volume || 0);
    const tradesPerHour = Math.min(10, volumeScore / 10); // Max 10 trades per hour

    return expectedProfit * tradesPerHour;
  }

  /**
   * Context7 Pattern: Calculate technical indicators
   */
  calculateTechnicalIndicators(rawData, historicalData = []) {
    const indicators = {};

    if (historicalData.length >= 5) {
      // Moving averages
      indicators.trendMovingAverage = this.calculateMovingAverage(historicalData, 5);

      // RSI
      if (historicalData.length >= 14) {
        indicators.rsi = this.calculateRSI(historicalData, 14);
      }

      // MACD
      if (historicalData.length >= 26) {
        indicators.macd = this.calculateMACD(historicalData);
      }

      // Bollinger Bands
      if (historicalData.length >= 20) {
        const bollinger = this.calculateBollingerBands(historicalData, 20);
        indicators.bollingerUpper = bollinger.upper;
        indicators.bollingerLower = bollinger.lower;
        indicators.bollingerMiddle = bollinger.middle;
      }
    }

    return indicators;
  }

  /**
   * Context7 Pattern: Calculate momentum score
   */
  calculateMomentumScore(rawData, historicalData = []) {
    if (historicalData.length < 2) {
      return 0;
    }

    const currentPrice = this.calculateAveragePrice(rawData.highPrice, rawData.lowPrice);
    const previousPrice = historicalData[historicalData.length - 2];

    if (!previousPrice || typeof previousPrice !== 'number') {
      return 0;
    }

    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

    // Momentum score: -100 to +100
    return Math.max(-100, Math.min(100, priceChange * 5));
  }

  /**
   * Context7 Pattern: Calculate confidence level
   */
  calculateConfidence(rawData, historicalData = []) {
    let confidence = 0.5; // Base confidence

    // Data completeness
    if (rawData.volume > 0) {
      confidence += 0.2;
    }
    if (rawData.highPrice > 0 && rawData.lowPrice > 0) {
      confidence += 0.2;
    }

    // Historical data availability
    if (historicalData.length >= 10) {
      confidence += 0.1;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Context7 Pattern: Calculate data quality score
   */
  calculateDataQuality(rawData) {
    let quality = 0;

    // Price data quality
    if (rawData.highPrice > 0 && rawData.lowPrice > 0) {
      quality += 30;
    }
    if (rawData.highPrice >= rawData.lowPrice) {
      quality += 20;
    }

    // Volume data quality
    if (rawData.volume !== undefined && rawData.volume >= 0) {
      quality += 20;
    }

    // Timestamp quality
    if (rawData.timestamp && rawData.timestamp > 0) {
      quality += 15;
    }

    // Source quality
    if (rawData.source && rawData.source !== 'unknown') {
      quality += 15;
    }

    return Math.min(100, quality);
  }

  /**
   * Context7 Pattern: Calculate moving average
   */
  calculateMovingAverage(historicalData, period) {
    if (historicalData.length < period) {
      return null;
    }

    const recentData = historicalData.slice(-period);
    const sum = recentData.reduce((acc, value) => acc + (typeof value === 'number' ? value : 0), 0);

    return sum / period;
  }

  /**
   * Context7 Pattern: Calculate RSI (Relative Strength Index)
   */
  calculateRSI(historicalData, period = 14) {
    if (historicalData.length < period + 1) {
      return null;
    }

    const prices = historicalData.slice(-period - 1);
    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains.push(change);
        losses.push(0);
      } else {
        gains.push(0);
        losses.push(Math.abs(change));
      }
    }

    const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
    const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.max(0, Math.min(100, rsi));
  }

  /**
   * Context7 Pattern: Calculate MACD
   */
  calculateMACD(historicalData, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (historicalData.length < slowPeriod) {
      return null;
    }

    const fastEMA = this.calculateEMA(historicalData, fastPeriod);
    const slowEMA = this.calculateEMA(historicalData, slowPeriod);

    if (fastEMA === null || slowEMA === null) {
      return null;
    }

    const macdLine = fastEMA - slowEMA;

    return {
      macd: macdLine,
      signal: 0, // Simplified - would need more complex calculation
      histogram: macdLine
    };
  }

  /**
   * Context7 Pattern: Calculate Bollinger Bands
   */
  calculateBollingerBands(historicalData, period = 20, stdDev = 2) {
    if (historicalData.length < period) {
      return null;
    }

    const recentData = historicalData.slice(-period);
    const sma = this.calculateMovingAverage(recentData, period);

    if (sma === null) {
      return null;
    }

    const variance = recentData.reduce((acc, price) => {
      const diff = price - sma;
      return acc + (diff * diff);
    }, 0) / period;

    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  /**
   * Context7 Pattern: Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(historicalData, period) {
    if (historicalData.length < period) {
      return null;
    }

    const multiplier = 2 / (period + 1);
    const prices = historicalData.slice(-period);

    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Context7 Pattern: Calculate trend risk
   */
  calculateTrendRisk(historicalData) {
    if (historicalData.length < 2) {
      return 0;
    }

    const changes = [];
    for (let i = 1; i < historicalData.length; i++) {
      const change = ((historicalData[i] - historicalData[i - 1]) / historicalData[i - 1]) * 100;
      changes.push(change);
    }

    // Calculate volatility of changes
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
    const volatilityRisk = Math.sqrt(variance);

    return Math.min(20, volatilityRisk);
  }

  /**
   * Context7 Pattern: Batch calculate metrics for multiple items
   */
  batchCalculateMetrics(items, historicalDataMap = {}) {
    const results = [];

    for (const item of items) {
      try {
        const historicalData = historicalDataMap[item.itemId] || [];
        const metrics = this.calculateAllMetrics(item, historicalData);
        results.push({
          itemId: item.itemId,
          metrics,
          success: true
        });
      } catch (error) {
        // Error handling moved to centralized manager - context: Error calculating metrics for item
        results.push({
          itemId: item.itemId,
          error: error.message,
          success: false
        });
      }
    }

    this.logger.info('Batch metric calculation completed', {
      totalItems: items.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Context7 Pattern: Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.debug('Financial metrics cache cleared');
  }

  /**
   * Context7 Pattern: Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 1000, // Theoretical max
      timeout: this.cacheTimeout
    };
  }
}

module.exports = { FinancialMetricsCalculator };
