/**
 * 🧠 Trading Decision Service - SOLID Optimized
 * 
 * Single Responsibility Principle:
 * - ONLY makes trading decisions based on market data
 * - AI model inference and decision logic
 * - Risk assessment and trade validation
 * 
 * Extracted from AITradingOrchestratorService to eliminate God Class
 */

const { BaseService } = require('../BaseService');

class TradingDecisionService extends BaseService {
  constructor(dependencies = {}) {
    super('TradingDecisionService', {
      enableCache: true,
      cachePrefix: 'trading_decisions',
      cacheTTL: 60, // 1 minute cache for decisions
      enableMongoDB: false
    });

    // Dependency injection
    this.aiModel = dependencies.aiModel;
    this.riskAnalyzer = dependencies.riskAnalyzer;
    this.financialCalculator = dependencies.financialCalculator;

    if (!this.aiModel) {
      throw new Error('AI model dependency required');
    }
  }

  /**
   * Process market data and make trading decisions following Context7 patterns
   */
  async processMarketData(items, sessionConfig) {
    return this.execute(async () => {
      const decisions = [];
      const startTime = Date.now();

      this.logger.debug('Processing market data for trading decisions', {
        itemCount: Object.keys(items).length,
        sessionConfig
      });

      for (const [itemId, itemData] of Object.entries(items)) {
        try {
          const decision = await this.makeItemDecision(itemData, sessionConfig);
          if (decision) {
            decisions.push(decision);
          }
        } catch (error) {
          this.logger.warn('Failed to make decision for item', { 
            itemId, 
            error: error.message 
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info('Trading decisions processed', {
        totalItems: Object.keys(items).length,
        decisionsGenerated: decisions.length,
        duration
      });

      return decisions;
    }, 'processMarketData', { logSuccess: true });
  }

  /**
   * Make decision for individual item
   */
  async makeItemDecision(itemData, sessionConfig) {
    // Validate item data
    if (!this.isValidItemData(itemData)) {
      return null;
    }

    // Check item meets basic criteria
    if (!this.meetsBasicCriteria(itemData, sessionConfig)) {
      return null;
    }

    // Get AI model prediction
    const prediction = await this.getAIPrediction(itemData);
    if (!prediction) {
      return null;
    }

    // Calculate risk and opportunity
    const riskAssessment = this.assessRisk(itemData, prediction);
    const opportunity = this.calculateOpportunity(itemData, prediction);

    // Make final decision
    const decision = this.makeDecision(itemData, prediction, riskAssessment, opportunity);

    return decision;
  }

  /**
   * Validate item data quality
   */
  isValidItemData(itemData) {
    return itemData &&
           itemData.highPrice > 0 &&
           itemData.lowPrice > 0 &&
           itemData.volume !== undefined &&
           itemData.marginPercent !== undefined &&
           !isNaN(itemData.highPrice) &&
           !isNaN(itemData.lowPrice);
  }

  /**
   * Check if item meets basic trading criteria
   */
  meetsBasicCriteria(itemData, sessionConfig) {
    const minMargin = sessionConfig.minProfitMargin || 0.05;
    const maxValue = sessionConfig.maxItemValue || 2000000000;
    const minVolume = sessionConfig.minVolume || 10;

    return itemData.marginPercent >= (minMargin * 100) &&
           itemData.highPrice <= maxValue &&
           itemData.volume >= minVolume &&
           itemData.riskScore < 80; // Risk threshold
  }

  /**
   * Get AI model prediction
   */
  async getAIPrediction(itemData) {
    try {
      // Prepare features for AI model
      const features = this.prepareFeatures(itemData);
      
      // Get prediction from AI model
      const prediction = await this.aiModel.predict(features);
      
      return {
        action: prediction.action, // 'buy', 'sell', 'hold'
        confidence: prediction.confidence,
        expectedReturn: prediction.expectedReturn,
        timeHorizon: prediction.timeHorizon,
        reasoning: prediction.reasoning
      };

    } catch (error) {
      this.logger.warn('Error getting AI prediction', error);
      return null;
    }
  }

  /**
   * Prepare features for AI model
   */
  prepareFeatures(itemData) {
    return {
      // Price features
      currentPrice: (itemData.highPrice + itemData.lowPrice) / 2,
      priceSpread: itemData.highPrice - itemData.lowPrice,
      marginPercent: itemData.marginPercent,
      
      // Volume features
      volume: Math.log(itemData.volume + 1), // Log transform
      volumeNormalized: Math.min(itemData.volume / 1000, 10),
      
      // Technical indicators
      rsi: itemData.rsi || 50,
      volatility: itemData.volatility || 0,
      
      // Risk features
      riskScore: itemData.riskScore || 50,
      
      // Market features
      timestamp: Date.now(),
      dayOfWeek: new Date().getDay(),
      hourOfDay: new Date().getHours()
    };
  }

  /**
   * CONSOLIDATED: Assess trading risk using FinancialCalculationService
   */
  assessRisk(itemData, prediction) {
    // CONSOLIDATED: Use FinancialCalculationService for risk calculation
    let baseRiskScore = 0;
    
    if (this.financialCalculator && this.financialCalculator.calculateRiskScore) {
      baseRiskScore = this.financialCalculator.calculateRiskScore(itemData);
    } else {
      // Fallback if service not available
      baseRiskScore = itemData.riskScore || 50;
    }

    // Add AI-specific risk factors
    let aiRiskAdjustment = 0;
    if (prediction.confidence < 0.6) aiRiskAdjustment += 20;
    else if (prediction.confidence < 0.8) aiRiskAdjustment += 10;

    const totalRiskScore = Math.min(100, Math.max(0, baseRiskScore + aiRiskAdjustment));

    return {
      score: totalRiskScore,
      level: totalRiskScore < 30 ? 'LOW' : totalRiskScore < 60 ? 'MEDIUM' : 'HIGH',
      factors: {
        volume: itemData.volume < 500,
        volatility: itemData.volatility > 25,
        price: itemData.highPrice > 1000000000,
        confidence: prediction.confidence < 0.8
      }
    };
  }

  /**
   * Calculate opportunity score
   */
  calculateOpportunity(itemData, prediction) {
    let opportunityScore = 0;

    // Margin opportunity
    if (itemData.marginPercent > 20) opportunityScore += 30;
    else if (itemData.marginPercent > 10) opportunityScore += 20;
    else if (itemData.marginPercent > 5) opportunityScore += 10;

    // Volume opportunity
    if (itemData.volume > 1000) opportunityScore += 25;
    else if (itemData.volume > 500) opportunityScore += 15;

    // AI prediction opportunity
    opportunityScore += prediction.confidence * 25;
    opportunityScore += Math.min(prediction.expectedReturn * 100, 20);

    return {
      score: Math.min(100, Math.max(0, opportunityScore)),
      level: opportunityScore > 70 ? 'HIGH' : opportunityScore > 40 ? 'MEDIUM' : 'LOW',
      expectedProfit: itemData.marginGp || 0,
      expectedReturn: prediction.expectedReturn
    };
  }

  /**
   * Make final trading decision
   */
  makeDecision(itemData, prediction, riskAssessment, opportunity) {
    // Decision thresholds
    const minOpportunity = 30;
    const maxRisk = 70;
    const minConfidence = 0.5;

    // Check if decision should be made
    if (opportunity.score < minOpportunity ||
        riskAssessment.score > maxRisk ||
        prediction.confidence < minConfidence) {
      return null;
    }

    // Calculate position size based on risk
    const basePosition = 1000000; // 1M base position
    const riskMultiplier = Math.max(0.1, (100 - riskAssessment.score) / 100);
    const positionSize = Math.floor(basePosition * riskMultiplier);

    return {
      itemId: itemData.itemId,
      action: prediction.action,
      confidence: prediction.confidence,
      
      // Financial details
      buyPrice: itemData.lowPrice,
      sellPrice: itemData.highPrice,
      positionSize,
      expectedProfit: opportunity.expectedProfit,
      expectedReturn: opportunity.expectedReturn,
      
      // Risk details
      riskScore: riskAssessment.score,
      riskLevel: riskAssessment.level,
      opportunityScore: opportunity.score,
      
      // Metadata
      timestamp: new Date(),
      reasoning: prediction.reasoning,
      features: this.prepareFeatures(itemData)
    };
  }

  /**
   * Validate decision before execution
   */
  validateDecision(decision) {
    const validations = {
      hasValidItemId: !!decision.itemId,
      hasValidAction: ['buy', 'sell', 'hold'].includes(decision.action),
      hasValidPrices: decision.buyPrice > 0 && decision.sellPrice > 0,
      hasValidPosition: decision.positionSize > 0,
      hasAcceptableRisk: decision.riskScore <= 80,
      hasMinimumConfidence: decision.confidence >= 0.5
    };

    const isValid = Object.values(validations).every(v => v);
    
    return {
      isValid,
      validations,
      errors: Object.entries(validations)
        .filter(([key, value]) => !value)
        .map(([key]) => key)
    };
  }
}

module.exports = { TradingDecisionService };