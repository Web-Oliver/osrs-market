/**
 * 💰 Capital Allocation Service - Context7 Optimized
 *
 * Context7 Pattern: Service Layer for Dynamic Capital Allocation
 * - Manages capital allocation between different trading strategies
 * - Implements dual-mode strategy: instant flips vs patient offers
 * - Considers market conditions and user risk tolerance
 * - Optimizes capital utilization for maximum profit
 * - SOLID architecture with single responsibility for capital management
 *
 * Dual-Mode Strategy:
 * - High-frequency instant flips: Fast, low-margin, high-volume trades
 * - Patient overnight offers: Slower, high-margin, lower-volume trades
 */

const { BaseService } = require('./BaseService');
const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');
const { MarketDataService } = require('./MarketDataService');
const {
  calculateProfitAfterTax,
  calculateGETax,
  GE_TAX_THRESHOLD_GP
} = require('../utils/marketConstants');

class CapitalAllocationService extends BaseService {
  constructor(config = {}) {
    super('CapitalAllocationService', {
      enableCache: true,
      cachePrefix: 'capital_allocation',
      cacheTTL: 180, // 3 minutes for allocation decisions
      enableMongoDB: true // Store allocation history
    });

    this.metricsCalculator = new FinancialMetricsCalculator();
    this.marketDataService = new MarketDataService();

    // Default configuration
    this.config = {
      // Capital allocation percentages
      instantFlipAllocation: config.instantFlipAllocation || 0.6, // 60% for instant flips
      patientOfferAllocation: config.patientOfferAllocation || 0.4, // 40% for patient offers

      // Risk management
      maxRiskPerTrade: config.maxRiskPerTrade || 0.05, // 5% max risk per trade
      maxTotalRisk: config.maxTotalRisk || 0.2, // 20% max total portfolio risk

      // Strategy thresholds
      instantFlipMinMargin: config.instantFlipMinMargin || 0.02, // 2% min margin for instant flips
      patientOfferMinMargin: config.patientOfferMinMargin || 0.05, // 5% min margin for patient offers

      // Volume requirements
      instantFlipMinVolume: config.instantFlipMinVolume || 1000, // Min volume for instant flips
      patientOfferMinVolume: config.patientOfferMinVolume || 100, // Min volume for patient offers

      // Timing constraints
      instantFlipMaxHours: config.instantFlipMaxHours || 2, // Max 2 hours for instant flips
      patientOfferMaxHours: config.patientOfferMaxHours || 24, // Max 24 hours for patient offers

      // Market condition thresholds
      volatilityThreshold: config.volatilityThreshold || 0.15, // 15% volatility threshold
      liquidityThreshold: config.liquidityThreshold || 0.5, // 50% liquidity threshold

      ...config
    };

    this.currentAllocations = {
      instantFlips: [],
      patientOffers: [],
      totalCapitalUsed: 0,
      availableCapital: 0,
      totalProfit: 0,
      lastRebalance: Date.now()
    };

    this.logger.info('💰 Capital Allocation Service initialized', {
      instantFlipAllocation: this.config.instantFlipAllocation,
      patientOfferAllocation: this.config.patientOfferAllocation,
      maxRiskPerTrade: this.config.maxRiskPerTrade
    });
  }

