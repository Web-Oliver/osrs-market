/**
 * 🤖 AI Trading Validator - Context7 Optimized
 *
 * Context7 Pattern: Validator Layer for AI Trading Operations
 * - Validates AI trading session requests
 * - Ensures data integrity for neural network operations
 * - Provides comprehensive input validation
 * - DRY principles with reusable validation patterns
 * - SOLID architecture with single responsibility
 */

const { BaseValidator } = require('./BaseValidator');

class AITradingValidator extends BaseValidator {
  /**
   * Context7 Pattern: Validate start trading session request
   */
  static startTradingSession(data) {
    const validator = new AITradingValidator();
    const errors = [];

    try {
      // Validate network configuration if provided
      if (data.networkConfig) {
        const networkErrors = validator.validateNetworkConfig(data.networkConfig);
        errors.push(...networkErrors);
      }

      // Validate adaptive configuration if provided
      if (data.adaptiveConfig) {
        const adaptiveErrors = validator.validateAdaptiveConfig(data.adaptiveConfig);
        errors.push(...adaptiveErrors);
      }

      // Validate session name if provided
      if (data.sessionName !== undefined) {
        const sessionNameValidation = validator.validateStringLength(data.sessionName, 1, 100, 'sessionName', false);
        if (!sessionNameValidation.isValid) {
          errors.push(sessionNameValidation.error);
        }
      }

      if (errors.length > 0) {
        return this.formatErrorResponse(errors, 'AI_TRADING_VALIDATION_ERROR');
      }
      
      return this.formatSuccessResponse(null, 'AI trading session validation successful');
    } catch (error) {
      return this.formatErrorResponse(
        [`Validation error occurred: ${error.message}`], 
        'AI_TRADING_SYSTEM_ERROR'
      );
    }
  }

  /**
   * Context7 Pattern: Validate process market data request
   */
  static processMarketData(data) {
    const validator = new AITradingValidator();
    const errors = [];

    try {
      // Validate items array
      if (!Array.isArray(data.items)) {
        errors.push('Items must be an array');
      } else if (data.items.length === 0) {
        errors.push('Items array cannot be empty');
      } else if (data.items.length > 1000) {
        errors.push('Items array cannot exceed 1000 items');
      } else {
        // Validate each item
        data.items.forEach((item, index) => {
          const itemErrors = validator.validateMarketItem(item, index);
          errors.push(...itemErrors);
        });
      }

      if (errors.length > 0) {
        return this.formatErrorResponse(errors, 'AI_TRADING_VALIDATION_ERROR');
      }
      
      return this.formatSuccessResponse(null, 'AI trading session validation successful');
    } catch (error) {
      return this.formatErrorResponse(
        [`Validation error occurred: ${error.message}`], 
        'AI_TRADING_SYSTEM_ERROR'
      );
    }
  }

  /**
   * Context7 Pattern: Validate generate trading signals request
   */
  static generateTradingSignals(data) {
    const validator = new AITradingValidator();
    const errors = [];

    try {
      // Validate items array
      if (!Array.isArray(data.items)) {
        errors.push('Items must be an array');
      } else if (data.items.length === 0) {
        errors.push('Items array cannot be empty');
      } else if (data.items.length > 500) {
        errors.push('Items array cannot exceed 500 items for signal generation');
      } else {
        // Validate each item
        data.items.forEach((item, index) => {
          const itemErrors = validator.validateMarketItem(item, index);
          errors.push(...itemErrors);
        });
      }

      if (errors.length > 0) {
        return this.formatErrorResponse(errors, 'AI_TRADING_VALIDATION_ERROR');
      }
      
      return this.formatSuccessResponse(null, 'AI trading session validation successful');
    } catch (error) {
      return this.formatErrorResponse(
        [`Validation error occurred: ${error.message}`], 
        'AI_TRADING_SYSTEM_ERROR'
      );
    }
  }

