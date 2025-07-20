/**
 * Market Trading Constants for OSRS Grand Exchange
 *
 * These constants define the core trading parameters and fees
 * that affect profit calculations and market analysis.
 */

// Grand Exchange Tax Rate (2% for items over 1000 GP)
const GE_TAX_RATE = 0.02; // 2%

// Tax threshold - items over this value are taxed
const GE_TAX_THRESHOLD_GP = 1000;

// Other market constants
const GE_SLOT_LIMIT = 8; // Maximum number of GE slots per account
const GE_OFFER_TIMEOUT_HOURS = 7 * 24; // 7 days in hours

/**
 * Calculate the Grand Exchange tax for a given item price
 * @param {number} price - The item price in GP
 * @returns {number} Tax amount in GP (rounded down)
 */
function calculateGETax(price) {
  if (price <= GE_TAX_THRESHOLD_GP) {
    return 0;
  }
  return Math.floor(price * GE_TAX_RATE);
}

/**
 * Calculate the net selling price after GE tax
 * @param {number} sellPrice - The selling price in GP
 * @returns {number} Net price after tax in GP
 */
function calculateNetSellPrice(sellPrice) {
  const tax = calculateGETax(sellPrice);
  return sellPrice - tax;
}

/**
 * Calculate the profit margin considering GE tax
 * @param {number} buyPrice - The buying price in GP
 * @param {number} sellPrice - The selling price in GP
 * @returns {number} Profit margin in GP after tax
 */
function calculateProfitAfterTax(buyPrice, sellPrice) {
  const netSellPrice = calculateNetSellPrice(sellPrice);
  return netSellPrice - buyPrice;
}

/**
 * Calculate the profit margin percentage considering GE tax
 * @param {number} buyPrice - The buying price in GP
 * @param {number} sellPrice - The selling price in GP
 * @returns {number} Profit margin percentage after tax
 */
function calculateProfitPercentageAfterTax(buyPrice, sellPrice) {
  const profit = calculateProfitAfterTax(buyPrice, sellPrice);
  if (buyPrice <= 0) {
    return 0;
  }
  return (profit / buyPrice) * 100;
}

/**
 * Check if an item is tax-free for flipping
 * @param {number} price - The item price in GP
 * @returns {boolean} True if item is tax-free
 */
function isTaxFree(price) {
  return price <= GE_TAX_THRESHOLD_GP;
}

module.exports = {
  // Constants
  GE_TAX_RATE,
  GE_TAX_THRESHOLD_GP,
  GE_SLOT_LIMIT,
  GE_OFFER_TIMEOUT_HOURS,

  // Functions
  calculateGETax,
  calculateNetSellPrice,
  calculateProfitAfterTax,
  calculateProfitPercentageAfterTax,
  isTaxFree
};
