/**
 * 📊 Metrics Calculation Service - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Service
 * - SOLID: Single Responsibility Principle (SRP) - Handles ONLY metrics calculations
 * - DRY: Centralized metrics logic to eliminate duplication
 * - Comprehensive efficiency and performance metrics
 * - Configurable thresholds and benchmarks
 * - Statistical analysis and trend calculations
 */

const { Logger } = require('../utils/Logger');
const { AppConstants } = require('../config/AppConstants');

class MetricsCalculationService {
  constructor() {
    this.logger = new Logger('MetricsCalculationService');
    
    // Default configuration and benchmarks
    this.config = {
      // OSRS market constants from centralized config
      totalOSRSItems: AppConstants.OSRS.TOTAL_ITEMS,
      
      // Performance benchmarks
      benchmarks: {
        excellentEfficiency: 90,
        goodEfficiency: 75,
        fairEfficiency: 60,
        poorEfficiency: 40
      },
      
      // Calculation parameters
      parameters: {
        memoryUsageWeight: 0.3,
        responseTimeWeight: 0.4,
        successRateWeight: 0.3
      }
    };
  }

  /**
   * Context7 Pattern: Calculate comprehensive efficiency metrics
   * SOLID: Single responsibility for efficiency calculations
   * DRY: Centralized efficiency calculation logic
   */
  calculateEfficiencyMetrics(stats, options = {}) {
    if (!stats || typeof stats !== 'object') {
      this.logger.warn('Invalid stats provided for efficiency calculation');
      return this.getDefaultEfficiencyMetrics();
    }

    const config = { ...this.config, ...options.config };

    try {
      this.logger.debug('Calculating efficiency metrics', {
        statsKeys: Object.keys(stats),
        totalItems: config.totalOSRSItems
      });

      const metrics = {
        // Item selection efficiency
        itemSelectionEfficiency: this.calculateItemSelectionEfficiency(stats, config),
        
        // Data collection efficiency
        dataCollectionEfficiency: this.calculateDataCollectionEfficiency(stats),
        
        // Processing efficiency
        processingEfficiency: this.calculateProcessingEfficiency(stats),
        
        // Resource efficiency
        resourceEfficiency: this.calculateResourceEfficiency(stats),
        
        // Overall efficiency score
        overallEfficiency: 0,
        
        // Performance metrics
        averageItemsPerSecond: this.calculateItemsPerSecond(stats),
        
        // Quality metrics
        dataQualityScore: this.calculateDataQualityScore(stats),
        
        // Reliability metrics
        reliabilityScore: this.calculateReliabilityScore(stats),
        
        // Trend indicators
        trendIndicators: this.calculateTrendIndicators(stats, options.historical)
      };

      // Calculate overall efficiency as weighted average
      metrics.overallEfficiency = this.calculateOverallEfficiency(metrics, config);

      // Add efficiency rating
      metrics.efficiencyRating = this.getEfficiencyRating(metrics.overallEfficiency, config);

      this.logger.debug('Efficiency metrics calculated successfully', {
        overallEfficiency: metrics.overallEfficiency,
        rating: metrics.efficiencyRating
      });

      return metrics;
    } catch (error) {
      this.logger.error('Error calculating efficiency metrics', error, { stats });
      return this.getDefaultEfficiencyMetrics();
    }
  }

  /**
   * Context7 Pattern: Calculate performance metrics
   * SOLID: Single responsibility for performance calculations
   */
  calculatePerformanceMetrics(stats, timeWindow = 3600000) {
    try {
      const performance = {
        // Throughput metrics
        throughput: {
          requestsPerSecond: this.calculateRequestsPerSecond(stats, timeWindow),
          itemsPerSecond: this.calculateItemsPerSecond(stats),
          dataPointsPerMinute: this.calculateDataPointsPerMinute(stats, timeWindow)
        },

        // Latency metrics
        latency: {
          averageResponseTime: stats.averageResponseTime || 0,
          p95ResponseTime: stats.p95ResponseTime || stats.averageResponseTime * 1.5,
          p99ResponseTime: stats.p99ResponseTime || stats.averageResponseTime * 2
        },

        // Error metrics
        errors: {
          errorRate: this.calculateErrorRate(stats),
          failureRate: this.calculateFailureRate(stats),
          recoveryTime: this.calculateRecoveryTime(stats)
        },

        // Resource utilization
        resources: {
          memoryUtilization: this.calculateMemoryUtilization(stats),
          cpuUtilization: stats.cpuUsage || 0,
          networkUtilization: this.calculateNetworkUtilization(stats)
        },

        // Business metrics
        business: {
          profitability: this.calculateProfitability(stats),
          accuracy: this.calculateAccuracy(stats),
          completeness: this.calculateCompleteness(stats)
        }
      };

      // Calculate composite scores
      performance.healthScore = this.calculateHealthScore(performance);
      performance.performanceGrade = this.getPerformanceGrade(performance.healthScore);

      return performance;
    } catch (error) {
      this.logger.error('Error calculating performance metrics', error);
      return this.getDefaultPerformanceMetrics();
    }
  }