  /**
   * Context7 Pattern: Validate update adaptive config request
   */
  static updateAdaptiveConfig(data) {
    const validator = new AITradingValidator();
    const errors = [];

    try {
      if (!data.config || typeof data.config !== 'object') {
        errors.push('Config object is required');
      } else {
        const configErrors = validator.validateAdaptiveConfig(data.config);
        errors.push(...configErrors);
      }

      if (errors.length > 0) {
        return this.formatErrorResponse(errors, 'AI_TRADING_VALIDATION_ERROR');
      }
      
      return this.formatSuccessResponse(null, 'AI trading session validation successful');
    } catch (error) {
      return this.formatErrorResponse(
        [`Validation error occurred: ${error.message}`], 
        'AI_TRADING_SYSTEM_ERROR'
      );
    }
  }

  /**
   * Context7 Pattern: Validate load model request
   */
  static loadModel(data) {
    const validator = new AITradingValidator();
    const errors = [];

    try {
      if (!data.modelData) {
        errors.push('Model data is required');
      } else if (typeof data.modelData !== 'string') {
        errors.push('Model data must be a string');
      } else if (data.modelData.length < 100) {
        errors.push('Model data appears to be too short');
      } else if (data.modelData.length > 10000000) { // 10MB limit
        errors.push('Model data is too large (max 10MB)');
      } else {
        // Try to parse JSON to ensure it's valid
        try {
          JSON.parse(data.modelData);
        } catch (parseError) {
          errors.push('Model data must be valid JSON');
        }
      }

      if (errors.length > 0) {
        return this.formatErrorResponse(errors, 'AI_TRADING_VALIDATION_ERROR');
      }
      
      return this.formatSuccessResponse(null, 'AI trading session validation successful');
    } catch (error) {
      return this.formatErrorResponse(
        [`Validation error occurred: ${error.message}`], 
        'AI_TRADING_SYSTEM_ERROR'
      );
    }
  }

