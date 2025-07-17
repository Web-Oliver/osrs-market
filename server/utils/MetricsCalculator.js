/**
 * 📊 Metrics Calculator - Context7 Optimized
 * 
 * Context7 Pattern: Advanced Metrics Calculation System
 * - Statistical calculations for monitoring data
 * - Performance metrics analysis
 * - Trend analysis and predictions
 * - Efficiency calculations
 */

class MetricsCalculator {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
  }

  /**
   * Context7 Pattern: Calculate efficiency metrics
   */
  calculateEfficiency(stats) {
    const efficiency = {
      overall: 0,
      apiUsage: 0,
      responseTime: 0,
      errorRate: 0,
      resourceUtilization: 0
    };

    if (!stats || typeof stats !== 'object') {
      return efficiency;
    }

    // API Usage Efficiency (higher is better)
    if (stats.totalApiRequests) {
      const expectedRequests = stats.totalApiRequests * 1.2; // 20% buffer
      efficiency.apiUsage = Math.min(100, (stats.totalApiRequests / expectedRequests) * 100);
    }

    // Response Time Efficiency (lower response time is better)
    if (stats.avgResponseTime) {
      const targetResponseTime = 1000; // 1 second target
      efficiency.responseTime = Math.max(0, 100 - (stats.avgResponseTime / targetResponseTime) * 100);
    }

    // Error Rate Efficiency (lower error rate is better)
    if (stats.avgSuccessRate) {
      efficiency.errorRate = stats.avgSuccessRate;
    }

    // Resource Utilization Efficiency
    if (stats.totalItemsProcessed && stats.totalApiRequests) {
      efficiency.resourceUtilization = (stats.totalItemsProcessed / stats.totalApiRequests) * 100;
    }

    // Overall Efficiency (weighted average)
    efficiency.overall = (
      efficiency.apiUsage * 0.3 +
      efficiency.responseTime * 0.25 +
      efficiency.errorRate * 0.25 +
      efficiency.resourceUtilization * 0.2
    );

    return efficiency;
  }

  /**
   * Context7 Pattern: Calculate trends
   */
  calculateTrends(stats) {
    const trends = {
      apiRequests: 'stable',
      successRate: 'stable',
      responseTime: 'stable',
      itemsProcessed: 'stable',
      profit: 'stable'
    };

    if (!stats || typeof stats !== 'object') {
      return trends;
    }

    // Calculate trends based on historical data (requires actual historical metrics)
    if (stats.historicalData && stats.historicalData.length >= 2) {
      Object.keys(trends).forEach(metric => {
        const historicalValues = stats.historicalData.map(point => point[metric]).filter(val => val !== undefined);
        if (historicalValues.length >= 2) {
          trends[metric] = this.calculateTrendDirection(historicalValues);
        }
      });
    } else {
      this.logger.warn('Insufficient historical data for trend calculation');
      // Set all trends to 'unknown' when no historical data is available
      Object.keys(trends).forEach(metric => {
        trends[metric] = 'unknown';
      });
    }

    return trends;
  }

  /**
   * Context7 Pattern: Generate recommendations
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (!stats || typeof stats !== 'object') {
      return recommendations;
    }

    // API Usage Recommendations
    if (stats.totalApiRequests > 800) {
      recommendations.push({
        category: 'api_usage',
        priority: 'high',
        title: 'High API Usage Detected',
        description: 'Consider implementing request caching or reducing polling frequency',
        impact: 'Reduces API rate limiting risk and improves performance'
      });
    }

    // Response Time Recommendations
    if (stats.avgResponseTime > 1200) {
      recommendations.push({
        category: 'performance',
        priority: 'medium',
        title: 'Slow Response Times',
        description: 'Optimize database queries and consider adding indexes',
        impact: 'Improves user experience and reduces resource usage'
      });
    }

    // Success Rate Recommendations
    if (stats.avgSuccessRate < 90) {
      recommendations.push({
        category: 'reliability',
        priority: 'high',
        title: 'Low Success Rate',
        description: 'Investigate error sources and implement retry logic',
        impact: 'Improves data collection reliability and completeness'
      });
    }

    // Memory Usage Recommendations
    if (stats.avgMemoryUsage && stats.avgMemoryUsage > 80) {
      recommendations.push({
        category: 'resources',
        priority: 'medium',
        title: 'High Memory Usage',
        description: 'Review memory allocation and implement garbage collection optimization',
        impact: 'Prevents memory leaks and improves stability'
      });
    }

    // Data Quality Recommendations
    if (stats.avgDataQuality && stats.avgDataQuality < 85) {
      recommendations.push({
        category: 'data_quality',
        priority: 'medium',
        title: 'Data Quality Issues',
        description: 'Implement additional data validation and cleansing',
        impact: 'Improves accuracy of market analysis and trading decisions'
      });
    }

    return recommendations;
  }

  /**
   * Context7 Pattern: Calculate statistical metrics
   */
  calculateStatistics(data, field) {
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }

    const values = data.map(item => 
      field ? this.getNestedValue(item, field) : item
    ).filter(value => typeof value === 'number' && !isNaN(value));

    if (values.length === 0) {
      return null;
    }

    const sorted = values.slice().sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    return {
      count: values.length,
      sum,
      mean,
      median: this.calculateMedian(sorted),
      min: Math.min(...values),
      max: Math.max(...values),
      range: Math.max(...values) - Math.min(...values),
      variance: this.calculateVariance(values, mean),
      standardDeviation: Math.sqrt(this.calculateVariance(values, mean)),
      percentiles: {
        p25: this.calculatePercentile(sorted, 25),
        p50: this.calculatePercentile(sorted, 50),
        p75: this.calculatePercentile(sorted, 75),
        p90: this.calculatePercentile(sorted, 90),
        p95: this.calculatePercentile(sorted, 95),
        p99: this.calculatePercentile(sorted, 99)
      }
    };
  }

  /**
   * Context7 Pattern: Calculate moving average
   */
  calculateMovingAverage(data, window = 5) {
    if (!Array.isArray(data) || data.length < window) {
      return [];
    }

    const movingAverages = [];
    
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const sum = slice.reduce((acc, val) => acc + val, 0);
      movingAverages.push(sum / window);
    }

    return movingAverages;
  }

  /**
   * Context7 Pattern: Calculate exponential moving average
   */
  calculateExponentialMovingAverage(data, alpha = 0.1) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const ema = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      const prevEma = ema[i - 1];
      const currentEma = alpha * data[i] + (1 - alpha) * prevEma;
      ema.push(currentEma);
    }

    return ema;
  }

  /**
   * Context7 Pattern: Calculate correlation between two datasets
   */
  calculateCorrelation(dataX, dataY) {
    if (!Array.isArray(dataX) || !Array.isArray(dataY) || 
        dataX.length !== dataY.length || dataX.length === 0) {
      return null;
    }

    const n = dataX.length;
    const sumX = dataX.reduce((acc, val) => acc + val, 0);
    const sumY = dataY.reduce((acc, val) => acc + val, 0);
    const sumXY = dataX.reduce((acc, val, i) => acc + val * dataY[i], 0);
    const sumX2 = dataX.reduce((acc, val) => acc + val * val, 0);
    const sumY2 = dataY.reduce((acc, val) => acc + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  /**
   * Context7 Pattern: Calculate performance score
   */
  calculatePerformanceScore(metrics) {
    const weights = {
      responseTime: 0.25,
      successRate: 0.25,
      throughput: 0.20,
      errorRate: 0.15,
      resourceUsage: 0.15
    };

    let score = 0;
    let totalWeight = 0;

    // Response Time Score (lower is better)
    if (metrics.avgResponseTime) {
      const responseTimeScore = Math.max(0, 100 - (metrics.avgResponseTime / 10)); // 10ms = 1 point
      score += responseTimeScore * weights.responseTime;
      totalWeight += weights.responseTime;
    }

    // Success Rate Score (higher is better)
    if (metrics.avgSuccessRate) {
      score += metrics.avgSuccessRate * weights.successRate;
      totalWeight += weights.successRate;
    }

    // Throughput Score (higher is better, normalize to 0-100)
    if (metrics.throughput) {
      const throughputScore = Math.min(100, (metrics.throughput / 10) * 100); // 10 req/s = 100 points
      score += throughputScore * weights.throughput;
      totalWeight += weights.throughput;
    }

    // Error Rate Score (lower is better)
    if (metrics.errorRate !== undefined) {
      const errorRateScore = Math.max(0, 100 - (metrics.errorRate * 100));
      score += errorRateScore * weights.errorRate;
      totalWeight += weights.errorRate;
    }

    // Resource Usage Score (lower is better)
    if (metrics.resourceUsage) {
      const resourceScore = Math.max(0, 100 - metrics.resourceUsage);
      score += resourceScore * weights.resourceUsage;
      totalWeight += weights.resourceUsage;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  /**
   * Context7 Pattern: Detect anomalies in data
   */
  detectAnomalies(data, threshold = 2) {
    if (!Array.isArray(data) || data.length < 10) {
      return [];
    }

    const stats = this.calculateStatistics(data);
    if (!stats) return [];

    const anomalies = [];
    const zScoreThreshold = threshold;

    data.forEach((value, index) => {
      const zScore = Math.abs((value - stats.mean) / stats.standardDeviation);
      
      if (zScore > zScoreThreshold) {
        anomalies.push({
          index,
          value,
          zScore,
          deviation: value - stats.mean,
          type: value > stats.mean ? 'high' : 'low'
        });
      }
    });

    return anomalies;
  }

  /**
   * Context7 Pattern: Calculate forecast
   */
  calculateForecast(data, periods = 5) {
    if (!Array.isArray(data) || data.length < 3) {
      return [];
    }

    // Simple linear regression forecast
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data;

    const sumX = x.reduce((acc, val) => acc + val, 0);
    const sumY = y.reduce((acc, val) => acc + val, 0);
    const sumXY = x.reduce((acc, val, i) => acc + val * y[i], 0);
    const sumX2 = x.reduce((acc, val) => acc + val * val, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const forecast = [];
    for (let i = 0; i < periods; i++) {
      const futureX = n + i;
      const futureY = slope * futureX + intercept;
      forecast.push({
        period: i + 1,
        value: futureY,
        confidence: Math.max(0, 100 - (i * 10)) // Decreasing confidence
      });
    }

    return forecast;
  }

  // Helper methods

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Calculate median
   */
  calculateMedian(sortedValues) {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0 ? 
      (sortedValues[mid - 1] + sortedValues[mid]) / 2 : 
      sortedValues[mid];
  }

  /**
   * Calculate percentile
   */
  calculatePercentile(sortedValues, percentile) {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }

  /**
   * Calculate variance
   */
  calculateVariance(values, mean) {
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  }

  /**
   * Extract historical trend data from actual metrics
   */
  extractHistoricalTrend(historicalData, metricName) {
    if (!historicalData || historicalData.length < 2) {
      return [];
    }
    
    return historicalData
      .map(point => point[metricName])
      .filter(val => val !== undefined && val !== null)
      .slice(-10); // Get last 10 data points
  }

  /**
   * Calculate trend direction
   */
  calculateTrendDirection(data) {
    if (data.length < 2) return 'stable';
    
    const start = data[0];
    const end = data[data.length - 1];
    const change = ((end - start) / start) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cached result or calculate
   */
  getCachedOrCalculate(key, calculator) {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result;
    }
    
    const result = calculator();
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  }
}

module.exports = { MetricsCalculator };