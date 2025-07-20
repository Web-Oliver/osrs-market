/**
 * ⚙️ Market Data Processing Service - Context7 Pattern
 *
 * Single Responsibility Principle Implementation:
 * - ONLY responsible for processing and transforming raw market data
 * - Separated from MarketDataService to reduce God Class violation
 * - Converts external API formats to internal format
 * - Applies business rules and enrichment logic
 *
 * SOLID Principles Applied:
 * - SRP: Single responsibility for data processing
 * - OCP: Open for extension with new processing rules
 * - DIP: Depends on FinancialCalculationService abstraction
 */

const { BaseService } = require('../BaseService');

class MarketDataProcessingService extends BaseService {
  constructor(dependencies = {}) {
    super('MarketDataProcessingService', {
      enableCache: false,
      enableMongoDB: false
    });

    // Dependency injection
    this.financialCalculator = dependencies.financialCalculator;
    this.dataTransformer = dependencies.dataTransformer;

    if (!this.financialCalculator) {
      throw new Error('FinancialCalculationService dependency is required');
    }
  }

  /**
   * Process raw OSRS Wiki data into internal market format
   * @param {Object} rawWikiData - Raw data from OSRS Wiki API
   * @returns {Object} Processed market data
   */
  processLiveMarketData(rawWikiData) {
    if (!rawWikiData || !rawWikiData.data) {
      throw new Error('Invalid raw wiki data provided');
    }

    this.logger.info('Processing live market data', {
      itemCount: Object.keys(rawWikiData.data).length
    });

    const processedData = {};

    Object.entries(rawWikiData.data).forEach(([itemId, priceData]) => {
      try {
        // Skip items without valid price data
        if (!priceData.high || !priceData.low || priceData.high <= 0 || priceData.low <= 0) {
          return;
        }

        // Convert to internal format
        const rawDataForCalculation = {
          itemId: parseInt(itemId),
          highPrice: priceData.high,
          lowPrice: priceData.low,
          volume: priceData.highTime ? 100 : 50, // Estimate volume based on data freshness
          timestamp: priceData.highTime || Date.now(),
          interval: 'latest',
          source: 'osrs_wiki_latest'
        };

        // Calculate all financial metrics using consolidated service
        const calculatedMetrics = this.financialCalculator.calculateAllMetrics(rawDataForCalculation);

        processedData[itemId] = {
          ...calculatedMetrics,
          // Additional processing-specific fields
          dataFreshness: this.calculateDataFreshness(priceData.highTime),
          reliability: this.calculateReliability(priceData),
          lastUpdated: new Date()
        };

      } catch (error) {
        this.logger.warn(`Error processing item ${itemId}`, error);
      }
    });

    this.logger.info(`Successfully processed ${Object.keys(processedData).length} items`);
    return processedData;
  }

  /**
   * Process 5-minute market data with volume information
   * @param {Object} rawWikiData - Raw 5m data from OSRS Wiki API
   * @returns {Object} Processed 5-minute data
   */
  process5MinuteMarketData(rawWikiData) {
    if (!rawWikiData || !rawWikiData.data) {
      throw new Error('Invalid raw 5m wiki data provided');
    }

    this.logger.info('Processing 5-minute market data', {
      itemCount: Object.keys(rawWikiData.data).length
    });

    const processedData = {};

    Object.entries(rawWikiData.data).forEach(([itemId, priceData]) => {
      try {
        if (!priceData.avgHighPrice || !priceData.avgLowPrice) {
          return;
        }

        const rawDataForCalculation = {
          itemId: parseInt(itemId),
          highPrice: priceData.avgHighPrice,
          lowPrice: priceData.avgLowPrice,
          volume: priceData.highPriceVolume || priceData.lowPriceVolume || 0,
          timestamp: Date.now(),
          interval: '5m',
          source: 'osrs_wiki_5m'
        };

        const calculatedMetrics = this.financialCalculator.calculateAllMetrics(rawDataForCalculation);

        processedData[itemId] = {
          ...calculatedMetrics,
          // 5m specific fields
          highPriceVolume: priceData.highPriceVolume || 0,
          lowPriceVolume: priceData.lowPriceVolume || 0,
          totalVolume: (priceData.highPriceVolume || 0) + (priceData.lowPriceVolume || 0),
          volumeWeightedPrice: this.calculateVolumeWeightedPrice(priceData),
          interval: '5m',
          lastUpdated: new Date()
        };

      } catch (error) {
        this.logger.warn(`Error processing 5m item ${itemId}`, error);
      }
    });

    this.logger.info(`Successfully processed ${Object.keys(processedData).length} 5m items`);
    return processedData;
  }

