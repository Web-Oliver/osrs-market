/**
 * 🔄 Auto Training Controller - Context7 Optimized
 * 
 * Context7 Pattern: Controller Layer for Auto Training Management
 * - Handles HTTP requests for automated training operations
 * - Manages training service lifecycle and configuration
 * - Implements comprehensive validation and error handling
 * - DRY principles with reusable response patterns
 * - SOLID architecture with single responsibility
 */

const { Logger } = require('../utils/Logger');
const { AutoTrainingService } = require('../services/AutoTrainingService');
const { AutoTrainingValidator } = require('../validators/AutoTrainingValidator');

class AutoTrainingController {
  constructor() {
    this.logger = new Logger('AutoTrainingController');
    this.trainingServices = new Map(); // userId -> AutoTrainingService
    this.logger.info('🔄 Auto Training Controller initialized');
  }

  /**
   * Context7 Pattern: Start auto training service
   */
  async startAutoTraining(req, res) {
    try {
      const { userId = 'default' } = req.user || {};
      const { config } = req.body;

      // Validate configuration
      const validationResult = AutoTrainingValidator.validateConfig(config);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration',
          details: validationResult.errors
        });
      }

      // Check if service already running for user
      if (this.trainingServices.has(userId)) {
        const existingService = this.trainingServices.get(userId);
        if (existingService.isRunning) {
          return res.status(409).json({
            success: false,
            error: 'Auto training service already running for this user'
          });
        }
      }

      // Create and start new service
      const service = new AutoTrainingService(config);
      await service.start();

      this.trainingServices.set(userId, service);

      const status = service.getStatus();
      
      this.logger.info('✅ Auto training service started', {
        userId,
        sessionId: status.sessionId
      });

      res.json({
        success: true,
        data: {
          userId,
          sessionId: status.sessionId,
          status: status,
          message: 'Auto training service started successfully'
        }
      });

    } catch (error) {
      this.logger.error('❌ Error starting auto training service', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start auto training service',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Stop auto training service
   */
  async stopAutoTraining(req, res) {
    try {
      const { userId = 'default' } = req.user || {};

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      const finalStatus = service.getStatus();
      service.stop();
      this.trainingServices.delete(userId);

      this.logger.info('✅ Auto training service stopped', {
        userId,
        sessionId: finalStatus.sessionId
      });

      res.json({
        success: true,
        data: {
          userId,
          sessionId: finalStatus.sessionId,
          finalStatus: finalStatus,
          message: 'Auto training service stopped successfully'
        }
      });

    } catch (error) {
      this.logger.error('❌ Error stopping auto training service', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop auto training service',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Get auto training status
   */
  async getAutoTrainingStatus(req, res) {
    try {
      const { userId = 'default' } = req.user || {};

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.json({
          success: true,
          data: {
            userId,
            isRunning: false,
            message: 'No auto training service found for this user'
          }
        });
      }

      const status = service.getStatus();
      const healthStatus = service.getHealthStatus();

      res.json({
        success: true,
        data: {
          userId,
          status,
          healthStatus,
          config: service.getConfig()
        }
      });

    } catch (error) {
      this.logger.error('❌ Error getting auto training status', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get auto training status',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Update auto training configuration
   */
  async updateAutoTrainingConfig(req, res) {
    try {
      const { userId = 'default' } = req.user || {};
      const { config } = req.body;

      // Validate configuration
      const validationResult = AutoTrainingValidator.validateConfig(config);
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration',
          details: validationResult.errors
        });
      }

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      service.updateConfig(config);
      const updatedConfig = service.getConfig();

      this.logger.info('✅ Auto training configuration updated', {
        userId,
        updatedFields: Object.keys(config)
      });

      res.json({
        success: true,
        data: {
          userId,
          updatedConfig,
          message: 'Configuration updated successfully'
        }
      });

    } catch (error) {
      this.logger.error('❌ Error updating auto training config', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update auto training configuration',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Manually trigger training cycle
   */
  async triggerTrainingCycle(req, res) {
    try {
      const { userId = 'default' } = req.user || {};

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      await service.manualTriggerTraining();
      const status = service.getStatus();

      this.logger.info('✅ Training cycle triggered manually', {
        userId,
        sessionId: status.sessionId
      });

      res.json({
        success: true,
        data: {
          userId,
          sessionId: status.sessionId,
          status,
          message: 'Training cycle triggered successfully'
        }
      });

    } catch (error) {
      this.logger.error('❌ Error triggering training cycle', error);
      res.status(500).json({
        success: false,
        error: 'Failed to trigger training cycle',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Export full training report
   */
  async exportTrainingReport(req, res) {
    try {
      const { userId = 'default' } = req.user || {};

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      const report = await service.exportFullReport();

      this.logger.info('✅ Training report exported', {
        userId,
        reportSize: report.length
      });

      res.json({
        success: true,
        data: {
          userId,
          report: JSON.parse(report),
          exportedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('❌ Error exporting training report', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export training report',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Save AI model
   */
  async saveModel(req, res) {
    try {
      const { userId = 'default' } = req.user || {};

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      const modelData = service.saveModel();
      if (!modelData) {
        return res.status(500).json({
          success: false,
          error: 'Failed to save model - no model data returned'
        });
      }

      this.logger.info('✅ AI model saved', {
        userId,
        modelSize: modelData.length
      });

      res.json({
        success: true,
        data: {
          userId,
          modelData,
          modelSize: modelData.length,
          savedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      this.logger.error('❌ Error saving AI model', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save AI model',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Load AI model
   */
  async loadModel(req, res) {
    try {
      const { userId = 'default' } = req.user || {};
      const { modelData } = req.body;

      if (!modelData) {
        return res.status(400).json({
          success: false,
          error: 'Model data is required'
        });
      }

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      service.loadModel(modelData);

      this.logger.info('✅ AI model loaded', {
        userId,
        modelSize: modelData.length
      });

      res.json({
        success: true,
        data: {
          userId,
          modelSize: modelData.length,
          loadedAt: new Date().toISOString(),
          message: 'AI model loaded successfully'
        }
      });

    } catch (error) {
      this.logger.error('❌ Error loading AI model', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load AI model',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Get historical data
   */
  async getHistoricalData(req, res) {
    try {
      const { userId = 'default' } = req.user || {};
      const { itemId, timeRange } = req.query;

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      const historicalData = service.getHistoricalData(
        itemId ? parseInt(itemId) : undefined,
        timeRange ? parseInt(timeRange) : undefined
      );

      res.json({
        success: true,
        data: {
          userId,
          itemId: itemId ? parseInt(itemId) : null,
          timeRange: timeRange ? parseInt(timeRange) : null,
          historicalData
        }
      });

    } catch (error) {
      this.logger.error('❌ Error getting historical data', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get historical data',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Get item timeseries
   */
  async getItemTimeseries(req, res) {
    try {
      const { userId = 'default' } = req.user || {};
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          error: 'Item ID is required'
        });
      }

      const service = this.trainingServices.get(userId);
      if (!service) {
        return res.status(404).json({
          success: false,
          error: 'No auto training service found for this user'
        });
      }

      const timeseries = service.getItemTimeseries(parseInt(itemId));

      res.json({
        success: true,
        data: {
          userId,
          itemId: parseInt(itemId),
          timeseries
        }
      });

    } catch (error) {
      this.logger.error('❌ Error getting item timeseries', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get item timeseries',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Get all active training services
   */
  async getActiveServices(req, res) {
    try {
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

      res.json({
        success: true,
        data: {
          totalActive: activeServices.length,
          services: activeServices
        }
      });

    } catch (error) {
      this.logger.error('❌ Error getting active services', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active services',
        details: error.message
      });
    }
  }

  /**
   * Context7 Pattern: Get system health
   */
  async getSystemHealth(req, res) {
    try {
      const totalServices = this.trainingServices.size;
      const runningServices = Array.from(this.trainingServices.values())
        .filter(service => service.isRunning).length;

      const systemHealth = {
        totalServices,
        runningServices,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: systemHealth
      });

    } catch (error) {
      this.logger.error('❌ Error getting system health', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get system health',
        details: error.message
      });
    }
  }
}

module.exports = { AutoTrainingController };