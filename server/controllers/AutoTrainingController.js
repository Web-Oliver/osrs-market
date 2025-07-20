/**
 * 🔄 Auto Training Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for Auto Training Management
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const { AutoTrainingService } = require('../services/AutoTrainingService');
const { AutoTrainingValidator } = require('../validators/AutoTrainingValidator');

class AutoTrainingController extends BaseController {
  constructor(dependencies = {}) {
    super('AutoTrainingController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.autoTrainingService = dependencies.autoTrainingService || new AutoTrainingService();
    this.trainingServices = new Map(); // userId -> AutoTrainingService
    this.logger.info('🔄 Auto Training Controller initialized');
  }

  /**
   * Context7 Pattern: Start auto training service
   */
  startAutoTraining = this.createPostEndpoint(
    async(trainingData) => {
      const { userId, config } = trainingData;

      // Check if service already running for user
      if (this.trainingServices.has(userId)) {
        const existingService = this.trainingServices.get(userId);
        if (existingService.isRunning) {
          const error = new Error('Auto training service already running for this user');
          error.statusCode = 409;
          throw error;
        }
      }

      // Create and start new service
      const service = new AutoTrainingService(config);
      await service.start();

      this.trainingServices.set(userId, service);
      const status = service.getStatus();

      return {
        userId,
        sessionId: status.sessionId,
        status: status
      };
    },
    {
      operationName: 'start auto training service',
      validator: (req) => AutoTrainingValidator.validateConfig(req.body.config),
      parseBody: (req) => ({
        userId: req.user?.userId || 'default',
        config: req.body.config
      })
    }
  );

  /**
   * Context7 Pattern: Stop auto training service
   */
  stopAutoTraining = this.createGetEndpoint(
    async(params) => {
      const { userId } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      const finalStatus = service.getStatus();
      service.stop();
      this.trainingServices.delete(userId);

      return {
        userId,
        sessionId: finalStatus.sessionId,
        finalStatus
      };
    },
    {
      operationName: 'stop auto training service',
      parseParams: (req) => ({
        userId: req.user?.userId || 'default'
      })
    }
  );

  /**
   * Context7 Pattern: Get auto training status
   */
  getAutoTrainingStatus = this.createGetEndpoint(
    async(params) => {
      const { userId } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        return {
          userId,
          isRunning: false,
          message: 'No auto training service found for this user'
        };
      }

      return {
        userId,
        status: service.getStatus(),
        healthStatus: service.getHealthStatus(),
        config: service.getConfig()
      };
    },
    {
      operationName: 'get auto training status',
      parseParams: (req) => ({
        userId: req.user?.userId || 'default'
      })
    }
  );

  /**
   * Context7 Pattern: Update auto training configuration
   */
  updateAutoTrainingConfig = this.createPostEndpoint(
    async(configData) => {
      const { userId, config } = configData;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      service.updateConfig(config);
      const updatedConfig = service.getConfig();

      return {
        userId,
        updatedConfig
      };
    },
    {
      operationName: 'update auto training configuration',
      validator: (req) => AutoTrainingValidator.validateConfig(req.body.config),
      parseBody: (req) => ({
        userId: req.user?.userId || 'default',
        config: req.body.config
      })
    }
  );

  /**
   * Context7 Pattern: Manually trigger training cycle
   */
  triggerTrainingCycle = this.createGetEndpoint(
    async(params) => {
      const { userId } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      await service.manualTriggerTraining();
      const status = service.getStatus();

      return {
        userId,
        sessionId: status.sessionId,
        status
      };
    },
    {
      operationName: 'trigger training cycle',
      parseParams: (req) => ({
        userId: req.user?.userId || 'default'
      })
    }
  );

  /**
   * Context7 Pattern: Export full training report
   */
  exportTrainingReport = this.createGetEndpoint(
    async(params) => {
      const { userId } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      const report = await service.exportFullReport();

      return {
        userId,
        report: JSON.parse(report),
        exportedAt: new Date().toISOString()
      };
    },
    {
      operationName: 'export training report',
      parseParams: (req) => ({
        userId: req.user?.userId || 'default'
      })
    }
  );

  /**
   * Context7 Pattern: Save AI model
   */
  saveModel = this.createGetEndpoint(
    async(params) => {
      const { userId } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      const modelData = service.saveModel();
      if (!modelData) {
        const error = new Error('Failed to save model - no model data returned');
        error.statusCode = 500;
        throw error;
      }

      return {
        userId,
        modelData,
        modelSize: modelData.length,
        savedAt: new Date().toISOString()
      };
    },
    {
      operationName: 'save AI model',
      parseParams: (req) => ({
        userId: req.user?.userId || 'default'
      })
    }
  );

  /**
   * Context7 Pattern: Load AI model
   */
  loadModel = this.createPostEndpoint(
    async(loadData) => {
      const { userId, modelData } = loadData;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      service.loadModel(modelData);

      return {
        userId,
        modelSize: modelData.length,
        loadedAt: new Date().toISOString()
      };
    },
    {
      operationName: 'load AI model',
      parseBody: (req) => {
        const { modelData } = req.body;

        if (!modelData) {
          throw new Error('Model data is required');
        }

        return {
          userId: req.user?.userId || 'default',
          modelData
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get historical data
   */
  getHistoricalData = this.createTimeBasedEndpoint(
    async(params) => {
      const { userId, itemId, timeRange } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      const historicalData = service.getHistoricalData(
        itemId ? parseInt(itemId) : undefined,
        timeRange ? parseInt(timeRange) : undefined
      );

      return historicalData.historicalData; // Frontend expects data to be the array directly
    },
    {
      operationName: 'get historical data',
      parseParams: (req) => ({
        userId: req.user?.userId || 'default',
        itemId: req.query.itemId,
        timeRange: req.query.timeRange
      })
    }
  );

  /**
   * Context7 Pattern: Get item timeseries
   */
  getItemTimeseries = this.createGetEndpoint(
    async(params) => {
      const { userId, itemId } = params;

      const service = this.trainingServices.get(userId);
      if (!service) {
        const error = new Error('No auto training service found for this user');
        error.statusCode = 404;
        throw error;
      }

      const timeseries = service.getItemTimeseries(parseInt(itemId));

      return {
        userId,
        itemId: parseInt(itemId),
        timeseries
      };
    },
    {
      operationName: 'get item timeseries',
      parseParams: (req) => {
        const { itemId } = req.params;

        if (!itemId) {
          throw new Error('Item ID is required');
        }

        return {
          userId: req.user?.userId || 'default',
          itemId
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get all active training services
   */
  getActiveServices = this.createGetEndpoint(
    async() => {
      const activeServices = [];

      for (const [userId, service] of this.trainingServices.entries()) {
        const status = service.getStatus();
        const healthStatus = service.getHealthStatus();

        activeServices.push({
          userId,
          status,
          healthStatus,
          isRunning: service.isRunning
        });
      }

      return {
        totalActive: activeServices.length,
        services: activeServices
      };
    },
    { operationName: 'get active services' }
  );

  /**
   * Context7 Pattern: Get system health
   */
  getSystemHealth = this.createGetEndpoint(
    async() => {
      const totalServices = this.trainingServices.size;
      const runningServices = Array.from(this.trainingServices.values())
        .filter(service => service.isRunning).length;

      return {
        totalServices,
        runningServices,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
    },
    { operationName: 'get system health' }
  );
}

module.exports = { AutoTrainingController };
