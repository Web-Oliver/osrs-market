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
  async predict(features) {
    return this.execute(async () => {
      this.logger.debug('Requesting prediction from Python RL service', {
        featureCount: features.length,
        features: features.slice(0, 5) // Log first 5 features for debugging
      });

      const response = await this.makeRequest('POST', '/api/v1/predictions', {
        features: features,
        model_id: null,
        include_confidence: true,
        timestamp: Date.now()
      });

      const apiResponse = response.data;
      const prediction = apiResponse.data || apiResponse;

      this.logger.info('Successfully received prediction from Python RL service', {
        status: apiResponse.status,
        action: prediction.action,
        action_name: prediction.action_name,
        confidence: prediction.confidence,
        model_id: prediction.model_id,
        execution_time_ms: apiResponse.execution_time_ms
      });

      return {
        action: prediction.action,
        action_name: prediction.action_name,
        confidence: prediction.confidence,
        expectedReturn: prediction.expected_return || 0,
        qValues: prediction.q_values || [],
        modelVersion: prediction.model_id,
        processingTime: apiResponse.execution_time_ms || 0,
        processed_features: prediction.processed_features,
        timestamp: apiResponse.timestamp || Date.now()
      };
    }, 'predict', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Train model using Python RL service
   *
   * @param {Array} trainingData - Training experiences
   * @returns {Promise<Object>} Training result with metrics
   */
  async train(trainingData) {
    return this.execute(async () => {
      this.logger.debug('Sending training data to Python RL service', {
        experienceCount: trainingData.length,
        dataSize: JSON.stringify(trainingData).length
      });

      const response = await this.makeRequest('POST', '/api/v1/training/start', {
        training_data: trainingData,
        config: {
          algorithm: 'DQN',
          episodes: trainingData.length
        },
        timestamp: Date.now()
      });

      const apiResponse = response.data;
      const trainingResult = apiResponse.data || apiResponse;

      this.logger.info('Successfully completed training with Python RL service', {
        status: apiResponse.status,
        session_id: trainingResult.session_id,
        episodes_planned: trainingResult.episodes_planned,
        model_id: trainingResult.model_id,
        execution_time_ms: apiResponse.execution_time_ms
      });

      return {
        success: apiResponse.status === 'success',
        sessionId: trainingResult.session_id,
        episodesTrained: trainingResult.episodes_planned || 0,
        averageLoss: trainingResult.initial_loss || 0,
        averageReward: trainingResult.initial_reward || 0,
        trainingTime: apiResponse.execution_time_ms || 0,
        modelVersion: trainingResult.model_id,
        metrics: trainingResult.metrics || {},
        timestamp: apiResponse.timestamp || Date.now()
      };
    }, 'train', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Save model using Python RL service
   *
   * @param {string} modelId - Unique identifier for the model
   * @returns {Promise<Object>} Save result with model metadata
   */
  async saveModel(modelId) {
    return this.execute(async () => {
      this.logger.debug('Requesting model save from Python RL service', {
        modelId
      });

      const response = await this.makeRequest('POST', '/api/v1/models', {
        model_id: modelId,
        action: 'save',
        timestamp: Date.now()
      });

      const apiResponse = response.data;
      const saveResult = apiResponse.data || apiResponse;

      this.logger.info('Successfully saved model with Python RL service', {
        status: apiResponse.status,
        model_id: saveResult.model_id,
        file_path: saveResult.file_path,
        file_size_bytes: saveResult.file_size_bytes,
        version: saveResult.version
      });

      return {
        success: apiResponse.status === 'success',
        modelId: saveResult.model_id,
        modelPath: saveResult.file_path,
        modelSize: saveResult.file_size_bytes,
        version: saveResult.version,
        savedAt: apiResponse.timestamp || Date.now()
      };
    }, 'saveModel', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Load model using Python RL service
   *
   * @param {string} modelId - Unique identifier for the model
   * @returns {Promise<Object>} Load result with model metadata
   */
  async loadModel(modelId) {
    return this.execute(async () => {
      this.logger.debug('Requesting model load from Python RL service', {
        modelId
      });

      const response = await this.makeRequest('GET', `/api/v1/models/${modelId}`, null);
        modelId: modelId,
        timestamp: Date.now()
      });

      const apiResponse = response.data;
      const loadResult = apiResponse.data || apiResponse;

      this.logger.info('Successfully loaded model with Python RL service', {
        status: apiResponse.status,
        model_id: loadResult.model_id,
        algorithm: loadResult.algorithm,
        version: loadResult.version,
        status_field: loadResult.status
      });

      return {
        success: apiResponse.status === 'success',
        modelId: loadResult.model_id,
        modelPath: loadResult.file_path || '',
        version: loadResult.version,
        modelInfo: loadResult || {},
        loadedAt: apiResponse.timestamp || Date.now()
      };
    }, 'loadModel', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get training status from Python RL service
   *
   * @returns {Promise<Object>} Training status and metrics
   */
  async getTrainingStatus() {
    return this.execute(async () => {
      this.logger.debug('Requesting training status from Python RL service');

      const response = await this.makeRequest('GET', '/api/v1/training/current');
      const apiResponse = response.data;
      const status = apiResponse.data || apiResponse;

      this.logger.debug('Successfully received training status from Python RL service', {
        status: apiResponse.status,
        is_training: status.is_training,
        current_episode: status.current_episode,
        total_episodes: status.total_episodes,
        model_id: status.model_id
      });

      return {
        isTraining: status.is_training || false,
        currentEpisode: status.current_episode || 0,
        totalEpisodes: status.total_episodes || 0,
        progress: status.progress || 0,
        currentLoss: status.current_loss || 0,
        averageReward: status.average_reward || 0,
        epsilon: status.epsilon || 0,
        modelVersion: status.model_id,
        uptime: status.uptime || 0,
        lastTrainingTime: status.last_training_time,
        timestamp: apiResponse.timestamp || Date.now()
      };
    }, 'getTrainingStatus', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get model performance metrics
   *
   * @param {string} modelId - Optional model ID to get specific metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getModelMetrics(modelId) {
    return this.execute(async () => {
      this.logger.debug('Requesting model metrics from Python RL service', {
        modelId
      });

      const endpoint = modelId ? `/api/v1/models/${modelId}` : '/api/v1/models';
      const response = await this.makeRequest('GET', endpoint);
      const apiResponse = response.data;
      const metrics = apiResponse.data || apiResponse;

      this.logger.debug('Successfully received model metrics from Python RL service', {
        status: apiResponse.status,
        model_id: metrics.model_id,
        algorithm: metrics.algorithm,
        performance: metrics.performance_metrics
      });

      return {
        modelId: metrics.model_id,
        totalTrades: metrics.performance_metrics?.total_trades || 0,
        profitability: metrics.performance_metrics?.profitability || 0,
        winRate: metrics.performance_metrics?.win_rate || 0,
        averageProfit: metrics.performance_metrics?.average_profit || 0,
        totalProfit: metrics.performance_metrics?.total_profit || 0,
        maxDrawdown: metrics.performance_metrics?.max_drawdown || 0,
        sharpeRatio: metrics.performance_metrics?.sharpe_ratio || 0,
        recentPerformance: metrics.performance_metrics?.recent_performance || [],
        timestamp: apiResponse.timestamp || Date.now()
      };
    }, 'getModelMetrics', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Check service health
   *
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    return this.execute(async () => {
this.logger.debug('Performing health check on Python RL service');

      const response = await this.makeRequest('GET', '/api/v1/health');
      const apiResponse = response.data;
      const health = apiResponse.data || apiResponse;

      this.logger.debug('Python RL service health check completed', {
        status: apiResponse.status,
        version: apiResponse.version,
        uptime: health.uptime_seconds,
        components: health.components
      });

      return {
        status: apiResponse.status,
        version: apiResponse.version,
        uptime: health.uptime_seconds || 0,
        memoryUsage: health.resource_usage?.memory_mb || 0,
        modelLoaded: health.components?.rl_agent === 'healthy',
        timestamp: apiResponse.timestamp || Date.now()
      };
    }, 'healthCheck', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Make HTTP request with retry logic and circuit breaker
   *
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise<Object>} HTTP response
   */
  async makeRequest(method, endpoint, data = null) {
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

module.exports = { PythonRLClientService };
