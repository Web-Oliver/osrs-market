/**
 * 🧮 Financial Calculator Interface - Context7 Pattern
 *
 * Implements Interface Segregation Principle by providing:
 * - Clean abstraction for financial calculations
 * - Separates calculation concerns from implementation details
 * - Enables easy mocking and testing
 * - Supports multiple calculation strategies
 *
 * SOLID Principles Applied:
 * - ISP: Interface segregation - only calculation methods
 * - DIP: Abstraction that concrete calculators implement
 */

/**
 * Interface for financial calculation services
 * Concrete implementations: FinancialMetricsCalculator, PriceCalculator
 */
class IFinancialCalculator {
  /**
   * Calculate volatility from high/low prices
   * @param {number} highPrice - High price
   * @param {number} lowPrice - Low price
   * @returns {number} Volatility percentage
   */
  calculateVolatility(highPrice, lowPrice) {
    throw new Error('calculateVolatility method must be implemented');
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * @param {number[]} prices - Array of historical prices
   * @param {number} period - RSI period (default 14)
   * @returns {number} RSI value (0-100)
   */
  calculateRSI(prices, period = 14) {
    throw new Error('calculateRSI method must be implemented');
  }

  /**
   * Calculate moving average
   * @param {number[]} values - Array of values
   * @param {number} period - Moving average period
   * @returns {number} Moving average value
   */
  calculateMovingAverage(values, period) {
    throw new Error('calculateMovingAverage method must be implemented');
  }

  /**
   * Calculate profit margin with tax considerations
   * @param {number} buyPrice - Buy price
   * @param {number} sellPrice - Sell price
   * @param {number} itemId - Item ID for tax calculation
   * @returns {Object} Profit calculation result
   */
  calculateProfitMargin(buyPrice, sellPrice, itemId) {
    throw new Error('calculateProfitMargin method must be implemented');
  }

  /**
   * Calculate all financial metrics for market data
   * @param {Object} rawData - Raw market data
   * @param {Array} historicalData - Historical data array
   * @returns {Object} Complete metrics object
   */
  calculateAllMetrics(rawData, historicalData = []) {
    throw new Error('calculateAllMetrics method must be implemented');
  }
}

module.exports = { IFinancialCalculator };
