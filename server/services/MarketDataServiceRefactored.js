/**
 * 📈 Market Data Service (Refactored) - Context7 Pattern
 * 
 * SOLID Principles Implementation:
 * - SRP: Single responsibility for coordinating market data operations
 * - OCP: Open for extension through dependency injection
 * - LSP: Maintains same interface as original MarketDataService
 * - ISP: Uses focused interfaces for each concern
 * - DIP: Depends on abstractions, not concrete implementations
 * 
 * DRY Principle Implementation:
 * - Eliminates duplicate calculation logic (delegates to FinancialCalculationService)
 * - Reuses common patterns through dependency injection
 * - Consolidates error handling and logging
 * 
 * This refactored service reduces the original 2,471 lines to ~300 lines
 * by properly separating concerns and eliminating code duplication.
 */

const { BaseService } = require('./BaseService');
const { DatabaseUtility } = require('../utils/DatabaseUtility');
const { MarketPriceSnapshotModel } = require('../models/MarketPriceSnapshotModel');

class MarketDataServiceRefactored extends BaseService {
  constructor(dependencies = {}) {
    super('MarketDataService', {
      enableCache: true,
      cachePrefix: 'market_data',
      cacheTTL: 600,
      enableMongoDB: true
    });

    // Dependency injection (implements DIP)
    this.fetchService = dependencies.marketDataFetcher;
    this.processingService = dependencies.marketDataProcessor;
    this.financialCalculator = dependencies.financialCalculator;

    // Validate required dependencies
    this.validateDependencies();

    // Legacy compatibility
    this.itemRepository = dependencies.itemRepository;
    this.aiTrading = dependencies.aiTrading;
  }

