/**
 * 📊 Monitoring Controller - Context7 Optimized
 * 
 * Context7 Pattern: Controller Layer
 * - Handles HTTP requests and responses
 * - Thin controllers with business logic in services
 * - Proper error handling with Context7 patterns
 * - DRY principles with reusable response methods
 * - Solid architecture with single responsibility
 */

const { MonitoringService } = require('../services/MonitoringService');
const { validateRequest } = require('../validators/MonitoringValidator');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class MonitoringController {
  constructor() {
    this.monitoringService = new MonitoringService();
    this.logger = new Logger('MonitoringController');
    
    // Context7 Pattern: Bind methods to preserve 'this' context
    this.getLiveData = this.getLiveData.bind(this);
    this.saveLiveData = this.saveLiveData.bind(this);
    this.getStreamData = this.getStreamData.bind(this);
    this.getAggregatedStats = this.getAggregatedStats.bind(this);
    this.getSystemStatus = this.getSystemStatus.bind(this);
    this.getEfficiencyMetrics = this.getEfficiencyMetrics.bind(this);
    this.getHealthStatus = this.getHealthStatus.bind(this);
    this.performDataCleanup = this.performDataCleanup.bind(this);
  }

  /**
   * Context7 Pattern: Get live monitoring data
   * GET /api/live-monitoring
   */
  async getLiveData(req, res, next) {
    try {
      this.logger.info('Fetching live monitoring data', { 
        query: req.query,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Context7 Pattern: Validate request parameters
      const validation = validateRequest.getLiveMonitoringData(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const { limit = 50 } = req.query;
      const data = await this.monitoringService.getLiveMonitoringData(parseInt(limit));

      this.logger.info('Successfully fetched live monitoring data', {
        recordCount: data.length,
        requestId: req.id
      });

      return ApiResponse.success(res, data, 'Live monitoring data fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching live monitoring data', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Save live monitoring data
   * POST /api/live-monitoring
   */
  async saveLiveData(req, res, next) {
    try {
      this.logger.info('Saving live monitoring data', {
        bodyKeys: Object.keys(req.body),
        ip: req.ip,
        requestId: req.id
      });

      // Context7 Pattern: Validate request body
      const validation = validateRequest.saveLiveData(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request body', validation.errors);
      }

      const enrichedData = {
        ...req.body,
        timestamp: req.body.timestamp || Date.now(),
        clientIp: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      };

      const insertedId = await this.monitoringService.saveLiveMonitoringData(enrichedData);

      this.logger.info('Successfully saved live monitoring data', {
        insertedId,
        requestId: req.id
      });

      return ApiResponse.created(res, { id: insertedId }, 'Live monitoring data saved successfully');
    } catch (error) {
      this.logger.error('Error saving live monitoring data', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get streaming data for Server-Sent Events
   * GET /api/live-monitoring/stream
   */
  async getStreamData(req, res, next) {
    try {
      this.logger.info('Starting live monitoring stream', {
        ip: req.ip,
        requestId: req.id
      });

      // Set up Server-Sent Events headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

      // Set up interval to send real monitoring data
      const intervalId = setInterval(async () => {
        try {
          const data = await this.monitoringService.getLiveMonitoringData(1);
          if (data && data.length > 0) {
            res.write(`data: ${JSON.stringify(data[0])}\n\n`);
          }
        } catch (error) {
          this.logger.error('Error streaming monitoring data', error);
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream error' })}\n\n`);
        }
      }, 2000); // Send data every 2 seconds

      // Handle client disconnect
      req.on('close', () => {
        clearInterval(intervalId);
        this.logger.info('Live monitoring stream closed', {
          ip: req.ip,
          requestId: req.id
        });
      });

      // Handle server errors
      req.on('error', (error) => {
        clearInterval(intervalId);
        this.logger.error('Live monitoring stream error', error, {
          ip: req.ip,
          requestId: req.id
        });
      });

    } catch (error) {
      this.logger.error('Error setting up live monitoring stream', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get aggregated statistics
   * GET /api/aggregated-stats
   */
  async getAggregatedStats(req, res, next) {
    try {
      this.logger.info('Fetching aggregated statistics', {
        query: req.query,
        requestId: req.id
      });

      // Context7 Pattern: Validate and sanitize input
      const validation = validateRequest.getAggregatedStats(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const { timeRange = 3600000 } = req.query; // 1 hour default
      const stats = await this.monitoringService.getAggregatedStats(parseInt(timeRange));

      this.logger.info('Successfully fetched aggregated statistics', {
        timeRange,
        requestId: req.id
      });

      return ApiResponse.success(res, stats, 'Aggregated statistics fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching aggregated statistics', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get system status
   * GET /api/system-status
   */
  async getSystemStatus(req, res, next) {
    try {
      this.logger.info('Fetching system status', {
        requestId: req.id
      });

      const status = await this.monitoringService.getSystemStatus();

      this.logger.info('Successfully fetched system status', {
        status: status.persistence?.enabled ? 'healthy' : 'degraded',
        requestId: req.id
      });

      return ApiResponse.success(res, status, 'System status fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching system status', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get efficiency metrics
   * GET /api/efficiency-metrics
   */
  async getEfficiencyMetrics(req, res, next) {
    try {
      this.logger.info('Fetching efficiency metrics', {
        requestId: req.id
      });

      const metrics = await this.monitoringService.getEfficiencyMetrics();

      this.logger.info('Successfully fetched efficiency metrics', {
        requestId: req.id
      });

      return ApiResponse.success(res, metrics, 'Efficiency metrics fetched successfully');
    } catch (error) {
      this.logger.error('Error fetching efficiency metrics', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get health status
   * GET /api/health
   */
  async getHealthStatus(req, res, next) {
    try {
      this.logger.info('Performing health check', {
        requestId: req.id
      });

      const health = await this.monitoringService.getHealthStatus();

      const statusCode = health.status === 'healthy' ? 200 : 503;
      
      this.logger.info('Health check completed', {
        status: health.status,
        mongodb: health.mongodb,
        requestId: req.id
      });

      return ApiResponse.custom(res, statusCode, health, 'Health check completed');
    } catch (error) {
      this.logger.error('Error performing health check', error, {
        requestId: req.id
      });
      
      // Context7 Pattern: Always return health status even on error
      return ApiResponse.custom(res, 503, {
        status: 'unhealthy',
        mongodb: false,
        error: error.message,
        timestamp: Date.now()
      }, 'Health check failed');
    }
  }

  /**
   * Context7 Pattern: Perform data cleanup
   * POST /api/cleanup
   */
  async performDataCleanup(req, res, next) {
    try {
      this.logger.info('Starting data cleanup', {
        body: req.body,
        requestId: req.id
      });

      // Context7 Pattern: Validate cleanup parameters
      const validation = validateRequest.performDataCleanup(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid cleanup parameters', validation.errors);
      }

      const { maxAge = 7 * 24 * 60 * 60 * 1000 } = req.body; // 7 days default
      const result = await this.monitoringService.performDataCleanup(maxAge);

      this.logger.info('Data cleanup completed successfully', {
        result,
        maxAge,
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Data cleanup completed successfully');
    } catch (error) {
      this.logger.error('Error performing data cleanup', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }
}

module.exports = { MonitoringController };