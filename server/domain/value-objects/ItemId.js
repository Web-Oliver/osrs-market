/**
 * 🆔 ItemId Value Object - Immutable item identifier
 *
 * Context7 Pattern: Value Object for type safety and validation
 * - DRY: Centralized ID validation and behavior
 * - SOLID: Single responsibility for item identification
 * - Immutable: Cannot be changed after creation
 */

class ItemId {
  /**
   * @private
   * @type {number}
   */
  #value;

  /**
   * Create a new ItemId
   * @param {number} value - The numeric identifier
   * @throws {Error} If value is invalid
   */
  constructor(value) {
    this.#value = this.#validateAndNormalize(value);
    Object.freeze(this);
  }

  /**
   * Validate and normalize the ID value
   * @private
   * @param {number} value - Raw ID value
   * @returns {number} Validated ID value
   * @throws {Error} If validation fails
   */
  #validateAndNormalize(value) {
    if (value == null) {
      throw new Error('ItemId cannot be null or undefined');
    }

    const numericValue = Number(value);

    if (!Number.isInteger(numericValue)) {
      throw new Error(`ItemId must be an integer, got: ${value}`);
    }

    if (numericValue < 1) {
      throw new Error(`ItemId must be positive, got: ${numericValue}`);
    }

    if (numericValue > Number.MAX_SAFE_INTEGER) {
      throw new Error(`ItemId too large: ${numericValue}`);
    }

    return numericValue;
  }

  /**
   * Get the numeric value
   * @returns {number} The ID value
   */
  get value() {
    return this.#value;
  }

  /**
   * Check equality with another ItemId
   * @param {ItemId} other - Other ItemId to compare
   * @returns {boolean} True if equal
   */
  equals(other) {
    if (!(other instanceof ItemId)) {
      return false;
    }
    return this.#value === other.#value;
  }

  /**
   * Get string representation
   * @returns {string} String representation
   */
  toString() {
    return `ItemId(${this.#value})`;
  }

  /**
   * Get JSON representation
   * @returns {number} The numeric value for JSON
   */
  toJSON() {
    return this.#value;
  }

  /**
   * Create ItemId from raw value with validation
   * @param {number} value - Raw ID value
   * @returns {ItemId} New ItemId instance
   */
  static from(value) {
    return new ItemId(value);
  }

  /**
   * Create ItemId from string with parsing
   * @param {string} str - String representation
   * @returns {ItemId} New ItemId instance
   */
  static fromString(str) {
    const parsed = parseInt(str, 10);
    return new ItemId(parsed);
  }

  /**
   * Check if value is a valid ItemId
   * @param {*} value - Value to check
   * @returns {boolean} True if valid
   */
  static isValid(value) {
    try {
      new ItemId(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a batch of ItemIds from an array
   * @param {number[]} values - Array of ID values
   * @returns {ItemId[]} Array of ItemId instances
   * @throws {Error} If any value is invalid
   */
  static fromArray(values) {
    if (!Array.isArray(values)) {
      throw new Error('Expected array of values');
    }

    return values.map(value => new ItemId(value));
  }

  /**
   * Extract numeric values from ItemId array
   * @param {ItemId[]} itemIds - Array of ItemId instances
   * @returns {number[]} Array of numeric values
   */
  static toValueArray(itemIds) {
    if (!Array.isArray(itemIds)) {
      throw new Error('Expected array of ItemIds');
    }

    return itemIds.map(itemId => {
      if (!(itemId instanceof ItemId)) {
        throw new Error('Array must contain only ItemId instances');
      }
      return itemId.value;
    });
  }
}

module.exports = { ItemId };