  /**
   * Context7 Pattern: Allocate capital between instant flips and patient offers
   *
   * @param {number} totalCapital - Total available capital
   * @param {Array} opportunities - Array of trading opportunities
   * @param {Object} marketConditions - Current market conditions
   * @returns {Object} Capital allocation recommendations
   */
  async allocateCapital() {
    return this.execute(async() => {
      this.logger.debug('Starting capital allocation', {
        totalCapital,
        opportunityCount: opportunities.length,
        marketConditions
      });

      // Update available capital
      this.currentAllocations.availableCapital = totalCapital;

      // Analyze market conditions
      const marketAnalysis = await this.analyzeMarketConditions(marketConditions);

      // Adjust allocation based on market conditions
      const adjustedAllocation = this.adjustAllocationForMarketConditions(marketAnalysis);

      // Calculate capital for each strategy
      const instantFlipCapital = totalCapital * adjustedAllocation.instantFlipAllocation;
      const patientOfferCapital = totalCapital * adjustedAllocation.patientOfferAllocation;

      // Select opportunities for each strategy
      const instantFlipOpportunities = this.selectInstantFlipOpportunities(opportunities, marketAnalysis);
      const patientOfferOpportunities = this.selectPatientOfferOpportunities(opportunities, marketAnalysis);

      // Allocate capital to instant flips
      const instantFlipAllocations = this.allocateToInstantFlips(
        instantFlipCapital,
        instantFlipOpportunities,
        marketAnalysis
      );

      // Allocate capital to patient offers
      const patientOfferAllocations = this.allocateToPatientOffers(
        patientOfferCapital,
        patientOfferOpportunities,
        marketAnalysis
      );

      // Calculate total allocated capital
      const totalAllocated = instantFlipAllocations.totalAllocated + patientOfferAllocations.totalAllocated;
      const remainingCapital = totalCapital - totalAllocated;

      const allocation = {
        totalCapital,
        totalAllocated,
        remainingCapital,
        allocationPercentage: (totalAllocated / totalCapital) * 100,

        instantFlips: {
          ...instantFlipAllocations,
          targetAllocation: adjustedAllocation.instantFlipAllocation,
          actualAllocation: instantFlipAllocations.totalAllocated / totalCapital
        },

        patientOffers: {
          ...patientOfferAllocations,
          targetAllocation: adjustedAllocation.patientOfferAllocation,
          actualAllocation: patientOfferAllocations.totalAllocated / totalCapital
        },

        marketAnalysis,
        adjustedAllocation,
        recommendations: this.generateRecommendations(marketAnalysis, totalAllocated, totalCapital),

        timestamp: Date.now()
      };

      // Update current allocations
      this.currentAllocations = {
        ...this.currentAllocations,
        instantFlips: instantFlipAllocations.trades,
        patientOffers: patientOfferAllocations.trades,
        totalCapitalUsed: totalAllocated,
        lastRebalance: Date.now()
      };

      this.logger.info('✅ Capital allocation completed', {
        totalCapital,
        totalAllocated,
        remainingCapital,
        instantFlipCount: instantFlipAllocations.trades.length,
        patientOfferCount: patientOfferAllocations.trades.length,
        allocationPercentage: allocation.allocationPercentage.toFixed(2)
      });

      return allocation;
    }, 'allocateCapital', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Analyze current market conditions
   */
  async analyzeMarketConditions() {
    return this.execute(async() => {
      const analysis = {
        volatility: marketConditions.volatility || 0.1,
        liquidity: marketConditions.liquidity || 0.7,
        trend: marketConditions.trend || 'neutral',
        activeTraders: marketConditions.activeTraders || 'medium',
        priceStability: marketConditions.priceStability || 'stable',

        // Market sentiment indicators
        marketSentiment: this.calculateMarketSentiment(marketConditions),
        riskLevel: this.calculateMarketRiskLevel(marketConditions),
        opportunityLevel: this.calculateOpportunityLevel(marketConditions),

        // Timing factors
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: this.getDayOfWeek(),
        isWeekend: this.isWeekend(),

        timestamp: Date.now()
      };

      this.logger.debug('Market conditions analyzed', {
        volatility: analysis.volatility,
        liquidity: analysis.liquidity,
        marketSentiment: analysis.marketSentiment,
        riskLevel: analysis.riskLevel
      });

      return analysis;
    }, 'analyzeMarketConditions', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Adjust allocation based on market conditions
   */
  adjustAllocationForMarketConditions(marketAnalysis) {
    let instantFlipAllocation = this.config.instantFlipAllocation;
    let patientOfferAllocation = this.config.patientOfferAllocation;

    // Adjust for volatility
    if (marketAnalysis.volatility > this.config.volatilityThreshold) {
      // High volatility favors instant flips
      instantFlipAllocation += 0.1;
      patientOfferAllocation -= 0.1;
    } else if (marketAnalysis.volatility < 0.05) {
      // Low volatility favors patient offers
      instantFlipAllocation -= 0.1;
      patientOfferAllocation += 0.1;
    }

    // Adjust for liquidity
    if (marketAnalysis.liquidity < this.config.liquidityThreshold) {
      // Low liquidity reduces instant flip allocation
      instantFlipAllocation -= 0.05;
      patientOfferAllocation += 0.05;
    }

    // Adjust for market sentiment
    if (marketAnalysis.marketSentiment === 'bearish') {
      // Bearish market reduces overall risk
      instantFlipAllocation -= 0.05;
      patientOfferAllocation -= 0.05;
    } else if (marketAnalysis.marketSentiment === 'bullish') {
      // Bullish market increases instant flip allocation
      instantFlipAllocation += 0.05;
      patientOfferAllocation -= 0.05;
    }

    // Adjust for time of day
    if (marketAnalysis.timeOfDay === 'peak') {
      // Peak hours favor instant flips
      instantFlipAllocation += 0.05;
      patientOfferAllocation -= 0.05;
    } else if (marketAnalysis.timeOfDay === 'off-peak') {
      // Off-peak hours favor patient offers
      instantFlipAllocation -= 0.05;
      patientOfferAllocation += 0.05;
    }

    // Ensure allocations stay within bounds
    instantFlipAllocation = Math.max(0.2, Math.min(0.8, instantFlipAllocation));
    patientOfferAllocation = Math.max(0.2, Math.min(0.8, patientOfferAllocation));

    // Normalize to ensure they add up to 1
    const total = instantFlipAllocation + patientOfferAllocation;
    instantFlipAllocation /= total;
    patientOfferAllocation /= total;

    return {
      instantFlipAllocation,
      patientOfferAllocation,
      adjustmentReason: this.getAdjustmentReason(marketAnalysis)
    };
  }

  /**
   * Context7 Pattern: Select opportunities for instant flips
   */
  selectInstantFlipOpportunities(opportunities, marketAnalysis) {
    return opportunities.filter(opportunity => {
      // Filter by margin requirement
      if (opportunity.marginPercent < this.config.instantFlipMinMargin * 100) {
        return false;
      }

      // Filter by volume requirement
      if (opportunity.volume < this.config.instantFlipMinVolume) {
        return false;
      }

      // Filter by estimated time to flip
      if (opportunity.timeToFlip > this.config.instantFlipMaxHours * 60) {
        return false;
      }

      // Filter by volatility (instant flips can handle higher volatility)
      if (opportunity.volatility > 50) {
        return false;
      }

      // Filter by risk level
      if (opportunity.riskLevel === 'HIGH' && marketAnalysis.riskLevel === 'high') {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by expected profit per hour (descending)
      return b.expectedProfitPerHour - a.expectedProfitPerHour;
    });
  }

  /**
   * Context7 Pattern: Select opportunities for patient offers
   */
  selectPatientOfferOpportunities(opportunities, marketAnalysis) {
    return opportunities.filter(opportunity => {
      // Filter by margin requirement (higher for patient offers)
      if (opportunity.marginPercent < this.config.patientOfferMinMargin * 100) {
        return false;
      }

      // Filter by volume requirement (lower for patient offers)
      if (opportunity.volume < this.config.patientOfferMinVolume) {
        return false;
      }

      // Filter by estimated time to flip (longer acceptable)
      if (opportunity.timeToFlip > this.config.patientOfferMaxHours * 60) {
        return false;
      }

      // Filter by volatility (patient offers prefer lower volatility)
      if (opportunity.volatility > 30) {
        return false;
      }

      // Prefer medium to low risk
      if (opportunity.riskLevel === 'HIGH') {
        return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort by margin percentage (descending)
      return b.marginPercent - a.marginPercent;
    });
  }

  /**
   * Context7 Pattern: Allocate capital to instant flips
   */
  allocateToInstantFlips(availableCapital, opportunities, marketAnalysis) {
    const trades = [];
    let totalAllocated = 0;
    let totalExpectedProfit = 0;

    for (const opportunity of opportunities) {
      if (totalAllocated >= availableCapital) {
        break;
      }

      // Calculate position size based on risk management
      const positionSize = this.calculatePositionSize(
        opportunity,
        availableCapital - totalAllocated,
        'instant'
      );

      if (positionSize > 0) {
        const trade = {
          itemId: opportunity.itemId,
          itemName: opportunity.itemName,
          strategy: 'instant_flip',
          buyPrice: opportunity.buyPrice,
          sellPrice: opportunity.sellPrice,
          quantity: Math.floor(positionSize / opportunity.buyPrice),
          capitalAllocated: Math.floor(positionSize / opportunity.buyPrice) * opportunity.buyPrice,
          expectedProfit: opportunity.netProfitGp * Math.floor(positionSize / opportunity.buyPrice),
          marginPercent: opportunity.marginPercent,
          riskLevel: opportunity.riskLevel,
          timeToFlip: opportunity.timeToFlip,
          confidence: opportunity.confidence || 0.7,
          timestamp: Date.now()
        };

        trades.push(trade);
        totalAllocated += trade.capitalAllocated;
        totalExpectedProfit += trade.expectedProfit;
      }
    }

    return {
      trades,
      totalAllocated,
      totalExpectedProfit,
      averageMargin: trades.length > 0 ? trades.reduce((sum, t) => sum + t.marginPercent, 0) / trades.length : 0,
      averageRisk: this.calculateAverageRisk(trades),
      utilization: totalAllocated / availableCapital
    };
  }

  /**
   * Context7 Pattern: Allocate capital to patient offers
   */
  allocateToPatientOffers(availableCapital, opportunities, marketAnalysis) {
    const trades = [];
    let totalAllocated = 0;
    let totalExpectedProfit = 0;

    for (const opportunity of opportunities) {
      if (totalAllocated >= availableCapital) {
        break;
      }

      // Calculate position size based on risk management
      const positionSize = this.calculatePositionSize(
        opportunity,
        availableCapital - totalAllocated,
        'patient'
      );

      if (positionSize > 0) {
        const trade = {
          itemId: opportunity.itemId,
          itemName: opportunity.itemName,
          strategy: 'patient_offer',
          buyPrice: opportunity.buyPrice,
          sellPrice: opportunity.sellPrice,
          quantity: Math.floor(positionSize / opportunity.buyPrice),
          capitalAllocated: Math.floor(positionSize / opportunity.buyPrice) * opportunity.buyPrice,
          expectedProfit: opportunity.netProfitGp * Math.floor(positionSize / opportunity.buyPrice),
          marginPercent: opportunity.marginPercent,
          riskLevel: opportunity.riskLevel,
          timeToFlip: opportunity.timeToFlip,
          confidence: opportunity.confidence || 0.7,
          timestamp: Date.now()
        };

        trades.push(trade);
        totalAllocated += trade.capitalAllocated;
        totalExpectedProfit += trade.expectedProfit;
      }
    }

    return {
      trades,
      totalAllocated,
      totalExpectedProfit,
      averageMargin: trades.length > 0 ? trades.reduce((sum, t) => sum + t.marginPercent, 0) / trades.length : 0,
      averageRisk: this.calculateAverageRisk(trades),
      utilization: totalAllocated / availableCapital
    };
  }

  /**
   * Context7 Pattern: Calculate position size based on risk management
   */
  calculatePositionSize(opportunity, availableCapital, strategy) {
    // Basic position size based on available capital
    const basePositionSize = availableCapital * 0.1; // Start with 10% of available capital

    // Adjust based on risk level
    const riskMultiplier = {
      'LOW': 1.5,
      'MEDIUM': 1.0,
      'HIGH': 0.5
    }[opportunity.riskLevel] || 1.0;

    // Adjust based on strategy
    const strategyMultiplier = strategy === 'instant' ? 1.2 : 0.8;

    // Adjust based on confidence
    const confidenceMultiplier = opportunity.confidence || 0.7;

    // Calculate final position size
    const positionSize = basePositionSize * riskMultiplier * strategyMultiplier * confidenceMultiplier;

    // Ensure position size doesn't exceed risk limits
    const maxRiskAmount = availableCapital * this.config.maxRiskPerTrade;
    const maxPositionSize = Math.min(positionSize, maxRiskAmount);

    // Ensure minimum position size
    const minPositionSize = opportunity.buyPrice * 1; // At least 1 item

    return Math.max(minPositionSize, maxPositionSize);
  }

  /**
   * Context7 Pattern: Calculate market sentiment
   */
  calculateMarketSentiment(marketConditions) {
    const sentiment = marketConditions.sentiment || 'neutral';
    const volatility = marketConditions.volatility || 0.1;
    const trend = marketConditions.trend || 'neutral';

    if (trend === 'bullish' && volatility < 0.15) {
      return 'bullish';
    } else if (trend === 'bearish' || volatility > 0.3) {
      return 'bearish';
    } else {
      return 'neutral';
    }
  }

  /**
   * Context7 Pattern: Calculate market risk level
   */
  calculateMarketRiskLevel(marketConditions) {
    const volatility = marketConditions.volatility || 0.1;
    const liquidity = marketConditions.liquidity || 0.7;

    if (volatility > 0.3 || liquidity < 0.3) {
      return 'high';
    } else if (volatility > 0.15 || liquidity < 0.5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Context7 Pattern: Calculate opportunity level
   */
  calculateOpportunityLevel(marketConditions) {
    const volatility = marketConditions.volatility || 0.1;
    const liquidity = marketConditions.liquidity || 0.7;

    if (volatility > 0.1 && liquidity > 0.6) {
      return 'high';
    } else if (volatility > 0.05 && liquidity > 0.4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Context7 Pattern: Get time of day classification
   */
  getTimeOfDay() {
    const hour = new Date().getHours();

    if (hour >= 18 && hour <= 22) {
      return 'peak'; // Evening peak hours
    } else if (hour >= 6 && hour <= 10) {
      return 'morning'; // Morning hours
    } else if (hour >= 22 || hour <= 6) {
      return 'off-peak'; // Night hours
    } else {
      return 'normal'; // Normal hours
    }
  }

  /**
   * Context7 Pattern: Get day of week classification
   */
  getDayOfWeek() {
    const day = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[day];
  }

  /**
   * Context7 Pattern: Check if weekend
   */
  isWeekend() {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  }

  /**
   * Context7 Pattern: Calculate average risk
   */
  calculateAverageRisk(trades) {
    if (trades.length === 0) {
      return 0;
    }

    const riskScores = trades.map(trade => {
      switch (trade.riskLevel) {
      case 'LOW': return 0.3;
      case 'MEDIUM': return 0.6;
      case 'HIGH': return 0.9;
      default: return 0.6;
      }
    });

    return riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length;
  }

  /**
   * Context7 Pattern: Get adjustment reason
   */
  getAdjustmentReason(marketAnalysis) {
    const reasons = [];

    if (marketAnalysis.volatility > this.config.volatilityThreshold) {
      reasons.push('High volatility favors instant flips');
    }

    if (marketAnalysis.liquidity < this.config.liquidityThreshold) {
      reasons.push('Low liquidity reduces instant flip allocation');
    }

    if (marketAnalysis.marketSentiment === 'bearish') {
      reasons.push('Bearish market reduces overall risk');
    } else if (marketAnalysis.marketSentiment === 'bullish') {
      reasons.push('Bullish market increases instant flip allocation');
    }

    if (marketAnalysis.timeOfDay === 'peak') {
      reasons.push('Peak hours favor instant flips');
    } else if (marketAnalysis.timeOfDay === 'off-peak') {
      reasons.push('Off-peak hours favor patient offers');
    }

    return reasons.join('; ');
  }

  /**
   * Context7 Pattern: Generate recommendations
   */
  generateRecommendations(marketAnalysis, totalAllocated, totalCapital) {
    const recommendations = [];

    const utilizationRate = totalAllocated / totalCapital;

    if (utilizationRate < 0.5) {
      recommendations.push({
        type: 'capital_utilization',
        message: 'Low capital utilization - consider lowering minimum margins',
        priority: 'medium'
      });
    }

    if (utilizationRate > 0.9) {
      recommendations.push({
        type: 'capital_utilization',
        message: 'High capital utilization - ensure adequate reserves',
        priority: 'high'
      });
    }

    if (marketAnalysis.volatility > 0.3) {
      recommendations.push({
        type: 'market_condition',
        message: 'High volatility detected - consider reducing position sizes',
        priority: 'high'
      });
    }

    if (marketAnalysis.liquidity < 0.3) {
      recommendations.push({
        type: 'market_condition',
        message: 'Low liquidity - focus on high-volume items',
        priority: 'medium'
      });
    }

    if (marketAnalysis.isWeekend) {
      recommendations.push({
        type: 'timing',
        message: 'Weekend trading - expect lower volumes',
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Context7 Pattern: Get current allocation status
   */
  getCurrentAllocationStatus() {
    return {
      ...this.currentAllocations,
      config: this.config,
      utilizationRate: this.currentAllocations.totalCapitalUsed / this.currentAllocations.availableCapital,
      timeSinceLastRebalance: Date.now() - this.currentAllocations.lastRebalance
    };
  }

  /**
   * Context7 Pattern: Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('📝 Capital allocation configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  /**
   * Context7 Pattern: Calculate portfolio metrics
   */
  calculatePortfolioMetrics() {
    const allTrades = [...this.currentAllocations.instantFlips, ...this.currentAllocations.patientOffers];

    if (allTrades.length === 0) {
      return {
        totalCapital: this.currentAllocations.availableCapital,
        totalAllocated: 0,
        totalExpectedProfit: 0,
        averageMargin: 0,
        averageRisk: 0,
        diversification: 0,
        tradeCount: 0
      };
    }

    const totalAllocated = allTrades.reduce((sum, trade) => sum + trade.capitalAllocated, 0);
    const totalExpectedProfit = allTrades.reduce((sum, trade) => sum + trade.expectedProfit, 0);
    const averageMargin = allTrades.reduce((sum, trade) => sum + trade.marginPercent, 0) / allTrades.length;
    const averageRisk = this.calculateAverageRisk(allTrades);
    const uniqueItems = new Set(allTrades.map(trade => trade.itemId)).size;
    const diversification = uniqueItems / allTrades.length;

    return {
      totalCapital: this.currentAllocations.availableCapital,
      totalAllocated,
      totalExpectedProfit,
      averageMargin,
      averageRisk,
      diversification,
      tradeCount: allTrades.length,
      utilizationRate: totalAllocated / this.currentAllocations.availableCapital
    };
  }
}

module.exports = { CapitalAllocationService };
