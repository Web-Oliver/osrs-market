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

const { Logger } = require('../utils/Logger');
const { FinancialMetricsCalculator } = require('../utils/FinancialMetricsCalculator');
const { MarketDataService } = require('./MarketDataService');
const { 
  calculateProfitAfterTax, 
  calculateGETax 
} = require('../utils/marketConstants');

class RiskManagementService {
  constructor(config = {}) {
    this.logger = new Logger('RiskManagement');
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
  async managePortfolioRisk(portfolio, marketData) {
    try {
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
    } catch (error) {
      this.logger.error('❌ Error managing portfolio risk', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Update position data with current market information
   */
  async updatePositionData(portfolio, marketData) {
    try {
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
    } catch (error) {
      this.logger.error('❌ Error updating position data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Calculate comprehensive portfolio risk metrics
   */
  calculatePortfolioRiskMetrics(portfolio, marketData) {
    try {
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
    } catch (error) {
      this.logger.error('❌ Error calculating portfolio risk metrics', error);
      throw error;
    }
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
  async checkStopLossOrders(portfolio, marketData) {
    try {
      const stopLossActions = [];
      const marketDataMap = new Map(marketData.map(item => [item.itemId, item]));
      
      for (const position of portfolio.positions || []) {
        const currentMarketData = marketDataMap.get(position.itemId);
        
        if (!currentMarketData) continue;
        
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
    } catch (error) {
      this.logger.error('❌ Error checking stop-loss orders', error);
      return [];
    }
  }

  /**
   * Context7 Pattern: Create stop-loss order for position
   */
  createStopLossOrder(position) {
    const stopLossPercentage = this.calculateDynamicStopLoss(position);
    const stopPrice = position.entryPrice * (1 - stopLossPercentage);
    
    return {
      positionId: position.id,
      itemId: position.itemId,
      stopPrice,
      stopLossPercentage,
      isTrailing: true,
      highestPrice: position.currentPrice || position.entryPrice,
      createdAt: Date.now(),
      lastUpdate: Date.now(),
      expectedLoss: (position.entryPrice - stopPrice) * position.quantity
    };
  }

  /**
   * Context7 Pattern: Calculate dynamic stop-loss percentage
   */
  calculateDynamicStopLoss(position) {
    let stopLossPercentage = this.config.defaultStopLossPercentage;
    
    // Adjust based on volatility
    if (position.currentVolatility > this.config.volatilityThreshold) {
      stopLossPercentage = Math.min(stopLossPercentage * 1.5, this.config.maxStopLossPercentage);
    }
    
    // Adjust based on holding time
    if (position.holdingTime > this.config.maxHoldingTime * 0.8) {
      stopLossPercentage = Math.min(stopLossPercentage * 1.2, this.config.maxStopLossPercentage);
    }
    
    // Adjust based on market conditions
    if (position.currentVolume < 1000) {
      stopLossPercentage = Math.min(stopLossPercentage * 1.3, this.config.maxStopLossPercentage);
    }
    
    return stopLossPercentage;
  }

  /**
   * Context7 Pattern: Check if stop-loss should be triggered
   */
  checkStopLossTrigger(position, currentMarketData, stopLossOrder) {
    const currentPrice = position.currentPrice || (currentMarketData.highPrice + currentMarketData.lowPrice) / 2;
    
    // Check basic stop-loss trigger
    if (currentPrice <= stopLossOrder.stopPrice) {
      return {
        triggered: true,
        reason: `Price ${currentPrice} fell below stop-loss ${stopLossOrder.stopPrice}`
      };
    }
    
    // Check for rapid price decline
    if (position.unrealizedPnLPercent < -this.config.maxStopLossPercentage * 100) {
      return {
        triggered: true,
        reason: `Unrealized loss ${position.unrealizedPnLPercent.toFixed(2)}% exceeds maximum`
      };
    }
    
    // Check for low liquidity stop-loss
    if (currentMarketData.volume < 100 && position.unrealizedPnLPercent < -this.config.defaultStopLossPercentage * 100 * 0.5) {
      return {
        triggered: true,
        reason: 'Low liquidity with significant unrealized loss'
      };
    }
    
    return null;
  }

  /**
   * Context7 Pattern: Check for trailing stop-loss updates
   */
  checkTrailingStopLossUpdate(position, currentMarketData, stopLossOrder) {
    const currentPrice = position.currentPrice || (currentMarketData.highPrice + currentMarketData.lowPrice) / 2;
    
    // Update highest price if current price is higher
    if (currentPrice > stopLossOrder.highestPrice) {
      const newStopPrice = currentPrice * (1 - this.config.trailingStopLossPercentage);
      
      // Only update if new stop price is higher than current
      if (newStopPrice > stopLossOrder.stopPrice) {
        return {
          newStopPrice,
          highestPrice: currentPrice
        };
      }
    }
    
    return null;
  }

  /**
   * Context7 Pattern: Evaluate liquidity management needs
   */
  evaluateLiquidityManagement(portfolio, marketData) {
    const liquidityActions = [];
    
    // Check overall liquidity buffer
    const liquidityBuffer = portfolio.cashBalance / portfolio.totalValue;
    
    if (liquidityBuffer < this.config.minLiquidityBuffer) {
      liquidityActions.push({
        type: 'INCREASE_LIQUIDITY',
        urgency: 'HIGH',
        targetLiquidity: this.config.minLiquidityBuffer,
        currentLiquidity: liquidityBuffer,
        suggestedAction: 'Sell least profitable positions',
        timestamp: Date.now()
      });
    }
    
    // Check for illiquid positions
    const illiquidPositions = (portfolio.positions || []).filter(position => {
      const marketData = marketData.find(data => data.itemId === position.itemId);
      return marketData && marketData.volume < 100;
    });
    
    if (illiquidPositions.length > 0) {
      liquidityActions.push({
        type: 'ILLIQUID_POSITIONS',
        urgency: 'MEDIUM',
        positions: illiquidPositions.map(pos => ({
          itemId: pos.itemId,
          itemName: pos.itemName,
          capitalInvested: pos.capitalInvested,
          holdingTime: pos.holdingTime
        })),
        suggestedAction: 'Consider exiting illiquid positions',
        timestamp: Date.now()
      });
    }
    
    return liquidityActions;
  }

  /**
   * Context7 Pattern: Evaluate rebalancing opportunities
   */
  evaluateRebalancingOpportunities(portfolio, marketData) {
    const rebalanceActions = [];
    
    // Check if enough time has passed since last rebalance
    if (Date.now() - this.riskState.lastRebalance < this.config.minRebalanceInterval) {
      return rebalanceActions;
    }
    
    // Check for concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(portfolio.positions || [], portfolio.totalValue);
    
    if (concentrationRisk > this.config.maxConcentrationRisk) {
      rebalanceActions.push({
        type: 'REDUCE_CONCENTRATION',
        urgency: 'HIGH',
        currentConcentration: concentrationRisk,
        maxConcentration: this.config.maxConcentrationRisk,
        suggestedAction: 'Reduce exposure to over-concentrated positions',
        timestamp: Date.now()
      });
    }
    
    // Check for opportunity cost rebalancing
    const opportunityActions = this.evaluateOpportunityCostRebalancing(portfolio, marketData);
    rebalanceActions.push(...opportunityActions);
    
    return rebalanceActions;
  }

  /**
   * Context7 Pattern: Calculate opportunity costs
   */
  calculateOpportunityCosts(portfolio, marketData) {
    const opportunityCosts = [];
    
    for (const position of portfolio.positions || []) {
      const currentMarketData = marketData.find(data => data.itemId === position.itemId);
      
      if (!currentMarketData) continue;
      
      // Calculate opportunity cost based on current margin vs position margin
      const currentMargin = currentMarketData.marginPercent;
      const positionMargin = position.expectedMargin;
      
      if (currentMargin < positionMargin * 0.5) {
        // Significant opportunity cost
        opportunityCosts.push({
          itemId: position.itemId,
          itemName: position.itemName,
          positionMargin,
          currentMargin,
          opportunityCost: (positionMargin - currentMargin) * position.quantity,
          recommendation: 'Consider exiting position',
          severity: 'HIGH'
        });
      }
    }
    
    return opportunityCosts;
  }

  /**
   * Context7 Pattern: Generate risk recommendations
   */
  generateRiskRecommendations(riskMetrics, stopLossActions, liquidityActions, rebalanceActions, opportunityCosts) {
    const recommendations = [];
    
    // Risk level recommendations
    if (riskMetrics.totalRisk > this.config.maxPortfolioRisk) {
      recommendations.push({
        type: 'REDUCE_PORTFOLIO_RISK',
        priority: 'HIGH',
        message: `Portfolio risk ${(riskMetrics.totalRisk * 100).toFixed(1)}% exceeds maximum ${(this.config.maxPortfolioRisk * 100).toFixed(1)}%`,
        actions: ['Reduce position sizes', 'Exit high-risk positions', 'Increase cash buffer']
      });
    }
    
    // Concentration risk recommendations
    if (riskMetrics.concentrationRisk > this.config.maxConcentrationRisk) {
      recommendations.push({
        type: 'DIVERSIFY_PORTFOLIO',
        priority: 'MEDIUM',
        message: `Concentration risk ${(riskMetrics.concentrationRisk * 100).toFixed(1)}% too high`,
        actions: ['Diversify across more items', 'Reduce large positions', 'Spread capital more evenly']
      });
    }
    
    // Liquidity recommendations
    if (riskMetrics.liquidityRisk > 0.3) {
      recommendations.push({
        type: 'IMPROVE_LIQUIDITY',
        priority: 'MEDIUM',
        message: 'Portfolio liquidity risk is elevated',
        actions: ['Focus on high-volume items', 'Exit illiquid positions', 'Maintain cash buffer']
      });
    }
    
    // Opportunity cost recommendations
    if (opportunityCosts.length > 0) {
      recommendations.push({
        type: 'OPTIMIZE_OPPORTUNITIES',
        priority: 'LOW',
        message: `${opportunityCosts.length} positions have significant opportunity costs`,
        actions: ['Review underperforming positions', 'Consider reallocation', 'Monitor market changes']
      });
    }
    
    return recommendations;
  }

  /**
   * Context7 Pattern: Calculate various risk components
   */
  calculateConcentrationRisk(positions, totalValue) {
    if (positions.length === 0 || totalValue === 0) return 0;
    
    const itemWeights = {};
    
    for (const position of positions) {
      const weight = position.capitalInvested / totalValue;
      itemWeights[position.itemId] = (itemWeights[position.itemId] || 0) + weight;
    }
    
    // Return highest single item concentration
    return Math.max(...Object.values(itemWeights));
  }

  calculateLiquidityRisk(positions, marketData) {
    if (positions.length === 0) return 0;
    
    const marketDataMap = new Map(marketData.map(item => [item.itemId, item]));
    let liquidityRisk = 0;
    
    for (const position of positions) {
      const data = marketDataMap.get(position.itemId);
      if (data && data.volume < 1000) {
        liquidityRisk += position.capitalInvested / 1000000; // Normalize risk
      }
    }
    
    return Math.min(liquidityRisk, 1.0);
  }

  calculateMarketRisk(positions, marketData) {
    if (positions.length === 0) return 0;
    
    const marketDataMap = new Map(marketData.map(item => [item.itemId, item]));
    let marketRisk = 0;
    
    for (const position of positions) {
      const data = marketDataMap.get(position.itemId);
      if (data) {
        const volatilityRisk = Math.min(data.volatility / 100, 1.0);
        marketRisk += volatilityRisk * (position.capitalInvested / 1000000);
      }
    }
    
    return Math.min(marketRisk, 1.0);
  }

  calculateVolatilityRisk(positions) {
    if (positions.length === 0) return 0;
    
    const avgVolatility = positions.reduce((sum, pos) => sum + (pos.currentVolatility || 0), 0) / positions.length;
    return Math.min(avgVolatility / this.config.volatilityThreshold, 1.0);
  }

  calculateCorrelationRisk(positions) {
    // Simplified correlation risk calculation
    // In a real implementation, you'd calculate actual correlations
    const uniqueCategories = new Set(positions.map(pos => pos.category || 'unknown')).size;
    const totalPositions = positions.length;
    
    return totalPositions > 0 ? Math.max(0, 1 - (uniqueCategories / totalPositions)) : 0;
  }

  /**
   * Context7 Pattern: Helper methods
   */
  calculateUnrealizedPnL(position, currentMarketData) {
    const currentPrice = (currentMarketData.highPrice + currentMarketData.lowPrice) / 2;
    const profitPerItem = calculateProfitAfterTax(position.entryPrice, currentPrice);
    return profitPerItem * position.quantity;
  }

  calculateOverallRiskScore(totalRisk, concentrationRisk, liquidityRisk, marketRisk) {
    const weightedRisk = totalRisk * 0.4 + concentrationRisk * 0.3 + liquidityRisk * 0.2 + marketRisk * 0.1;
    return Math.min(weightedRisk, 1.0);
  }

  getRiskLevel(riskScore) {
    if (riskScore > 0.7) return 'HIGH';
    if (riskScore > 0.4) return 'MEDIUM';
    return 'LOW';
  }

  generateRiskAlerts(riskMetrics, portfolio) {
    const alerts = [];
    
    if (riskMetrics.totalRisk > this.config.maxPortfolioRisk) {
      alerts.push({
        type: 'HIGH_PORTFOLIO_RISK',
        severity: 'HIGH',
        message: `Portfolio risk ${(riskMetrics.totalRisk * 100).toFixed(1)}% exceeds limit`,
        timestamp: Date.now()
      });
    }
    
    if (riskMetrics.concentrationRisk > this.config.maxConcentrationRisk) {
      alerts.push({
        type: 'HIGH_CONCENTRATION_RISK',
        severity: 'MEDIUM',
        message: `Concentration risk ${(riskMetrics.concentrationRisk * 100).toFixed(1)}% too high`,
        timestamp: Date.now()
      });
    }
    
    return alerts;
  }

  evaluateOpportunityCostRebalancing(portfolio, marketData) {
    // Simplified opportunity cost rebalancing
    const actions = [];
    
    // This would implement sophisticated rebalancing logic
    // For now, return empty array
    
    return actions;
  }

  /**
   * Context7 Pattern: Public interface methods
   */
  getRiskState() {
    return {
      ...this.riskState,
      config: this.config
    };
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('📝 Risk management configuration updated', {
      updatedFields: Object.keys(newConfig)
    });
  }

  async emergencyStopLoss(positionId, reason) {
    try {
      const position = this.riskState.positions.get(positionId);
      if (!position) {
        throw new Error(`Position ${positionId} not found`);
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
      this.logger.error('❌ Error executing emergency stop-loss', error);
      throw error;
    }
  }
}

module.exports = { RiskManagementService };