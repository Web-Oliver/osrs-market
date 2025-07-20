/**
 * 🏛️ Item Domain Service - Complex business logic coordination
 *
 * Context7 Pattern: Domain Service for business operations that don't belong to entities
 * - DRY: Centralized complex business logic
 * - SOLID: Single responsibility for item domain operations
 * - Domain-driven design: Keeps business logic in domain layer
 */

const { BaseService } = require('../../services/BaseService');
const { ItemId } = require('../value-objects/ItemId');
const { AlchemyInfo } = require('../value-objects/AlchemyInfo');
const { ItemSpecifications } = require('../specifications/ItemSpecifications');

/**
 * @typedef {import('../../types/domain/Item.js').ItemCreationData} ItemCreationData
 * @typedef {import('../../types/domain/Item.js').ItemStatistics} ItemStatistics
 * @typedef {import('../../types/domain/Item.js').ItemBusinessRules} ItemBusinessRules
 */

class ItemDomainService extends BaseService {
  /**
   * @private
   * @type {ItemBusinessRules}
   */
  #businessRules;

  constructor() {
    super('ItemDomainService', {
      enableCache: true,
      cachePrefix: 'item_domain',
      cacheTTL: 3600, // 1 hour for domain operations
      enableMongoDB: false // Domain service doesn't need direct MongoDB access
    });
    
    this.#businessRules = {
      MIN_ALCHEMY_PROFIT: 50,
      HIGH_VALUE_THRESHOLD: 100000,
      NATURE_RUNE_COST: 200,
      MAX_SYNC_AGE_MS: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  /**
   * Get business rules configuration
   * @returns {ItemBusinessRules} Business rules
   */
  getBusinessRules() {
    return { ...this.#businessRules };
  }

  /**
   * Update business rules configuration
   * @param {Partial<ItemBusinessRules>} newRules - Rules to update
   */
  updateBusinessRules(newRules) {
    Object.assign(this.#businessRules, newRules);
    this.logger.info('Business rules updated', { newRules });
  }

  /**
   * Validate item creation data with business rules
   * @param {ItemCreationData} data - Item creation data
   * @returns {{isValid: boolean, errors: string[], warnings: string[]}} Validation result
   */
  validateItemCreation(data) {
    const errors = [];
    const warnings = [];

    // Basic validation
    if (!data || typeof data !== 'object') {
      errors.push('Item data is required');
      return { isValid: false, errors, warnings };
    }

    // ID validation
    if (!ItemId.isValid(data.itemId)) {
      errors.push('Invalid item ID');
    }

    // Name validation
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Item name is required and must be non-empty');
    } else if (data.name.length > 200) {
      errors.push('Item name is too long (max 200 characters)');
    }

    // Examine validation
    if (!data.examine || typeof data.examine !== 'string') {
      errors.push('Item examine text is required');
    } else if (data.examine.length > 500) {
      errors.push('Item examine text is too long (max 500 characters)');
    }

    // Alchemy validation
    const lowalch = Number(data.lowalch || 0);
    const highalch = Number(data.highalch || 0);

    if (lowalch < 0) {
      errors.push('Low alchemy value cannot be negative');
    }

    if (highalch < 0) {
      errors.push('High alchemy value cannot be negative');
    }

    if (highalch < lowalch) {
      errors.push('High alchemy value cannot be less than low alchemy value');
    }

    // Value validation
    const value = Number(data.value || 1);
    if (value < 1) {
      errors.push('Item value must be at least 1');
    }

    // Business rule warnings
    if (highalch > 0 && value > 0) {
      const alchemyInfo = new AlchemyInfo({
        lowalch,
        highalch,
        natureRuneCost: this.#businessRules.NATURE_RUNE_COST
      });

      const profit = alchemyInfo.calculateProfit(value);
      if (profit < 0 && highalch > lowalch) {
        warnings.push('Item alchemy is not profitable at current value');
      }
    }

    if (value > this.#businessRules.HIGH_VALUE_THRESHOLD) {
      warnings.push('High-value item detected - ensure data accuracy');
    }

    if (data.buyLimit && data.buyLimit > 25000) {
      warnings.push('Unusually high buy limit - please verify');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Enrich item data with calculated fields and categorization
   * @param {ItemCreationData} data - Raw item data
   * @returns {ItemCreationData} Enriched item data
   */
  enrichItemData(data) {
    const enriched = { ...data };

    // Normalize and clean data
    if (enriched.name) {
      enriched.name = enriched.name.trim();
    }

    if (enriched.examine) {
      enriched.examine = enriched.examine.trim();
    }

    // Ensure numeric values are properly typed
    enriched.lowalch = Math.max(0, Number(enriched.lowalch || 0));
    enriched.highalch = Math.max(0, Number(enriched.highalch || 0));
    enriched.value = Math.max(1, Number(enriched.value || 1));
    enriched.weight = Math.max(0, Number(enriched.weight || 0));

    if (enriched.buyLimit) {
      enriched.buyLimit = Math.max(0, Number(enriched.buyLimit));
    }

    // Ensure boolean values
    enriched.members = Boolean(enriched.members);
    enriched.tradeable_on_ge = Boolean(enriched.tradeable_on_ge);
    enriched.stackable = Boolean(enriched.stackable);
    enriched.noted = Boolean(enriched.noted);

    // Add data source if not present
    if (!enriched.dataSource) {
      enriched.dataSource = 'manual';
    }

    this.#logger.debug('Item data enriched', {
      itemId: enriched.itemId,
      name: enriched.name
    });

    return enriched;
  }

  /**
   * Calculate comprehensive item statistics from a collection
   * @param {Item[]} items - Array of items
   * @returns {ItemStatistics} Comprehensive statistics
   */
  calculateItemStatistics(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return this.#getEmptyStatistics();
    }

    const stats = {
      totalItems: items.length,
      membersItems: 0,
      freeItems: 0,
      tradeableItems: 0,
      stackableItems: 0,
      avgValue: 0,
      maxValue: 0,
      minValue: Number.MAX_SAFE_INTEGER,
      avgHighAlch: 0,
      lastSyncDate: new Date(0),
      categoryBreakdown: {}
    };

    let totalValue = 0;
    let totalHighAlch = 0;

    for (const item of items) {
      // Membership status
      if (item.members) {
        stats.membersItems++;
      } else {
        stats.freeItems++;
      }

      // Market properties
      if (item.market.tradeableOnGE) {
        stats.tradeableItems++;
      }

      if (item.market.stackable) {
        stats.stackableItems++;
      }

      // Value statistics
      const value = item.market.value;
      totalValue += value;
      stats.maxValue = Math.max(stats.maxValue, value);
      stats.minValue = Math.min(stats.minValue, value);

      // Alchemy statistics
      totalHighAlch += item.alchemy.highalch;

      // Sync date tracking
      if (item.audit.lastSyncedAt > stats.lastSyncDate) {
        stats.lastSyncDate = item.audit.lastSyncedAt;
      }

      // Category breakdown
      const category = item.getCategory();
      stats.categoryBreakdown[category] = (stats.categoryBreakdown[category] || 0) + 1;
    }

    // Calculate averages
    stats.avgValue = Math.round(totalValue / items.length);
    stats.avgHighAlch = Math.round(totalHighAlch / items.length);

    // Handle edge case for minimum value
    if (stats.minValue === Number.MAX_SAFE_INTEGER) {
      stats.minValue = 0;
    }

    this.#logger.debug('Item statistics calculated', {
      totalItems: stats.totalItems,
      categories: Object.keys(stats.categoryBreakdown).length
    });