  /**
   * Context7 Pattern: Validate network configuration
   */
  validateNetworkConfig(config) {
    const errors = [];

    // Validate inputSize
    const inputSizeValidation = this.validateInteger(config.inputSize, 1, 100, 'inputSize');
    if (!inputSizeValidation.isValid) {
      errors.push(`Network ${inputSizeValidation.error}`);
    }

    // Validate outputSize
    const outputSizeValidation = this.validateInteger(config.outputSize, 1, 10, 'outputSize');
    if (!outputSizeValidation.isValid) {
      errors.push(`Network ${outputSizeValidation.error}`);
    }

    // Validate hiddenLayers
    if (!Array.isArray(config.hiddenLayers)) {
      errors.push('Network hiddenLayers must be an array');
    } else if (config.hiddenLayers.length === 0) {
      errors.push('Network hiddenLayers cannot be empty');
    } else if (config.hiddenLayers.length > 10) {
      errors.push('Network hiddenLayers cannot exceed 10 layers');
    } else {
      config.hiddenLayers.forEach((layer, index) => {
        const layerValidation = this.validateInteger(layer, 1, 1000, `hiddenLayer[${index}]`);
        if (!layerValidation.isValid) {
          errors.push(`Network ${layerValidation.error}`);
        }
      });
    }

    // Validate learningRate
    const learningRateValidation = this.validateFloat(config.learningRate, 0.0001, 1, 'learningRate');
    if (!learningRateValidation.isValid) {
      errors.push(`Network ${learningRateValidation.error}`);
    }

    // Validate epsilon
    const epsilonValidation = this.validateFloat(config.epsilon, 0, 1, 'epsilon');
    if (!epsilonValidation.isValid) {
      errors.push(`Network ${epsilonValidation.error}`);
    }

    // Validate epsilonMin
    const epsilonMinValidation = this.validateFloat(config.epsilonMin, 0, 1, 'epsilonMin');
    if (!epsilonMinValidation.isValid) {
      errors.push(`Network ${epsilonMinValidation.error}`);
    }

    // Validate epsilonDecay
    const epsilonDecayValidation = this.validateFloat(config.epsilonDecay, 0.9, 0.9999, 'epsilonDecay');
    if (!epsilonDecayValidation.isValid) {
      errors.push(`Network ${epsilonDecayValidation.error}`);
    }

    // Validate gamma
    const gammaValidation = this.validateFloat(config.gamma, 0, 1, 'gamma');
    if (!gammaValidation.isValid) {
      errors.push(`Network ${gammaValidation.error}`);
    }

    // Validate memorySize
    const memorySizeValidation = this.validateInteger(config.memorySize, 100, 100000, 'memorySize');
    if (!memorySizeValidation.isValid) {
      errors.push(`Network ${memorySizeValidation.error}`);
    }

    // Validate batchSize
    const batchSizeValidation = this.validateInteger(config.batchSize, 1, 1000, 'batchSize');
    if (!batchSizeValidation.isValid) {
      errors.push(`Network ${batchSizeValidation.error}`);
    }

    // Validate tau
    const tauValidation = this.validateFloat(config.tau, 0.0001, 0.1, 'tau');
    if (!tauValidation.isValid) {
      errors.push(`Network ${tauValidation.error}`);
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate adaptive configuration
   */
  validateAdaptiveConfig(config) {
    const errors = [];

    // Validate enableOnlineLearning
    if (config.enableOnlineLearning !== undefined && typeof config.enableOnlineLearning !== 'boolean') {
      errors.push('Adaptive enableOnlineLearning must be a boolean');
    }

    // Validate learningFrequency
    if (config.learningFrequency !== undefined) {
      const learningFreqValidation = this.validateInteger(config.learningFrequency, 1, 1000, 'learningFrequency');
      if (!learningFreqValidation.isValid) {
        errors.push(`Adaptive ${learningFreqValidation.error}`);
      }
    }

    // Validate performanceThreshold
    if (config.performanceThreshold !== undefined) {
      const perfThresholdValidation = this.validateFloat(config.performanceThreshold, 0, 1, 'performanceThreshold');
      if (!perfThresholdValidation.isValid) {
        errors.push(`Adaptive ${perfThresholdValidation.error}`);
      }
    }

    // Validate explorationBoost
    if (config.explorationBoost !== undefined && typeof config.explorationBoost !== 'boolean') {
      errors.push('Adaptive explorationBoost must be a boolean');
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate market item
   */
  validateMarketItem(item, index) {
    const errors = [];

    // Validate item ID
    const itemIdValidation = this.validateItemId(item.id, `Item[${index}].id`);
    if (!itemIdValidation.isValid) {
      errors.push(itemIdValidation.error);
    }

    // Validate item name
    const itemNameValidation = this.validateStringLength(item.name, 1, 100, `Item[${index}].name`);
    if (!itemNameValidation.isValid) {
      errors.push(itemNameValidation.error);
    }

    // Validate price data
    if (!item.priceData || typeof item.priceData !== 'object') {
      errors.push(`Item[${index}].priceData is required and must be an object`);
    } else {
      const priceErrors = this.validatePriceData(item.priceData, index);
      errors.push(...priceErrors);
    }

    // Validate boolean fields
    if (item.members !== undefined && typeof item.members !== 'boolean') {
      errors.push(`Item[${index}].members must be a boolean`);
    }

    if (item.tradeable !== undefined && typeof item.tradeable !== 'boolean') {
      errors.push(`Item[${index}].tradeable must be a boolean`);
    }

    if (item.grandExchange !== undefined && typeof item.grandExchange !== 'boolean') {
      errors.push(`Item[${index}].grandExchange must be a boolean`);
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate price data
   */
  validatePriceData(priceData, itemIndex) {
    const errors = [];

    // Validate high price
    if (priceData.high !== undefined && priceData.high !== null) {
      const highPriceValidation = this.validateInteger(priceData.high, 1, 2147483647, `Item[${itemIndex}].priceData.high`);
      if (!highPriceValidation.isValid) {
        errors.push(highPriceValidation.error);
      }
    }

    // Validate low price
    if (priceData.low !== undefined && priceData.low !== null) {
      const lowPriceValidation = this.validateInteger(priceData.low, 1, 2147483647, `Item[${itemIndex}].priceData.low`);
      if (!lowPriceValidation.isValid) {
        errors.push(lowPriceValidation.error);
      }
    }

    // Validate price relationship
    if (priceData.high && priceData.low && priceData.high < priceData.low) {
      errors.push(`Item[${itemIndex}].priceData.high cannot be less than low price`);
    }

    // Validate timestamps with enhanced validation
    if (priceData.highTime !== undefined && priceData.highTime !== null) {
      const highTimeValidation = this.validateTimestampEnhanced(priceData.highTime, `Item[${itemIndex}].priceData.highTime`, true);
      if (!highTimeValidation.isValid) {
        errors.push(highTimeValidation.error);
      }
    }

    if (priceData.lowTime !== undefined && priceData.lowTime !== null) {
      const lowTimeValidation = this.validateTimestampEnhanced(priceData.lowTime, `Item[${itemIndex}].priceData.lowTime`, true);
      if (!lowTimeValidation.isValid) {
        errors.push(lowTimeValidation.error);
      }
    }

    return errors;
  }

  /**
   * Context7 Pattern: Validate session ID parameter
   */
  static validateSessionId(sessionId) {
    const validator = new AITradingValidator();
    const errors = [];

    if (!sessionId) {
      errors.push('Session ID is required');
    } else if (typeof sessionId !== 'string') {
      errors.push('Session ID must be a string');
    } else if (sessionId.length < 10 || sessionId.length > 100) {
      errors.push('Session ID must be between 10 and 100 characters');
    } else if (!/^session_\d+_[a-z0-9]+$/.test(sessionId)) {
      errors.push('Session ID format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate trading action
   */
  static validateTradingAction(action) {
    const validator = new AITradingValidator();
    const errors = [];

    if (!action || typeof action !== 'object') {
      errors.push('Trading action is required and must be an object');
    } else {
      // Validate action type
      const actionTypeValidation = validator.validateEnum(action.type, ['BUY', 'SELL', 'HOLD'], 'type');
      if (!actionTypeValidation.isValid) {
        errors.push(`Trading action ${actionTypeValidation.error}`);
      }

      // Validate item ID
      const itemIdValidation = validator.validateItemId(action.itemId, 'itemId');
      if (!itemIdValidation.isValid) {
        errors.push(`Trading action ${itemIdValidation.error}`);
      }

      // Validate quantity
      const quantityValidation = validator.validateInteger(action.quantity, 1, 1000000, 'quantity');
      if (!quantityValidation.isValid) {
        errors.push(`Trading action ${quantityValidation.error}`);
      }

      // Validate price
      const priceValidation = validator.validateInteger(action.price, 1, 2147483647, 'price');
      if (!priceValidation.isValid) {
        errors.push(`Trading action ${priceValidation.error}`);
      }

      // Validate confidence
      const confidenceValidation = validator.validateFloat(action.confidence, 0, 1, 'confidence');
      if (!confidenceValidation.isValid) {
        errors.push(`Trading action ${confidenceValidation.error}`);
      }

      // Validate reason
      const reasonValidation = validator.validateStringLength(action.reason, 1, 200, 'reason');
      if (!reasonValidation.isValid) {
        errors.push(`Trading action ${reasonValidation.error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Utility validation methods (DEPRECATED - Use BaseValidator methods)
   * These methods are kept for backward compatibility but should be migrated to BaseValidator
   */
  isValidInteger(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
    const validation = this.validateInteger(value, min, max, 'value');
    return validation.isValid;
  }

  isValidFloat(value, min = Number.MIN_VALUE, max = Number.MAX_VALUE) {
    const validation = this.validateFloat(value, min, max, 'value');
    return validation.isValid;
  }

  isValidString(value, minLength = 0, maxLength = Infinity) {
    const validation = this.validateStringLength(value, minLength, maxLength, 'value', false);
    return validation.isValid;
  }
}

// Export validation methods
const validateRequest = {
  startTradingSession: AITradingValidator.startTradingSession,
  processMarketData: AITradingValidator.processMarketData,
  generateTradingSignals: AITradingValidator.generateTradingSignals,
  updateAdaptiveConfig: AITradingValidator.updateAdaptiveConfig,
  loadModel: AITradingValidator.loadModel,
  validateSessionId: AITradingValidator.validateSessionId,
  validateTradingAction: AITradingValidator.validateTradingAction
};

module.exports = { AITradingValidator, validateRequest };
