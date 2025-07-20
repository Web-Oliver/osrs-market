/**
 * 📊 Data Collection Controller - Context7 Optimized
 *
 * Context7 Pattern: Controller Layer for Data Collection Operations
 * - Handles data collection lifecycle management
 * - Thin controllers with business logic in services
 * - Proper validation and error handling
 * - DRY principles with reusable patterns
 */

const { DataCollectionService } = require('../services/DataCollectionService');
const { validateRequest } = require('../validators/DataCollectionValidator');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class DataCollectionController {
  constructor() {
    this.dataCollectionService = new DataCollectionService();
    this.logger = new Logger('DataCollectionController');

    // Context7 Pattern: Bind methods to preserve 'this' context
    this.startCollection = this.startCollection.bind(this);
    this.stopCollection = this.stopCollection.bind(this);
    this.getCollectionStatus = this.getCollectionStatus.bind(this);
    this.getCollectionStats = this.getCollectionStats.bind(this);
    this.updateConfiguration = this.updateConfiguration.bind(this);
    this.getSelectedItems = this.getSelectedItems.bind(this);
    this.refreshItemSelection = this.refreshItemSelection.bind(this);
    this.getCollectionHealth = this.getCollectionHealth.bind(this);
    this.clearCache = this.clearCache.bind(this);
  }

  /**
   * Context7 Pattern: Start data collection
   * POST /api/data-collection/start
   */
  async startCollection(req, res, next) {
    try {
      this.logger.info('Starting data collection', {
        ip: req.ip,
        requestId: req.id
      });

      const result = await this.dataCollectionService.startCollection();

      this.logger.info('Data collection started successfully', {
        itemsSelected: result.itemsSelected,
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Data collection started successfully');
    } catch (error) {
      this.logger.error('Error starting data collection', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Stop data collection
   * POST /api/data-collection/stop
   */
  async stopCollection(req, res, next) {
    try {
      this.logger.info('Stopping data collection', {
        ip: req.ip,
        requestId: req.id
      });

      const result = await this.dataCollectionService.stopCollection();

      this.logger.info('Data collection stopped successfully', {
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Data collection stopped successfully');
    } catch (error) {
      this.logger.error('Error stopping data collection', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get collection status
   * GET /api/data-collection/status
   */
  async getCollectionStatus(req, res, next) {
    try {
      this.logger.debug('Fetching collection status', {
        requestId: req.id
      });

      const status = this.dataCollectionService.getCollectionStatus();

      this.logger.debug('Successfully fetched collection status', {
        isCollecting: status.isCollecting,
        uptime: status.uptime,
        requestId: req.id
      });

      return ApiResponse.success(res, status, 'Collection status retrieved successfully');
    } catch (error) {
      this.logger.error('Error fetching collection status', error, {
        requestId: req.id
      });
      next(error);
    }
  }

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
      this.logger.error('Error fetching collection statistics', error, {
        requestId: req.id
      });
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

      const updatedConfig = this.dataCollectionService.updateConfig(req.body);

      this.logger.info('Configuration updated successfully', {
        updatedConfig,
        requestId: req.id
      });

      return ApiResponse.success(res, updatedConfig, 'Configuration updated successfully');
    } catch (error) {
      this.logger.error('Error updating configuration', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get selected items
   * GET /api/data-collection/selected-items
   */
  async getSelectedItems(req, res, next) {
    try {
      this.logger.debug('Fetching selected items', {
        requestId: req.id
      });

      const status = this.dataCollectionService.getCollectionStatus();
      const selectedItems = status.selectedItems;

      this.logger.debug('Successfully fetched selected items', {
        itemCount: selectedItems.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        items: selectedItems,
        count: selectedItems.length,
        lastUpdated: status.lastCollection
      }, 'Selected items retrieved successfully');
    } catch (error) {
      this.logger.error('Error fetching selected items', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Refresh item selection
   * POST /api/data-collection/refresh-selection
   */
  async refreshItemSelection(req, res, next) {
    try {
      this.logger.info('Refreshing item selection', {
        requestId: req.id
      });

      await this.dataCollectionService.refreshSmartSelection();

      const status = this.dataCollectionService.getCollectionStatus();
      const selectedItems = status.selectedItems;

      this.logger.info('Item selection refreshed successfully', {
        newItemCount: selectedItems.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        items: selectedItems,
        count: selectedItems.length,
        refreshedAt: Date.now()
      }, 'Item selection refreshed successfully');
    } catch (error) {
      this.logger.error('Error refreshing item selection', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get collection health
   * GET /api/data-collection/health
   */
  async getCollectionHealth(req, res, next) {
    try {
      this.logger.debug('Fetching collection health', {
        requestId: req.id
      });

      const health = this.dataCollectionService.getHealth();

      this.logger.debug('Successfully fetched collection health', {
        status: health.status,
        requestId: req.id
      });

      const statusCode = health.status === 'running' ? 200 : 503;
      return ApiResponse.custom(res, statusCode, health, 'Collection health retrieved successfully');
    } catch (error) {
      this.logger.error('Error fetching collection health', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Clear cache
   * POST /api/data-collection/clear-cache
   */
  async clearCache(req, res, next) {
    try {
      this.logger.info('Clearing data collection cache', {
        requestId: req.id
      });

      this.dataCollectionService.clearCache();

      this.logger.info('Cache cleared successfully', {
        requestId: req.id
      });

      return ApiResponse.success(res, { cleared: true }, 'Cache cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing cache', error, {
        requestId: req.id
      });
      next(error);
    }
  }

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
      this.logger.error('Error fetching latest collected data', error, {
        requestId: req.id
      });
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
      this.logger.error('Error fetching collection metrics', error, {
        requestId: req.id
      });
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
      this.logger.error('Error fetching performance analytics', error, {
        requestId: req.id
      });
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
      this.logger.error('Error exporting data', error, {
        format: req.query.format,
        requestId: req.id
      });
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
}

module.exports = { DataCollectionController };
