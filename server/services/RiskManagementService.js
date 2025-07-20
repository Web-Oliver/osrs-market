/**
 * ⚠️ Risk Management Service - Context7 Optimized
 *
 * Context7 Pattern: Service Layer for Dynamic Risk Management
 * - Implements automated stop-loss mechanisms for individual positions
 * - Portfolio-level liquidity management system
 * - Evaluates opportunity costs and capital reallocation
 * - Monitors and manages overall portfolio risk
 * - SOLID architecture with single responsibility for risk management
 *
 * Risk Management Features:
 * - Stop-loss orders for individual trades
 * - Portfolio-level risk monitoring
 * - Dynamic position sizing based on risk
 * - Liquidity management and rebalancing
 * - Market condition risk adjustments
 */

const { BaseService } = require('./BaseService');
const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');
const { MarketDataService } = require('./MarketDataService');
const {
  calculateProfitAfterTax,
  calculateGETax
} = require('../utils/marketConstants');

class RiskManagementService extends BaseService {
  constructor(config = {}) {
    super('RiskManagementService', {
      enableCache: true,
      cachePrefix: 'risk_management',
      cacheTTL: 60, // 1 minute for risk calculations
      enableMongoDB: true // Store risk metrics
    });
    
    this.metricsCalculator = new FinancialMetricsCalculator();
    this.marketDataService = new MarketDataService();

    // Risk management configuration
    this.config = {
      // Stop-loss configuration
      defaultStopLossPercentage: config.defaultStopLossPercentage || 0.05, // 5% stop-loss
      trailingStopLossPercentage: config.trailingStopLossPercentage || 0.03, // 3% trailing stop
      maxStopLossPercentage: config.maxStopLossPercentage || 0.15, // 15% maximum stop-loss

      // Position risk limits
      maxPositionRisk: config.maxPositionRisk || 0.02, // 2% max risk per position
      maxPortfolioRisk: config.maxPortfolioRisk || 0.1, // 10% max total portfolio risk
      maxConcentrationRisk: config.maxConcentrationRisk || 0.15, // 15% max per single item

      // Liquidity management
      minLiquidityBuffer: config.minLiquidityBuffer || 0.1, // 10% minimum cash buffer
      liquidityThreshold: config.liquidityThreshold || 0.05, // 5% liquidity threshold
      maxHoldingTime: config.maxHoldingTime || 24 * 60 * 60 * 1000, // 24 hours max holding

      // Market risk parameters
      volatilityThreshold: config.volatilityThreshold || 0.2, // 20% volatility threshold
      correlationThreshold: config.correlationThreshold || 0.7, // 70% correlation limit
      marketStressThreshold: config.marketStressThreshold || 0.3, // 30% market stress

      // Rebalancing parameters
      rebalanceThreshold: config.rebalanceThreshold || 0.05, // 5% deviation threshold
      minRebalanceInterval: config.minRebalanceInterval || 60 * 60 * 1000, // 1 hour minimum
      maxRebalanceInterval: config.maxRebalanceInterval || 6 * 60 * 60 * 1000, // 6 hours maximum

      ...config
    };

    // Risk monitoring state
    this.riskState = {
      positions: new Map(),
      stopLossOrders: new Map(),
      riskMetrics: {
        totalRisk: 0,
        concentrationRisk: 0,
        liquidityRisk: 0,
        marketRisk: 0,
        lastUpdate: Date.now()
      },
      alerts: [],
      lastRebalance: Date.now()
    };

    this.logger.info('⚠️ Risk Management Service initialized', {
      defaultStopLoss: this.config.defaultStopLossPercentage,
      maxPortfolioRisk: this.config.maxPortfolioRisk,
      minLiquidityBuffer: this.config.minLiquidityBuffer
    });
  }

