/**
 * 📊 Trading Analysis Service - Context7 Optimized
 *
 * Context7 Pattern: Service Layer for Market Signal Analysis and Interpretation
 * - Interprets technical indicators and generates market signals
 * - Provides comprehensive trading recommendations
 * - Focuses on higher-level market analysis vs raw calculations
 * - DRY principles with reusable interpretation patterns
 * - SOLID architecture with single responsibility for analysis
 *
 * REFACTORED: Now uses FinancialMetricsCalculator for raw calculations
 * This service focuses on interpreting those metrics to generate trading signals
 */

const { Logger } = require('../utils/Logger');
const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');

class TradingAnalysisService {
  constructor() {
    this.logger = new Logger('TradingAnalysis');
    this.metricsCalculator = new FinancialMetricsCalculator();
    this.logger.info('📊 Trading Analysis Service initialized with FinancialMetricsCalculator');
  }

  /**
   * Context7 Pattern: Interpret RSI signals
   */
  interpretRSI(rsi) {
    try {
      let signal = 'HOLD';
      let strength = 0;
      let interpretation = '';

      if (rsi < 30) {
        signal = 'BUY';
        strength = (30 - rsi) / 30; // Stronger signal as RSI gets lower
        interpretation = 'Oversold condition - potential buying opportunity';
      } else if (rsi > 70) {
        signal = 'SELL';
        strength = (rsi - 70) / 30; // Stronger signal as RSI gets higher
        interpretation = 'Overbought condition - potential selling opportunity';
      } else if (rsi > 45 && rsi < 55) {
        signal = 'HOLD';
        strength = 0.2;
        interpretation = 'Neutral momentum - wait for clearer signal';
      } else {
        signal = 'HOLD';
        strength = 0.1;
        interpretation = 'Moderate momentum - monitor for trend changes';
      }

      this.logger.debug('📈 RSI interpreted', {
        rsi: rsi.toFixed(2),
        signal,
        strength: strength.toFixed(2),
        interpretation
      });

      return { signal, strength, interpretation };
    } catch (error) {
      this.logger.error('❌ Error interpreting RSI', error);
      return { signal: 'HOLD', strength: 0.1, interpretation: 'Error interpreting RSI' };
    }
  }

  /**
   * Context7 Pattern: Interpret MACD signals
   */
  interpretMACD(macd) {
    try {
      let signal = 'HOLD';
      let strength = 0;
      let interpretation = '';

      if (macd.macd > macd.signal && macd.histogram > 0) {
        signal = 'BUY';
        strength = Math.min(1, Math.abs(macd.histogram) / 10); // Normalize histogram
        interpretation = 'MACD above signal line with positive histogram - bullish momentum';
      } else if (macd.macd < macd.signal && macd.histogram < 0) {
        signal = 'SELL';
        strength = Math.min(1, Math.abs(macd.histogram) / 10);
        interpretation = 'MACD below signal line with negative histogram - bearish momentum';
      } else if (Math.abs(macd.histogram) < 0.1) {
        signal = 'HOLD';
        strength = 0.1;
        interpretation = 'MACD convergence - momentum changing, wait for direction';
      } else {
        signal = 'HOLD';
        strength = 0.2;
        interpretation = 'Mixed MACD signals - monitor for trend confirmation';
      }

      this.logger.debug('📊 MACD interpreted', {
        macd: macd.macd.toFixed(3),
        signal: macd.signal.toFixed(3),
        histogram: macd.histogram.toFixed(3),
        tradingSignal: signal,
        strength: strength.toFixed(2)
      });

      return { signal, strength, interpretation };
    } catch (error) {
      this.logger.error('❌ Error interpreting MACD', error);
      return { signal: 'HOLD', strength: 0.1, interpretation: 'Error interpreting MACD' };
    }
  }

