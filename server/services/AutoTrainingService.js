/**
 * 🔄 Auto Training Service - Context7 Optimized
 * 
 * Context7 Pattern: Service Layer for Automated AI Training
 * - Orchestrates automated training cycles for AI trading systems
 * - Manages data collection and batch processing
 * - Implements continuous learning and adaptive configuration
 * - DRY principles with reusable training patterns
 * - SOLID architecture with single responsibility
 */

const { Logger } = require('../utils/Logger');
const { OSRSDataCollectorService } = require('./OSRSDataCollectorService');
const { AITradingOrchestratorService } = require('./AITradingOrchestratorService');

class AutoTrainingService {
  constructor(config = {}) {
    this.logger = new Logger('AutoTrainingService');
    this.config = {
      dataCollection: {
        enableAutoCollection: true,
        collectionInterval: 300000, // 5 minutes
        maxItemsPerCollection: 1000,
        enableHistoricalData: true,
        ...config.dataCollection
      },
      neuralNetwork: {
        inputSize: 10,
        hiddenSize: 64,
        outputSize: 3,
        learningRate: 0.001,
        batchSize: 32,
        epochs: 100,
        ...config.neuralNetwork
      },
      adaptiveLearning: {
        enableAdaptation: true,
        adaptationInterval: 3600000, // 1 hour
        performanceThreshold: 0.7,
        explorationDecay: 0.995,
        ...config.adaptiveLearning
      },
      training: {
        enableAutoTraining: true,
        trainingInterval: 600000, // 10 minutes
        minDataPoints: 100,
        batchProcessingSize: 50,
        continuousLearning: true,
        ...config.training
      },
      itemSelection: {
        enableSmartFiltering: true,
        volumeThreshold: 1000,
        priceRangeMin: 1000,
        priceRangeMax: 10000000,
        spreadThreshold: 5,
        maxItemsToTrade: 100,
        ...config.itemSelection
      },
      ...config
    };

    this.isRunning = false;
    this.trainingIntervalId = null;
    this.sessionId = null;
    this.dataCollector = null;
    this.aiOrchestrator = null;

    this.logger.info('🔄 Auto Training Service initialized', {
      enableAutoTraining: this.config.training.enableAutoTraining,
      trainingInterval: this.config.training.trainingInterval,
      minDataPoints: this.config.training.minDataPoints,
      batchProcessingSize: this.config.training.batchProcessingSize
    });
  }

