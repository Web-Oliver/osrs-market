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
        if (!validator.isValidString(data.sessionName, 1, 100)) {
          errors.push('Session name must be between 1 and 100 characters');
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
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

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
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

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
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

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
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

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Context7 Pattern: Validate network configuration
   */
  validateNetworkConfig(config) {
    const errors = [];

    // Validate inputSize
    if (!this.isValidInteger(config.inputSize, 1, 100)) {
      errors.push('Network inputSize must be an integer between 1 and 100');
    }

    // Validate outputSize
    if (!this.isValidInteger(config.outputSize, 1, 10)) {
      errors.push('Network outputSize must be an integer between 1 and 10');
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
        if (!this.isValidInteger(layer, 1, 1000)) {
          errors.push(`Network hiddenLayer[${index}] must be an integer between 1 and 1000`);
        }
      });
    }

    // Validate learningRate
    if (!this.isValidFloat(config.learningRate, 0.0001, 1)) {
      errors.push('Network learningRate must be a float between 0.0001 and 1');
    }

    // Validate epsilon
    if (!this.isValidFloat(config.epsilon, 0, 1)) {
      errors.push('Network epsilon must be a float between 0 and 1');
    }

    // Validate epsilonMin
    if (!this.isValidFloat(config.epsilonMin, 0, 1)) {
      errors.push('Network epsilonMin must be a float between 0 and 1');
    }

    // Validate epsilonDecay
    if (!this.isValidFloat(config.epsilonDecay, 0.9, 0.9999)) {
      errors.push('Network epsilonDecay must be a float between 0.9 and 0.9999');
    }

    // Validate gamma
    if (!this.isValidFloat(config.gamma, 0, 1)) {
      errors.push('Network gamma must be a float between 0 and 1');
    }

    // Validate memorySize
    if (!this.isValidInteger(config.memorySize, 100, 100000)) {
      errors.push('Network memorySize must be an integer between 100 and 100000');
    }

    // Validate batchSize
    if (!this.isValidInteger(config.batchSize, 1, 1000)) {
      errors.push('Network batchSize must be an integer between 1 and 1000');
    }

    // Validate tau
    if (!this.isValidFloat(config.tau, 0.0001, 0.1)) {
      errors.push('Network tau must be a float between 0.0001 and 0.1');
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
      if (!this.isValidInteger(config.learningFrequency, 1, 1000)) {
        errors.push('Adaptive learningFrequency must be an integer between 1 and 1000');
      }
    }

    // Validate performanceThreshold
    if (config.performanceThreshold !== undefined) {
      if (!this.isValidFloat(config.performanceThreshold, 0, 1)) {
        errors.push('Adaptive performanceThreshold must be a float between 0 and 1');
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
    if (!this.isValidInteger(item.id, 1, 999999)) {
      errors.push(`Item[${index}].id must be an integer between 1 and 999999`);
    }

    // Validate item name
    if (!this.isValidString(item.name, 1, 100)) {
      errors.push(`Item[${index}].name must be between 1 and 100 characters`);
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
      if (!this.isValidInteger(priceData.high, 1, 2147483647)) {
        errors.push(`Item[${itemIndex}].priceData.high must be an integer between 1 and 2147483647`);
      }
    }

    // Validate low price
    if (priceData.low !== undefined && priceData.low !== null) {
      if (!this.isValidInteger(priceData.low, 1, 2147483647)) {
        errors.push(`Item[${itemIndex}].priceData.low must be an integer between 1 and 2147483647`);
      }
    }

    // Validate price relationship
    if (priceData.high && priceData.low && priceData.high < priceData.low) {
      errors.push(`Item[${itemIndex}].priceData.high cannot be less than low price`);
    }

    // Validate timestamps
    if (priceData.highTime !== undefined && priceData.highTime !== null) {
      if (!this.isValidInteger(priceData.highTime, 0, Date.now() + 86400000)) {
        errors.push(`Item[${itemIndex}].priceData.highTime must be a valid timestamp`);
      }
    }

    if (priceData.lowTime !== undefined && priceData.lowTime !== null) {
      if (!this.isValidInteger(priceData.lowTime, 0, Date.now() + 86400000)) {
        errors.push(`Item[${itemIndex}].priceData.lowTime must be a valid timestamp`);
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
      if (!['BUY', 'SELL', 'HOLD'].includes(action.type)) {
        errors.push('Trading action type must be BUY, SELL, or HOLD');
      }

      // Validate item ID
      if (!validator.isValidInteger(action.itemId, 1, 999999)) {
        errors.push('Trading action itemId must be an integer between 1 and 999999');
      }

      // Validate quantity
      if (!validator.isValidInteger(action.quantity, 1, 1000000)) {
        errors.push('Trading action quantity must be an integer between 1 and 1000000');
      }

      // Validate price
      if (!validator.isValidInteger(action.price, 1, 2147483647)) {
        errors.push('Trading action price must be an integer between 1 and 2147483647');
      }

      // Validate confidence
      if (!validator.isValidFloat(action.confidence, 0, 1)) {
        errors.push('Trading action confidence must be a float between 0 and 1');
      }

      // Validate reason
      if (!validator.isValidString(action.reason, 1, 200)) {
        errors.push('Trading action reason must be between 1 and 200 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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