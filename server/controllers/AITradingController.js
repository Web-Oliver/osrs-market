/**
 * 🤖 AI Trading Controller - Context7 Optimized
 * 
 * Context7 Pattern: Controller Layer for AI Trading Operations
 * - Handles AI trading session management
 * - Manages neural network training and prediction
 * - Provides trading analytics and performance metrics
 * - Thin controllers with business logic in services
 * - Proper validation and error handling
 * - DRY principles with reusable patterns
 * - SOLID architecture with single responsibility
 */

const { AITradingOrchestratorService } = require('../services/AITradingOrchestratorService');
const { TradingAnalysisService } = require('../services/TradingAnalysisService');
const { validateRequest } = require('../validators/AITradingValidator');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class AITradingController {
  constructor() {
    this.logger = new Logger('AITradingController');
    this.tradingAnalysis = new TradingAnalysisService();
    this.orchestratorInstances = new Map(); // Multiple orchestrator instances
    
    // Default neural network configuration
    this.defaultNetworkConfig = {
      inputSize: 8,
      hiddenLayers: [64, 32],
      outputSize: 3,
      learningRate: 0.001,
      epsilon: 1.0,
      epsilonMin: 0.01,
      epsilonDecay: 0.995,
      gamma: 0.95,
      memorySize: 10000,
      batchSize: 32,
      tau: 0.001
    };

    // Default adaptive learning configuration
    this.defaultAdaptiveConfig = {
      enableOnlineLearning: true,
      learningFrequency: 10,
      performanceThreshold: 0.6,
      explorationBoost: true
    };
    
    // Context7 Pattern: Bind methods to preserve 'this' context
    this.startTradingSession = this.startTradingSession.bind(this);
    this.stopTradingSession = this.stopTradingSession.bind(this);
    this.pauseTradingSession = this.pauseTradingSession.bind(this);
    this.resumeTradingSession = this.resumeTradingSession.bind(this);
    this.processMarketData = this.processMarketData.bind(this);
    this.getTrainingProgress = this.getTrainingProgress.bind(this);
    this.getPerformanceAnalytics = this.getPerformanceAnalytics.bind(this);
    this.updateAdaptiveConfig = this.updateAdaptiveConfig.bind(this);
    this.saveModel = this.saveModel.bind(this);
    this.loadModel = this.loadModel.bind(this);
    this.exportTrainingData = this.exportTrainingData.bind(this);
    this.generateTradingSignals = this.generateTradingSignals.bind(this);
    this.getSystemStatus = this.getSystemStatus.bind(this);
    this.getActiveSessions = this.getActiveSessions.bind(this);
    
    this.logger.info('🤖 AI Trading Controller initialized');
  }

  /**
   * Context7 Pattern: Start AI trading session
   * POST /api/ai-trading/sessions
   */
  async startTradingSession(req, res, next) {
    try {
      this.logger.info('🚀 Starting AI trading session', {
        body: req.body,
        ip: req.ip,
        requestId: req.id
      });

      // Context7 Pattern: Validate request body
      const validation = validateRequest.startTradingSession(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request parameters', validation.errors);
      }

      const { 
        networkConfig = this.defaultNetworkConfig,
        adaptiveConfig = this.defaultAdaptiveConfig,
        sessionName = 'Default Session'
      } = req.body;

      // Create new orchestrator instance
      const orchestrator = new AITradingOrchestratorService(networkConfig, adaptiveConfig);
      const sessionId = orchestrator.startLearningSession();
      
      // Store orchestrator instance
      this.orchestratorInstances.set(sessionId, {
        orchestrator,
        sessionName,
        createdAt: Date.now(),
        createdBy: req.ip
      });

      this.logger.info('✅ AI trading session started successfully', {
        sessionId,
        sessionName,
        networkConfig,
        adaptiveConfig,
        requestId: req.id
      });

      return ApiResponse.created(res, {
        sessionId,
        sessionName,
        networkConfig,
        adaptiveConfig,
        status: 'TRAINING'
      }, 'AI trading session started successfully');
    } catch (error) {
      this.logger.error('❌ Error starting AI trading session', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Stop AI trading session
   * DELETE /api/ai-trading/sessions/:sessionId
   */
  async stopTradingSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('🛑 Stopping AI trading session', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      // Stop the session
      await sessionInstance.orchestrator.finishLearningSession();
      
      // Get final performance data
      const finalPerformance = sessionInstance.orchestrator.getPerformanceAnalytics();
      
      // Remove from active sessions
      this.orchestratorInstances.delete(sessionId);

      this.logger.info('✅ AI trading session stopped successfully', {
        sessionId,
        finalPerformance: {
          totalTrades: finalPerformance.overall.totalTrades,
          netProfit: finalPerformance.overall.netProfit,
          successRate: finalPerformance.overall.successRate
        },
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        status: 'STOPPED',
        finalPerformance
      }, 'AI trading session stopped successfully');
    } catch (error) {
      this.logger.error('❌ Error stopping AI trading session', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Pause AI trading session
   * POST /api/ai-trading/sessions/:sessionId/pause
   */
  async pauseTradingSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('⏸️ Pausing AI trading session', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      sessionInstance.orchestrator.pauseLearningSession();

      this.logger.info('✅ AI trading session paused successfully', {
        sessionId,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        status: 'PAUSED'
      }, 'AI trading session paused successfully');
    } catch (error) {
      this.logger.error('❌ Error pausing AI trading session', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Resume AI trading session
   * POST /api/ai-trading/sessions/:sessionId/resume
   */
  async resumeTradingSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('▶️ Resuming AI trading session', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      sessionInstance.orchestrator.resumeLearningSession();

      this.logger.info('✅ AI trading session resumed successfully', {
        sessionId,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        status: 'TRAINING'
      }, 'AI trading session resumed successfully');
    } catch (error) {
      this.logger.error('❌ Error resuming AI trading session', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Process market data for trading decisions
   * POST /api/ai-trading/sessions/:sessionId/process-market-data
   */
  async processMarketData(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { items } = req.body;
      
      this.logger.info('📊 Processing market data for trading decisions', {
        sessionId,
        itemCount: items?.length,
        requestId: req.id
      });

      // Context7 Pattern: Validate request
      const validation = validateRequest.processMarketData(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid market data', validation.errors);
      }

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return ApiResponse.badRequest(res, 'Items array is required and cannot be empty');
      }

      // Process market data through orchestrator
      const actions = await sessionInstance.orchestrator.processMarketData(items);

      this.logger.info('✅ Market data processed successfully', {
        sessionId,
        itemCount: items.length,
        actionsGenerated: actions.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        processedItems: items.length,
        actionsGenerated: actions.length,
        actions
      }, 'Market data processed successfully');
    } catch (error) {
      this.logger.error('❌ Error processing market data', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get training progress
   * GET /api/ai-trading/sessions/:sessionId/progress
   */
  async getTrainingProgress(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('📈 Getting training progress', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      const progress = sessionInstance.orchestrator.getTrainingProgress();

      this.logger.info('✅ Training progress retrieved successfully', {
        sessionId,
        episodeCount: progress.session?.episodeCount,
        totalTrades: progress.session?.totalTrades,
        requestId: req.id
      });

      return ApiResponse.success(res, progress, 'Training progress retrieved successfully');
    } catch (error) {
      this.logger.error('❌ Error getting training progress', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get performance analytics
   * GET /api/ai-trading/sessions/:sessionId/analytics
   */
  async getPerformanceAnalytics(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('📊 Getting performance analytics', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      const analytics = sessionInstance.orchestrator.getPerformanceAnalytics();

      this.logger.info('✅ Performance analytics retrieved successfully', {
        sessionId,
        totalTrades: analytics.overall.totalTrades,
        successRate: analytics.overall.successRate,
        netProfit: analytics.overall.netProfit,
        requestId: req.id
      });

      return ApiResponse.success(res, analytics, 'Performance analytics retrieved successfully');
    } catch (error) {
      this.logger.error('❌ Error getting performance analytics', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Update adaptive configuration
   * PUT /api/ai-trading/sessions/:sessionId/adaptive-config
   */
  async updateAdaptiveConfig(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { config } = req.body;
      
      this.logger.info('⚙️ Updating adaptive configuration', {
        sessionId,
        config,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      sessionInstance.orchestrator.setAdaptiveConfig(config);
      const updatedConfig = sessionInstance.orchestrator.getAdaptiveConfig();

      this.logger.info('✅ Adaptive configuration updated successfully', {
        sessionId,
        updatedConfig,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        adaptiveConfig: updatedConfig
      }, 'Adaptive configuration updated successfully');
    } catch (error) {
      this.logger.error('❌ Error updating adaptive configuration', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Save model
   * POST /api/ai-trading/sessions/:sessionId/save-model
   */
  async saveModel(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('💾 Saving AI model', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      const modelData = sessionInstance.orchestrator.saveModel();

      this.logger.info('✅ AI model saved successfully', {
        sessionId,
        modelSize: modelData.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        modelData,
        modelSize: modelData.length,
        savedAt: Date.now()
      }, 'AI model saved successfully');
    } catch (error) {
      this.logger.error('❌ Error saving AI model', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Load model
   * POST /api/ai-trading/sessions/:sessionId/load-model
   */
  async loadModel(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { modelData } = req.body;
      
      this.logger.info('📁 Loading AI model', {
        sessionId,
        modelSize: modelData?.length,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      if (!modelData) {
        return ApiResponse.badRequest(res, 'Model data is required');
      }

      sessionInstance.orchestrator.loadModel(modelData);

      this.logger.info('✅ AI model loaded successfully', {
        sessionId,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        loadedAt: Date.now()
      }, 'AI model loaded successfully');
    } catch (error) {
      this.logger.error('❌ Error loading AI model', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Export training data
   * GET /api/ai-trading/sessions/:sessionId/export
   */
  async exportTrainingData(req, res, next) {
    try {
      const { sessionId } = req.params;
      
      this.logger.info('📤 Exporting training data', {
        sessionId,
        requestId: req.id
      });

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      if (!sessionInstance) {
        return ApiResponse.notFound(res, 'Trading session not found');
      }

      const exportData = sessionInstance.orchestrator.exportTrainingData();

      this.logger.info('✅ Training data exported successfully', {
        sessionId,
        outcomesCount: exportData.outcomes.length,
        metricsCount: exportData.metrics.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessionId,
        exportData,
        exportedAt: Date.now()
      }, 'Training data exported successfully');
    } catch (error) {
      this.logger.error('❌ Error exporting training data', error, {
        sessionId: req.params.sessionId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Generate trading signals
   * POST /api/ai-trading/signals
   */
  async generateTradingSignals(req, res, next) {
    try {
      const { items } = req.body;
      
      this.logger.info('🎯 Generating trading signals', {
        itemCount: items?.length,
        requestId: req.id
      });

      // Context7 Pattern: Validate request
      const validation = validateRequest.generateTradingSignals(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid request data', validation.errors);
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return ApiResponse.badRequest(res, 'Items array is required and cannot be empty');
      }

      const signals = [];
      for (const item of items) {
        // Create mock price history for analysis
        const prices = [
          item.priceData.low || 0,
          (item.priceData.low + item.priceData.high) / 2 || 0,
          item.priceData.high || 0
        ].filter(p => p > 0);

        if (prices.length > 0) {
          const analysis = this.tradingAnalysis.getMarketAnalysis(prices, item.priceData);
          const flippingOpportunity = this.tradingAnalysis.identifyFlippingOpportunity(
            item.id,
            item.name,
            item.priceData
          );

          signals.push({
            itemId: item.id,
            itemName: item.name,
            signal: analysis.signal,
            indicators: analysis.indicators,
            flippingOpportunity,
            analysis: {
              volatility: analysis.volatility,
              trendStrength: analysis.trendStrength,
              supportResistance: analysis.supportResistance
            }
          });
        }
      }

      this.logger.info('✅ Trading signals generated successfully', {
        itemCount: items.length,
        signalsGenerated: signals.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        signals,
        generatedAt: Date.now(),
        itemsProcessed: items.length
      }, 'Trading signals generated successfully');
    } catch (error) {
      this.logger.error('❌ Error generating trading signals', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get system status
   * GET /api/ai-trading/system-status
   */
  async getSystemStatus(req, res, next) {
    try {
      this.logger.info('📊 Getting AI trading system status', {
        requestId: req.id
      });

      const systemStatus = {
        activeSessions: this.orchestratorInstances.size,
        sessions: Array.from(this.orchestratorInstances.entries()).map(([sessionId, instance]) => ({
          sessionId,
          sessionName: instance.sessionName,
          status: instance.orchestrator.getCurrentSession()?.status || 'UNKNOWN',
          createdAt: instance.createdAt,
          createdBy: instance.createdBy,
          systemStatus: instance.orchestrator.getSystemStatus()
        })),
        defaultConfigs: {
          networkConfig: this.defaultNetworkConfig,
          adaptiveConfig: this.defaultAdaptiveConfig
        },
        systemHealth: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: Date.now()
        }
      };

      this.logger.info('✅ System status retrieved successfully', {
        activeSessions: systemStatus.activeSessions,
        requestId: req.id
      });

      return ApiResponse.success(res, systemStatus, 'System status retrieved successfully');
    } catch (error) {
      this.logger.error('❌ Error getting system status', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get active sessions
   * GET /api/ai-trading/sessions
   */
  async getActiveSessions(req, res, next) {
    try {
      this.logger.info('📋 Getting active trading sessions', {
        requestId: req.id
      });

      const sessions = Array.from(this.orchestratorInstances.entries()).map(([sessionId, instance]) => ({
        sessionId,
        sessionName: instance.sessionName,
        createdAt: instance.createdAt,
        createdBy: instance.createdBy,
        currentSession: instance.orchestrator.getCurrentSession(),
        systemStatus: instance.orchestrator.getSystemStatus()
      }));

      this.logger.info('✅ Active sessions retrieved successfully', {
        sessionCount: sessions.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        sessions,
        totalSessions: sessions.length
      }, 'Active sessions retrieved successfully');
    } catch (error) {
      this.logger.error('❌ Error getting active sessions', error, {
        requestId: req.id
      });
      next(error);
    }
  }
}

module.exports = { AITradingController };