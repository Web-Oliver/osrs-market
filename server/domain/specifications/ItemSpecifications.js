/**
 * 📋 Item Specifications - Business rule specifications using Specification Pattern
 * 
 * Context7 Pattern: Specification Pattern for business rules
 * - DRY: Reusable business rule definitions
 * - SOLID: Open/Closed principle - extensible specifications
 * - Clean business logic separation
 */

const { AlchemyInfo } = require('../value-objects/AlchemyInfo');

/**
 * Base Specification class
 */
class Specification {
  /**
   * Check if entity satisfies specification
   * @param {*} entity - Entity to check
   * @returns {boolean} True if satisfied
   */
  isSatisfiedBy(entity) {
    throw new Error('Specification must implement isSatisfiedBy method');
  }

  /**
   * Combine with another specification using AND logic
   * @param {Specification} other - Other specification
   * @returns {AndSpecification} Combined specification
   */
  and(other) {
    return new AndSpecification(this, other);
  }

  /**
   * Combine with another specification using OR logic
   * @param {Specification} other - Other specification
   * @returns {OrSpecification} Combined specification
   */
  or(other) {
    return new OrSpecification(this, other);
  }

  /**
   * Negate this specification
   * @returns {NotSpecification} Negated specification
   */
  not() {
    return new NotSpecification(this);
  }
}

/**
 * AND logic specification
 */
class AndSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  isSatisfiedBy(entity) {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }
}

/**
 * OR logic specification
 */
class OrSpecification extends Specification {
  constructor(left, right) {
    super();
    this.left = left;
    this.right = right;
  }

  isSatisfiedBy(entity) {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }
}

/**
 * NOT logic specification
 */
class NotSpecification extends Specification {
  constructor(spec) {
    super();
    this.spec = spec;
  }

  isSatisfiedBy(entity) {
    return !this.spec.isSatisfiedBy(entity);
  }
}

// Item-specific specifications

/**
 * Check if item is members-only
 */
class MembersItemSpecification extends Specification {
  isSatisfiedBy(item) {
    return item.members === true;
  }
}

/**
 * Check if item is tradeable on Grand Exchange
 */
class TradeableItemSpecification extends Specification {
  isSatisfiedBy(item) {
    return item.market.tradeableOnGE === true;
  }
}

/**
 * Check if item is active
 */
class ActiveItemSpecification extends Specification {
  isSatisfiedBy(item) {
    return item.status === 'active';
  }
}

/**
 * Check if item is stackable
 */
class StackableItemSpecification extends Specification {
  isSatisfiedBy(item) {
    return item.market.stackable === true;
  }
}

/**
 * Check if item value is above threshold
 */
class HighValueItemSpecification extends Specification {
  constructor(threshold = 100000) {
    super();
    this.threshold = threshold;
  }

  isSatisfiedBy(item) {
    return item.market.value >= this.threshold;
  }
}

/**
 * Check if item alchemy is profitable
 */
class ProfitableAlchemySpecification extends Specification {
  isSatisfiedBy(item) {
    return item.isProfitableAlchemy();
  }
}

/**
 * Check if item alchemy profit exceeds minimum
 */
class MinimumAlchemyProfitSpecification extends Specification {
  constructor(minimumProfit = 50) {
    super();
    this.minimumProfit = minimumProfit;
  }

  isSatisfiedBy(item) {
    return item.getAlchemyProfit() >= this.minimumProfit;
  }
}

/**
 * Check if item belongs to specific category
 */
class ItemCategorySpecification extends Specification {
  constructor(category) {
    super();
    this.category = category;
  }

  isSatisfiedBy(item) {
    return item.getCategory() === this.category;
  }
}

/**
 * Check if item name contains specific text
 */
class ItemNameContainsSpecification extends Specification {
  constructor(searchText, caseSensitive = false) {
    super();
    this.searchText = caseSensitive ? searchText : searchText.toLowerCase();
    this.caseSensitive = caseSensitive;
  }

  isSatisfiedBy(item) {
    const itemName = this.caseSensitive ? item.name : item.name.toLowerCase();
    return itemName.includes(this.searchText);
  }
}

/**
 * Check if item needs synchronization
 */
class NeedsSyncSpecification extends Specification {
  constructor(maxAgeMs = 24 * 60 * 60 * 1000) {
    super();
    this.maxAgeMs = maxAgeMs;
  }

  isSatisfiedBy(item) {
    return item.needsSync(this.maxAgeMs);
  }
}

/**
 * Check if item weight is below threshold
 */
class LightweightItemSpecification extends Specification {
  constructor(maxWeight = 1.0) {
    super();
    this.maxWeight = maxWeight;
  }

  isSatisfiedBy(item) {
    return item.weight <= this.maxWeight;
  }
}

/**
 * Check if item has Grand Exchange buy limit
 */
class HasBuyLimitSpecification extends Specification {
  isSatisfiedBy(item) {
    return item.market.buyLimit !== null && item.market.buyLimit > 0;
  }
}

