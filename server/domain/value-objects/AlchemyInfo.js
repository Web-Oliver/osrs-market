/**
 * 🧪 AlchemyInfo Value Object - Immutable alchemy calculation data
 *
 * Context7 Pattern: Value Object with business logic encapsulation
 * - DRY: Centralized alchemy calculations and validation
 * - SOLID: Single responsibility for alchemy-related behavior
 * - Immutable: Cannot be changed after creation
 */

class AlchemyInfo {
  /**
   * @private
   * @type {number}
   */
  #lowalch;

  /**
   * @private
   * @type {number}
   */
  #highalch;

  /**
   * @private
   * @type {number}
   */
  #natureRuneCost;

  /**
   * Create a new AlchemyInfo
   * @param {Object} params - Alchemy parameters
   * @param {number} params.lowalch - Low alchemy value
   * @param {number} params.highalch - High alchemy value
   * @param {number} [params.natureRuneCost=200] - Cost of nature rune
   * @throws {Error} If values are invalid
   */
  constructor({ lowalch, highalch, natureRuneCost = 200 }) {
    this.#validateInputs(lowalch, highalch, natureRuneCost);

    this.#lowalch = lowalch;
    this.#highalch = highalch;
    this.#natureRuneCost = natureRuneCost;

    Object.freeze(this);
  }

  /**
   * Validate alchemy inputs
   * @private
   * @param {number} lowalch - Low alchemy value
   * @param {number} highalch - High alchemy value
   * @param {number} natureRuneCost - Nature rune cost
   * @throws {Error} If validation fails
   */
  #validateInputs(lowalch, highalch, natureRuneCost) {
    if (typeof lowalch !== 'number' || lowalch < 0) {
      throw new Error(`Low alchemy value must be a non-negative number, got: ${lowalch}`);
    }

    if (typeof highalch !== 'number' || highalch < 0) {
      throw new Error(`High alchemy value must be a non-negative number, got: ${highalch}`);
    }

    if (highalch < lowalch) {
      throw new Error(`High alchemy value (${highalch}) cannot be less than low alchemy value (${lowalch})`);
    }

    if (typeof natureRuneCost !== 'number' || natureRuneCost < 0) {
      throw new Error(`Nature rune cost must be a non-negative number, got: ${natureRuneCost}`);
    }
  }

  /**
   * Get low alchemy value
   * @returns {number} Low alchemy value
   */
  get lowalch() {
    return this.#lowalch;
  }

  /**
   * Get high alchemy value
   * @returns {number} High alchemy value
   */
  get highalch() {
    return this.#highalch;
  }

  /**
   * Get nature rune cost
   * @returns {number} Nature rune cost
   */
  get natureRuneCost() {
    return this.#natureRuneCost;
  }

  /**
   * Calculate profit from high alchemy
   * @param {number} itemCost - Cost to buy the item
   * @returns {number} Profit from high alchemy (can be negative)
   */
  calculateProfit(itemCost) {
    if (typeof itemCost !== 'number' || itemCost < 0) {
      throw new Error(`Item cost must be a non-negative number, got: ${itemCost}`);
    }

    return this.#highalch - itemCost - this.#natureRuneCost;
  }

  /**
   * Check if high alchemy is profitable
   * @param {number} itemCost - Cost to buy the item
   * @returns {boolean} True if profitable
   */
  isProfitable(itemCost) {
    return this.calculateProfit(itemCost) > 0;
  }

  /**
   * Get profit margin as percentage
   * @param {number} itemCost - Cost to buy the item
   * @returns {number} Profit margin percentage
   */
  getProfitMargin(itemCost) {
    if (itemCost === 0) {
      return this.#highalch > this.#natureRuneCost ? Infinity : 0;
    }

    const profit = this.calculateProfit(itemCost);
    return (profit / itemCost) * 100;
  }

  /**
   * Get break-even price (maximum profitable buy price)
   * @returns {number} Maximum price to pay for profitable alchemy
   */
  getBreakEvenPrice() {
    return Math.max(0, this.#highalch - this.#natureRuneCost);
  }

  /**
   * Check equality with another AlchemyInfo
   * @param {AlchemyInfo} other - Other AlchemyInfo to compare
   * @returns {boolean} True if equal
   */
  equals(other) {
    if (!(other instanceof AlchemyInfo)) {
      return false;
    }

    return this.#lowalch === other.#lowalch &&
           this.#highalch === other.#highalch &&
           this.#natureRuneCost === other.#natureRuneCost;
  }

  /**
   * Get string representation
   * @returns {string} String representation
   */
  toString() {
    return `AlchemyInfo(low: ${this.#lowalch}, high: ${this.#highalch}, rune: ${this.#natureRuneCost})`;
  }

  /**
   * Get JSON representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      lowalch: this.#lowalch,
      highalch: this.#highalch,
      natureRuneCost: this.#natureRuneCost,
      breakEvenPrice: this.getBreakEvenPrice()
    };
  }

  /**
   * Create AlchemyInfo with validation
   * @param {Object} data - Alchemy data
   * @returns {AlchemyInfo} New AlchemyInfo instance
   */
  static from(data) {
    return new AlchemyInfo(data);
  }

  /**
   * Create AlchemyInfo from raw values
   * @param {number} lowalch - Low alchemy value
   * @param {number} highalch - High alchemy value
   * @param {number} [natureRuneCost=200] - Nature rune cost
   * @returns {AlchemyInfo} New AlchemyInfo instance
   */
  static create(lowalch, highalch, natureRuneCost = 200) {
    return new AlchemyInfo({ lowalch, highalch, natureRuneCost });
  }

  /**
   * Check if alchemy data is valid
   * @param {Object} data - Data to validate
   * @returns {boolean} True if valid
   */
  static isValid(data) {
    try {
      new AlchemyInfo(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get default nature rune cost
   * @returns {number} Default nature rune cost
   */
  static get DEFAULT_NATURE_RUNE_COST() {
    return 200;
  }
}

module.exports = { AlchemyInfo };
