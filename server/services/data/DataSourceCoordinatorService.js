/**
 * 🔄 Data Source Coordinator Service - SOLID Optimized
 *
 * Single Responsibility Principle:
 * - ONLY coordinates data collection from multiple sources
 * - Manages data source priorities and fallbacks
 * - Handles rate limiting and throttling
 *
 * Extracted from DataCollectionService to eliminate God Class
 */

const { BaseService } = require('../BaseService');

class DataSourceCoordinatorService extends BaseService {
  constructor(dependencies = {}) {
    super('DataSourceCoordinatorService', {
      enableCache: true,
      cachePrefix: 'data_sources',
      cacheTTL: 300,
      enableMongoDB: false
    });

    // Dependency injection
    this.dataSources = dependencies.dataSources || [];
    this.rateLimiter = dependencies.rateLimiter;

    // Source management
    this.sourceStatus = new Map();
    this.sourceMetrics = new Map();
    this.fallbackChain = [];

    this.initializeSources();
  }

  /**
   * Initialize data sources
   */
  initializeSources() {
    this.dataSources.forEach(source => {
      this.sourceStatus.set(source.name, {
        isActive: true,
        lastCheck: Date.now(),
        responseTime: 0,
        errorCount: 0,
        successCount: 0
      });

      this.sourceMetrics.set(source.name, {
        totalRequests: 0,
        successfulRequests: 0,
        averageResponseTime: 0,
        lastError: null
      });
    });

    this.logger.info('Initialized data sources', {
      count: this.dataSources.length,
      sources: this.dataSources.map(s => s.name)
    });
  }

  /**
   * Coordinate data collection from all sources
   */
  async collectFromAllSources(query = {}) {
    const results = new Map();
    const errors = [];

    for (const source of this.getActiveSources()) {
      try {
        const data = await this.collectFromSource(source, query);
        results.set(source.name, data);
      } catch (error) {
        this.handleSourceError(source, error);
        errors.push({ source: source.name, error: error.message });
      }
    }

    return {
      results: Object.fromEntries(results),
      errors,
      timestamp: new Date(),
      sourcesUsed: Array.from(results.keys())
    };
  }

  /**
   * Collect data from specific source
   */
  async collectFromSource(source, query) {
    const startTime = Date.now();

    try {
      // Check rate limiting
      if (this.rateLimiter && !this.rateLimiter.canMakeRequest(source.name)) {
        throw new Error(`Rate limit exceeded for source: ${source.name}`);
      }

      // Make request to source
      const data = await source.collect(query);

      // Update success metrics
      this.updateSourceMetrics(source.name, startTime, true);

      this.logger.debug('Data collected from source', {
        source: source.name,
        dataSize: Array.isArray(data) ? data.length : Object.keys(data || {}).length,
        responseTime: Date.now() - startTime
      });

      return data;

    } catch (error) {
      this.updateSourceMetrics(source.name, startTime, false, error);
      throw error;
    }
  }

  /**
   * Get active data sources
   */
  getActiveSources() {
    return this.dataSources.filter(source => {
      const status = this.sourceStatus.get(source.name);
      return status && status.isActive;
    });
  }

  /**
   * Update source metrics
   */
  updateSourceMetrics(sourceName, startTime, success, error = null) {
    const responseTime = Date.now() - startTime;
    const status = this.sourceStatus.get(sourceName);
    const metrics = this.sourceMetrics.get(sourceName);

    if (status) {
      status.lastCheck = Date.now();
      status.responseTime = responseTime;

      if (success) {
        status.successCount++;
        status.errorCount = Math.max(0, status.errorCount - 1); // Reduce error count on success
      } else {
        status.errorCount++;
        if (status.errorCount > 5) {
          status.isActive = false; // Deactivate problematic sources
          this.logger.warn('Deactivated data source due to errors', {
            source: sourceName,
            errorCount: status.errorCount
          });
        }
      }
    }

    if (metrics) {
      metrics.totalRequests++;
      if (success) {
        metrics.successfulRequests++;
      }

      // Running average of response time
      const alpha = 0.1;
      metrics.averageResponseTime = metrics.averageResponseTime === 0
        ? responseTime
        : (1 - alpha) * metrics.averageResponseTime + alpha * responseTime;

      if (error) {
        metrics.lastError = {
          message: error.message,
          timestamp: new Date()
        };
      }
    }
  }