  /**
   * Context7 Pattern: Interpret Bollinger Bands signals
   */
  interpretBollingerBands(currentPrice, bands) {
    try {
      let signal = 'HOLD';
      let strength = 0;
      let interpretation = '';

      const bandWidth = bands.upper - bands.lower;
      const pricePosition = (currentPrice - bands.lower) / bandWidth;

      if (currentPrice <= bands.lower) {
        signal = 'BUY';
        strength = Math.min(1, (bands.lower - currentPrice) / bands.lower);
        interpretation = 'Price at or below lower band - potential oversold reversal';
      } else if (currentPrice >= bands.upper) {
        signal = 'SELL';
        strength = Math.min(1, (currentPrice - bands.upper) / bands.upper);
        interpretation = 'Price at or above upper band - potential overbought reversal';
      } else if (pricePosition > 0.4 && pricePosition < 0.6) {
        signal = 'HOLD';
        strength = 0.2;
        interpretation = 'Price near middle band - neutral momentum';
      } else {
        signal = 'HOLD';
        strength = 0.1;
        interpretation = 'Price within bands - normal trading range';
      }

      this.logger.debug('📊 Bollinger Bands interpreted', {
        currentPrice: currentPrice.toFixed(2),
        lower: bands.lower.toFixed(2),
        middle: bands.middle.toFixed(2),
        upper: bands.upper.toFixed(2),
        pricePosition: pricePosition.toFixed(2),
        signal,
        strength: strength.toFixed(2)
      });

      return { signal, strength, interpretation };
    } catch (error) {
      this.logger.error('❌ Error interpreting Bollinger Bands', error);
      return { signal: 'HOLD', strength: 0.1, interpretation: 'Error interpreting Bollinger Bands' };
    }
  }

  /**
   * Context7 Pattern: Get technical indicators using FinancialMetricsCalculator
   */
  getTechnicalIndicators(rawData, historicalData = []) {
    try {
      this.logger.debug('🔍 Getting technical indicators', {
        itemId: rawData.itemId,
        historicalCount: historicalData.length
      });

      // Use FinancialMetricsCalculator to get all calculated metrics
      const metrics = this.metricsCalculator.calculateAllMetrics(rawData, historicalData);

      // Extract technical indicators
      const indicators = {
        rsi: metrics.rsi || 50,
        macd: metrics.macd || { macd: 0, signal: 0, histogram: 0 },
        bollinger: {
          upper: metrics.bollingerUpper || 0,
          middle: metrics.bollingerMiddle || 0,
          lower: metrics.bollingerLower || 0
        },
        movingAverage: metrics.trendMovingAverage || 0,
        volatility: metrics.volatility || 0,
        momentum: metrics.momentumScore || 0
      };

      this.logger.debug('✅ Technical indicators retrieved', {
        rsi: indicators.rsi?.toFixed(2) || 'N/A',
        macd: indicators.macd?.macd?.toFixed(3) || 'N/A',
        volatility: indicators.volatility?.toFixed(2) || 'N/A',
        momentum: indicators.momentum?.toFixed(2) || 'N/A'
      });

      return indicators;
    } catch (error) {
      this.logger.error('❌ Error getting technical indicators', error);
      // Return safe defaults
      return {
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        bollinger: { upper: 0, middle: 0, lower: 0 },
        movingAverage: 0,
        volatility: 0,
        momentum: 0
      };
    }
  }