  /**
   * Context7 Pattern: Calculate trend indicators
   * SOLID: Single responsibility for trend analysis
   */
  calculateTrendIndicators(currentStats, historicalData = []) {
    if (!historicalData || historicalData.length === 0) {
      return {
        trend: 'stable',
        direction: 'neutral',
        confidence: 0,
        predictions: {}
      };
    }

    try {
      const trends = {
        efficiency: this.calculateTrend(historicalData, 'efficiency'),
        throughput: this.calculateTrend(historicalData, 'throughput'),
        errorRate: this.calculateTrend(historicalData, 'errorRate'),
        responseTime: this.calculateTrend(historicalData, 'responseTime')
      };

      const overallTrend = this.aggregateTrends(trends);
      
      return {
        trend: overallTrend.direction,
        direction: overallTrend.direction,
        confidence: overallTrend.confidence,
        slopes: trends,
        predictions: this.generatePredictions(historicalData, currentStats)
      };
    } catch (error) {
      this.logger.error('Error calculating trend indicators', error);
      return { trend: 'unknown', direction: 'neutral', confidence: 0 };
    }
  }

  // Private Calculation Methods

  /**
   * Calculate item selection efficiency
   */
  calculateItemSelectionEfficiency(stats, config) {
    const itemsTracked = stats.itemsTracked || stats.selectedItems || 0;
    const totalItems = config.totalOSRSItems;
    
    if (totalItems === 0) return 0;
    
    // Calculate efficiency as percentage of optimal selection
    // Higher efficiency means better selection of profitable items
    const selectionRatio = itemsTracked / totalItems;
    const efficiency = Math.min(100, selectionRatio * 100);
    
    return Math.round(efficiency * 100) / 100;
  }

  /**
   * Calculate data collection efficiency
   */
  calculateDataCollectionEfficiency(stats) {
    const successRate = stats.successRate || 0;
    return Math.round(successRate * 100) / 100;
  }

  /**
   * Calculate processing efficiency
   */
  calculateProcessingEfficiency(stats) {
    const averageResponseTime = stats.averageResponseTime || 1000;
    const idealResponseTime = 200; // 200ms ideal
    
    // Efficiency decreases as response time increases
    const efficiency = Math.max(0, 100 - ((averageResponseTime - idealResponseTime) / 10));
    
    return Math.round(Math.min(100, efficiency) * 100) / 100;
  }

  /**
   * Calculate resource efficiency
   */
  calculateResourceEfficiency(stats) {
    const memoryUsage = stats.memoryUsage || 0;
    const maxMemory = 100; // Assume 100% as max
    
    // Higher memory usage = lower efficiency
    const efficiency = Math.max(0, 100 - memoryUsage);
    
    return Math.round(efficiency * 100) / 100;
  }

  /**
   * Calculate items processed per second
   */
  calculateItemsPerSecond(stats) {
    const averageItemsPerCollection = stats.averageItemsPerCollection || 0;
    const averageResponseTime = stats.averageResponseTime || 1000;
    
    if (averageResponseTime === 0) return 0;
    
    const itemsPerSecond = averageItemsPerCollection / (averageResponseTime / 1000);
    return Math.round(itemsPerSecond * 100) / 100;
  }