    return stats;
  }

  /**
   * Find items matching business criteria
   * @param {Item[]} items - Items to filter
   * @param {string} criteriaName - Predefined criteria name
   * @param {Object} [params] - Optional parameters for criteria
   * @returns {Item[]} Filtered items
   */
  findItemsByCriteria(items, criteriaName, params = {}) {
    let specification;

    switch (criteriaName) {
    case 'highValueTradeable':
      specification = ItemSpecifications.highValueTradeable(
        params.valueThreshold || this.#businessRules.HIGH_VALUE_THRESHOLD
      );
      break;

    case 'profitableAlchemy':
      specification = ItemSpecifications.profitableAlchemy(
        params.minimumProfit || this.#businessRules.MIN_ALCHEMY_PROFIT
      );
      break;

    case 'freeToPlayTradeable':
      specification = ItemSpecifications.freeToPlayTradeable();
      break;

    case 'flippingCandidates':
      specification = ItemSpecifications.flippingCandidates();
      break;

    case 'needsDataRefresh':
      specification = ItemSpecifications.needsDataRefresh(
        params.maxAge || this.#businessRules.MAX_SYNC_AGE_MS
      );
      break;

    case 'lowValueStackable':
      specification = ItemSpecifications.lowValueStackable(params.maxValue);
      break;

    case 'highEndMembersEquipment':
      specification = ItemSpecifications.highEndMembersEquipment(
        params.valueThreshold || 1000000
      );
      break;

    case 'newPlayerFriendly':
      specification = ItemSpecifications.newPlayerFriendly();
      break;

    case 'bulkTradingItems':
      specification = ItemSpecifications.bulkTradingItems();
      break;

    case 'recentlyUpdatedHighValue':
      specification = ItemSpecifications.recentlyUpdatedHighValue(
        params.maxAge,
        params.valueThreshold || this.#businessRules.HIGH_VALUE_THRESHOLD
      );
      break;

    default:
      throw new Error(`Unknown criteria: ${criteriaName}`);
    }

    const filtered = items.filter(item => specification.isSatisfiedBy(item));

    this.#logger.debug('Items filtered by criteria', {
      criteriaName,
      totalItems: items.length,
      filteredItems: filtered.length,
      params
    });

    return filtered;
  }

  /**
   * Perform batch validation on multiple items
   * @param {ItemCreationData[]} itemsData - Array of item creation data
   * @returns {{valid: ItemCreationData[], invalid: {data: ItemCreationData, errors: string[]}[]}} Validation results
   */
  batchValidateItems(itemsData) {
    if (!Array.isArray(itemsData)) {
      throw new Error('Expected array of item data');
    }

    const valid = [];
    const invalid = [];

    for (const data of itemsData) {
      const validation = this.validateItemCreation(data);
      if (validation.isValid) {
        valid.push(this.enrichItemData(data));
      } else {
        invalid.push({
          data,
          errors: validation.errors
        });
      }
    }

    this.#logger.info('Batch validation completed', {
      total: itemsData.length,
      valid: valid.length,
      invalid: invalid.length
    });

    return { valid, invalid };
  }

  /**
   * Determine if items are similar enough to be duplicates
   * @param {Item} item1 - First item
   * @param {Item} item2 - Second item
   * @returns {{isDuplicate: boolean, similarity: number, reasons: string[]}} Duplicate analysis
   */
  analyzeDuplicates(item1, item2) {
    const reasons = [];
    let similarity = 0;
    const weights = {
      name: 0.4,
      examine: 0.2,
      alchemy: 0.2,
      market: 0.2
    };

    // Name similarity (simple contains check)
    const name1 = item1.name.toLowerCase();
    const name2 = item2.name.toLowerCase();

    if (name1 === name2) {
      similarity += weights.name;
      reasons.push('Identical names');
    } else if (name1.includes(name2) || name2.includes(name1)) {
      similarity += weights.name * 0.7;
      reasons.push('Similar names');
    }

    // Examine similarity
    if (item1.examine === item2.examine) {
      similarity += weights.examine;
      reasons.push('Identical examine text');
    }

    // Alchemy similarity
    if (item1.alchemy.lowalch === item2.alchemy.lowalch &&
        item1.alchemy.highalch === item2.alchemy.highalch) {
      similarity += weights.alchemy;
      reasons.push('Identical alchemy values');
    }

    // Market similarity
    if (item1.market.value === item2.market.value &&
        item1.market.tradeableOnGE === item2.market.tradeableOnGE) {
      similarity += weights.market;
      reasons.push('Identical market data');
    }

    const isDuplicate = similarity >= 0.8; // 80% similarity threshold

    return {
      isDuplicate,
      similarity: Math.round(similarity * 100) / 100,
      reasons
    };
  }

  /**
   * Get empty statistics object
   * @private
   * @returns {ItemStatistics} Empty statistics
   */
  #getEmptyStatistics() {
    return {
      totalItems: 0,
      membersItems: 0,
      freeItems: 0,
      tradeableItems: 0,
      stackableItems: 0,
      avgValue: 0,
      maxValue: 0,
      minValue: 0,
      avgHighAlch: 0,
      lastSyncDate: new Date(0),
      categoryBreakdown: {}
    };
  }
}

module.exports = { ItemDomainService };