  /**
   * Context7 Pattern: Generate comprehensive market signal from technical indicators
   */
  generateMarketSignal(rawData, historicalData = []) {
    try {
      this.logger.debug('🎯 Generating market signal', {
        itemId: rawData.itemId,
        highPrice: rawData.highPrice,
        lowPrice: rawData.lowPrice,
        historicalCount: historicalData.length
      });

      // Get technical indicators using FinancialMetricsCalculator
      const indicators = this.getTechnicalIndicators(rawData, historicalData);
      const currentPrice = (rawData.highPrice + rawData.lowPrice) / 2;

      const signalComponents = [];

      // RSI interpretation
      if (indicators.rsi) {
        const rsiSignal = this.interpretRSI(indicators.rsi);
        signalComponents.push({
          source: 'RSI',
          ...rsiSignal,
          weight: 0.3
        });
      }

      // MACD interpretation
      if (indicators.macd) {
        const macdSignal = this.interpretMACD(indicators.macd);
        signalComponents.push({
          source: 'MACD',
          ...macdSignal,
          weight: 0.25
        });
      }

      // Bollinger Bands interpretation
      if (indicators.bollinger) {
        const bbSignal = this.interpretBollingerBands(currentPrice, indicators.bollinger);
        signalComponents.push({
          source: 'Bollinger Bands',
          ...bbSignal,
          weight: 0.2
        });
      }

      // Momentum interpretation
      if (indicators.momentum !== undefined) {
        const momentumSignal = this.interpretMomentum(indicators.momentum);
        signalComponents.push({
          source: 'Momentum',
          ...momentumSignal,
          weight: 0.15
        });
      }

      // Volatility interpretation
      if (indicators.volatility !== undefined) {
        const volatilitySignal = this.interpretVolatility(indicators.volatility);
        signalComponents.push({
          source: 'Volatility',
          ...volatilitySignal,
          weight: 0.1
        });
      }

      // Calculate weighted signal
      const buyWeight = signalComponents
        .filter(s => s.signal === 'BUY')
        .reduce((sum, s) => sum + (s.weight * s.strength), 0);
      const sellWeight = signalComponents
        .filter(s => s.signal === 'SELL')
        .reduce((sum, s) => sum + (s.weight * s.strength), 0);
      const holdWeight = signalComponents
        .filter(s => s.signal === 'HOLD')
        .reduce((sum, s) => sum + (s.weight * s.strength), 0);

      let dominantSignal, strength;

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
      const confidence = totalWeight > 0 ? Math.max(buyWeight, sellWeight, holdWeight) / totalWeight : 0.5;

      const marketSignal = {
        type: dominantSignal,
        strength: Math.min(1, strength),
        confidence: Math.min(1, confidence),
        indicators,
        components: signalComponents,
        analysis: {
          buyWeight,
          sellWeight,
          holdWeight,
          currentPrice,
          interpretation: this.generateSignalInterpretation(dominantSignal, strength, confidence, signalComponents)
        },
        timestamp: Date.now()
      };

      this.logger.info('✅ Market signal generated', {
        itemId: rawData.itemId,
        signal: dominantSignal,
        strength: strength.toFixed(3),
        confidence: confidence.toFixed(3),
        componentCount: signalComponents.length
      });

      return marketSignal;
    } catch (error) {
      this.logger.error('❌ Error generating market signal', error);
      return {
        type: 'HOLD',
        strength: 0.1,
        confidence: 0.5,
        indicators: {},
        components: [],
        analysis: {
          buyWeight: 0,
          sellWeight: 0,
          holdWeight: 0.1,
          currentPrice: (rawData.highPrice + rawData.lowPrice) / 2 || 0,
          interpretation: 'Error generating signal - defaulting to HOLD'
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Context7 Pattern: Interpret momentum signals
   */
  interpretMomentum(momentum) {
    try {
      let signal = 'HOLD';
      let strength = 0;
      let interpretation = '';

      if (momentum > 20) {
        signal = 'BUY';
        strength = Math.min(1, momentum / 50);
        interpretation = 'Strong positive momentum - bullish trend';
      } else if (momentum < -20) {
        signal = 'SELL';
        strength = Math.min(1, Math.abs(momentum) / 50);
        interpretation = 'Strong negative momentum - bearish trend';
      } else if (momentum > 5) {
        signal = 'HOLD';
        strength = 0.3;
        interpretation = 'Moderate positive momentum - cautious optimism';
      } else if (momentum < -5) {
        signal = 'HOLD';
        strength = 0.3;
        interpretation = 'Moderate negative momentum - cautious pessimism';
      } else {
        signal = 'HOLD';
        strength = 0.1;
        interpretation = 'Low momentum - sideways movement';
      }

      return { signal, strength, interpretation };
    } catch (error) {
      this.logger.error('❌ Error interpreting momentum', error);
      return { signal: 'HOLD', strength: 0.1, interpretation: 'Error interpreting momentum' };
    }
  }

  /**
   * Context7 Pattern: Interpret volatility signals
   */
  interpretVolatility(volatility) {
    try {
      let signal = 'HOLD';
      let strength = 0;
      let interpretation = '';

      if (volatility > 30) {
        signal = 'HOLD';
        strength = 0.1;
        interpretation = 'High volatility - increased risk, avoid trading';
      } else if (volatility > 15) {
        signal = 'HOLD';
        strength = 0.2;
        interpretation = 'Moderate volatility - trade with caution';
      } else if (volatility > 5) {
        signal = 'HOLD';
        strength = 0.4;
        interpretation = 'Normal volatility - suitable for trading';
      } else {
        signal = 'HOLD';
        strength = 0.3;
        interpretation = 'Low volatility - stable but limited opportunities';
      }

      return { signal, strength, interpretation };
    } catch (error) {
      this.logger.error('❌ Error interpreting volatility', error);
      return { signal: 'HOLD', strength: 0.1, interpretation: 'Error interpreting volatility' };
    }
  }

  /**
   * Context7 Pattern: Generate signal interpretation
   */
  generateSignalInterpretation(signal, strength, confidence, components) {
    try {
      const strengthLevel = strength > 0.7 ? 'Strong' : strength > 0.4 ? 'Moderate' : 'Weak';
      const confidenceLevel = confidence > 0.7 ? 'High' : confidence > 0.4 ? 'Medium' : 'Low';

      const supportingComponents = components.filter(c => c.signal === signal);
      const conflictingComponents = components.filter(c => c.signal !== signal && c.signal !== 'HOLD');

      let interpretation = `${strengthLevel} ${signal} signal with ${confidenceLevel} confidence. `;

      if (supportingComponents.length > 0) {
        const sources = supportingComponents.map(c => c.source).join(', ');
        interpretation += `Supported by: ${sources}. `;
      }

      if (conflictingComponents.length > 0) {
        const conflictingSources = conflictingComponents.map(c => c.source).join(', ');
        interpretation += `Conflicting signals from: ${conflictingSources}. `;
      }

      // Add risk assessment
      if (strength > 0.6 && confidence > 0.6) {
        interpretation += 'Recommended for execution.';
      } else if (strength > 0.4 && confidence > 0.4) {
        interpretation += 'Consider with caution.';
      } else {
        interpretation += 'Monitor for stronger signals.';
      }

      return interpretation;
    } catch (error) {
      this.logger.error('❌ Error generating signal interpretation', error);
      return 'Unable to generate interpretation';
    }
  }

  /**
   * Context7 Pattern: Identify flipping opportunity using FinancialMetricsCalculator
   */
  identifyFlippingOpportunity(rawData, historicalData = [], minProfitMargin = 5) {
    try {
      const { itemId, highPrice, lowPrice, volume = 1000 } = rawData;

      if (!highPrice || !lowPrice || highPrice <= lowPrice) {
        this.logger.debug('🚫 No flipping opportunity - invalid price data', {
          itemId,
          highPrice,
          lowPrice
        });
        return null;
      }

      // Use FinancialMetricsCalculator to get comprehensive metrics
      const metrics = this.metricsCalculator.calculateAllMetrics(rawData, historicalData);

      // Check if opportunity meets minimum margin requirement
      if (metrics.marginPercent < minProfitMargin) {
        this.logger.debug('🚫 No flipping opportunity - insufficient margin', {
          itemId,
          marginPercent: metrics.marginPercent.toFixed(2),
          minProfitMargin
        });
        return null;
      }

      // Get market signal for additional context
      const marketSignal = this.generateMarketSignal(rawData, historicalData);

      // Determine risk level from risk score
      let riskLevel;
      if (metrics.riskScore > 70) {
        riskLevel = 'HIGH';
      } else if (metrics.riskScore > 40) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      // Calculate time to flip based on velocity and volume
      const timeToFlip = Math.max(5, Math.min(120,
        60 / Math.log((volume * metrics.velocity / 100) + 1)
      ));

      const opportunity = {
        itemId,
        itemName: rawData.itemName || `Item ${itemId}`,

        // Price and profit data
        buyPrice: lowPrice,
        sellPrice: highPrice,
        grossProfitGp: metrics.grossProfitGp,
        netProfitGp: metrics.marginGp, // After GE tax
        grossProfitPercent: metrics.grossProfitPercent,
        netProfitPercent: metrics.marginPercent, // After GE tax

        // GE tax information
        geTaxAmount: metrics.geTaxAmount,
        isTaxFree: metrics.isTaxFree,

        // Risk and performance metrics
        riskLevel,
        riskScore: metrics.riskScore,
        volatility: metrics.volatility,
        velocity: metrics.velocity,
        expectedProfitPerHour: metrics.expectedProfitPerHour,

        // Market data
        volume,
        volumeScore: metrics.volumeScore,
        liquidityRating: metrics.liquidityRating,

        // Timing estimates
        timeToFlip,

        // Market signal context
        marketSignal: {
          type: marketSignal.type,
          strength: marketSignal.strength,
          confidence: marketSignal.confidence,
          interpretation: marketSignal.analysis.interpretation
        },

        // Additional context
        confidence: metrics.confidence,
        dataQuality: metrics.dataQuality,

        // Tags for categorization
        tags: this.generateOpportunityTags(metrics, marketSignal),

        timestamp: Date.now()
      };

      this.logger.info('💰 Flipping opportunity identified', {
        itemId,
        itemName: opportunity.itemName,
        netProfitGp: opportunity.netProfitGp,
        netProfitPercent: opportunity.netProfitPercent.toFixed(2),
        riskLevel,
        marketSignal: marketSignal.type,
        expectedProfitPerHour: opportunity.expectedProfitPerHour.toFixed(2)
      });

      return opportunity;
    } catch (error) {
      this.logger.error('❌ Error identifying flipping opportunity', error);
      return null;
    }
  }

  /**
   * Context7 Pattern: Generate opportunity tags for categorization
   */
  generateOpportunityTags(metrics, marketSignal) {
    const tags = [];

    // Risk-based tags
    if (metrics.riskScore < 30) {
      tags.push('low_risk');
    } else if (metrics.riskScore > 70) {
      tags.push('high_risk');
    }

    // Profit-based tags
    if (metrics.marginPercent > 20) {
      tags.push('high_profit');
    } else if (metrics.marginPercent > 10) {
      tags.push('good_profit');
    }

    // Volume-based tags
    if (metrics.volumeScore > 70) {
      tags.push('high_volume');
    } else if (metrics.volumeScore < 30) {
      tags.push('low_volume');
    }

    // Volatility-based tags
    if (metrics.volatility > 30) {
      tags.push('volatile');
    } else if (metrics.volatility < 10) {
      tags.push('stable');
    }

    // Speed-based tags
    if (metrics.velocity > 70) {
      tags.push('fast_flip');
    } else if (metrics.velocity < 30) {
      tags.push('slow_flip');
    }

    // Market signal tags
    if (marketSignal.type === 'BUY' && marketSignal.strength > 0.6) {
      tags.push('strong_buy');
    } else if (marketSignal.type === 'SELL' && marketSignal.strength > 0.6) {
      tags.push('strong_sell');
    }

    // Tax-related tags
    if (metrics.isTaxFree) {
      tags.push('tax_free');
    }

    // Profit per hour tags
    if (metrics.expectedProfitPerHour > 1000000) {
      tags.push('high_gp_per_hour');
    } else if (metrics.expectedProfitPerHour > 500000) {
      tags.push('good_gp_per_hour');
    }

    return tags;
  }

  /**
   * Context7 Pattern: Calculate spread percentage (deprecated - use FinancialMetricsCalculator)
   */
  calculateSpreadPercentage(high, low) {
    try {
      if (!high || !low || low === 0) {
        return 0;
      }
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
      if (prices.length < 2) {
        return 0;
      }

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
      if (prices.length < period + 1) {
        return 0;
      }

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
   * Context7 Pattern: Get comprehensive market analysis using FinancialMetricsCalculator
   */
  getMarketAnalysis(rawData, historicalData = []) {
    try {
      this.logger.debug('🔍 Performing comprehensive market analysis', {
        itemId: rawData.itemId,
        historicalCount: historicalData.length
      });

      // Use FinancialMetricsCalculator for all metrics
      const metrics = this.metricsCalculator.calculateAllMetrics(rawData, historicalData);

      // Generate market signal using interpretation methods
      const marketSignal = this.generateMarketSignal(rawData, historicalData);

      // Get technical indicators
      const indicators = this.getTechnicalIndicators(rawData, historicalData);

      // Identify flipping opportunity if profitable
      const flippingOpportunity = this.identifyFlippingOpportunity(rawData, historicalData);

      const analysis = {
        // Core metrics from FinancialMetricsCalculator
        metrics: {
          marginGp: metrics.marginGp,
          marginPercent: metrics.marginPercent,
          volatility: metrics.volatility,
          riskScore: metrics.riskScore,
          expectedProfitPerHour: metrics.expectedProfitPerHour,
          velocity: metrics.velocity,
          volumeScore: metrics.volumeScore,
          momentumScore: metrics.momentumScore,

          // GE tax information
          geTaxAmount: metrics.geTaxAmount,
          isTaxFree: metrics.isTaxFree,
          netSellPrice: metrics.netSellPrice
        },

        // Technical indicators
        indicators,

        // Market signal with interpretation
        marketSignal,

        // Flipping opportunity (if available)
        flippingOpportunity,

        // Analysis summary
        summary: {
          recommendation: marketSignal.type,
          confidence: marketSignal.confidence,
          riskLevel: flippingOpportunity?.riskLevel || 'UNKNOWN',
          profitability: metrics.marginPercent > 10 ? 'HIGH' :
            metrics.marginPercent > 5 ? 'MEDIUM' : 'LOW',
          tradingViability: this.assessTradingViability(metrics, marketSignal)
        },

        timestamp: Date.now()
      };

      this.logger.info('✅ Market analysis completed', {
        itemId: rawData.itemId,
        signal: marketSignal.type,
        confidence: marketSignal.confidence.toFixed(3),
        marginPercent: metrics.marginPercent.toFixed(2),
        riskScore: metrics.riskScore.toFixed(1),
        expectedProfitPerHour: metrics.expectedProfitPerHour.toFixed(2),
        hasFlippingOpportunity: !!flippingOpportunity
      });

      return analysis;
    } catch (error) {
      this.logger.error('❌ Error performing market analysis', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Assess trading viability
   */
  assessTradingViability(metrics, marketSignal) {
    try {
      let viabilityScore = 0;
      const factors = [];

      // Profit factor (40% weight)
      if (metrics.marginPercent > 15) {
        viabilityScore += 40;
        factors.push('High profit margin');
      } else if (metrics.marginPercent > 8) {
        viabilityScore += 25;
        factors.push('Good profit margin');
      } else if (metrics.marginPercent > 3) {
        viabilityScore += 10;
        factors.push('Moderate profit margin');
      }

      // Risk factor (25% weight)
      if (metrics.riskScore < 30) {
        viabilityScore += 25;
        factors.push('Low risk');
      } else if (metrics.riskScore < 60) {
        viabilityScore += 15;
        factors.push('Moderate risk');
      } else {
        viabilityScore += 5;
        factors.push('High risk');
      }

      // Volume factor (20% weight)
      if (metrics.volumeScore > 60) {
        viabilityScore += 20;
        factors.push('High volume');
      } else if (metrics.volumeScore > 30) {
        viabilityScore += 12;
        factors.push('Moderate volume');
      } else {
        viabilityScore += 5;
        factors.push('Low volume');
      }

      // Market signal factor (15% weight)
      if (marketSignal.type === 'BUY' && marketSignal.strength > 0.6) {
        viabilityScore += 15;
        factors.push('Strong buy signal');
      } else if (marketSignal.type === 'SELL' && marketSignal.strength > 0.6) {
        viabilityScore += 10;
        factors.push('Strong sell signal');
      } else if (marketSignal.confidence > 0.6) {
        viabilityScore += 8;
        factors.push('Confident signal');
      }

      let rating;
      if (viabilityScore >= 75) {
        rating = 'EXCELLENT';
      } else if (viabilityScore >= 60) {
        rating = 'GOOD';
      } else if (viabilityScore >= 40) {
        rating = 'FAIR';
      } else if (viabilityScore >= 25) {
        rating = 'POOR';
      } else {
        rating = 'AVOID';
      }

      return {
        score: viabilityScore,
        rating,
        factors,
        recommendation: this.getViabilityRecommendation(rating, factors)
      };
    } catch (error) {
      this.logger.error('❌ Error assessing trading viability', error);
      return {
        score: 0,
        rating: 'UNKNOWN',
        factors: [],
        recommendation: 'Unable to assess viability'
      };
    }
  }

  /**
   * Context7 Pattern: Get viability recommendation
   */
  getViabilityRecommendation(rating, factors) {
    const factorList = factors.join(', ').toLowerCase();

    switch (rating) {
    case 'EXCELLENT':
      return `Highly recommended for trading. Strong factors: ${factorList}`;
    case 'GOOD':
      return `Good trading opportunity. Positive factors: ${factorList}`;
    case 'FAIR':
      return `Moderate trading opportunity. Consider factors: ${factorList}`;
    case 'POOR':
      return `Risky trading opportunity. Caution advised due to: ${factorList}`;
    case 'AVOID':
      return `Avoid trading. Negative factors: ${factorList}`;
    default:
      return 'Unable to provide recommendation';
    }
  }
}

module.exports = { TradingAnalysisService };