  /**
   * Process 1-hour market data
   * @param {Object} rawWikiData - Raw 1h data from OSRS Wiki API
   * @returns {Object} Processed 1-hour data
   */
  process1HourMarketData(rawWikiData) {
    if (!rawWikiData || !rawWikiData.data) {
      throw new Error('Invalid raw 1h wiki data provided');
    }

    this.logger.info('Processing 1-hour market data', {
      itemCount: Object.keys(rawWikiData.data).length
    });

    const processedData = {};

    Object.entries(rawWikiData.data).forEach(([itemId, priceData]) => {
      try {
        if (!priceData.avgHighPrice || !priceData.avgLowPrice) {
          return;
        }

        const rawDataForCalculation = {
          itemId: parseInt(itemId),
          highPrice: priceData.avgHighPrice,
          lowPrice: priceData.avgLowPrice,
          volume: priceData.highPriceVolume || priceData.lowPriceVolume || 0,
          timestamp: Date.now(),
          interval: '1h',
          source: 'osrs_wiki_1h'
        };

        const calculatedMetrics = this.financialCalculator.calculateAllMetrics(rawDataForCalculation);

        processedData[itemId] = {
          ...calculatedMetrics,
          // 1h specific fields
          highPriceVolume: priceData.highPriceVolume || 0,
          lowPriceVolume: priceData.lowPriceVolume || 0,
          totalVolume: (priceData.highPriceVolume || 0) + (priceData.lowPriceVolume || 0),
          volumeWeightedPrice: this.calculateVolumeWeightedPrice(priceData),
          interval: '1h',
          trend: this.calculateTrend(priceData),
          lastUpdated: new Date()
        };

      } catch (error) {
        this.logger.warn(`Error processing 1h item ${itemId}`, error);
      }
    });

    this.logger.info(`Successfully processed ${Object.keys(processedData).length} 1h items`);
    return processedData;
  }

  /**
   * Enrich processed data with additional business logic
   * @param {Object} processedData - Already processed market data
   * @param {Object} enrichmentData - Additional data for enrichment
   * @returns {Object} Enriched market data
   */
  enrichMarketData(processedData, enrichmentData = {}) {
    this.logger.info('Enriching market data', {
      itemCount: Object.keys(processedData).length
    });

    const enrichedData = {};

    Object.entries(processedData).forEach(([itemId, itemData]) => {
      try {
        enrichedData[itemId] = {
          ...itemData,
          // Trading opportunity classification
          opportunityClass: this.classifyTradingOpportunity(itemData),
          riskLevel: this.classifyRiskLevel(itemData.riskScore),
          // Market conditions
          marketCondition: this.assessMarketCondition(itemData),
          liquidityScore: this.calculateLiquidityScore(itemData),
          // Recommendations
          recommendedAction: this.generateRecommendation(itemData),
          confidence: this.calculateConfidence(itemData),
          // Enrichment metadata
          enrichedAt: new Date(),
          enrichmentVersion: '1.0.0'
        };

        // Add external enrichment data if provided
        if (enrichmentData[itemId]) {
          enrichedData[itemId] = {
            ...enrichedData[itemId],
            ...enrichmentData[itemId]
          };
        }

      } catch (error) {
        this.logger.warn(`Error enriching item ${itemId}`, error);
        enrichedData[itemId] = itemData; // Keep original data if enrichment fails
      }
    });

    this.logger.info(`Successfully enriched ${Object.keys(enrichedData).length} items`);
    return enrichedData;
  }

  /**
   * Calculate data freshness score based on timestamp
   * @param {number} timestamp - Data timestamp
   * @returns {number} Freshness score (0-100)
   */
  calculateDataFreshness(timestamp) {
    if (!timestamp) {
      return 0;
    }

    const ageMs = Date.now() - timestamp;
    const ageMinutes = ageMs / (1000 * 60);

    // Freshness decreases over time
    if (ageMinutes <= 5) {
      return 100;
    }
    if (ageMinutes <= 15) {
      return 80;
    }
    if (ageMinutes <= 60) {
      return 60;
    }
    if (ageMinutes <= 180) {
      return 40;
    }
    if (ageMinutes <= 720) {
      return 20;
    }
    return 0;
  }

  /**
   * Calculate reliability score based on price data quality
   * @param {Object} priceData - Raw price data
   * @returns {number} Reliability score (0-100)
   */
  calculateReliability(priceData) {
    let score = 100;

    // Reduce score for missing data
    if (!priceData.high) {
      score -= 30;
    }
    if (!priceData.low) {
      score -= 30;
    }
    if (!priceData.highTime) {
      score -= 20;
    }
    if (!priceData.lowTime) {
      score -= 20;
    }

    // Reduce score for stale data
    if (priceData.highTime) {
      const freshness = this.calculateDataFreshness(priceData.highTime);
      score = Math.min(score, freshness);
    }

    return Math.max(0, score);
  }

  /**
   * Calculate volume-weighted price
   * @param {Object} priceData - Price data with volume information
   * @returns {number} Volume-weighted price
   */
  calculateVolumeWeightedPrice(priceData) {
    const highVol = priceData.highPriceVolume || 0;
    const lowVol = priceData.lowPriceVolume || 0;
    const totalVol = highVol + lowVol;

    if (totalVol === 0) {
      return (priceData.avgHighPrice + priceData.avgLowPrice) / 2;
    }

    const weightedPrice = (
      (priceData.avgHighPrice * highVol) +
      (priceData.avgLowPrice * lowVol)
    ) / totalVol;

    return Math.round(weightedPrice);
  }

