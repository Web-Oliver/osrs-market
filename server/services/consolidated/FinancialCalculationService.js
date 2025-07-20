/**
 * 🧮 Consolidated Financial Calculation Service - Context7 Pattern
 * 
 * DRY Principle Implementation:
 * - Single source of truth for ALL financial calculations
 * - Eliminates duplicate volatility, RSI, and moving average calculations
 * - Consolidates calculation logic from PriceCalculator, FinancialMetricsCalculator, and TradingAnalysisService
 * 
 * SOLID Principles Applied:
 * - SRP: Single responsibility for financial calculations only
 * - OCP: Open for extension with new calculation methods
 * - DIP: Implements IFinancialCalculator interface
 * - ISP: Focused interface without unnecessary dependencies
 */

const { IFinancialCalculator } = require('../../abstractions/IFinancialCalculator');
const {
  calculateProfitAfterTax,
  calculateGETax,
  calculateNetSellPrice,
  isTaxFree
} = require('../../utils/marketConstants');
const { Logger } = require('../../utils/Logger');


class FinancialCalculationService extends IFinancialCalculator {
  constructor() {
    super();
    this.logger = new Logger('FinancialCalculationService');
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * CONSOLIDATED: Calculate volatility (eliminates 3 duplicate implementations)
   * Used by: PriceCalculator, FinancialMetricsCalculator, TradingAnalysisService
   */
  calculateVolatility(highPrice, lowPrice) {
    if (!highPrice || !lowPrice || highPrice <= 0 || lowPrice <= 0) {
      return 0;
    }

    if (highPrice < lowPrice) {
      [highPrice, lowPrice] = [lowPrice, highPrice]; // Swap if needed
    }

    const midPrice = (highPrice + lowPrice) / 2;
    const volatility = ((highPrice - lowPrice) / midPrice) * 100;
    
    return Math.round(volatility * 100) / 100; // Round to 2 decimal places
  }

  /**
   * CONSOLIDATED: Calculate RSI (eliminates 2 duplicate implementations)
   * Used by: PriceCalculator, FinancialMetricsCalculator
   */
  calculateRSI(prices, period = 14) {
    if (!Array.isArray(prices) || prices.length < period + 1) {
      return 50; // Neutral RSI for insufficient data
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for remaining periods
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }

    if (avgLoss === 0) {
      return 100; // All gains, no losses
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate moving average (eliminates 2 duplicate implementations)
   * Used by: PriceCalculator, FinancialMetricsCalculator
   */
  calculateMovingAverage(values, period) {
    if (!Array.isArray(values) || values.length < period) {
      return 0;
    }

    const relevantValues = values.slice(-period); // Get last 'period' values
    const sum = relevantValues.reduce((acc, val) => acc + (val || 0), 0);
    
    return Math.round((sum / period) * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate profit margin with GE tax (eliminates multiple implementations)
   * Used by: PriceCalculator, FinancialMetricsCalculator, MarketDataService
   */
  calculateProfitMargin(buyPrice, sellPrice, itemId) {
    if (!buyPrice || !sellPrice || buyPrice <= 0 || sellPrice <= 0) {
      return {
        marginGp: 0,
        marginPercent: 0,
        profitAfterTax: 0,
        taxAmount: 0,
        netSellPrice: sellPrice || 0
      };
    }

    const netSellPrice = calculateNetSellPrice(sellPrice, itemId);
    const taxAmount = calculateGETax(sellPrice, itemId);
    const profitAfterTax = netSellPrice - buyPrice;
    const marginGp = profitAfterTax;
    const marginPercent = (profitAfterTax / buyPrice) * 100;

    return {
      marginGp: Math.round(marginGp),
      marginPercent: Math.round(marginPercent * 100) / 100,
      profitAfterTax: Math.round(profitAfterTax),
      taxAmount: Math.round(taxAmount),
      netSellPrice: Math.round(netSellPrice)
    };
  }

  /**
   * CONSOLIDATED: Calculate MACD indicator
   * Used by: TradingAnalysisService
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!Array.isArray(prices) || prices.length < slowPeriod) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine = fastEMA - slowEMA;

    // For signal line, we would need historical MACD values
    // For now, return simplified calculation
    const signal = macdLine * 0.9; // Simplified signal approximation
    const histogram = macdLine - signal;

    return {
      macd: Math.round(macdLine * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100
    };
  }

  /**
   * CONSOLIDATED: Calculate Exponential Moving Average
   * Helper method for MACD and other indicators
   */
  calculateEMA(prices, period) {
    if (!Array.isArray(prices) || prices.length < period) {
      return 0;
    }

    const multiplier = 2 / (period + 1);
    let ema = prices[0]; // Start with first price

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * CONSOLIDATED: Calculate Bollinger Bands
   * Used by: TradingAnalysisService
   */
  calculateBollingerBands(prices, period = 20, multiplier = 2) {
    if (!Array.isArray(prices) || prices.length < period) {
      return { upper: 0, middle: 0, lower: 0 };
    }

    const middle = this.calculateMovingAverage(prices, period);
    const relevantPrices = prices.slice(-period);
    
    // Calculate standard deviation
    const variance = relevantPrices.reduce((acc, price) => {
      const diff = price - middle;
      return acc + (diff * diff);
    }, 0) / period;
    
    const stdDev = Math.sqrt(variance);
    
    const upper = middle + (stdDev * multiplier);
    const lower = middle - (stdDev * multiplier);

    return {
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(middle * 100) / 100,
      lower: Math.round(lower * 100) / 100
    };
  }

  /**
   * CONSOLIDATED: Calculate alchemy profit (eliminates 4+ duplicate implementations)
   * Used by: ItemMappingService, ItemDomainService, TradingDecisionService, AutoTrainingService
   */
  calculateAlchemyProfit(highalch, value, includeRuneCost = true) {
    if (!highalch || !value || highalch <= 0 || value <= 0) {
      return 0;
    }

    const natureRuneCost = includeRuneCost ? 200 : 0; // Nature rune cost
    const profit = Math.max(0, highalch - value - natureRuneCost);
    
    return Math.round(profit * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate profit margin percentage
   * Used by: Multiple services for profit margin calculations
   */
  calculateProfitMarginPercentage(profit, investment) {
    if (!investment || investment <= 0) {
      return 0;
    }
    
    const margin = (profit / investment) * 100;
    return Math.round(margin * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate business value score
   * Combines item value with profit potential
   */
  calculateBusinessValue(value, alchemyProfit, multiplier = 2) {
    if (!value || value <= 0) {
      return 0;
    }
    
    const adjustedProfit = alchemyProfit || 0;
    return Math.round((value + (adjustedProfit * multiplier)) * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate spread percentage
   * Used by: TradingDecisionService, AutoTrainingService, SmartItemSelectorService
   */
  calculateSpreadPercentage(highPrice, lowPrice) {
    if (!highPrice || !lowPrice || lowPrice <= 0) {
      return 0;
    }

    if (highPrice < lowPrice) {
      [highPrice, lowPrice] = [lowPrice, highPrice]; // Swap if needed
    }

    const spread = ((highPrice - lowPrice) / lowPrice) * 100;
    return Math.round(spread * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate price change percentage
   * Used by: SmartItemSelectorService, TradingAnalysisService, MonitoringService
   */
  calculatePriceChangePercentage(currentPrice, previousPrice) {
    if (!currentPrice || !previousPrice || previousPrice <= 0) {
      return 0;
    }

    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    return Math.round(changePercent * 100) / 100;
  }

  /**
   * CONSOLIDATED: Calculate price momentum
   * Used for trend analysis across multiple services
   */
  calculatePriceMomentum(prices, periods = 3) {
    if (!Array.isArray(prices) || prices.length < periods + 1) {
      return 0;
    }

    const recent = prices.slice(-periods);
    const older = prices.slice(-periods * 2, -periods);
    
    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, price) => sum + price, 0) / recent.length;
    const olderAvg = older.reduce((sum, price) => sum + price, 0) / older.length;

    return this.calculatePriceChangePercentage(recentAvg, olderAvg);
  }

  /**
   * CONSOLIDATED: Calculate risk score
   * Used by: TradingDecisionService, RiskManagementService, AutoTrainingService
   */
  calculateRiskScore(itemData) {
    let riskScore = 0;

    // Volume risk
    if (!itemData.volume || itemData.volume < 100) riskScore += 30;
    else if (itemData.volume < 500) riskScore += 20;
    else if (itemData.volume < 1000) riskScore += 10;

    // Volatility risk  
    const volatility = itemData.volatility || 0;
    if (volatility > 50) riskScore += 25;
    else if (volatility > 25) riskScore += 15;
    else if (volatility > 10) riskScore += 5;

    // Price level risk
    const price = itemData.highPrice || itemData.price || 0;
    if (price > 1000000000) riskScore += 20; // Very expensive items
    else if (price < 1000) riskScore += 15; // Very cheap items (potential manipulation)

    // Spread risk
    if (itemData.highPrice && itemData.lowPrice) {
      const spread = this.calculateSpreadPercentage(itemData.highPrice, itemData.lowPrice);
      if (spread > 20) riskScore += 20;
      else if (spread > 10) riskScore += 10;
    }

    return Math.min(100, Math.max(0, riskScore)); // Clamp between 0-100
  }

  /**
   * CONSOLIDATED: Calculate all financial metrics
   * Master method that consolidates all calculations
   */
  calculateAllMetrics(rawData, historicalData = []) {
    this.errorManager.handleAsync(async () => {
const {
        itemId,
        highPrice,
        lowPrice,
        volume = 0,
        timestamp = Date.now()
      } = rawData;

      // Basic validation
      if (!highPrice || !lowPrice) {
        throw new Error('Missing required price data');
      }

      // Core calculations using consolidated methods
      const volatility = this.calculateVolatility(highPrice, lowPrice);
      const profitMargin = this.calculateProfitMargin(lowPrice, highPrice, itemId);
      
      // Historical analysis (if data available)
      let rsi = 50;
      let movingAverage = (highPrice + lowPrice) / 2;
      let macd = { macd: 0, signal: 0, histogram: 0 };
      let bollingerBands = { upper: highPrice, middle: movingAverage, lower: lowPrice };

      if (historicalData.length > 0) {
        const prices = historicalData.map(d => d.avgPrice || (d.highPrice + d.lowPrice) / 2);
        rsi = this.calculateRSI(prices);
        movingAverage = this.calculateMovingAverage(prices, Math.min(20, prices.length));
        macd = this.calculateMACD(prices);
        bollingerBands = this.calculateBollingerBands(prices);
      }

      // Risk assessment
      const riskScore = Math.min(25 + (volatility * 0.5) + (volume < 100 ? 20 : 0), 100);

      return {
        // Basic market data
        itemId,
        highPrice: Math.round(highPrice),
        lowPrice: Math.round(lowPrice),
        avgPrice: Math.round((highPrice + lowPrice) / 2),
        volume,
        timestamp,

        // Calculated metrics
        marginGp: profitMargin.marginGp,
        marginPercent: profitMargin.marginPercent,
        profitAfterTax: profitMargin.profitAfterTax,
        taxAmount: profitMargin.taxAmount,
        
        // Technical indicators
        volatility,
        rsi,
        movingAverage: Math.round(movingAverage),
        
        // Advanced indicators
        macd: macd.macd,
        macdSignal: macd.signal,
        macdHistogram: macd.histogram,
        bollingerUpper: bollingerBands.upper,
        bollingerMiddle: bollingerBands.middle,
        bollingerLower: bollingerBands.lower,

        // Risk and opportunity metrics
        riskScore: Math.round(riskScore),
        expectedProfitPerHour: Math.round(profitMargin.marginGp * 20),
        
        // Metadata
        calculatedAt: new Date(),
        calculatorVersion: '1.0.0'
      };
    }, 'operation', { logSuccess: false })
  }

  /**
   * Clear calculation cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.debug('Calculation cache cleared');
  }
}

module.exports = { FinancialCalculationService };