/**
 * 📊 Monitoring Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for Monitoring Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const { MonitoringService } = require('../services/MonitoringService');
const { validateRequest } = require('../validators/MonitoringValidator');
const TimeConstants = require('../utils/TimeConstants');


class MonitoringController extends BaseController {
  constructor(dependencies = {}) {
    super('MonitoringController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.monitoringService = dependencies.monitoringService || new MonitoringService();
    
    // Initialize endpoints after service is set
    this.initializeEndpoints();
  }

  initializeEndpoints() {
    // Endpoints that require the service to be initialized
    this.getSystemStatus = this.createGetEndpoint(
      this.monitoringService.getSystemStatus,
      { operationName: 'fetch system status' }
    );
    
    this.getEfficiencyMetrics = this.createGetEndpoint(
      this.monitoringService.getEfficiencyMetrics,
      { operationName: 'fetch efficiency metrics' }
    );
    
    this.getHealthStatus = this.createGetEndpoint(
      this.monitoringService.getHealthStatus,
      { operationName: 'fetch health status' }
    );
    
    this.getAggregatedStats = this.createGetEndpoint(
      this.monitoringService.getAggregatedStats,
      { operationName: 'fetch aggregated stats' }
    );
  }

  /**
   * Context7 Pattern: Get live monitoring data
   * GET /api/live-monitoring
   */
  getLiveData = this.createGetEndpoint(
    async(params) => {
      const { limit } = params;
      return await this.monitoringService.getLiveMonitoringData(limit);
    },
    {
      operationName: 'fetch live monitoring data',
      validator: (req) => validateRequest.getLiveMonitoringData(req.query),
      parseParams: (req) => ({
        limit: parseInt(req.query.limit || 50)
      })
    }
  );

  /**
   * Context7 Pattern: Save live monitoring data
   * POST /api/live-monitoring
   */
  saveLiveData = this.createPostEndpoint(
    async(enrichedData) => {
      const insertedId = await this.monitoringService.saveLiveMonitoringData(enrichedData);
      return { id: insertedId };
    },
    {
      operationName: 'save live monitoring data',
      validator: (req) => validateRequest.saveLiveData(req.body),
      parseBody: (req) => ({
        ...req.body,
        timestamp: req.body.timestamp || Date.now(),
        clientIp: req.ip,
        userAgent: req.get('User-Agent'),
        requestId: req.id
      })
    }
  );

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
      const intervalId = setInterval(async() => {
        try {
          const data = await this.monitoringService.getLiveMonitoringData(1);
          if (data && data.length > 0) {
            res.write(`data: ${JSON.stringify(data[0])}\n\n`);
          }
        } catch (error) {
          // Error handling moved to centralized manager - context: Error streaming monitoring data
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
        // Error handling moved to centralized manager - context: Live monitoring stream error
      });

    } catch (error) {
      // Error handling moved to centralized manager - context: Error setting up live monitoring stream
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
      // Error handling moved to centralized manager - context: Error fetching aggregated statistics
      next(error);
    }
  }

  // Endpoints are now initialized in constructor via initializeEndpoints()

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

      const { maxAge = TimeConstants.SEVEN_DAYS } = req.body; // 7 days default
      const result = await this.monitoringService.performDataCleanup(maxAge);

      this.logger.info('Data cleanup completed successfully', {
        result,
        maxAge,
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Data cleanup completed successfully');
    } catch (error) {
      // Error handling moved to centralized manager - context: Error performing data cleanup
      next(error);
    }
  }
}

module.exports = { MonitoringController };
