/**
 * 🤖 AI Trading Routes - Context7 Optimized
 * 
 * Context7 Pattern: Routes Layer for AI Trading Operations
 * - Handles AI trading session management endpoints
 * - Provides neural network training and prediction routes
 * - Manages trading analytics and performance metrics
 * - DRY principles with reusable route patterns
 * - SOLID architecture with proper separation of concerns
 */

const express = require('express');
const { AITradingController } = require('../controllers/AITradingController');
const { validateRequest } = require('../validators/AITradingValidator');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

const router = express.Router();
const controller = new AITradingController();
const errorMiddleware = new ErrorMiddleware();
const logger = new Logger('AITradingRoutes');

/**
 * Context7 Pattern: Middleware for session ID validation
 */
const validateSessionId = (req, res, next) => {
  const { sessionId } = req.params;
  const validation = validateRequest.validateSessionId(sessionId);
  
  if (!validation.isValid) {
    return ApiResponse.badRequest(res, 'Invalid session ID', validation.errors);
  }
  
  next();
};

/**
 * Context7 Pattern: AI Trading Session Management Routes
 */

// Create new AI trading session
router.post('/sessions', controller.startTradingSession);

// Get all active sessions
router.get('/sessions', controller.getActiveSessions);

// Get system status
router.get('/system-status', controller.getSystemStatus);

// Session-specific routes with ID validation
router.use('/sessions/:sessionId', validateSessionId);

// Stop/delete trading session
router.delete('/sessions/:sessionId', controller.stopTradingSession);

// Pause trading session
router.post('/sessions/:sessionId/pause', controller.pauseTradingSession);

// Resume trading session
router.post('/sessions/:sessionId/resume', controller.resumeTradingSession);

// Process market data for trading decisions
router.post('/sessions/:sessionId/process-market-data', controller.processMarketData);

// Get training progress
router.get('/sessions/:sessionId/progress', controller.getTrainingProgress);

// Get performance analytics
router.get('/sessions/:sessionId/analytics', controller.getPerformanceAnalytics);

// Update adaptive configuration
router.put('/sessions/:sessionId/adaptive-config', controller.updateAdaptiveConfig);

// Save AI model
router.post('/sessions/:sessionId/save-model', controller.saveModel);

// Load AI model
router.post('/sessions/:sessionId/load-model', controller.loadModel);

// Export training data
router.get('/sessions/:sessionId/export', controller.exportTrainingData);

/**
 * Context7 Pattern: Trading Analysis Routes
 */

// Generate trading signals (no session required)
router.post('/signals', errorMiddleware.handleAsyncError(controller.generateTradingSignals));

/**
 * Context7 Pattern: Documentation Routes
 */

// API documentation
router.get('/', (req, res) => {
  logger.info('📚 AI Trading API documentation accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  const documentation = {
    title: 'OSRS Market Tracker - AI Trading API',
    version: '1.0.0',
    description: 'AI-powered trading system for OSRS market analysis and automated trading decisions',
    baseUrl: '/api/ai-trading',
    endpoints: {
      sessions: {
        'POST /sessions': {
          description: 'Start a new AI trading session',
          body: {
            sessionName: 'string (optional)',
            networkConfig: 'object (optional)',
            adaptiveConfig: 'object (optional)'
          },
          response: 'Session details with ID'
        },
        'GET /sessions': {
          description: 'Get all active trading sessions',
          response: 'Array of active sessions'
        },
        'DELETE /sessions/:sessionId': {
          description: 'Stop an AI trading session',
          response: 'Session termination details'
        },
        'POST /sessions/:sessionId/pause': {
          description: 'Pause an AI trading session',
          response: 'Session pause confirmation'
        },
        'POST /sessions/:sessionId/resume': {
          description: 'Resume a paused AI trading session',
          response: 'Session resume confirmation'
        }
      },
      trading: {
        'POST /sessions/:sessionId/process-market-data': {
          description: 'Process market data for trading decisions',
          body: {
            items: 'array of market items with price data'
          },
          response: 'Generated trading actions'
        },
        'POST /signals': {
          description: 'Generate trading signals from market data',
          body: {
            items: 'array of market items with price data'
          },
          response: 'Trading signals and analysis'
        }
      },
      analytics: {
        'GET /sessions/:sessionId/progress': {
          description: 'Get training progress for a session',
          response: 'Training metrics and session details'
        },
        'GET /sessions/:sessionId/analytics': {
          description: 'Get performance analytics for a session',
          response: 'Comprehensive performance metrics'
        }
      },
      model: {
        'POST /sessions/:sessionId/save-model': {
          description: 'Save the trained AI model',
          response: 'Model data and metadata'
        },
        'POST /sessions/:sessionId/load-model': {
          description: 'Load a previously saved AI model',
          body: {
            modelData: 'string (serialized model)'
          },
          response: 'Load confirmation'
        },
        'GET /sessions/:sessionId/export': {
          description: 'Export training data and outcomes',
          response: 'Complete training dataset'
        }
      },
      configuration: {
        'PUT /sessions/:sessionId/adaptive-config': {
          description: 'Update adaptive learning configuration',
          body: {
            config: 'object with adaptive learning settings'
          },
          response: 'Updated configuration'
        },
        'GET /system-status': {
          description: 'Get overall system status',
          response: 'System health and active sessions'
        }
      }
    },
    examples: {
      startSession: {
        url: 'POST /api/ai-trading/sessions',
        body: {
          sessionName: 'My Trading Session',
          networkConfig: {
            inputSize: 8,
            hiddenLayers: [64, 32],
            outputSize: 3,
            learningRate: 0.001,
            epsilon: 1.0,
            epsilonMin: 0.01,
            epsilonDecay: 0.995
          },
          adaptiveConfig: {
            enableOnlineLearning: true,
            learningFrequency: 10,
            performanceThreshold: 0.6
          }
        }
      },
      processMarketData: {
        url: 'POST /api/ai-trading/sessions/{sessionId}/process-market-data',
        body: {
          items: [
            {
              id: 4151,
              name: 'Abyssal whip',
              priceData: {
                high: 2500000,
                low: 2400000,
                highTime: 1640995200,
                lowTime: 1640995200
              },
              members: true,
              tradeable: true,
              grandExchange: true
            }
          ]
        }
      },
      generateSignals: {
        url: 'POST /api/ai-trading/signals',
        body: {
          items: [
            {
              id: 4151,
              name: 'Abyssal whip',
              priceData: {
                high: 2500000,
                low: 2400000
              }
            }
          ]
        }
      }
    },
    features: [
      'Neural network-based trading decisions',
      'Real-time market data processing',
      'Adaptive learning and optimization',
      'Performance analytics and reporting',
      'Model persistence and loading',
      'Multiple concurrent trading sessions',
      'Technical analysis integration',
      'Risk assessment and management'
    ],
    notes: [
      'All prices are in OSRS gold pieces (GP)',
      'Session IDs are generated automatically',
      'Models are trained using Deep Q-Learning',
      'Trading signals use technical analysis',
      'Performance metrics include profit/loss, success rate, and risk metrics',
      'Sessions can be paused and resumed',
      'Training data can be exported for analysis'
    ]
  };

  res.json(documentation);
});

/**
 * Context7 Pattern: Error handling middleware
 */
router.use((error, req, res, next) => {
  logger.error('🚨 AI Trading route error', error, {
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    requestId: req.id
  });

  // Don't log the error again if it's already been handled
  if (res.headersSent) {
    return next(error);
  }

  // Default error response
  return ApiResponse.error(res, 'AI Trading operation failed');
});

module.exports = router;