  /**
   * Context7 Pattern: Start the automated training service
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('⚠️ Auto training service already running');
      return;
    }

    this.logger.info('🚀 Starting automated AI training service...');
    this.isRunning = true;

    try {
      // Initialize data collector
      this.dataCollector = new OSRSDataCollectorService(this.config.dataCollection);
      await this.dataCollector.startCollection();

      // Initialize AI orchestrator
      this.aiOrchestrator = new AITradingOrchestratorService(
        this.config.neuralNetwork,
        this.config.adaptiveLearning
      );

      // Start AI training session
      this.sessionId = this.aiOrchestrator.startLearningSession();

      // Set up automated training loop
      if (this.config.training.enableAutoTraining) {
        this.trainingIntervalId = setInterval(async () => {
          try {
            await this.performTrainingCycle();
          } catch (error) {
            this.logger.error('❌ Error in training cycle', error);
          }
        }, this.config.training.trainingInterval);
      }

      this.logger.info('✅ Auto training service started successfully', {
        sessionId: this.sessionId,
        autoTraining: this.config.training.enableAutoTraining,
        trainingInterval: this.config.training.trainingInterval
      });

    } catch (error) {
      this.logger.error('❌ Failed to start auto training service', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Context7 Pattern: Stop the automated training service
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('⚠️ Auto training service is not running');
      return;
    }

    this.logger.info('🛑 Stopping auto training service...');

    try {
      // Stop data collection
      if (this.dataCollector) {
        this.dataCollector.stopCollection();
      }

      // Stop training loop
      if (this.trainingIntervalId) {
        clearInterval(this.trainingIntervalId);
        this.trainingIntervalId = null;
      }

      // Finish training session
      if (this.aiOrchestrator && this.sessionId) {
        this.aiOrchestrator.finishLearningSession();
        this.sessionId = null;
      }

      this.isRunning = false;
      this.logger.info('✅ Auto training service stopped successfully');

    } catch (error) {
      this.logger.error('❌ Error stopping auto training service', error);
    }
  }

  /**
   * Context7 Pattern: Perform a single training cycle
   */
  async performTrainingCycle() {
    this.logger.debug('🔄 Performing automated training cycle...');

    try {
      if (!this.dataCollector || !this.aiOrchestrator) {
        throw new Error('Services not initialized');
      }

      const latestData = this.dataCollector.getLatestData();
      if (!latestData) {
        this.logger.debug('⚠️ No data available for training');
        return;
      }

      // Check if we have enough data points
      if (latestData.items.length < this.config.training.minDataPoints) {
        this.logger.debug('⚠️ Insufficient data points', {
          current: latestData.items.length,
          required: this.config.training.minDataPoints
        });
        return;
      }

      // Filter and select relevant items for training
      const selectedItems = this.selectTrainingItems(latestData.items);
      
      if (selectedItems.length === 0) {
        this.logger.debug('⚠️ No suitable items found for training');
        return;
      }

      this.logger.debug('📊 Processing items for AI training', {
        selectedItems: selectedItems.length,
        totalItems: latestData.items.length
      });

      // Process items in batches to avoid overwhelming the system
      const batchSize = this.config.training.batchProcessingSize;
      for (let i = 0; i < selectedItems.length; i += batchSize) {
        const batch = selectedItems.slice(i, i + batchSize);
        
        try {
          await this.aiOrchestrator.processMarketData(batch);
          
          // Small delay between batches to prevent API rate limiting
          await this.delay(1000);
        } catch (error) {
          this.logger.error('❌ Error processing batch', {
            batchStart: i,
            batchEnd: i + batchSize,
            error: error.message
          });
        }
      }

      // Generate training report
      this.generateTrainingReport();

    } catch (error) {
      this.logger.error('❌ Training cycle failed', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Select items for training based on filters
   */
  selectTrainingItems(items) {
    if (!this.config.itemSelection.enableSmartFiltering) {
      return items.slice(0, this.config.itemSelection.maxItemsToTrade);
    }

    const filtered = items.filter(item => {
      // Price range filter
      const avgPrice = ((item.priceData?.high || 0) + (item.priceData?.low || 0)) / 2;
      if (avgPrice < this.config.itemSelection.priceRangeMin) return false;
      if (avgPrice > this.config.itemSelection.priceRangeMax) return false;

      // Spread threshold filter
      const high = item.priceData?.high || 0;
      const low = item.priceData?.low || 0;
      if (high === 0 || low === 0) return false;
      
      const spreadPercentage = ((high - low) / low) * 100;
      if (spreadPercentage < this.config.itemSelection.spreadThreshold) return false;

      // Must be tradeable on Grand Exchange
      if (!item.grandExchange) return false;

      return true;
    });

    // Sort by trading potential (spread percentage desc)
    const sorted = filtered.sort((a, b) => {
      const spreadA = this.calculateSpread(a);
      const spreadB = this.calculateSpread(b);
      return spreadB - spreadA;
    });

    return sorted.slice(0, this.config.itemSelection.maxItemsToTrade);
  }

  /**
   * Context7 Pattern: Calculate spread percentage for an item
   */
  calculateSpread(item) {
    const high = item.priceData?.high || 0;
    const low = item.priceData?.low || 0;
    if (low === 0) return 0;
    return ((high - low) / low) * 100;
  }

  /**
   * Context7 Pattern: Generate training cycle report
   */
  generateTrainingReport() {
    try {
      const progress = this.aiOrchestrator.getTrainingProgress();
      const analytics = this.aiOrchestrator.getPerformanceAnalytics();
      const collectorStats = this.dataCollector.getStats();

      this.logger.info('📊 Training Cycle Report', {
        dataCollection: {
          totalCollections: collectorStats.totalCollections,
          lastCollection: collectorStats.lastCollection
        },
        session: progress?.session ? {
          id: progress.session.id,
          episodeCount: progress.session.episodeCount,
          totalTrades: progress.session.totalTrades,
          totalProfit: progress.session.totalProfit?.toFixed(2) + ' GP'
        } : null,
        performance: analytics?.overall ? {
          successRate: analytics.overall.successRate?.toFixed(1) + '%',
          averageProfit: analytics.overall.averageProfit?.toFixed(2) + ' GP',
          profitFactor: analytics.overall.profitFactor?.toFixed(2)
        } : null
      });

    } catch (error) {
      this.logger.error('❌ Error generating training report', error);
    }
  }

  /**
   * Context7 Pattern: Get current service status
   */
  getStatus() {
    const dataCollectorStats = this.dataCollector?.getStats() || {};
    const trainingProgress = this.aiOrchestrator?.getTrainingProgress() || {};
    const analytics = this.aiOrchestrator?.getPerformanceAnalytics() || {};

    return {
      isRunning: this.isRunning,
      sessionId: this.sessionId,
      dataCollection: {
        status: dataCollectorStats.isCollecting ? 'ACTIVE' : 'STOPPED',
        totalCollections: dataCollectorStats.totalCollections || 0,
        lastCollection: dataCollectorStats.lastCollection || null,
        memoryUsage: dataCollectorStats.memoryUsage || 0
      },
      training: {
        session: trainingProgress?.session || null,
        metrics: trainingProgress?.recentMetrics?.slice(-10) || [],
        performance: trainingProgress?.performance || null,
        modelStats: trainingProgress?.modelStats || null
      },
      analytics: analytics
    };
  }

  /**
   * Context7 Pattern: Export full training report
   */
  async exportFullReport() {
    try {
      const status = this.getStatus();
      const marketMetrics = this.dataCollector?.getMarketMetrics() || {};
      const trainingData = this.aiOrchestrator?.exportTrainingData() || { outcomes: [], metrics: [] };

      const report = {
        timestamp: new Date().toISOString(),
        config: this.config,
        status,
        marketMetrics,
        trainingData: {
          totalOutcomes: trainingData.outcomes.length,
          totalMetrics: trainingData.metrics.length,
          model: 'EXPORTED_SEPARATELY' // Too large for report
        },
        systemHealth: {
          dataQuality: this.assessDataQuality(),
          trainingEfficiency: this.assessTrainingEfficiency(),
          recommendations: this.generateRecommendations()
        }
      };

      return JSON.stringify(report, null, 2);

    } catch (error) {
      this.logger.error('❌ Error exporting full report', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Assess data quality
   */
  assessDataQuality() {
    if (!this.dataCollector) return 'NO_DATA';

    const latestData = this.dataCollector.getLatestData();
    if (!latestData) return 'NO_DATA';

    const validItems = latestData.items.filter(item => 
      item.priceData?.high && item.priceData?.low
    ).length;

    const dataQualityRatio = validItems / latestData.items.length;
    
    if (dataQualityRatio > 0.9) return 'EXCELLENT';
    if (dataQualityRatio > 0.7) return 'GOOD';
    if (dataQualityRatio > 0.5) return 'FAIR';
    return 'POOR';
  }

  /**
   * Context7 Pattern: Assess training efficiency
   */
  assessTrainingEfficiency() {
    if (!this.aiOrchestrator) return 'NO_DATA';

    const analytics = this.aiOrchestrator.getPerformanceAnalytics();
    if (!analytics?.overall) return 'NO_DATA';

    const successRate = analytics.overall.successRate;
    const profitFactor = analytics.overall.profitFactor;

    if (successRate > 80 && profitFactor > 2) return 'EXCELLENT';
    if (successRate > 60 && profitFactor > 1.5) return 'GOOD';
    if (successRate > 40 && profitFactor > 1) return 'FAIR';
    return 'POOR';
  }

  /**
   * Context7 Pattern: Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    try {
      const analytics = this.aiOrchestrator?.getPerformanceAnalytics();

      if (analytics?.overall) {
        if (analytics.overall.successRate < 50) {
          recommendations.push('Consider increasing exploration rate (epsilon)');
          recommendations.push('Review item selection criteria');
        }

        if (analytics.overall.profitFactor < 1) {
          recommendations.push('Adjust risk management parameters');
          recommendations.push('Focus on higher spread items');
        }

        if (analytics.overall.averageProfit < 1000) {
          recommendations.push('Consider increasing minimum price thresholds');
          recommendations.push('Target higher value items');
        }
      }

      const dataQuality = this.assessDataQuality();
      if (dataQuality === 'POOR' || dataQuality === 'FAIR') {
        recommendations.push('Improve data collection filters');
        recommendations.push('Increase data collection frequency');
      }

    } catch (error) {
      this.logger.error('❌ Error generating recommendations', error);
    }

    return recommendations;
  }

  /**
   * Context7 Pattern: Update service configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update data collector config
    if (newConfig.dataCollection && this.dataCollector) {
      this.dataCollector.updateConfig(newConfig.dataCollection);
    }

    // Update AI orchestrator config
    if (newConfig.adaptiveLearning && this.aiOrchestrator) {
      this.aiOrchestrator.setAdaptiveConfig(newConfig.adaptiveLearning);
    }

    this.logger.info('⚙️ Auto training configuration updated', newConfig);
  }

  /**
   * Context7 Pattern: Get current configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Context7 Pattern: Manually trigger training cycle
   */
  async manualTriggerTraining() {
    if (!this.isRunning) {
      throw new Error('Auto training service is not running');
    }

    this.logger.info('🔄 Manually triggering training cycle...');
    await this.performTrainingCycle();
  }

  /**
   * Context7 Pattern: Save AI model
   */
  saveModel() {
    if (!this.aiOrchestrator) {
      throw new Error('AI orchestrator not initialized');
    }

    return this.aiOrchestrator.saveModel();
  }

  /**
   * Context7 Pattern: Load AI model
   */
  loadModel(modelData) {
    if (!this.aiOrchestrator) {
      throw new Error('AI orchestrator not initialized');
    }

    this.aiOrchestrator.loadModel(modelData);
  }

  /**
   * Context7 Pattern: Get historical data
   */
  getHistoricalData(itemId, timeRange) {
    if (!this.dataCollector) {
      throw new Error('Data collector not initialized');
    }

    return this.dataCollector.getHistoricalData(itemId, timeRange);
  }

  /**
   * Context7 Pattern: Get item timeseries
   */
  getItemTimeseries(itemId) {
    if (!this.dataCollector) {
      throw new Error('Data collector not initialized');
    }

    return this.dataCollector.getItemTimeseries(itemId);
  }

  /**
   * Context7 Pattern: Get service health status
   */
  getHealthStatus() {
    return {
      status: this.isRunning ? 'RUNNING' : 'STOPPED',
      sessionId: this.sessionId,
      dataCollector: this.dataCollector ? 'INITIALIZED' : 'NOT_INITIALIZED',
      aiOrchestrator: this.aiOrchestrator ? 'INITIALIZED' : 'NOT_INITIALIZED',
      trainingInterval: this.trainingIntervalId ? 'ACTIVE' : 'INACTIVE',
      lastTrainingCycle: this.lastTrainingCycle || null
    };
  }

  /**
   * Context7 Pattern: Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { AutoTrainingService };