  /**
   * Calculate overall efficiency as weighted average
   */
  calculateOverallEfficiency(metrics, config) {
    const weights = config.parameters;
    
    const weightedSum = 
      (metrics.dataCollectionEfficiency * weights.successRateWeight) +
      (metrics.processingEfficiency * weights.responseTimeWeight) +
      (metrics.resourceEfficiency * weights.memoryUsageWeight);
    
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    
    if (totalWeight === 0) return 0;
    
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Get efficiency rating based on score
   */
  getEfficiencyRating(score, config) {
    const benchmarks = config.benchmarks;
    
    if (score >= benchmarks.excellentEfficiency) return 'excellent';
    if (score >= benchmarks.goodEfficiency) return 'good';
    if (score >= benchmarks.fairEfficiency) return 'fair';
    if (score >= benchmarks.poorEfficiency) return 'poor';
    return 'critical';
  }

  /**
   * Calculate simple trend from historical data
   */
  calculateTrend(historicalData, metric) {
    if (historicalData.length < 2) {
      return { slope: 0, direction: 'stable', confidence: 0 };
    }

    const values = historicalData.map(point => point[metric] || 0);
    const n = values.length;
    
    // Simple linear regression
    const sumX = n * (n + 1) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * (i + 1), 0);
    const sumX2 = n * (n + 1) * (2 * n + 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    const direction = slope > 0.1 ? 'improving' : 
                     slope < -0.1 ? 'declining' : 'stable';
    
    const confidence = Math.min(100, Math.abs(slope) * 100);
    
    return { slope, direction, confidence };
  }

  /**
   * Default efficiency metrics for error cases
   */
  getDefaultEfficiencyMetrics() {
    return {
      itemSelectionEfficiency: 0,
      dataCollectionEfficiency: 0,
      processingEfficiency: 0,
      resourceEfficiency: 0,
      overallEfficiency: 0,
      efficiencyRating: 'unknown',
      averageItemsPerSecond: 0,
      dataQualityScore: 0,
      reliabilityScore: 0,
      trendIndicators: { trend: 'unknown', direction: 'neutral', confidence: 0 }
    };
  }

  /**
   * Additional helper methods for comprehensive metrics
   */
  calculateDataQualityScore(stats) {
    // Placeholder implementation
    return stats.dataQualityScore || 75;
  }

  calculateReliabilityScore(stats) {
    const uptime = stats.uptime || 0;
    const successRate = stats.successRate || 0;
    return (uptime * 0.6 + successRate * 0.4);
  }

  calculateRequestsPerSecond(stats, timeWindow) {
    const requests = stats.totalRequests || stats.apiRequestsCount || 0;
    const timeInSeconds = timeWindow / 1000;
    return timeInSeconds > 0 ? requests / timeInSeconds : 0;
  }

  calculateErrorRate(stats) {
    const total = stats.totalRequests || 1;
    const errors = stats.errorCount || 0;
    return (errors / total) * 100;
  }

  calculateFailureRate(stats) {
    const total = stats.totalCollections || 1;
    const failures = stats.failedCollections || 0;
    return (failures / total) * 100;
  }

  calculateMemoryUtilization(stats) {
    return stats.memoryUsage || 0;
  }

  calculateProfitability(stats) {
    return stats.totalProfit || 0;
  }

  calculateAccuracy(stats) {
    return stats.accuracy || stats.successRate || 0;
  }

  calculateCompleteness(stats) {
    return stats.completeness || 90;
  }

  calculateHealthScore(performance) {
    // Composite health score based on multiple factors
    const factors = [
      performance.throughput.requestsPerSecond > 0 ? 100 : 0,
      100 - performance.errors.errorRate,
      100 - performance.resources.memoryUtilization,
      performance.business.accuracy
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  }

  getPerformanceGrade(healthScore) {
    if (healthScore >= 90) return 'A';
    if (healthScore >= 80) return 'B';
    if (healthScore >= 70) return 'C';
    if (healthScore >= 60) return 'D';
    return 'F';
  }

  getDefaultPerformanceMetrics() {
    return {
      throughput: { requestsPerSecond: 0, itemsPerSecond: 0, dataPointsPerMinute: 0 },
      latency: { averageResponseTime: 0, p95ResponseTime: 0, p99ResponseTime: 0 },
      errors: { errorRate: 0, failureRate: 0, recoveryTime: 0 },
      resources: { memoryUtilization: 0, cpuUtilization: 0, networkUtilization: 0 },
      business: { profitability: 0, accuracy: 0, completeness: 0 },
      healthScore: 0,
      performanceGrade: 'F'
    };
  }

  aggregateTrends(trends) {
    const directions = Object.values(trends).map(t => t.direction);
    const confidences = Object.values(trends).map(t => t.confidence);
    
    const avgConfidence = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Simple majority vote for direction
    const improving = directions.filter(d => d === 'improving').length;
    const declining = directions.filter(d => d === 'declining').length;
    
    let overallDirection;
    if (improving > declining) {
      overallDirection = 'improving';
    } else if (declining > improving) {
      overallDirection = 'declining';
    } else {
      overallDirection = 'stable';
    }
    
    return { direction: overallDirection, confidence: avgConfidence };
  }

  generatePredictions(historicalData, currentStats) {
    // Placeholder for prediction logic
    return {
      nextHourEfficiency: currentStats.efficiency || 75,
      nextDayThroughput: currentStats.throughput || 100,
      confidence: 60
    };
  }

  calculateDataPointsPerMinute(stats, timeWindow) {
    const dataPoints = stats.totalItemsProcessed || 0;
    const timeInMinutes = timeWindow / 60000;
    return timeInMinutes > 0 ? dataPoints / timeInMinutes : 0;
  }

  calculateRecoveryTime(stats) {
    return stats.averageRecoveryTime || 0;
  }

  calculateNetworkUtilization(stats) {
    return stats.networkUsage || 0;
  }
}

module.exports = { MetricsCalculationService };