/**
 * 🏭 Controller Factory - SOLID DIP Implementation
 * 
 * Eliminates direct dependency violations in controllers by implementing proper dependency injection
 * 
 * SOLID Principles Applied:
 * - SRP: Single responsibility for creating controllers with proper dependencies
 * - OCP: Open for extension with new controllers and services
 * - DIP: Controllers depend on abstractions (injected dependencies), not concrete implementations
 * 
 * DRY Principle:
 * - Eliminates duplicate service instantiation across controllers
 * - Centralizes dependency management
 * - Provides consistent dependency injection patterns
 */

// Service imports
const { MarketDataService } = require('../services/MarketDataService');
const { DataCollectionService } = require('../services/DataCollectionService');
const { OSRSDataScraperService } = require('../services/OSRSDataScraperService');
const { AITradingOrchestratorService } = require('../services/AITradingOrchestratorService');
const { TradingAnalysisService } = require('../services/TradingAnalysisService');
const { MonitoringService } = require('../services/MonitoringService');
const { ItemMappingService } = require('../services/ItemMappingService');
const { OSRSWikiService } = require('../services/OSRSWikiService');
const { AutoTrainingService } = require('../services/AutoTrainingService');
const { SmartItemSelectorService } = require('../services/SmartItemSelectorService');

// Controller imports
const { MarketDataController } = require('../controllers/MarketDataController');
const { DataCollectionController } = require('../controllers/DataCollectionController');
const { OSRSScraperController } = require('../controllers/OSRSScraperController');
const { AITradingController } = require('../controllers/AITradingController');
const { MonitoringController } = require('../controllers/MonitoringController');
const { ItemMappingController } = require('../controllers/ItemMappingController');
const { ExternalAPIController } = require('../controllers/ExternalAPIController');
const { AutoTrainingController } = require('../controllers/AutoTrainingController');

class ControllerFactory {
  constructor() {
    this.serviceInstances = new Map();
    this.controllerInstances = new Map();
    this.initializeServices();
  }

  /**
   * Initialize all services as singletons
   * SOLID: Single responsibility for service initialization
   */
  initializeServices() {
    // Create service instances with proper dependency injection
    this.serviceInstances.set('marketData', new MarketDataService());
    this.serviceInstances.set('dataCollection', new DataCollectionService());
    this.serviceInstances.set('osrsDataScraper', new OSRSDataScraperService());
    this.serviceInstances.set('tradingAnalysis', new TradingAnalysisService());
    this.serviceInstances.set('monitoring', new MonitoringService());
    this.serviceInstances.set('itemMapping', new ItemMappingService());
    this.serviceInstances.set('osrsWiki', new OSRSWikiService());
    this.serviceInstances.set('smartItemSelector', new SmartItemSelectorService());

    // AI Trading Orchestrator with dependencies
    this.serviceInstances.set('aiTradingOrchestrator', new AITradingOrchestratorService({
      marketDataService: this.serviceInstances.get('marketData'),
      tradingAnalysisService: this.serviceInstances.get('tradingAnalysis')
    }));

    // Auto Training with dependencies
    this.serviceInstances.set('autoTraining', new AutoTrainingService({
      aiTradingService: this.serviceInstances.get('aiTradingOrchestrator'),
      monitoringService: this.serviceInstances.get('monitoring')
    }));
  }

  /**
   * Create MarketDataController with injected dependencies
   * SOLID: DIP - Controller depends on abstractions
   */
  createMarketDataController() {
    if (!this.controllerInstances.has('marketData')) {
      this.controllerInstances.set('marketData', new MarketDataController({
        marketDataService: this.serviceInstances.get('marketData'),
        smartItemSelectorService: this.serviceInstances.get('smartItemSelector')
      }));
    }
    return this.controllerInstances.get('marketData');
  }

  /**
   * Create DataCollectionController with injected dependencies
   */
  createDataCollectionController() {
    if (!this.controllerInstances.has('dataCollection')) {
      this.controllerInstances.set('dataCollection', new DataCollectionController({
        dataCollectionService: this.serviceInstances.get('dataCollection')
      }));
    }
    return this.controllerInstances.get('dataCollection');
  }

