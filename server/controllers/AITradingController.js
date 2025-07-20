/**
 * 🤖 AI Trading Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for AI Trading Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and parameter parsing
 */

const { BaseController } = require('./BaseController');
const { AITradingOrchestratorService } = require('../services/AITradingOrchestratorService');
const { TradingAnalysisService } = require('../services/TradingAnalysisService');
const { validateRequest } = require('../validators/AITradingValidator');

class AITradingController extends BaseController {
  constructor(dependencies = {}) {
    super('AITradingController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.aiTradingService = dependencies.aiTradingService || new AITradingOrchestratorService();
    this.tradingAnalysisService = dependencies.tradingAnalysisService || new TradingAnalysisService();
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

    this.logger.info('🤖 AI Trading Controller initialized');
  }

  /**
   * Context7 Pattern: Start AI trading session
   * POST /api/ai-trading/sessions
   */
  startTradingSession = this.createPostEndpoint(
    async(sessionData) => {
      // Create new orchestrator instance
      const orchestrator = new AITradingOrchestratorService(
        sessionData.networkConfig,
        sessionData.adaptiveConfig
      );
      const sessionId = orchestrator.startLearningSession();

      // Store orchestrator instance
      this.orchestratorInstances.set(sessionId, {
        orchestrator,
        sessionName: sessionData.sessionName,
        createdAt: Date.now(),
        createdBy: sessionData.metadata.clientIp
      });

      return {
        sessionId,
        sessionName: sessionData.sessionName,
        networkConfig: sessionData.networkConfig,
        adaptiveConfig: sessionData.adaptiveConfig,
        status: 'TRAINING'
      };
    },
    {
      operationName: 'start AI trading session',
      validator: () => validateRequest.startTradingSession(req.body),
      parseBody: (req) => {
        const {
          networkConfig = this.defaultNetworkConfig,
          adaptiveConfig = this.defaultAdaptiveConfig,
          sessionName = 'Default Session'
        } = req.body;

        return {
          networkConfig,
          adaptiveConfig,
          sessionName,
          metadata: {
            clientIp: req.ip,
            userAgent: req.get('User-Agent'),
            requestId: req.id,
            timestamp: Date.now()
          }
        };
      }
    }
  );

  /**
   * Context7 Pattern: Stop AI trading session
   * DELETE /api/ai-trading/sessions/:sessionId
   */
  stopTradingSession = this.createDeleteEndpoint(
    async(sessionId) => {
      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      // Stop the session
      await sessionInstance.orchestrator.finishLearningSession();

      // Get final performance data
      const finalPerformance = sessionInstance.orchestrator.getPerformanceAnalytics();

      // Remove from active sessions
      this.orchestratorInstances.delete(sessionId);

      return {
        sessionId,
        status: 'STOPPED',
        finalPerformance
      };
    },
    {
      operationName: 'stop AI trading session',
      resourceIdParam: 'sessionId'
    }
  );

  /**
   * Context7 Pattern: Pause AI trading session
   * POST /api/ai-trading/sessions/:sessionId/pause
   */
  pauseTradingSession = this.createPostEndpoint(
    async(sessionData) => {
      const { sessionId } = sessionData;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      sessionInstance.orchestrator.pauseLearningSession();

      return {
        sessionId,
        status: 'PAUSED'
      };
    },
    {
      operationName: 'pause AI trading session',
      resourceIdParam: 'sessionId',
      parseParams: (req) => ({ sessionId: req.params.sessionId })
    }
  );

  /**
   * Context7 Pattern: Resume AI trading session
   * POST /api/ai-trading/sessions/:sessionId/resume
   */
  resumeTradingSession = this.createPostEndpoint(
    async(sessionData) => {
      const { sessionId } = sessionData;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      sessionInstance.orchestrator.resumeLearningSession();

      return {
        sessionId,
        status: 'TRAINING'
      };
    },
    {
      operationName: 'resume AI trading session',
      resourceIdParam: 'sessionId',
      parseParams: (req) => ({ sessionId: req.params.sessionId })
    }
  );

  /**
   * Context7 Pattern: Process market data for trading decisions
   * POST /api/ai-trading/sessions/:sessionId/process-market-data
   */
  processMarketData = this.createPostEndpoint(
    async(marketData) => {
      const { sessionId, items } = marketData;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      // DRY: Use BaseController validation utility
      this.validateNonEmptyArray(items, 'Items array');

      const actions = await sessionInstance.orchestrator.processMarketData(items);

      return {
        sessionId,
        processedItems: items.length,
        actionsGenerated: actions.length,
        actions
      };
    },
    {
      operationName: 'process market data',
      validator: (req) => validateRequest.processMarketData(req.body),
      parseBody: (req) => ({
        sessionId: req.params.sessionId,
        items: req.body.items
      })
    }
  );

  /**
   * Context7 Pattern: Get training progress
   * GET /api/ai-trading/sessions/:sessionId/progress
   */
  getTrainingProgress = this.createGetEndpoint(
    async(params) => {
      const { sessionId } = params;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      return sessionInstance.orchestrator.getTrainingProgress();
    },
    {
      operationName: 'get training progress',
      parseParams: (req) => ({ sessionId: req.params.sessionId })
    }
  );

  /**
   * Context7 Pattern: Get performance analytics
   * GET /api/ai-trading/sessions/:sessionId/analytics
   */
  getPerformanceAnalytics = this.createGetEndpoint(
    async(params) => {
      const { sessionId } = params;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      return sessionInstance.orchestrator.getPerformanceAnalytics();
    },
    {
      operationName: 'get performance analytics',
      parseParams: (req) => ({ sessionId: req.params.sessionId })
    }
  );

  /**
   * Context7 Pattern: Update adaptive configuration
   * PUT /api/ai-trading/sessions/:sessionId/adaptive-config
   */
  updateAdaptiveConfig = this.createPostEndpoint(
    async(configData) => {
      const { sessionId, config } = configData;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      sessionInstance.orchestrator.setAdaptiveConfig(config);
      const updatedConfig = sessionInstance.orchestrator.getAdaptiveConfig();

      return {
        sessionId,
        adaptiveConfig: updatedConfig
      };
    },
    {
      operationName: 'update adaptive configuration',
      parseBody: (req) => ({
        sessionId: req.params.sessionId,
        config: req.body.config
      })
    }
  );

  /**
   * Context7 Pattern: Save model
   * POST /api/ai-trading/sessions/:sessionId/save-model
   */
  saveModel = this.createGetEndpoint(
    async(params) => {
      const { sessionId } = params;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      const modelData = sessionInstance.orchestrator.saveModel();

      return {
        sessionId,
        modelData,
        modelSize: modelData.length,
        savedAt: Date.now()
      };
    },
    {
      operationName: 'save AI model',
      parseParams: (req) => ({ sessionId: req.params.sessionId })
    }
  );

  /**
   * Context7 Pattern: Load model
   * POST /api/ai-trading/sessions/:sessionId/load-model
   */
  loadModel = this.createPostEndpoint(
    async(loadData) => {
      const { sessionId, modelData } = loadData;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      // DRY: Use BaseController validation utility
      this.validateRequiredParams({ modelData }, ['modelData']);

      sessionInstance.orchestrator.loadModel(modelData);

      return {
        sessionId,
        loadedAt: Date.now()
      };
    },
    {
      operationName: 'load AI model',
      parseBody: (req) => ({
        sessionId: req.params.sessionId,
        modelData: req.body.modelData
      })
    }
  );

  /**
   * Context7 Pattern: Export training data
   * GET /api/ai-trading/sessions/:sessionId/export
   */
  exportTrainingData = this.createGetEndpoint(
    async(params) => {
      const { sessionId } = params;

      const sessionInstance = this.orchestratorInstances.get(sessionId);
      // DRY: Use BaseController validation utility
      this.validateService(sessionInstance, 'Trading session', sessionId);

      const exportData = sessionInstance.orchestrator.exportTrainingData();

      return {
        sessionId,
        exportData,
        exportedAt: Date.now()
      };
    },
    {
      operationName: 'export training data',
      parseParams: (req) => ({ sessionId: req.params.sessionId })
    }
  );

  /**
   * Context7 Pattern: Generate trading signals
   * POST /api/ai-trading/signals
   */
  generateTradingSignals = this.createPostEndpoint(
    async(signalData) => {
      const { items } = signalData;

      // DRY: Use BaseController validation utility
      this.validateNonEmptyArray(items, 'Items array');

      const signals = [];
      for (const item of items) {
        if (!item.priceHistory || item.priceHistory.length < 3) {
          continue;
        }

        const prices = item.priceHistory.map(point => point.price || point.high || 0).filter(p => p > 0);

        if (prices.length >= 3) {
          const analysis = this.tradingAnalysisService.getMarketAnalysis(prices, item.priceData);
          const flippingOpportunity = this.tradingAnalysisService.identifyFlippingOpportunity(
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

      return {
        signals,
        generatedAt: Date.now(),
        itemsProcessed: items.length
      };
    },
    {
      operationName: 'generate trading signals',
      validator: (req) => validateRequest.generateTradingSignals(req.body),
      parseBody: (req) => ({ items: req.body.items })
    }
  );

  /**
   * Context7 Pattern: Get system status
   * GET /api/ai-trading/system-status
   */
  getSystemStatus = this.createGetEndpoint(
    async() => {
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

      return systemStatus;
    },
    { operationName: 'get system status' }
  );

  /**
   * Context7 Pattern: Get active sessions
   * GET /api/ai-trading/sessions
   */
  getActiveSessions = this.createGetEndpoint(
    async() => {
      const sessions = Array.from(this.orchestratorInstances.entries()).map(([sessionId, instance]) => ({
        sessionId,
        sessionName: instance.sessionName,
        createdAt: instance.createdAt,
        createdBy: instance.createdBy,
        currentSession: instance.orchestrator.getCurrentSession(),
        systemStatus: instance.orchestrator.getSystemStatus()
      }));

      return {
        sessions,
        totalSessions: sessions.length
      };
    },
    { operationName: 'get active sessions' }
  );
}

module.exports = { AITradingController };
