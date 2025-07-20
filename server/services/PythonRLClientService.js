/**
 * 🐍 Python RL Client Service - Context7 Optimized
 *
 * Context7 Pattern: HTTP Client for Python Reinforcement Learning Microservice
 * - Thin client layer for Python AI microservice communication
 * - Implements robust error handling and retry mechanisms
 * - Supports prediction, training, and model management endpoints
 * - Circuit breaker pattern for resilience
 * - SOLID architecture with single responsibility for HTTP communication
 *
 * REFACTORED: Replaces local neural network with Python microservice calls
 * This service acts as a proxy to the Python RL microservice
 */

const axios = require('axios');
const { BaseService } = require('./BaseService');

class PythonRLClientService extends BaseService {
  constructor(config) {
    super('PythonRLClientService', {
      enableCache: true,
      cachePrefix: 'python_rl_client',
      cacheTTL: 30, // 30 seconds for RL responses
      enableMongoDB: false, // No MongoDB needed for HTTP client
      retryAttempts: config?.retryAttempts || 3,
      retryDelay: config?.retryDelay || 1000
    });
    
    this.config = {
      baseUrl: config?.baseUrl || process.env.PYTHON_RL_SERVICE_URL || 'http://localhost:8000',
      timeout: config?.timeout || 30000, // 30 seconds
      circuitBreakerThreshold: config?.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config?.circuitBreakerTimeout || 60000, // 1 minute
      ...config
    };

    // Circuit breaker state
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0
    };