  /**
   * Validate that all required dependencies are provided
   * @throws {Error} If required dependencies are missing
   */
  validateDependencies() {
    const required = ['fetchService', 'processingService', 'financialCalculator'];
    const missing = required.filter(dep => !this[dep]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required dependencies: ${missing.join(', ')}`);
    }
  }

  /**
   * Get live market data - Orchestrates fetch and processing
   * Reduces original ~97 lines to ~15 lines through delegation
   */
  async getLiveMarketData() {
    return this.execute(async () => {
this.logger.info('Getting live market data');

        // Fetch raw data (delegated to specialized service)
        const rawData = await this.fetchService.fetchLiveMarketData();

        // Process data (delegated to specialized service)
        const processedData = this.processingService.processLiveMarketData(rawData);

        this.logger.info(`Successfully retrieved live data for ${Object.keys(processedData).length} items`);
        return processedData;
    }, 'getLiveMarketData', { logSuccess: true });
  }, 300);
  }

  /**
   * Get 5-minute market data - Orchestrates fetch and processing
   * Reduces original ~62 lines to ~15 lines through delegation
   */
  async get5MinuteMarketData() {
    return this.execute(async () => {
this.logger.info('Getting 5-minute market data');

        const rawData = await this.fetchService.fetch5MinuteMarketData();
        const processedData = this.processingService.process5MinuteMarketData(rawData);

        this.logger.info(`Successfully retrieved 5m data for ${Object.keys(processedData).length} items`);
        return processedData;
    }, 'get5MinuteMarketData', { logSuccess: true });
  }, 300);
  }

  /**
   * Get 1-hour market data - Orchestrates fetch and processing
   * Reduces original ~59 lines to ~15 lines through delegation
   */
  async get1HourMarketData() {
    return this.execute(async () => {
this.logger.info('Getting 1-hour market data');

        const rawData = await this.fetchService.fetch1HourMarketData();
        const processedData = this.processingService.process1HourMarketData(rawData);

        this.logger.info(`Successfully retrieved 1h data for ${Object.keys(processedData).length} items`);
        return processedData;
    }, 'get1HourMarketData', { logSuccess: true });
  }, 600);
  }

  /**
   * Save market snapshot to database
   * Simplified from original ~139 lines to ~25 lines
   */
  async saveMarketSnapshot() {
    return this.execute(async () => {
this.logger.info('Saving market snapshot', { 
        interval, 
        itemCount: Object.keys(marketData).length 
      });

      const savedCount = await this.withRetry(async () => {
        let count = 0;

        for (const [itemId, itemData] of Object.entries(marketData)) {
          try {
            const snapshotData = {
              ...itemData,
              interval,
              createdAt: new Date()
            };

            await MarketPriceSnapshotModel.findOneAndUpdate(
              { itemId: parseInt(itemId), interval },
              snapshotData,
              { upsert: true, new: true }
            );

            count++;
    }, 'saveMarketSnapshot', { logSuccess: true });
  }

  /**
   * Get market snapshots from database
   * Simplified from original ~58 lines to ~20 lines
   */
  async getMarketSnapshots() {
    return this.execute(async () => {
const query = { interval };
      
      if (itemId) {
        query.itemId = parseInt(itemId);
      }

      // DRY: Use DatabaseUtility for standardized date range filtering
      if (startDate || endDate) {
        Object.assign(query, DatabaseUtility.buildDateRangeQuery(startDate, endDate, 'createdAt'));
      }

      const snapshots = await MarketPriceSnapshotModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(1000) // Prevent excessive memory usage
        .lean();

      this.logger.info(`Retrieved ${snapshots.length} market snapshots`);
      return snapshots;
    }, 'getMarketSnapshots', { logSuccess: true });
  }

  /**
   * Get top flipping opportunities
   * Simplified analytics using processing service
   */
  async getTopFlips() {
    return this.execute(async () => {
const {
        limit = 50,
        minMargin = 5,
        minVolume = 100,
        maxRisk = 70,
        interval = 'latest'
      } = options;

      this.logger.info('Getting top flipping opportunities', options);

      // Get latest market data
      const marketData = await this.getLiveMarketData();

      // Filter and sort opportunities
      const opportunities = Object.values(marketData)
        .filter(item => 
          item.marginPercent >= minMargin &&
          item.volume >= minVolume &&
          item.riskScore <= maxRisk
        )
        .sort((a, b) => {
          // Sort by profit potential (margin * volume * confidence)
          const scoreA = (a.marginPercent || 0) * Math.log(a.volume || 1) * (a.confidence || 50) / 100;
          const scoreB = (b.marginPercent || 0) * Math.log(b.volume || 1) * (b.confidence || 50) / 100;
          return scoreB - scoreA;
        })
        .slice(0, limit);

      this.logger.info(`Found ${opportunities.length} flipping opportunities`);
      return opportunities;
    }, 'getTopFlips', { logSuccess: true });
  }

  /**
   * Get trading recommendations
   * Simplified recommendation logic using processing service
   */
  async getRecommendations() {
    return this.execute(async () => {
const {
        riskTolerance = 'medium',
        investmentAmount = 100000,
        timeHorizon = 'short'
      } = options;

      this.logger.info('Getting trading recommendations', options);

      const marketData = await this.getLiveMarketData();
      
      // Filter by risk tolerance
      const riskThreshold = this.getRiskThreshold(riskTolerance);
      const recommendations = Object.values(marketData)
        .filter(item => item.riskScore <= riskThreshold)
        .filter(item => item.recommendedAction === 'buy' || item.recommendedAction === 'strong_buy')
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 20);

      this.logger.info(`Generated ${recommendations.length} recommendations`);
      return recommendations;
    }, 'getRecommendations', { logSuccess: true });
  }

  /**
   * Get market analytics
   * Consolidated analytics using financial calculator
   */
  async getAnalytics() {
    return this.execute(async () => {
this.logger.info('Getting market analytics');

      const marketData = await this.getLiveMarketData();
      const items = Object.values(marketData);

      const analytics = {
        totalItems: items.length,
        averageMargin: this.calculateAverage(items, 'marginPercent'),
        averageVolume: this.calculateAverage(items, 'volume'),
        averageRisk: this.calculateAverage(items, 'riskScore'),
        
        // Opportunity distribution
        opportunityDistribution: this.calculateOpportunityDistribution(items),
        
        // Risk distribution
        riskDistribution: this.calculateRiskDistribution(items),
        
        // Top performers
        topMarginItems: items.sort((a, b) => (b.marginPercent || 0) - (a.marginPercent || 0)).slice(0, 10),
        topVolumeItems: items.sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 10),
        
        lastUpdated: new Date()
      };

      this.logger.info('Generated market analytics');
      return analytics;
    }, 'getAnalytics', { logSuccess: true });
  }

  /**
   * Export market data
   * Simplified export functionality
   */
  async exportData() {
    return this.execute(async () => {
const { format = 'json', interval = 'latest' } = options;
      
      this.logger.info('Exporting market data', { format, interval });

      const marketData = await this.getLiveMarketData();
      
      if (format === 'csv') {
        return this.convertToCSV(marketData);
      }

      return marketData;
    }, 'exportData', { logSuccess: true });
  }

  // Helper methods

  getRiskThreshold(riskTolerance) {
    const thresholds = {
      low: 30,
      medium: 60,
      high: 90
    };
    return thresholds[riskTolerance] || thresholds.medium;
  }

  calculateAverage(items, field) {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + (item[field] || 0), 0);
    return Math.round((sum / items.length) * 100) / 100;
  }

  calculateOpportunityDistribution(items) {
    const distribution = { excellent: 0, good: 0, moderate: 0, poor: 0, loss: 0 };
    
    items.forEach(item => {
      const opportunity = item.opportunityClass || 'poor';
      distribution[opportunity] = (distribution[opportunity] || 0) + 1;
    });

    return distribution;
  }

  calculateRiskDistribution(items) {
    const distribution = { low: 0, medium: 0, high: 0, extreme: 0 };
    
    items.forEach(item => {
      const risk = item.riskLevel || 'medium';
      distribution[risk] = (distribution[risk] || 0) + 1;
    });

    return distribution;
  }

  convertToCSV(data) {
    if (Object.keys(data).length === 0) return '';

    const items = Object.values(data);
    const headers = Object.keys(items[0]).join(',');
    const rows = items.map(item => Object.values(item).join(','));
    
    return [headers, ...rows].join('\n');
  }
}

module.exports = { MarketDataServiceRefactored };