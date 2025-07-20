/**
 * 🔄 Auto Training Validator - Context7 Optimized
 *
 * Context7 Pattern: Validation Layer for Auto Training Operations
 * - Comprehensive input validation for auto training configurations
 * - Validates neural network, adaptive learning, and training parameters
 * - DRY principles with reusable validation functions
 * - SOLID architecture with single responsibility
 */

const { Logger } = require('../utils/Logger');

class AutoTrainingValidator {
  constructor() {
    this.logger = new Logger('AutoTrainingValidator');
  }

  /**
   * Context7 Pattern: Validate auto training configuration
   */
  static validateConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
      return {
        isValid: false,
        errors: ['Configuration must be a valid object']
      };
    }

    // Validate data collection config
    if (config.dataCollection) {
      const dataCollectionErrors = this.validateDataCollectionConfig(config.dataCollection);
      errors.push(...dataCollectionErrors);
    }

    // Validate neural network config
    if (config.neuralNetwork) {
      const neuralNetworkErrors = this.validateNeuralNetworkConfig(config.neuralNetwork);
      errors.push(...neuralNetworkErrors);
    }

    // Validate adaptive learning config
    if (config.adaptiveLearning) {
      const adaptiveLearningErrors = this.validateAdaptiveLearningConfig(config.adaptiveLearning);
      errors.push(...adaptiveLearningErrors);
    }

    // Validate training config
    if (config.training) {
      const trainingErrors = this.validateTrainingConfig(config.training);
      errors.push(...trainingErrors);
    }

    // Validate item selection config
    if (config.itemSelection) {
      const itemSelectionErrors = this.validateItemSelectionConfig(config.itemSelection);
      errors.push(...itemSelectionErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate data collection configuration
   */
  static validateDataCollectionConfig(config) {
    const errors = [];

    if (typeof config !== 'object') {
      errors.push('Data collection config must be an object');
      return errors;
    }

    // Validate enableAutoCollection
    if (config.enableAutoCollection !== undefined && typeof config.enableAutoCollection !== 'boolean') {
      errors.push('enableAutoCollection must be a boolean');
    }

    // Validate collectionInterval
    if (config.collectionInterval !== undefined) {
      if (typeof config.collectionInterval !== 'number' || config.collectionInterval <= 0) {
        errors.push('collectionInterval must be a positive number');
      } else if (config.collectionInterval < 60000) {
        errors.push('collectionInterval must be at least 60000ms (1 minute)');
      }
    }

    // Validate maxItemsPerCollection
    if (config.maxItemsPerCollection !== undefined) {
      if (typeof config.maxItemsPerCollection !== 'number' || config.maxItemsPerCollection <= 0) {
        errors.push('maxItemsPerCollection must be a positive number');
      } else if (config.maxItemsPerCollection > 10000) {
        errors.push('maxItemsPerCollection must not exceed 10000');
      }
    }

    // Validate enableHistoricalData
    if (config.enableHistoricalData !== undefined && typeof config.enableHistoricalData !== 'boolean') {
      errors.push('enableHistoricalData must be a boolean');
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate neural network configuration
   */
  static validateNeuralNetworkConfig(config) {
    const errors = [];

    if (typeof config !== 'object') {
      errors.push('Neural network config must be an object');
      return errors;
    }

    // Validate inputSize
    if (config.inputSize !== undefined) {
      if (typeof config.inputSize !== 'number' || config.inputSize <= 0) {
        errors.push('inputSize must be a positive number');
      } else if (config.inputSize > 1000) {
        errors.push('inputSize must not exceed 1000');
      }
    }

    // Validate hiddenLayers
    if (config.hiddenLayers !== undefined) {
      if (!Array.isArray(config.hiddenLayers)) {
        errors.push('hiddenLayers must be an array of positive numbers');
      } else {
        for (let i = 0; i < config.hiddenLayers.length; i++) {
          if (typeof config.hiddenLayers[i] !== 'number' || config.hiddenLayers[i] <= 0) {
            errors.push(`hiddenLayers[${i}] must be a positive number`);
          } else if (config.hiddenLayers[i] > 1000) {
            errors.push(`hiddenLayers[${i}] must not exceed 1000`);
          }
        }
        if (config.hiddenLayers.length === 0) {
          errors.push('hiddenLayers must contain at least one layer');
        } else if (config.hiddenLayers.length > 10) {
          errors.push('hiddenLayers must not exceed 10 layers');
        }
      }
    }

    // Validate outputSize
    if (config.outputSize !== undefined) {
      if (typeof config.outputSize !== 'number' || config.outputSize <= 0) {
        errors.push('outputSize must be a positive number');
      } else if (config.outputSize > 100) {
        errors.push('outputSize must not exceed 100');
      }
    }

    // Validate learningRate
    if (config.learningRate !== undefined) {
      if (typeof config.learningRate !== 'number' || config.learningRate <= 0) {
        errors.push('learningRate must be a positive number');
      } else if (config.learningRate > 1) {
        errors.push('learningRate must not exceed 1.0');
      }
    }

    // Validate batchSize
    if (config.batchSize !== undefined) {
      if (typeof config.batchSize !== 'number' || config.batchSize <= 0) {
        errors.push('batchSize must be a positive number');
      } else if (config.batchSize > 1000) {
        errors.push('batchSize must not exceed 1000');
      }
    }

    // Validate epochs
    if (config.epochs !== undefined) {
      if (typeof config.epochs !== 'number' || config.epochs <= 0) {
        errors.push('epochs must be a positive number');
      } else if (config.epochs > 10000) {
        errors.push('epochs must not exceed 10000');
      }
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate adaptive learning configuration
   */
  static validateAdaptiveLearningConfig(config) {
    const errors = [];

    if (typeof config !== 'object') {
      errors.push('Adaptive learning config must be an object');
      return errors;
    }

    // Validate enableAdaptation
    if (config.enableAdaptation !== undefined && typeof config.enableAdaptation !== 'boolean') {
      errors.push('enableAdaptation must be a boolean');
    }

    // Validate adaptationInterval
    if (config.adaptationInterval !== undefined) {
      if (typeof config.adaptationInterval !== 'number' || config.adaptationInterval <= 0) {
        errors.push('adaptationInterval must be a positive number');
      } else if (config.adaptationInterval < 300000) {
        errors.push('adaptationInterval must be at least 300000ms (5 minutes)');
      }
    }

    // Validate performanceThreshold
    if (config.performanceThreshold !== undefined) {
      if (typeof config.performanceThreshold !== 'number' || config.performanceThreshold < 0 || config.performanceThreshold > 1) {
        errors.push('performanceThreshold must be a number between 0 and 1');
      }
    }

    // Validate explorationDecay
    if (config.explorationDecay !== undefined) {
      if (typeof config.explorationDecay !== 'number' || config.explorationDecay < 0 || config.explorationDecay > 1) {
        errors.push('explorationDecay must be a number between 0 and 1');
      }
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate training configuration
   */
  static validateTrainingConfig(config) {
    const errors = [];

    if (typeof config !== 'object') {
      errors.push('Training config must be an object');
      return errors;
    }

    // Validate enableAutoTraining
    if (config.enableAutoTraining !== undefined && typeof config.enableAutoTraining !== 'boolean') {
      errors.push('enableAutoTraining must be a boolean');
    }

    // Validate trainingInterval
    if (config.trainingInterval !== undefined) {
      if (typeof config.trainingInterval !== 'number' || config.trainingInterval <= 0) {
        errors.push('trainingInterval must be a positive number');
      } else if (config.trainingInterval < 60000) {
        errors.push('trainingInterval must be at least 60000ms (1 minute)');
      }
    }

    // Validate minDataPoints
    if (config.minDataPoints !== undefined) {
      if (typeof config.minDataPoints !== 'number' || config.minDataPoints <= 0) {
        errors.push('minDataPoints must be a positive number');
      } else if (config.minDataPoints > 10000) {
        errors.push('minDataPoints must not exceed 10000');
      }
    }

    // Validate batchProcessingSize
    if (config.batchProcessingSize !== undefined) {
      if (typeof config.batchProcessingSize !== 'number' || config.batchProcessingSize <= 0) {
        errors.push('batchProcessingSize must be a positive number');
      } else if (config.batchProcessingSize > 1000) {
        errors.push('batchProcessingSize must not exceed 1000');
      }
    }

    // Validate continuousLearning
    if (config.continuousLearning !== undefined && typeof config.continuousLearning !== 'boolean') {
      errors.push('continuousLearning must be a boolean');
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate item selection configuration
   */
  static validateItemSelectionConfig(config) {
    const errors = [];

    if (typeof config !== 'object') {
      errors.push('Item selection config must be an object');
      return errors;
    }

    // Validate enableSmartFiltering
    if (config.enableSmartFiltering !== undefined && typeof config.enableSmartFiltering !== 'boolean') {
      errors.push('enableSmartFiltering must be a boolean');
    }

    // Validate volumeThreshold
    if (config.volumeThreshold !== undefined) {
      if (typeof config.volumeThreshold !== 'number' || config.volumeThreshold < 0) {
        errors.push('volumeThreshold must be a non-negative number');
      }
    }

    // Validate priceRangeMin
    if (config.priceRangeMin !== undefined) {
      if (typeof config.priceRangeMin !== 'number' || config.priceRangeMin < 0) {
        errors.push('priceRangeMin must be a non-negative number');
      }
    }

    // Validate priceRangeMax
    if (config.priceRangeMax !== undefined) {
      if (typeof config.priceRangeMax !== 'number' || config.priceRangeMax < 0) {
        errors.push('priceRangeMax must be a non-negative number');
      }
    }

    // Validate price range consistency
    if (config.priceRangeMin !== undefined && config.priceRangeMax !== undefined) {
      if (config.priceRangeMin >= config.priceRangeMax) {
        errors.push('priceRangeMin must be less than priceRangeMax');
      }
    }

    // Validate spreadThreshold
    if (config.spreadThreshold !== undefined) {
      if (typeof config.spreadThreshold !== 'number' || config.spreadThreshold < 0) {
        errors.push('spreadThreshold must be a non-negative number');
      } else if (config.spreadThreshold > 100) {
        errors.push('spreadThreshold must not exceed 100%');
      }
    }

    // Validate maxItemsToTrade
    if (config.maxItemsToTrade !== undefined) {
      if (typeof config.maxItemsToTrade !== 'number' || config.maxItemsToTrade <= 0) {
        errors.push('maxItemsToTrade must be a positive number');
      } else if (config.maxItemsToTrade > 1000) {
        errors.push('maxItemsToTrade must not exceed 1000');
      }
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate model data
   */
  static validateModelData(modelData) {
    const errors = [];

    if (!modelData) {
      errors.push('Model data is required');
      return { isValid: false, errors };
    }

    if (typeof modelData !== 'string') {
      errors.push('Model data must be a string');
      return { isValid: false, errors };
    }

    if (modelData.length === 0) {
      errors.push('Model data cannot be empty');
      return { isValid: false, errors };
    }

    // Try to parse as JSON to validate format
    try {
      JSON.parse(modelData);
    } catch {
      errors.push('Model data must be valid JSON');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate item ID
   */
  static validateItemId(itemId) {
    const errors = [];

    if (itemId === undefined || itemId === null) {
      errors.push('Item ID is required');
      return { isValid: false, errors };
    }

    const numericItemId = parseInt(itemId);
    if (isNaN(numericItemId) || numericItemId <= 0) {
      errors.push('Item ID must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate time range
   */
  static validateTimeRange(timeRange) {
    const errors = [];

    if (timeRange === undefined || timeRange === null) {
      return { isValid: true, errors }; // Optional parameter
    }

    const numericTimeRange = parseInt(timeRange);
    if (isNaN(numericTimeRange) || numericTimeRange <= 0) {
      errors.push('Time range must be a positive number');
    } else if (numericTimeRange > 31536000000) { // 1 year in ms
      errors.push('Time range must not exceed 1 year');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate user ID
   */
  static validateUserId(userId) {
    const errors = [];

    if (!userId) {
      errors.push('User ID is required');
      return { isValid: false, errors };
    }

    if (typeof userId !== 'string') {
      errors.push('User ID must be a string');
    } else if (userId.length < 1 || userId.length > 100) {
      errors.push('User ID must be between 1 and 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Sanitize configuration values
   */
  static sanitizeConfig(config) {
    const sanitized = { ...config };

    // Sanitize data collection config
    if (sanitized.dataCollection) {
      if (sanitized.dataCollection.collectionInterval) {
        sanitized.dataCollection.collectionInterval = Math.max(60000, sanitized.dataCollection.collectionInterval);
      }
      if (sanitized.dataCollection.maxItemsPerCollection) {
        sanitized.dataCollection.maxItemsPerCollection = Math.min(10000, Math.max(1, sanitized.dataCollection.maxItemsPerCollection));
      }
    }

    // Sanitize neural network config
    if (sanitized.neuralNetwork) {
      if (sanitized.neuralNetwork.learningRate) {
        sanitized.neuralNetwork.learningRate = Math.min(1, Math.max(0.0001, sanitized.neuralNetwork.learningRate));
      }
      if (sanitized.neuralNetwork.batchSize) {
        sanitized.neuralNetwork.batchSize = Math.min(1000, Math.max(1, sanitized.neuralNetwork.batchSize));
      }
    }

    // Sanitize training config
    if (sanitized.training) {
      if (sanitized.training.trainingInterval) {
        sanitized.training.trainingInterval = Math.max(60000, sanitized.training.trainingInterval);
      }
      if (sanitized.training.batchProcessingSize) {
        sanitized.training.batchProcessingSize = Math.min(1000, Math.max(1, sanitized.training.batchProcessingSize));
      }
    }

    // Sanitize item selection config
    if (sanitized.itemSelection) {
      if (sanitized.itemSelection.maxItemsToTrade) {
        sanitized.itemSelection.maxItemsToTrade = Math.min(1000, Math.max(1, sanitized.itemSelection.maxItemsToTrade));
      }
      if (sanitized.itemSelection.spreadThreshold) {
        sanitized.itemSelection.spreadThreshold = Math.min(100, Math.max(0, sanitized.itemSelection.spreadThreshold));
      }
    }

    return sanitized;
  }
}

module.exports = { AutoTrainingValidator };
