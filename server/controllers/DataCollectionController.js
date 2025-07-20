/**
 * 📊 Data Collection Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for Data Collection Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const { DataCollectionService } = require('../services/DataCollectionService');
const { validateRequest } = require('../validators/DataCollectionValidator');


class DataCollectionController extends BaseController {
  constructor(dependencies = {}) {
    super('DataCollectionController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.dataCollectionService = dependencies.dataCollectionService || new DataCollectionService();
    
    // Initialize endpoints after service is set
    this.initializeEndpoints();
  }

  initializeEndpoints() {
    // Endpoints that require the service to be initialized
    this.startCollection = this.createPostEndpoint(
      this.dataCollectionService.startCollection,
      { operationName: 'start data collection' }
    );
    
    this.stopCollection = this.createPostEndpoint(
      this.dataCollectionService.stopCollection,
      { operationName: 'stop data collection' }
    );
    
    this.getCollectionStatus = this.createGetEndpoint(
      () => this.dataCollectionService.getCollectionStatus(),
      { operationName: 'get collection status' }
    );
  }

  // Endpoints are now initialized in constructor via initializeEndpoints()

  /**
   * Context7 Pattern: Get collection statistics
   * GET /api/data-collection/stats
   */
  async getCollectionStats(req, res, next) {
    try {
      this.logger.debug('Fetching collection statistics', {
        requestId: req.id
      });

      const stats = this.dataCollectionService.getCollectionStats();

      this.logger.debug('Successfully fetched collection statistics', {
        totalCollections: stats.totalCollections,
        successRate: stats.successRate,
        requestId: req.id
      });

      return ApiResponse.success(res, stats, 'Collection statistics retrieved successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error fetching collection statistics
      next(error);
    }
  }

  /**
   * Context7 Pattern: Update configuration
   * PUT /api/data-collection/config
   */
  async updateConfiguration(req, res, next) {
    try {
      this.logger.info('Updating data collection configuration', {
        updates: Object.keys(req.body),
        requestId: req.id
      });

      // Context7 Pattern: Validate request body
      const validation = validateRequest.updateConfiguration(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid configuration', validation.errors);
      }

      const updatedConfig = await this.dataCollectionService.updateConfig(req.body);

      this.logger.info('Configuration updated successfully', {
        updatedConfig,
        requestId: req.id
      });

      return ApiResponse.success(res, updatedConfig, 'Configuration updated successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error updating configuration
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get selected items
   * GET /api/data-collection/selected-items
   */
  getSelectedItems = this.createGetEndpoint(
    () => {
      const status = this.dataCollectionService.getCollectionStatus();
      const selectedItems = status.selectedItems;

      return {
        items: selectedItems,
        count: selectedItems.length,
        lastUpdated: status.lastCollection
      };
    },
    { operationName: 'get selected items' }
  );

  /**
   * Context7 Pattern: Refresh item selection
   * POST /api/data-collection/refresh-selection
   */
  refreshItemSelection = this.createPostEndpoint(
    async() => {
      await this.dataCollectionService.refreshSmartSelection();

      const status = this.dataCollectionService.getCollectionStatus();
      const selectedItems = status.selectedItems;

      return {
        items: selectedItems,
        count: selectedItems.length,
        refreshedAt: Date.now()
      };
    },
    { operationName: 'refresh item selection' }
  );

  /**
   * Context7 Pattern: Get collection health
   * GET /api/data-collection/health
   */
  getCollectionHealth = this.createGetEndpoint(
    () => this.dataCollectionService.getHealth(),
    { operationName: 'get collection health' }
  );

  /**
   * Context7 Pattern: Clear cache
   * POST /api/data-collection/clear-cache
   */
  clearCache = this.createPostEndpoint(
    async () => {
      await this.dataCollectionService.clearCache();
      return { cleared: true };
    },
    { operationName: 'clear data collection cache' }
  );

  /**
   * Context7 Pattern: Get latest collected data
   * GET /api/data-collection/latest
   */
  async getLatestData(req, res, next) {
    try {
      this.logger.debug('Fetching latest collected data', {
        limit: req.query.limit,
        requestId: req.id
      });

      const limit = req.query.limit ? parseInt(req.query.limit) : 50;

      // Get latest data from market data service
      const marketData = await this.dataCollectionService.marketDataService.getMarketData({
        limit,
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      this.logger.debug('Successfully fetched latest collected data', {
        recordCount: marketData.length,
        requestId: req.id
      });

      return ApiResponse.success(res, marketData, 'Latest collected data retrieved successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error fetching latest collected data
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get collection metrics
   * GET /api/data-collection/metrics
   */
  async getCollectionMetrics(req, res, next) {
    try {
      this.logger.debug('Fetching collection metrics', {
        timeRange: req.query.timeRange,
        requestId: req.id
      });

      const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 3600000; // 1 hour

      // Get metrics from monitoring service
      const metrics = await this.dataCollectionService.monitoringService.getAggregatedStats(timeRange);

      this.logger.debug('Successfully fetched collection metrics', {
        timeRange,
        requestId: req.id
      });

      return ApiResponse.success(res, metrics, 'Collection metrics retrieved successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error fetching collection metrics
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get performance analytics
   * GET /api/data-collection/performance
   */
  async getPerformanceAnalytics(req, res, next) {
    try {
      this.logger.debug('Fetching performance analytics', {
        requestId: req.id
      });

      const stats = this.dataCollectionService.getCollectionStats();
      const health = this.dataCollectionService.getHealth();

      const performance = {
        collections: {
          total: stats.totalCollections,
          successful: stats.successfulCollections,
          failed: stats.failedCollections,
          successRate: stats.successRate
        },
        items: {
          totalProcessed: stats.totalItemsProcessed,
          averagePerCollection: stats.averageItemsPerCollection,
          currentlyTracked: health.selectedItems
        },
        timing: {
          averageResponseTime: stats.averageResponseTime,
          uptime: stats.uptime,
          lastCollection: stats.lastCollectionTime
        },
        resources: {
          memoryUsage: health.memory,
          apiRequests: stats.apiRequestsCount,
          cacheHits: stats.cacheHits,
          cacheMisses: stats.cacheMisses
        },
        errors: {
          count: stats.errors.length,
          recent: stats.errors.slice(-5) // Last 5 errors
        }
      };

      this.logger.debug('Successfully fetched performance analytics', {
        requestId: req.id
      });

      return ApiResponse.success(res, performance, 'Performance analytics retrieved successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error fetching performance analytics
      next(error);
    }
  }

  /**
   * Context7 Pattern: Export collected data
   * GET /api/data-collection/export
   */
  async exportData(req, res, next) {
    try {
      this.logger.info('Exporting collected data', {
        format: req.query.format,
        timeRange: req.query.timeRange,
        requestId: req.id
      });

      const format = req.query.format || 'json';
      const timeRange = req.query.timeRange ? parseInt(req.query.timeRange) : 24 * 60 * 60 * 1000; // 24 hours

      // Validate format
      const validFormats = ['json', 'csv'];
      if (!validFormats.includes(format)) {
        return ApiResponse.badRequest(res, 'Invalid format', {
          validFormats,
          provided: format
        });
      }

      // Get data from market data service
      const endTime = Date.now();
      const startTime = endTime - timeRange;

      const data = await this.dataCollectionService.marketDataService.getMarketData({
        startTime,
        endTime,
        limit: 10000, // Large limit for export
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      // Set appropriate headers
      const filename = `osrs-market-data-${new Date().toISOString().split('T')[0]}.${format}`;

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Convert to CSV
        const csvData = this.convertToCSV(data);
        res.send(csvData);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        return ApiResponse.success(res, {
          data,
          exportInfo: {
            format,
            timeRange,
            recordCount: data.length,
            exportedAt: new Date().toISOString()
          }
        }, 'Data exported successfully');
      }

      this.logger.info('Data exported successfully', {
        format,
        recordCount: data.length,
        requestId: req.id
      });

    } catch (error) {
      // Error handling moved to centralized manager - context: Error exporting data
      next(error);
    }
  }

  // Context7 Pattern: Private helper methods

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = ['timestamp', 'itemId', 'itemName', 'highPrice', 'lowPrice', 'profitMargin', 'spread'];
    const rows = data.map(item => [
      new Date(item.timestamp).toISOString(),
      item.itemId,
      item.itemName || '',
      item.priceData?.high || '',
      item.priceData?.low || '',
      item.profitMargin || '',
      item.spread || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Format uptime for display
   */
  formatUptime(uptime) {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Calculate efficiency metrics
   */
  calculateEfficiencyMetrics(stats) {
    const totalItems = 3000; // Approximate total OSRS items
    const itemSelectionEfficiency = ((totalItems - stats.itemsTracked) / totalItems) * 100;

    return {
      itemSelectionEfficiency: Math.round(itemSelectionEfficiency * 100) / 100,
      dataCollectionEfficiency: stats.successRate,
      averageItemsPerSecond: stats.averageItemsPerCollection / (stats.averageResponseTime / 1000),
      resourceEfficiency: Math.max(0, 100 - stats.memoryUsage)
    };
  }

  // =========================================
  // DATA PIPELINE ORCHESTRATOR ENDPOINTS
  // =========================================

  /**
   * Start the data pipeline orchestrator
   */
  async startPipeline(req, res) {
    try {
      const result = await this.dataCollectionService.startDataPipeline();

      res.json({
        success: true,
        message: 'Data pipeline started successfully',
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error starting pipeline:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start data pipeline',
        details: error.message
      });
    }
  }

  /**
   * Stop the data pipeline orchestrator
   */
  async stopPipeline(req, res) {
    try {
      const result = await this.dataCollectionService.stopDataPipeline();

      res.json({
        success: true,
        message: 'Data pipeline stopped successfully',
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error stopping pipeline:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop data pipeline',
        details: error.message
      });
    }
  }

  /**
   * Get pipeline status and health
   */
  async getPipelineStatus(req, res) {
    try {
      const status = this.dataCollectionService.getPipelineStatus();
      const health = this.dataCollectionService.getHealth();

      res.json({
        success: true,
        data: {
          pipeline: status,
          health: health,
          components: {
            dataCollection: this.dataCollectionService.isCollecting,
            aiDataFlow: !!this.dataCollectionService.aiDataInterval,
            monitoring: !!this.dataCollectionService.healthMonitorInterval
          }
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error getting pipeline status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pipeline status',
        details: error.message
      });
    }
  }

  /**
   * Force push data to AI service
   */
  async pushToAI(req, res) {
    try {
      const result = await this.dataCollectionService.pushDataToAI();

      res.json({
        success: true,
        message: 'Data pushed to AI service',
        data: result,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error pushing to AI:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to push data to AI service',
        details: error.message
      });
    }
  }

  /**
   * Test AI service connection
   */
  async testAIConnection(req, res) {
    try {
      const isConnected = await this.dataCollectionService.testAIServiceConnection();

      res.json({
        success: true,
        data: {
          aiServiceConnected: isConnected,
          aiServiceUrl: 'http://localhost:8000'
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error testing AI connection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test AI connection',
        details: error.message
      });
    }
  }
}

module.exports = { DataCollectionController };