    // Create axios instance with default configuration
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OSRS-Market-Backend/1.0',
        'Authorization': 'Bearer development-bypass-token'
      }
    });

    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('Sending request to Python RL service', {
          method: config.method?.toUpperCase(),
          url: config.url,
          dataSize: config.data ? JSON.stringify(config.data).length : 0
        });
        return config;
      },
      (error) => {
        // Error handling moved to centralized manager - context: Request interceptor error
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('Received response from Python RL service', {
          status: response.status,
          url: response.config.url,
          responseSize: response.data ? JSON.stringify(response.data).length : 0
        });
        this.onSuccess();
        return response;
      },
      (error) => {
        // Error handling moved to centralized manager - context: Response interceptor error
        this.onFailure();
        return Promise.reject(error);
      }
    );

    this.logger.info('🐍 Python RL Client Service initialized', {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      retryAttempts: this.config.retryAttempts
    });
  }

  /**
   * Context7 Pattern: Predict trading action using Python RL service
   *
   * @param {Array} features - Market features for prediction
   * @returns {Promise<Object>} Prediction result with action and confidence
   */
  async predict() {
    return this.execute(async () => {
this.logger.debug('Requesting prediction from Python RL service', {
        featureCount: features.length,
        features: features.slice(0, 5) // Log first 5 features for debugging
      });

      const response = await this.makeRequest('POST', '/api/v1/predictions/predict', {
        observation: features,
        item_id: null,
        feature_engineering: true,
        timestamp: Date.now()
      });

      const prediction = response.data;

      this.logger.info('Successfully received prediction from Python RL service', {
        success: prediction.success,
        action: prediction.action,
        action_name: prediction.action_name,
        confidence: prediction.confidence,
        model_id: prediction.model_id,
        prediction_time_ms: prediction.prediction_time_ms
      });

      return {
        action: prediction.action,
        action_name: prediction.action_name,
        confidence: prediction.confidence,
        expectedReturn: prediction.expected_return || 0,
        qValues: prediction.q_values || [],
        modelVersion: prediction.model_id,
        processingTime: prediction.prediction_time_ms,
        processed_features: prediction.processed_features,
        timestamp: prediction.timestamp || Date.now()
      };
    }, 'predict', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Train model using Python RL service
   *
   * @param {Array} trainingData - Training experiences
   * @returns {Promise<Object>} Training result with metrics
   */
  async train() {
    return this.execute(async () => {
this.logger.debug('Sending training data to Python RL service', {
        experienceCount: trainingData.length,
        dataSize: JSON.stringify(trainingData).length
      });

      const response = await this.makeRequest('POST', '/api/v1/training/train', {
        data: trainingData,
        timestamp: Date.now()
      });

      const trainingResult = response.data;

      this.logger.info('Successfully completed training with Python RL service', {
        success: trainingResult.success,
        episodes_trained: trainingResult.episodes_trained,
        average_loss: trainingResult.average_loss,
        average_reward: trainingResult.average_reward,
        training_time_ms: trainingResult.training_time_ms,
        model_id: trainingResult.model_id
      });

      return {
        success: trainingResult.success,
        episodesTrained: trainingResult.episodes_trained,
        averageLoss: trainingResult.average_loss,
        averageReward: trainingResult.average_reward,
        trainingTime: trainingResult.training_time_ms,
        modelVersion: trainingResult.model_id,
        metrics: trainingResult.metrics || {},
        timestamp: trainingResult.timestamp || Date.now()
      };
    }, 'train', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Save model using Python RL service
   *
   * @param {string} modelId - Unique identifier for the model
   * @returns {Promise<Object>} Save result with model metadata
   */
  async saveModel() {
    return this.execute(async () => {
this.logger.debug('Requesting model save from Python RL service', {
        modelId
      });

      const response = await this.makeRequest('POST', '/api/v1/models/save', {
        modelId: modelId,
        timestamp: Date.now()
      });

      const saveResult = response.data;

      this.logger.info('Successfully saved model with Python RL service', {
        success: saveResult.success,
        model_id: saveResult.model_id,
        file_path: saveResult.file_path,
        file_size_bytes: saveResult.file_size_bytes,
        version: saveResult.version
      });

      return {
        success: saveResult.success,
        modelId: saveResult.model_id,
        modelPath: saveResult.file_path,
        modelSize: saveResult.file_size_bytes,
        version: saveResult.version,
        savedAt: saveResult.saved_at || Date.now()
      };
    }, 'saveModel', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Load model using Python RL service
   *
   * @param {string} modelId - Unique identifier for the model
   * @returns {Promise<Object>} Load result with model metadata
   */
  async loadModel() {
    return this.execute(async () => {
this.logger.debug('Requesting model load from Python RL service', {
        modelId
      });

      const response = await this.makeRequest('POST', '/api/v1/models/load', {
        modelId: modelId,
        timestamp: Date.now()
      });

      const loadResult = response.data;

      this.logger.info('Successfully loaded model with Python RL service', {
        success: loadResult.success,
        model_id: loadResult.model_id,
        file_path: loadResult.file_path,
        version: loadResult.version,
        loaded_at: loadResult.loaded_at
      });

      return {
        success: loadResult.success,
        modelId: loadResult.model_id,
        modelPath: loadResult.file_path,
        version: loadResult.version,
        modelInfo: loadResult.model_info || {},
        loadedAt: loadResult.loaded_at || Date.now()
      };
    }, 'loadModel', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Get training status from Python RL service
   *
   * @returns {Promise<Object>} Training status and metrics
   */
  async getTrainingStatus() {
    return this.execute(async () => {
this.logger.debug('Requesting training status from Python RL service');

      const response = await this.makeRequest('GET', '/api/v1/training/training/stats');
      const status = response.data;

      this.logger.debug('Successfully received training status from Python RL service', {
        isTraining: status.isTraining,
        currentEpisode: status.currentEpisode,
        totalEpisodes: status.totalEpisodes,
        modelVersion: status.modelVersion
      });

      return {
        isTraining: status.isTraining,
        currentEpisode: status.currentEpisode,
        totalEpisodes: status.totalEpisodes,
        progress: status.progress,
        currentLoss: status.currentLoss,
        averageReward: status.averageReward,
        epsilon: status.epsilon,
        modelVersion: status.modelVersion,
        uptime: status.uptime,
        lastTrainingTime: status.lastTrainingTime,
        timestamp: status.timestamp || Date.now()
      };
    }, 'getTrainingStatus', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Get model performance metrics
   *
   * @param {string} modelId - Optional model ID to get specific metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getModelMetrics() {
    return this.execute(async () => {
this.logger.debug('Requesting model metrics from Python RL service', {
        modelId
      });

      const endpoint = modelId ? `/api/v1/predictions/predictions/metrics/${modelId}` : '/api/v1/models/models/stats';
      const response = await this.makeRequest('GET', endpoint);
      const metrics = response.data;

      this.logger.debug('Successfully received model metrics from Python RL service', {
        modelId: metrics.modelId,
        totalTrades: metrics.totalTrades,
        profitability: metrics.profitability,
        winRate: metrics.winRate
      });

      return {
        modelId: metrics.modelId,
        totalTrades: metrics.totalTrades,
        profitability: metrics.profitability,
        winRate: metrics.winRate,
        averageProfit: metrics.averageProfit,
        totalProfit: metrics.totalProfit,
        maxDrawdown: metrics.maxDrawdown,
        sharpeRatio: metrics.sharpeRatio,
        recentPerformance: metrics.recentPerformance || [],
        timestamp: metrics.timestamp || Date.now()
      };
    }, 'getModelMetrics', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Check service health
   *
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return this.execute(async () => {
this.logger.debug('Performing health check on Python RL service');

      const response = await this.makeRequest('GET', '/health/detailed');
      const health = response.data;

      this.logger.debug('Python RL service health check completed', {
        status: health.status,
        version: health.version,
        uptime: health.uptime
      });

      return {
        status: health.status,
        version: health.version,
        uptime: health.uptime,
        memoryUsage: health.memoryUsage,
        modelLoaded: health.modelLoaded,
        timestamp: health.timestamp || Date.now()
      };
    }, 'healthCheck', { logSuccess: true });
  }
  }

  /**
   * Context7 Pattern: Make HTTP request with retry logic and circuit breaker
   *
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} HTTP response
   */
  async makeRequest() {
    return this.execute(async () => {
const requestConfig = {
          method: method.toLowerCase(),
          url: endpoint
        };

        if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) {
          requestConfig.data = data;
        }

        const response = await this.httpClient.request(requestConfig);

        // Reset circuit breaker on success
        if (this.circuitBreaker.failureCount > 0) {
          this.circuitBreaker.failureCount = 0;
          this.circuitBreaker.successCount++;
          this.logger.info('Circuit breaker reset after successful request', {
            successCount: this.circuitBreaker.successCount
          });
        }

        return response;
    }, 'makeRequest', { logSuccess: true });
  }
  }
}

module.exports = { PythonRLClientService };