  /**
   * Context7 Pattern: Monitor and manage risk for a portfolio
   *
   * @param {Object} portfolio - Current portfolio state
   * @param {Array} marketData - Current market data
   * @returns {Object} Risk management actions and recommendations
   */
  async managePortfolioRisk() {
    return this.execute(async () => {
this.logger.debug('Starting portfolio risk management', {
        totalPositions: portfolio.positions?.length || 0,
        totalValue: portfolio.totalValue || 0
      });

      // Update position data
      await this.updatePositionData(portfolio, marketData);

      // Calculate current risk metrics
      const riskMetrics = this.calculatePortfolioRiskMetrics(portfolio, marketData);

      // Check for stop-loss triggers
      const stopLossActions = await this.checkStopLossOrders(portfolio, marketData);

      // Evaluate liquidity management needs
      const liquidityActions = this.evaluateLiquidityManagement(portfolio, marketData);

      // Check for rebalancing opportunities
      const rebalanceActions = this.evaluateRebalancingOpportunities(portfolio, marketData);

      // Generate risk alerts
      const riskAlerts = this.generateRiskAlerts(riskMetrics, portfolio);

      // Calculate opportunity costs
      const opportunityCosts = this.calculateOpportunityCosts(portfolio, marketData);

      // Generate recommendations
      const recommendations = this.generateRiskRecommendations(
        riskMetrics,
        stopLossActions,
        liquidityActions,
        rebalanceActions,
        opportunityCosts
      );

      // Update internal state
      this.riskState.riskMetrics = riskMetrics;
      this.riskState.alerts = riskAlerts;

      const riskManagementResult = {
        riskMetrics,
        actions: {
          stopLoss: stopLossActions,
          liquidity: liquidityActions,
          rebalance: rebalanceActions
        },
        alerts: riskAlerts,
        recommendations,
        opportunityCosts,
        timestamp: Date.now()
      };

      this.logger.info('✅ Portfolio risk management completed', {
        totalRisk: riskMetrics.totalRisk.toFixed(3),
        alertCount: riskAlerts.length,
        actionCount: stopLossActions.length + liquidityActions.length + rebalanceActions.length
      });

      return riskManagementResult;
    }, 'managePortfolioRisk', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Update position data with current market information
   */
  async updatePositionData() {
    return this.execute(async () => {
const marketDataMap = new Map(marketData.map(item => [item.itemId, item]));

      for (const position of portfolio.positions || []) {
        const currentMarketData = marketDataMap.get(position.itemId);

        if (currentMarketData) {
          // Update position with current market data
          position.currentPrice = (currentMarketData.highPrice + currentMarketData.lowPrice) / 2;
          position.currentMargin = currentMarketData.marginPercent;
          position.currentVolume = currentMarketData.volume;
          position.currentVolatility = currentMarketData.volatility;

          // Calculate unrealized P&L
          position.unrealizedPnL = this.calculateUnrealizedPnL(position, currentMarketData);
          position.unrealizedPnLPercent = (position.unrealizedPnL / position.capitalInvested) * 100;

          // Update holding time
          position.holdingTime = Date.now() - position.entryTime;

          // Store updated position
          this.riskState.positions.set(position.id, position);
        }
      }
    }, 'updatePositionData', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Calculate comprehensive portfolio risk metrics
   */
  calculatePortfolioRiskMetrics(portfolio, marketData) {
    this.execute(async () => {
const positions = portfolio.positions || [];
      const totalValue = portfolio.totalValue || 0;

      if (positions.length === 0 || totalValue === 0) {
        return {
          totalRisk: 0,
          concentrationRisk: 0,
          liquidityRisk: 0,
          marketRisk: 0,
          volatilityRisk: 0,
          correlationRisk: 0,
          positionRisks: [],
          lastUpdate: Date.now()
        };
      }

      // Calculate individual position risks
      const positionRisks = positions.map(position => this.calculatePositionRisk(position, totalValue));

      // Calculate total portfolio risk
      const totalRisk = positionRisks.reduce((sum, risk) => sum + risk.totalRisk, 0);

      // Calculate concentration risk
      const concentrationRisk = this.calculateConcentrationRisk(positions, totalValue);

      // Calculate liquidity risk
      const liquidityRisk = this.calculateLiquidityRisk(positions, marketData);

      // Calculate market risk
      const marketRisk = this.calculateMarketRisk(positions, marketData);

      // Calculate volatility risk
      const volatilityRisk = this.calculateVolatilityRisk(positions);

      // Calculate correlation risk
      const correlationRisk = this.calculateCorrelationRisk(positions);

      return {
        totalRisk,
        concentrationRisk,
        liquidityRisk,
        marketRisk,
        volatilityRisk,
        correlationRisk,
        positionRisks,
        riskScore: this.calculateOverallRiskScore(totalRisk, concentrationRisk, liquidityRisk, marketRisk),
        lastUpdate: Date.now()
      };
    }, 'operation', { logSuccess: false })
  }

  /**
   * Context7 Pattern: Calculate risk for individual position
   */
  calculatePositionRisk(position, totalPortfolioValue) {
    const positionWeight = position.capitalInvested / totalPortfolioValue;

    // Base risk from position size
    const sizeRisk = Math.min(positionWeight / this.config.maxPositionRisk, 1.0);

    // Volatility risk
    const volatilityRisk = Math.min((position.currentVolatility || 0) / this.config.volatilityThreshold, 1.0);

    // Holding time risk
    const holdingTimeRisk = Math.min(position.holdingTime / this.config.maxHoldingTime, 1.0);

    // Unrealized loss risk
    const unrealizedLossRisk = position.unrealizedPnL < 0 ?
      Math.min(Math.abs(position.unrealizedPnLPercent) / (this.config.defaultStopLossPercentage * 100), 1.0) : 0;

    // Combined risk score
    const totalRisk = (sizeRisk * 0.3 + volatilityRisk * 0.3 + holdingTimeRisk * 0.2 + unrealizedLossRisk * 0.2) * positionWeight;

    return {
      positionId: position.id,
      itemId: position.itemId,
      sizeRisk,
      volatilityRisk,
      holdingTimeRisk,
      unrealizedLossRisk,
      totalRisk,
      positionWeight,
      riskLevel: this.getRiskLevel(totalRisk)
    };
  }

  /**
   * Context7 Pattern: Check stop-loss orders and generate actions
   */
  async checkStopLossOrders() {
    return this.execute(async () => {
const stopLossActions = [];
      const marketDataMap = new Map(marketData.map(item => [item.itemId, item]));

      for (const position of portfolio.positions || []) {
        const currentMarketData = marketDataMap.get(position.itemId);

        if (!currentMarketData) {
          continue;
        }

        // Check for stop-loss trigger
        const stopLossOrder = this.riskState.stopLossOrders.get(position.id) ||
          this.createStopLossOrder(position);

        const stopLossTriggered = this.checkStopLossTrigger(position, currentMarketData, stopLossOrder);

        if (stopLossTriggered) {
          stopLossActions.push({
            type: 'STOP_LOSS_TRIGGERED',
            positionId: position.id,
            itemId: position.itemId,
            itemName: position.itemName,
            currentPrice: position.currentPrice,
            stopLossPrice: stopLossOrder.stopPrice,
            expectedLoss: stopLossOrder.expectedLoss,
            urgency: 'HIGH',
            reason: stopLossTriggered.reason,
            timestamp: Date.now()
          });
        }

        // Check for trailing stop-loss updates
        const trailingUpdate = this.checkTrailingStopLossUpdate(position, currentMarketData, stopLossOrder);

        if (trailingUpdate) {
          stopLossActions.push({
            type: 'TRAILING_STOP_UPDATE',
            positionId: position.id,
            itemId: position.itemId,
            oldStopPrice: stopLossOrder.stopPrice,
            newStopPrice: trailingUpdate.newStopPrice,
            urgency: 'MEDIUM',
            timestamp: Date.now()
          });

          // Update the stop-loss order
          stopLossOrder.stopPrice = trailingUpdate.newStopPrice;
          stopLossOrder.lastUpdate = Date.now();
        }

        // Store updated stop-loss order
        this.riskState.stopLossOrders.set(position.id, stopLossOrder);
      }

      return stopLossActions;
    }, 'checkStopLossOrders', { logSuccess: true });
  }

      this.logger.warn('🚨 Emergency stop-loss triggered', {
        positionId,
        itemId: position.itemId,
        reason
      });

      // Add emergency stop-loss action
      return {
        type: 'EMERGENCY_STOP_LOSS',
        positionId,
        itemId: position.itemId,
        reason,
        urgency: 'CRITICAL',
        timestamp: Date.now()
      };
    } catch (error) {
      // Error handling moved to centralized manager - context: ❌ Error executing emergency stop-loss
      throw error;
    }
  }
}

module.exports = { RiskManagementService };