  /**
   * Calculate price trend
   * @param {Object} priceData - Price data
   * @returns {string} Trend direction
   */
  calculateTrend(priceData) {
    // Simplified trend calculation
    // In a real implementation, this would use historical data
    const spread = priceData.avgHighPrice - priceData.avgLowPrice;
    const midPrice = (priceData.avgHighPrice + priceData.avgLowPrice) / 2;
    const spreadPercent = (spread / midPrice) * 100;

    if (spreadPercent > 10) {
      return 'volatile';
    }
    if (spreadPercent > 5) {
      return 'trending';
    }
    return 'stable';
  }

  /**
   * Classify trading opportunity
   * @param {Object} itemData - Processed item data
   * @returns {string} Opportunity classification
   */
  classifyTradingOpportunity(itemData) {
    const margin = itemData.marginPercent || 0;
    const volume = itemData.volume || 0;
    const risk = itemData.riskScore || 0;

    if (margin > 20 && volume > 1000 && risk < 30) {
      return 'excellent';
    }
    if (margin > 10 && volume > 500 && risk < 50) {
      return 'good';
    }
    if (margin > 5 && volume > 100 && risk < 70) {
      return 'moderate';
    }
    if (margin > 0) {
      return 'poor';
    }
    return 'loss';
  }

  /**
   * Classify risk level
   * @param {number} riskScore - Risk score
   * @returns {string} Risk level
   */
  classifyRiskLevel(riskScore) {
    if (riskScore < 25) {
      return 'low';
    }
    if (riskScore < 50) {
      return 'medium';
    }
    if (riskScore < 75) {
      return 'high';
    }
    return 'extreme';
  }

  /**
   * Assess market condition
   * @param {Object} itemData - Item data
   * @returns {string} Market condition
   */
  assessMarketCondition(itemData) {
    const volatility = itemData.volatility || 0;
    const volume = itemData.volume || 0;

    if (volatility > 15 && volume > 1000) {
      return 'active';
    }
    if (volatility > 10 || volume > 500) {
      return 'normal';
    }
    if (volatility > 5 || volume > 100) {
      return 'quiet';
    }
    return 'dormant';
  }

  /**
   * Calculate liquidity score
   * @param {Object} itemData - Item data
   * @returns {number} Liquidity score (0-100)
   */
  calculateLiquidityScore(itemData) {
    const volume = itemData.volume || 0;
    const margin = itemData.marginPercent || 0;

    let score = 0;

    // Volume component (60% of score)
    if (volume > 10000) {
      score += 60;
    } else if (volume > 5000) {
      score += 50;
    } else if (volume > 1000) {
      score += 40;
    } else if (volume > 500) {
      score += 30;
    } else if (volume > 100) {
      score += 20;
    } else if (volume > 10) {
      score += 10;
    }

    // Margin component (40% of score)
    if (margin > 0 && margin < 50) {
      score += 40;
    } else if (margin >= 50) {
      score += 20;
    }

    return Math.min(100, score);
  }

  /**
   * Generate trading recommendation
   * @param {Object} itemData - Item data
   * @returns {string} Recommendation
   */
  generateRecommendation(itemData) {
    const opportunity = this.classifyTradingOpportunity(itemData);
    const risk = this.classifyRiskLevel(itemData.riskScore);
    const liquidity = this.calculateLiquidityScore(itemData);

    if (opportunity === 'excellent' && risk === 'low' && liquidity > 70) {
      return 'strong_buy';
    }
    if (opportunity === 'good' && (risk === 'low' || risk === 'medium') && liquidity > 50) {
      return 'buy';
    }
    if (opportunity === 'moderate' && risk !== 'extreme' && liquidity > 30) {
      return 'hold';
    }
    if (opportunity === 'poor' || risk === 'extreme') {
      return 'avoid';
    }
    return 'monitor';
  }

  /**
   * Calculate recommendation confidence
   * @param {Object} itemData - Item data
   * @returns {number} Confidence percentage (0-100)
   */
  calculateConfidence(itemData) {
    let confidence = 50; // Base confidence

    // Data quality factors
    if (itemData.reliability && itemData.reliability > 80) {
      confidence += 20;
    }
    if (itemData.dataFreshness && itemData.dataFreshness > 80) {
      confidence += 15;
    }

    // Volume factors
    if (itemData.volume > 1000) {
      confidence += 10;
    } else if (itemData.volume < 50) {
      confidence -= 20;
    }

    // Volatility factors
    if (itemData.volatility > 0 && itemData.volatility < 20) {
      confidence += 10;
    } else if (itemData.volatility > 50) {
      confidence -= 15;
    }

    return Math.max(0, Math.min(100, confidence));
  }
}

module.exports = { MarketDataProcessingService };
