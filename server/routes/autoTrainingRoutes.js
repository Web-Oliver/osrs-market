/**
 * 🔄 Auto Training Routes - Context7 Optimized
 * 
 * Context7 Pattern: Route Layer for Auto Training Operations
 * - RESTful endpoints for automated training management
 * - Comprehensive route coverage for all auto training operations
 * - Consistent response patterns and error handling
 * - DRY principles with reusable route patterns
 * - SOLID architecture with clear separation of concerns
 */

const express = require('express');
const { AutoTrainingController } = require('../controllers/AutoTrainingController');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { Logger } = require('../utils/Logger');

const router = express.Router();
const controller = new AutoTrainingController();
const errorMiddleware = new ErrorMiddleware();
const requestMiddleware = new RequestMiddleware();
const logger = new Logger('AutoTrainingRoutes');

/**
 * Context7 Pattern: Auto Training Service Management Routes
 */

// POST /api/auto-training/start - Start auto training service
router.post('/start', 
  errorMiddleware.handleAsyncError(async (req, res) => {
    logger.debug('🔄 POST /start - Starting auto training service');
    await controller.startAutoTraining(req, res);
  })
);

// POST /api/auto-training/stop - Stop auto training service
router.post('/stop', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('🛑 POST /stop - Stopping auto training service');
  await controller.stopAutoTraining(req, res);
}));

// GET /api/auto-training/status - Get auto training service status
router.get('/status', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('📊 GET /status - Getting auto training status');
  await controller.getAutoTrainingStatus(req, res);
}));

// PUT /api/auto-training/config - Update auto training configuration
router.put('/config', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('⚙️ PUT /config - Updating auto training configuration');
  await controller.updateAutoTrainingConfig(req, res);
}));

/**
 * Context7 Pattern: Training Operations Routes
 */

// POST /api/auto-training/trigger - Manually trigger training cycle
router.post('/trigger', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('🔄 POST /trigger - Manually triggering training cycle');
  await controller.triggerTrainingCycle(req, res);
}));

// GET /api/auto-training/report - Export full training report
router.get('/report', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('📋 GET /report - Exporting training report');
  await controller.exportTrainingReport(req, res);
}));

/**
 * Context7 Pattern: Model Management Routes
 */

// POST /api/auto-training/model/save - Save AI model
router.post('/model/save', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('💾 POST /model/save - Saving AI model');
  await controller.saveModel(req, res);
}));

// POST /api/auto-training/model/load - Load AI model
router.post('/model/load', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('📥 POST /model/load - Loading AI model');
  await controller.loadModel(req, res);
}));

/**
 * Context7 Pattern: Data Access Routes
 */

// GET /api/auto-training/data/historical - Get historical data
router.get('/data/historical', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('📈 GET /data/historical - Getting historical data');
  await controller.getHistoricalData(req, res);
}));

// GET /api/auto-training/data/timeseries/:itemId - Get item timeseries
router.get('/data/timeseries/:itemId', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('📊 GET /data/timeseries/:itemId - Getting item timeseries');
  await controller.getItemTimeseries(req, res);
}));

/**
 * Context7 Pattern: System Management Routes
 */

// GET /api/auto-training/services - Get all active training services
router.get('/services', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('🔍 GET /services - Getting active training services');
  await controller.getActiveServices(req, res);
}));

// GET /api/auto-training/health - Get system health
router.get('/health', errorMiddleware.handleAsyncError(async (req, res) => {
  logger.debug('💚 GET /health - Getting system health');
  await controller.getSystemHealth(req, res);
}));

// Note: Error handling is now managed by ErrorMiddleware.handleAsyncError wrappers

logger.info('🔄 Auto Training routes initialized with endpoints:', {
  endpoints: [
    'POST /start',
    'POST /stop', 
    'GET /status',
    'PUT /config',
    'POST /trigger',
    'GET /report',
    'POST /model/save',
    'POST /model/load',
    'GET /data/historical',
    'GET /data/timeseries/:itemId',
    'GET /services',
    'GET /health'
  ]
});

module.exports = router;