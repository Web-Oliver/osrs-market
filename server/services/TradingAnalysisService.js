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

const { BaseService } = require('./BaseService');
const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');

class TradingAnalysisService extends BaseService {
  constructor() {
    super('TradingAnalysisService', {
      enableCache: true,
      cachePrefix: 'trading_analysis',
      cacheTTL: 120, // 2 minutes for trading signals
      enableMongoDB: false // No MongoDB needed for analysis service
    });

    this.metricsCalculator = new FinancialMetricsCalculator();
    this.logger.info('📊 Trading Analysis Service initialized with FinancialMetricsCalculator');
  }

  /**
   * Context7 Pattern: Interpret RSI signals
   */
  interpretRSI(rsi) {
    this.execute(async() => {
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
    }, 'operation', { logSuccess: false });
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
      // Error handling moved to centralized manager - context: ❌ Error assessing trading viability
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