  /**
   * Handle source error
   */
  handleSourceError(source, error) {
    this.logger.warn('Data source error', {
      source: source.name,
      error: error.message
    });

    // Check if we should try fallback sources
    const status = this.sourceStatus.get(source.name);
    if (status && status.errorCount > 3) {
      this.tryFallbackSources(source, error);
    }
  }

  /**
   * Try fallback sources
   */
  async tryFallbackSources(failedSource, originalError) {
    const fallbacks = this.getFallbackSources(failedSource);

    for (const fallback of fallbacks) {
      try {
        this.logger.info('Trying fallback source', {
          failed: failedSource.name,
          fallback: fallback.name
        });

        // This would trigger collection from fallback
        return await this.collectFromSource(fallback, {});
      } catch (fallbackError) {
        this.logger.warn('Fallback source also failed', {
          fallback: fallback.name,
          error: fallbackError.message
        });
      }
    }

    throw originalError; // All fallbacks failed
  }

  /**
   * Get fallback sources for a failed source
   */
  getFallbackSources(failedSource) {
    return this.dataSources.filter(source =>
      source.name !== failedSource.name &&
      source.canFallbackFor &&
      source.canFallbackFor.includes(failedSource.name)
    );
  }

  /**
   * Get source status summary
   */
  getSourceStatusSummary() {
    const summary = {
      totalSources: this.dataSources.length,
      activeSources: this.getActiveSources().length,
      sources: []
    };

    for (const source of this.dataSources) {
      const status = this.sourceStatus.get(source.name);
      const metrics = this.sourceMetrics.get(source.name);

      summary.sources.push({
        name: source.name,
        isActive: status?.isActive || false,
        responseTime: status?.responseTime || 0,
        successRate: metrics ? (metrics.successfulRequests / Math.max(1, metrics.totalRequests)) : 0,
        totalRequests: metrics?.totalRequests || 0,
        averageResponseTime: metrics?.averageResponseTime || 0,
        lastError: metrics?.lastError,
        lastCheck: status?.lastCheck
      });
    }

    return summary;
  }

  /**
   * Reactivate failed sources
   */
  reactivateFailedSources() {
    let reactivated = 0;

    for (const [sourceName, status] of this.sourceStatus.entries()) {
      if (!status.isActive) {
        status.isActive = true;
        status.errorCount = 0;
        reactivated++;

        this.logger.info('Reactivated data source', { source: sourceName });
      }
    }

    return reactivated;
  }

  /**
   * Add new data source
   */
  addDataSource(source) {
    if (!source.name || !source.collect) {
      throw new Error('Data source must have name and collect method');
    }

    this.dataSources.push(source);
    this.initializeSourceStatus(source);

    this.logger.info('Added new data source', { source: source.name });
  }

  /**
   * Remove data source
   */
  removeDataSource(sourceName) {
    const index = this.dataSources.findIndex(s => s.name === sourceName);

    if (index !== -1) {
      this.dataSources.splice(index, 1);
      this.sourceStatus.delete(sourceName);
      this.sourceMetrics.delete(sourceName);

      this.logger.info('Removed data source', { source: sourceName });
      return true;
    }

    return false;
  }

  /**
   * Initialize status for single source
   */
  initializeSourceStatus(source) {
    this.sourceStatus.set(source.name, {
      isActive: true,
      lastCheck: Date.now(),
      responseTime: 0,
      errorCount: 0,
      successCount: 0
    });

    this.sourceMetrics.set(source.name, {
      totalRequests: 0,
      successfulRequests: 0,
      averageResponseTime: 0,
      lastError: null
    });
  }

  /**
   * Health check for all sources
   */
  async performHealthCheck() {
    const healthResults = [];

    for (const source of this.dataSources) {
      try {
        const startTime = Date.now();

        // Simple health check call
        if (source.healthCheck) {
          await source.healthCheck();
        } else {
          // Fallback: try a minimal request
          await this.collectFromSource(source, { limit: 1 });
        }

        healthResults.push({
          source: source.name,
          healthy: true,
          responseTime: Date.now() - startTime
        });

      } catch (error) {
        healthResults.push({
          source: source.name,
          healthy: false,
          error: error.message
        });
      }
    }

    this.logger.info('Health check completed', {
      healthy: healthResults.filter(r => r.healthy).length,
      total: healthResults.length
    });

    return healthResults;
  }
}

module.exports = { DataSourceCoordinatorService };