/**
 * Check if item value is within range
 */
class ValueRangeSpecification extends Specification {
  constructor(minValue, maxValue) {
    super();
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  isSatisfiedBy(item) {
    return item.market.value >= this.minValue && item.market.value <= this.maxValue;
  }
}

/**
 * Check if item was updated recently
 */
class RecentlyUpdatedSpecification extends Specification {
  constructor(maxAgeMs = 60 * 60 * 1000) { // 1 hour default
    super();
    this.maxAgeMs = maxAgeMs;
  }

  isSatisfiedBy(item) {
    const age = Date.now() - item.audit.updatedAt.getTime();
    return age <= this.maxAgeMs;
  }
}

/**
 * Predefined composite specifications for common use cases
 */
class ItemSpecifications {
  /**
   * High-value tradeable items
   * @param {number} valueThreshold - Minimum value threshold
   * @returns {Specification} Combined specification
   */
  static highValueTradeable(valueThreshold = 100000) {
    return new HighValueItemSpecification(valueThreshold)
      .and(new TradeableItemSpecification())
      .and(new ActiveItemSpecification());
  }

  /**
   * Profitable alchemy items
   * @param {number} minimumProfit - Minimum profit threshold
   * @returns {Specification} Combined specification
   */
  static profitableAlchemy(minimumProfit = 50) {
    return new MinimumAlchemyProfitSpecification(minimumProfit)
      .and(new ActiveItemSpecification());
  }

  /**
   * Free-to-play tradeable items
   * @returns {Specification} Combined specification
   */
  static freeToPlayTradeable() {
    return new TradeableItemSpecification()
      .and(new MembersItemSpecification().not())
      .and(new ActiveItemSpecification());
  }

  /**
   * Items suitable for flipping (tradeable, has buy limit)
   * @returns {Specification} Combined specification
   */
  static flippingCandidates() {
    return new TradeableItemSpecification()
      .and(new HasBuyLimitSpecification())
      .and(new ActiveItemSpecification());
  }

  /**
   * Items needing data refresh
   * @param {number} maxAgeMs - Maximum age before sync needed
   * @returns {Specification} Combined specification
   */
  static needsDataRefresh(maxAgeMs = 24 * 60 * 60 * 1000) {
    return new NeedsSyncSpecification(maxAgeMs)
      .and(new ActiveItemSpecification());
  }

  /**
   * Low-value stackable items
   * @param {number} maxValue - Maximum value threshold
   * @returns {Specification} Combined specification
   */
  static lowValueStackable(maxValue = 1000) {
    return new ValueRangeSpecification(0, maxValue)
      .and(new StackableItemSpecification())
      .and(new ActiveItemSpecification());
  }

  /**
   * High-end members equipment
   * @param {number} valueThreshold - Minimum value threshold
   * @returns {Specification} Combined specification
   */
  static highEndMembersEquipment(valueThreshold = 1000000) {
    return new HighValueItemSpecification(valueThreshold)
      .and(new MembersItemSpecification())
      .and(new ItemCategorySpecification('weapons').or(new ItemCategorySpecification('armor')))
      .and(new ActiveItemSpecification());
  }

  /**
   * Items for new players (F2P, low value, useful)
   * @returns {Specification} Combined specification
   */
  static newPlayerFriendly() {
    return new MembersItemSpecification().not()
      .and(new ValueRangeSpecification(1, 10000))
      .and(new TradeableItemSpecification())
      .and(new ActiveItemSpecification());
  }

  /**
   * Bulk trading items (stackable, tradeable, reasonable value)
   * @returns {Specification} Combined specification
   */
  static bulkTradingItems() {
    return new StackableItemSpecification()
      .and(new TradeableItemSpecification())
      .and(new ValueRangeSpecification(10, 50000))
      .and(new ActiveItemSpecification());
  }

  /**
   * Recently updated high-value items
   * @param {number} maxAge - Maximum age for "recent" updates
   * @param {number} valueThreshold - Minimum value threshold
   * @returns {Specification} Combined specification
   */
  static recentlyUpdatedHighValue(maxAge = 60 * 60 * 1000, valueThreshold = 100000) {
    return new RecentlyUpdatedSpecification(maxAge)
      .and(new HighValueItemSpecification(valueThreshold))
      .and(new ActiveItemSpecification());
  }
}

module.exports = {
  Specification,
  AndSpecification,
  OrSpecification,
  NotSpecification,
  MembersItemSpecification,
  TradeableItemSpecification,
  ActiveItemSpecification,
  StackableItemSpecification,
  HighValueItemSpecification,
  ProfitableAlchemySpecification,
  MinimumAlchemyProfitSpecification,
  ItemCategorySpecification,
  ItemNameContainsSpecification,
  NeedsSyncSpecification,
  LightweightItemSpecification,
  HasBuyLimitSpecification,
  ValueRangeSpecification,
  RecentlyUpdatedSpecification,
  ItemSpecifications
};