  /**
   * Create OSRSScraperController with injected dependencies
   */
  createOSRSScraperController() {
    if (!this.controllerInstances.has('osrsScraper')) {
      this.controllerInstances.set('osrsScraper', new OSRSScraperController({
        scraperService: this.serviceInstances.get('osrsDataScraper')
      }));
    }
    return this.controllerInstances.get('osrsScraper');
  }

  /**
   * Create AITradingController with injected dependencies
   */
  createAITradingController() {
    if (!this.controllerInstances.has('aiTrading')) {
      this.controllerInstances.set('aiTrading', new AITradingController({
        aiTradingService: this.serviceInstances.get('aiTradingOrchestrator'),
        tradingAnalysisService: this.serviceInstances.get('tradingAnalysis')
      }));
    }
    return this.controllerInstances.get('aiTrading');
  }

  /**
   * Create MonitoringController with injected dependencies
   */
  createMonitoringController() {
    if (!this.controllerInstances.has('monitoring')) {
      this.controllerInstances.set('monitoring', new MonitoringController({
        monitoringService: this.serviceInstances.get('monitoring')
      }));
    }
    return this.controllerInstances.get('monitoring');
  }

  /**
   * Create ItemMappingController with injected dependencies
   */
  createItemMappingController() {
    if (!this.controllerInstances.has('itemMapping')) {
      this.controllerInstances.set('itemMapping', new ItemMappingController({
        itemMappingService: this.serviceInstances.get('itemMapping')
      }));
    }
    return this.controllerInstances.get('itemMapping');
  }

  /**
   * Create ExternalAPIController with injected dependencies
   */
  createExternalAPIController() {
    if (!this.controllerInstances.has('externalAPI')) {
      this.controllerInstances.set('externalAPI', new ExternalAPIController({
        osrsWikiService: this.serviceInstances.get('osrsWiki')
      }));
    }
    return this.controllerInstances.get('externalAPI');
  }

  /**
   * Create AutoTrainingController with injected dependencies
   */
  createAutoTrainingController() {
    if (!this.controllerInstances.has('autoTraining')) {
      this.controllerInstances.set('autoTraining', new AutoTrainingController({
        autoTrainingService: this.serviceInstances.get('autoTraining')
      }));
    }
    return this.controllerInstances.get('autoTraining');
  }

  /**
   * Get service instance by name
   * Useful for dynamic service access
   */
  getService(serviceName) {
    return this.serviceInstances.get(serviceName);
  }

  /**
   * Get all available services
   */
  getAllServices() {
    return Object.fromEntries(this.serviceInstances.entries());
  }

  /**
   * Get all available controllers
   */
  getAllControllers() {
    return {
      marketData: this.createMarketDataController(),
      dataCollection: this.createDataCollectionController(),
      osrsScraper: this.createOSRSScraperController(),
      aiTrading: this.createAITradingController(),
      monitoring: this.createMonitoringController(),
      itemMapping: this.createItemMappingController(),
      externalAPI: this.createExternalAPIController(),
      autoTraining: this.createAutoTrainingController()
    };
  }

  /**
   * Health check for all services
   */
  async healthCheckServices() {
    const healthChecks = {};
    
    for (const [serviceName, service] of this.serviceInstances.entries()) {
      try {
        if (typeof service.healthCheck === 'function') {
          healthChecks[serviceName] = await service.healthCheck();
        } else {
          healthChecks[serviceName] = { status: 'healthy', message: 'No health check available' };
        }
      } catch (error) {
        healthChecks[serviceName] = { 
          status: 'unhealthy', 
          error: error.message 
        };
      }
    }
    
    return healthChecks;
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown() {
    for (const [serviceName, service] of this.serviceInstances.entries()) {
      try {
        if (typeof service.shutdown === 'function') {
          await service.shutdown();
          console.log(`✅ ${serviceName} service shutdown completed`);
        }
      } catch (error) {
        console.error(`❌ Error shutting down ${serviceName} service:`, error.message);
      }
    }
  }
}

// Create singleton instance
let controllerFactory = null;

/**
 * Get singleton controller factory instance
 */
function getControllerFactory() {
  if (!controllerFactory) {
    controllerFactory = new ControllerFactory();
  }
  return controllerFactory;
}

module.exports = {
  ControllerFactory,
  getControllerFactory
};