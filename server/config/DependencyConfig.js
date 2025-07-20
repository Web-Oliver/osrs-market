/**
 * 🔧 Dependency Configuration - Context7 Pattern
 *
 * Implements Dependency Inversion Principle:
 * - Centralized dependency registration
 * - Abstracts concrete implementations from services
 * - Enables easy testing with mock implementations
 * - Supports different configurations for different environments
 *
 * SOLID Principles Applied:
 * - DIP: High-level modules depend on abstractions
 * - OCP: Open for extension with new dependencies
 * - SRP: Single responsibility for dependency configuration
 */

const { DependencyContainer } = require('../core/DependencyContainer');

// Import concrete implementations
const { FinancialCalculationService } = require('../services/consolidated/FinancialCalculationService');
const { MarketDataFetchService } = require('../services/consolidated/MarketDataFetchService');
const { MarketDataProcessingService } = require('../services/consolidated/MarketDataProcessingService');
const { DataTransformer } = require('../utils/DataTransformer');
const { Logger } = require('../utils/Logger');

/**
 * Configure all application dependencies
 * @param {DependencyContainer} container - The dependency container
 * @param {Object} config - Configuration options
 */
function configureDependencies(container, config = {}) {
  const logger = new Logger('DependencyConfig');
  logger.info('Configuring dependencies', { environment: config.environment || 'development' });

  // Register core utilities as singletons
  container.register('logger', () => new Logger('App'), { singleton: true });
  container.register('dataTransformer', () => new DataTransformer(), { singleton: true });

  // Register financial calculation service as singleton
  container.register('financialCalculator', (deps) => {
    return new FinancialCalculationService();
  }, { singleton: true });

  // Register market data fetch service
  container.register('marketDataFetcher', (deps) => {
    const fetchDependencies = {
      httpClient: config.httpClient, // Allow injection for testing
      userAgent: config.userAgent || 'OSRS-Market-Backend - Market Analysis Tool'
    };
    return new MarketDataFetchService(fetchDependencies);
  }, { singleton: true });

  // Register market data processing service
  container.register('marketDataProcessor', (deps) => {
    const processingDependencies = {
      financialCalculator: deps.resolve('financialCalculator'),
      dataTransformer: deps.resolve('dataTransformer')
    };
    return new MarketDataProcessingService(processingDependencies);
  }, { singleton: true });

  // Register legacy services for backward compatibility
  registerLegacyServices(container, config);

  // Register test doubles in test environment
  if (config.environment === 'test') {
    registerTestDependencies(container, config);
  }

  logger.info('Dependencies configured successfully', {
    registeredCount: container.getRegisteredNames().length,
    dependencies: container.getRegisteredNames()
  });
}

/**
 * Register legacy services for backward compatibility
 * @param {DependencyContainer} container - The dependency container
 * @param {Object} config - Configuration options
 */
function registerLegacyServices(container, config) {
  // Legacy PriceCalculator (now delegates to FinancialCalculationService)
  container.register('priceCalculator', (deps) => {
    const { PriceCalculator } = require('../utils/PriceCalculator');
    return new PriceCalculator();
  }, { singleton: true });

  // Legacy FinancialMetricsCalculator (now delegates to FinancialCalculationService)
  container.register('metricsCalculator', (deps) => {
    const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');
    return new FinancialMetricsCalculator();
  }, { singleton: true });
}

/**
 * Register test-specific dependencies
 * @param {DependencyContainer} container - The dependency container
 * @param {Object} config - Configuration options
 */
function registerTestDependencies(container, config) {
  // Mock HTTP client for testing
  if (config.mockHttpClient) {
    container.register('httpClient', () => config.mockHttpClient, { singleton: true });
  }

  // Mock financial calculator for testing
  if (config.mockFinancialCalculator) {
    container.register('financialCalculator', () => config.mockFinancialCalculator, { singleton: true });
  }

  // Override other services with mocks if provided
  Object.entries(config.mocks || {}).forEach(([name, mockFactory]) => {
    container.register(name, mockFactory, { singleton: true });
  });
}

/**
 * Create and configure a new dependency container
 * @param {Object} config - Configuration options
 * @returns {DependencyContainer} Configured container
 */
function createConfiguredContainer(config = {}) {
  const container = new DependencyContainer();
  configureDependencies(container, config);
  return container;
}

/**
 * Get default production configuration
 * @returns {Object} Production configuration
 */
function getProductionConfig() {
  return {
    environment: 'production',
    userAgent: 'OSRS-Market-Backend - Market Analysis Tool v1.0'
    // Additional production-specific config
  };
}

/**
 * Get test configuration with mocks
 * @param {Object} mocks - Mock implementations
 * @returns {Object} Test configuration
 */
function getTestConfig(mocks = {}) {
  return {
    environment: 'test',
    userAgent: 'OSRS-Market-Backend - Test Suite',
    mocks,
    // Mock HTTP client that returns fake data
    mockHttpClient: async(url, options) => {
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async() => ({
          data: {
            '4151': { high: 1000, low: 900, highTime: Date.now() }
          }
        })
      };
    }
  };
}

module.exports = {
  configureDependencies,
  createConfiguredContainer,
  getProductionConfig,
  getTestConfig,
  registerLegacyServices,
  registerTestDependencies
};
