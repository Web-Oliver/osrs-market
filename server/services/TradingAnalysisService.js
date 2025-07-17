/**
 * 📊 Trading Analysis Service - Context7 Optimized
 * 
 * Context7 Pattern: Service Layer for Technical Analysis
 * - Implements RSI, MACD, Bollinger Bands, EMA, SMA calculations
 * - Generates market signals and flipping opportunities
 * - Provides comprehensive technical indicators
 * - DRY principles with reusable analysis patterns
 * - SOLID architecture with single responsibility
 */

const { Logger } = require('../utils/Logger');

class TradingAnalysisService {
  constructor() {
    this.logger = new Logger('TradingAnalysis');
    this.logger.info('📊 Trading Analysis Service initialized');
  }

  /**
   * Context7 Pattern: Calculate RSI (Relative Strength Index)
   */
  calculateRSI(prices, period = 14) {
    try {
      if (prices.length < period + 1) return 50;
      
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
      
      // Calculate RSI for remaining periods using smoothed averages
      for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      }
      
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));

      this.logger.debug('📈 RSI calculated', {
        rsi: rsi.toFixed(2),
        avgGain: avgGain.toFixed(2),
        avgLoss: avgLoss.toFixed(2),
        period
      });

      return rsi;
    } catch (error) {
      this.logger.error('❌ Error calculating RSI', error);
      return 50; // Return neutral RSI on error
    }
  }
  
  /**
   * Context7 Pattern: Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(prices, period) {
    try {
      if (prices.length === 0) return 0;
      if (prices.length === 1) return prices[0];
      
      const multiplier = 2 / (period + 1);
      let ema = prices[0];
      
      for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
      }

      this.logger.debug('📊 EMA calculated', {
        ema: ema.toFixed(2),
        period,
        priceCount: prices.length
      });
      
      return ema;
    } catch (error) {
      this.logger.error('❌ Error calculating EMA', error);
      return 0;
    }
  }
  
  /**
   * Context7 Pattern: Calculate SMA (Simple Moving Average)
   */
  calculateSMA(prices, period) {
    try {
      if (prices.length < period) {
        return prices.reduce((a, b) => a + b, 0) / prices.length;
      }
      
      const recentPrices = prices.slice(-period);
      const sma = recentPrices.reduce((a, b) => a + b, 0) / period;

      this.logger.debug('📊 SMA calculated', {
        sma: sma.toFixed(2),
        period,
        priceCount: prices.length
      });
      
      return sma;
    } catch (error) {
      this.logger.error('❌ Error calculating SMA', error);
      return 0;
    }
  }
  
  /**
   * Context7 Pattern: Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(prices) {
    try {
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      const macdLine = ema12 - ema26;
      
      // For signal line, we'd need to calculate EMA of MACD line over time
      // Simplified version - using current MACD as approximation
      const signalLine = macdLine * 0.8; // Simplified signal calculation
      const histogram = macdLine - signalLine;

      const macd = {
        line: macdLine,
        signal: signalLine,
        histogram: histogram
      };

      this.logger.debug('📊 MACD calculated', {
        line: macd.line.toFixed(3),
        signal: macd.signal.toFixed(3),
        histogram: macd.histogram.toFixed(3)
      });
      
      return macd;
    } catch (error) {
      this.logger.error('❌ Error calculating MACD', error);
      return { line: 0, signal: 0, histogram: 0 };
    }
  }
  
  /**
   * Context7 Pattern: Calculate Bollinger Bands
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    try {
      const sma = this.calculateSMA(prices, period);
      
      if (prices.length < period) {
        return {
          upper: sma,
          middle: sma,
          lower: sma
        };
      }
      
      const recentPrices = prices.slice(-period);
      const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      const bands = {
        upper: sma + (standardDeviation * stdDev),
        middle: sma,
        lower: sma - (standardDeviation * stdDev)
      };

      this.logger.debug('📊 Bollinger Bands calculated', {
        upper: bands.upper.toFixed(2),
        middle: bands.middle.toFixed(2),
        lower: bands.lower.toFixed(2),
        stdDev: standardDeviation.toFixed(2)
      });
      
      return bands;
    } catch (error) {
      this.logger.error('❌ Error calculating Bollinger Bands', error);
      const fallback = this.calculateSMA(prices, Math.min(period, prices.length));
      return { upper: fallback, middle: fallback, lower: fallback };
    }
  }
  
  /**
   * Context7 Pattern: Calculate all technical indicators
   */
  calculateTechnicalIndicators(prices) {
    try {
      this.logger.debug('🔍 Calculating technical indicators', {
        priceCount: prices.length
      });

      const indicators = {
        rsi: this.calculateRSI(prices),
        macd: this.calculateMACD(prices),
        bollinger: this.calculateBollingerBands(prices),
        ema12: this.calculateEMA(prices, 12),
        ema26: this.calculateEMA(prices, 26),
        sma20: this.calculateSMA(prices, 20)
      };

      this.logger.debug('✅ Technical indicators calculated', {
        rsi: indicators.rsi.toFixed(2),
        macdLine: indicators.macd.line.toFixed(3),
        ema12: indicators.ema12.toFixed(2),
        bollingerMiddle: indicators.bollinger.middle.toFixed(2)
      });
      
      return indicators;
    } catch (error) {
      this.logger.error('❌ Error calculating technical indicators', error);
      // Return safe defaults
      return {
        rsi: 50,
        macd: { line: 0, signal: 0, histogram: 0 },
        bollinger: { upper: 0, middle: 0, lower: 0 },
        ema12: 0,
        ema26: 0,
        sma20: 0
      };
    }
  }
  
  /**
   * Context7 Pattern: Generate market signal from technical indicators
   */
  generateMarketSignal(indicators, priceData) {
    try {
      this.logger.debug('🎯 Generating market signal', {
        rsi: indicators.rsi,
        macdLine: indicators.macd.line,
        currentPrice: (priceData.high + priceData.low) / 2
      });

      const signals = [];
      
      // RSI signals
      if (indicators.rsi < 30) {
        signals.push({ type: 'BUY', weight: 0.3 });
      } else if (indicators.rsi > 70) {
        signals.push({ type: 'SELL', weight: 0.3 });
      } else {
        signals.push({ type: 'HOLD', weight: 0.1 });
      }
      
      // MACD signals
      if (indicators.macd.histogram > 0 && indicators.macd.line > indicators.macd.signal) {
        signals.push({ type: 'BUY', weight: 0.25 });
      } else if (indicators.macd.histogram < 0) {
        signals.push({ type: 'SELL', weight: 0.25 });
      } else {
        signals.push({ type: 'HOLD', weight: 0.1 });
      }
      
      // Bollinger Bands signals
      const high = priceData.high || 0;
      const low = priceData.low || 0;
      const currentPrice = (high + low) / 2;
      
      if (currentPrice < indicators.bollinger.lower) {
        signals.push({ type: 'BUY', weight: 0.2 });
      } else if (currentPrice > indicators.bollinger.upper) {
        signals.push({ type: 'SELL', weight: 0.2 });
      } else {
        signals.push({ type: 'HOLD', weight: 0.1 });
      }
      
      // Calculate weighted signal
      const buyWeight = signals.filter(s => s.type === 'BUY').reduce((sum, s) => sum + s.weight, 0);
      const sellWeight = signals.filter(s => s.type === 'SELL').reduce((sum, s) => sum + s.weight, 0);
      const holdWeight = signals.filter(s => s.type === 'HOLD').reduce((sum, s) => sum + s.weight, 0);
      
      let dominantSignal;
      let strength;
      
      if (buyWeight > sellWeight && buyWeight > holdWeight) {
        dominantSignal = 'BUY';
        strength = buyWeight;
      } else if (sellWeight > holdWeight) {
        dominantSignal = 'SELL';
        strength = sellWeight;
      } else {
        dominantSignal = 'HOLD';
        strength = holdWeight;
      }
      
      // Calculate confidence based on signal consistency
      const totalWeight = buyWeight + sellWeight + holdWeight;
      const confidence = Math.max(buyWeight, sellWeight, holdWeight) / totalWeight;
      
      const marketSignal = {
        type: dominantSignal,
        strength,
        indicators,
        confidence,
        timestamp: Date.now()
      };

      this.logger.debug('✅ Market signal generated', {
        signal: dominantSignal,
        strength: strength.toFixed(3),
        confidence: confidence.toFixed(3),
        buyWeight: buyWeight.toFixed(3),
        sellWeight: sellWeight.toFixed(3),
        holdWeight: holdWeight.toFixed(3)
      });
      
      return marketSignal;
    } catch (error) {
      this.logger.error('❌ Error generating market signal', error);
      return {
        type: 'HOLD',
        strength: 0.1,
        indicators,
        confidence: 0.5,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Context7 Pattern: Identify flipping opportunity
   */
  identifyFlippingOpportunity(itemId, itemName, priceData, volume = 1000, minProfitMargin = 5) {
    try {
      const { high, low } = priceData;
      
      if (!high || !low || high <= low) {
        this.logger.debug('🚫 No flipping opportunity - invalid price data', {
          itemId,
          high,
          low
        });
        return null;
      }
      
      const spreadGP = high - low;
      const spreadPercentage = (spreadGP / low) * 100;
      
      if (spreadPercentage < minProfitMargin) {
        this.logger.debug('🚫 No flipping opportunity - insufficient margin', {
          itemId,
          spreadPercentage: spreadPercentage.toFixed(2),
          minProfitMargin
        });
        return null;
      }
      
      // Estimate risk level based on spread and volatility
      let riskLevel;
      if (spreadPercentage > 20) {
        riskLevel = 'HIGH';
      } else if (spreadPercentage > 10) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }
      
      // Estimate time to flip based on volume and spread
      const timeToFlip = Math.max(5, Math.min(120, 60 / Math.log(volume + 1)));
      
      // Calculate ROI (simplified)
      const roi = (spreadGP / low) * 100;
      
      const opportunity = {
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
      };

      this.logger.info('💰 Flipping opportunity identified', {
        itemId,
        itemName,
        profitGP: spreadGP,
        spreadPercentage: spreadPercentage.toFixed(2),
        riskLevel,
        roi: roi.toFixed(2)
      });
      
      return opportunity;
    } catch (error) {
      this.logger.error('❌ Error identifying flipping opportunity', error);
      return null;
    }
  }
  
  /**
   * Context7 Pattern: Calculate spread percentage
   */
  calculateSpreadPercentage(high, low) {
    try {
      if (!high || !low || low === 0) return 0;
      const spread = ((high - low) / low) * 100;
      
      this.logger.debug('📊 Spread calculated', {
        high,
        low,
        spreadPercentage: spread.toFixed(2)
      });
      
      return spread;
    } catch (error) {
      this.logger.error('❌ Error calculating spread percentage', error);
      return 0;
    }
  }
  
  /**
   * Context7 Pattern: Check if flip is profitable
   */
  isProfitableFlip(spreadPercentage, minMargin = 5) {
    const isProfitable = spreadPercentage >= minMargin;
    
    this.logger.debug('💹 Profitability check', {
      spreadPercentage: spreadPercentage.toFixed(2),
      minMargin,
      isProfitable
    });
    
    return isProfitable;
  }

  /**
   * Context7 Pattern: Calculate volatility from prices
   */
  calculateVolatility(prices, period = 20) {
    try {
      if (prices.length < 2) return 0;
      
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }
      
      const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * 100; // Convert to percentage

      this.logger.debug('📊 Volatility calculated', {
        volatility: volatility.toFixed(2),
        period,
        priceCount: prices.length
      });
      
      return volatility;
    } catch (error) {
      this.logger.error('❌ Error calculating volatility', error);
      return 0;
    }
  }

  /**
   * Context7 Pattern: Calculate support and resistance levels
   */
  calculateSupportResistance(prices, period = 20) {
    try {
      if (prices.length < period) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        return { support: min, resistance: max };
      }
      
      const recentPrices = prices.slice(-period);
      const support = Math.min(...recentPrices);
      const resistance = Math.max(...recentPrices);

      this.logger.debug('📊 Support/Resistance calculated', {
        support: support.toFixed(2),
        resistance: resistance.toFixed(2),
        range: (resistance - support).toFixed(2)
      });
      
      return { support, resistance };
    } catch (error) {
      this.logger.error('❌ Error calculating support/resistance', error);
      return { support: 0, resistance: 0 };
    }
  }

  /**
   * Context7 Pattern: Calculate trend strength
   */
  calculateTrendStrength(prices, period = 14) {
    try {
      if (prices.length < period + 1) return 0;
      
      let upMoves = 0;
      let downMoves = 0;
      
      for (let i = 1; i <= period; i++) {
        if (prices[i] > prices[i - 1]) {
          upMoves++;
        } else if (prices[i] < prices[i - 1]) {
          downMoves++;
        }
      }
      
      const trendStrength = (upMoves - downMoves) / period;

      this.logger.debug('📊 Trend strength calculated', {
        trendStrength: trendStrength.toFixed(3),
        upMoves,
        downMoves,
        period
      });
      
      return trendStrength;
    } catch (error) {
      this.logger.error('❌ Error calculating trend strength', error);
      return 0;
    }
  }

  /**
   * Context7 Pattern: Get comprehensive market analysis
   */
  getMarketAnalysis(prices, priceData) {
    try {
      this.logger.debug('🔍 Performing comprehensive market analysis', {
        priceCount: prices.length
      });

      const indicators = this.calculateTechnicalIndicators(prices);
      const signal = this.generateMarketSignal(indicators, priceData);
      const volatility = this.calculateVolatility(prices);
      const supportResistance = this.calculateSupportResistance(prices);
      const trendStrength = this.calculateTrendStrength(prices);
      const spreadPercentage = this.calculateSpreadPercentage(priceData.high, priceData.low);

      const analysis = {
        indicators,
        signal,
        volatility,
        supportResistance,
        trendStrength,
        spreadPercentage,
        timestamp: Date.now()
      };

      this.logger.info('✅ Market analysis completed', {
        signal: signal.type,
        confidence: signal.confidence.toFixed(3),
        volatility: volatility.toFixed(2),
        trendStrength: trendStrength.toFixed(3),
        spreadPercentage: spreadPercentage.toFixed(2)
      });

      return analysis;
    } catch (error) {
      this.logger.error('❌ Error performing market analysis', error);
      throw error;
    }
  }
}

module.exports = { TradingAnalysisService };