/**
 * 🏺 Item Domain Entity - Rich domain model with business behavior
 *
 * Context7 Pattern: Domain Entity with encapsulated business logic
 * - DRY: Centralized item business rules and behavior
 * - SOLID: Single responsibility for item domain logic
 * - Rich Domain Model: Contains behavior, not just data
 */

const { ItemId } = require('../value-objects/ItemId');
const { AlchemyInfo } = require('../value-objects/AlchemyInfo');
const { Logger } = require('../../utils/Logger');
const TimeConstants = require('../../utils/TimeConstants');

/**
 * @typedef {import('../../types/domain/Item.js').ItemData} ItemData
 * @typedef {import('../../types/domain/Item.js').ItemCreationData} ItemCreationData
 * @typedef {import('../../types/domain/Item.js').ItemUpdateData} ItemUpdateData
 * @typedef {import('../../types/domain/Item.js').ItemCategory} ItemCategory
 * @typedef {import('../../types/shared/Common.js').EntityStatus} EntityStatus
 * @typedef {import('../../types/shared/Common.js').DataSource} DataSource
 */

class Item {
  /**
   * @private
   * @type {ItemId}
   */
  #id;

  /**
   * @private
   * @type {string}
   */
  #name;

  /**
   * @private
   * @type {string}
   */
  #examine;

  /**
   * @private
   * @type {boolean}
   */
  #members;

  /**
   * @private
   * @type {AlchemyInfo}
   */
  #alchemy;

  /**
   * @private
   * @type {Object}
   */
  #market;

  /**
   * @private
   * @type {number}
   */
  #weight;

  /**
   * @private
   * @type {string|null}
   */
  #icon;

  /**
   * @private
   * @type {EntityStatus}
   */
  #status;

  /**
   * @private
   * @type {DataSource}
   */
  #dataSource;

  /**
   * @private
   * @type {Object}
   */
  #audit;

  /**
   * @private
   * @type {Logger}
   */
  #logger;

  /**
   * Create a new Item entity
   * @param {ItemCreationData} data - Item creation data
   */
  constructor(data) {
    this.#logger = new Logger('Item');
    this.#validateCreationData(data);
    this.#initializeFromData(data);
  }

  /**
   * Validate item creation data
   * @private
   * @param {ItemCreationData} data - Data to validate
   * @throws {Error} If validation fails
   */
  #validateCreationData(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('Item creation data is required');
    }

    const required = ['itemId', 'name', 'examine'];
    for (const field of required) {
      if (data[field] == null) {
        throw new Error(`${field} is required for item creation`);
      }
    }

    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Item name must be a non-empty string');
    }

    if (typeof data.examine !== 'string') {
      throw new Error('Item examine must be a string');
    }
  }

  /**
   * Initialize item from creation data
   * @private
   * @param {ItemCreationData} data - Creation data
   */
  #initializeFromData(data) {
    const now = new Date();

    this.#id = new ItemId(data.itemId);
    this.#name = data.name.trim();
    this.#examine = data.examine.trim();
    this.#members = Boolean(data.members);
    this.#weight = Math.max(0, Number(data.weight || 0));
    this.#icon = data.icon || null;
    this.#status = data.status || 'active';
    this.#dataSource = data.dataSource || 'manual';

    // Initialize alchemy info
    this.#alchemy = new AlchemyInfo({
      lowalch: Math.max(0, Number(data.lowalch || 0)),
      highalch: Math.max(0, Number(data.highalch || 0))
    });

    // Initialize market info
    this.#market = {
      value: Math.max(1, Number(data.value || 1)),
      buyLimit: data.buyLimit ? Math.max(0, Number(data.buyLimit)) : null,
      tradeableOnGE: Boolean(data.tradeable_on_ge),
      stackable: Boolean(data.stackable),
      noted: Boolean(data.noted)
    };

    // Initialize audit fields
    this.#audit = {
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
      version: 1
    };

    this.#logger.debug('Item entity created', {
      itemId: this.#id.value,
      name: this.#name
    });
  }

  // Getters for accessing properties
  get id() {
    return this.#id;
  }
  get name() {
    return this.#name;
  }
  get examine() {
    return this.#examine;
  }
  get members() {
    return this.#members;
  }
  get alchemy() {
    return this.#alchemy;
  }
  get market() {
    return this.#market;
  }
  get weight() {
    return this.#weight;
  }
  get icon() {
    return this.#icon;
  }
  get status() {
    return this.#status;
  }
  get dataSource() {
    return this.#dataSource;
  }
  get audit() {
    return this.#audit;
  }

  /**
   * Update item properties
   * @param {ItemUpdateData} updateData - Data to update
   * @throws {Error} If update data is invalid
   */
  update(updateData) {
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data is required');
    }

    const updates = {};
    let hasChanges = false;

    // Update basic properties
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
        throw new Error('Name must be a non-empty string');
      }
      updates.name = updateData.name.trim();
      hasChanges = true;
    }

    if (updateData.examine !== undefined) {
      if (typeof updateData.examine !== 'string') {
        throw new Error('Examine must be a string');
      }
      updates.examine = updateData.examine.trim();
      hasChanges = true;
    }

    if (updateData.members !== undefined) {
      updates.members = Boolean(updateData.members);
      hasChanges = true;
    }

    if (updateData.weight !== undefined) {
      updates.weight = Math.max(0, Number(updateData.weight));
      hasChanges = true;
    }

    if (updateData.icon !== undefined) {
      updates.icon = updateData.icon || null;
      hasChanges = true;
    }

    if (updateData.status !== undefined) {
      updates.status = updateData.status;
      hasChanges = true;
    }

    // Update alchemy info if provided
    if (updateData.lowalch !== undefined || updateData.highalch !== undefined) {
      const newLowalch = updateData.lowalch !== undefined ?
        Math.max(0, Number(updateData.lowalch)) : this.#alchemy.lowalch;
      const newHighalch = updateData.highalch !== undefined ?
        Math.max(0, Number(updateData.highalch)) : this.#alchemy.highalch;

      updates.alchemy = new AlchemyInfo({
        lowalch: newLowalch,
        highalch: newHighalch
      });
      hasChanges = true;
    }

    // Update market info if provided
    const marketUpdates = {};
    let hasMarketChanges = false;

    if (updateData.value !== undefined) {
      marketUpdates.value = Math.max(1, Number(updateData.value));
      hasMarketChanges = true;
    }

    if (updateData.buyLimit !== undefined) {
      marketUpdates.buyLimit = updateData.buyLimit ?
        Math.max(0, Number(updateData.buyLimit)) : null;
      hasMarketChanges = true;
    }

    if (updateData.tradeable_on_ge !== undefined) {
      marketUpdates.tradeableOnGE = Boolean(updateData.tradeable_on_ge);
      hasMarketChanges = true;
    }

    if (updateData.stackable !== undefined) {
      marketUpdates.stackable = Boolean(updateData.stackable);
      hasMarketChanges = true;
    }

    if (updateData.noted !== undefined) {
      marketUpdates.noted = Boolean(updateData.noted);
      hasMarketChanges = true;
    }

    if (hasMarketChanges) {
      updates.market = { ...this.#market, ...marketUpdates };
      hasChanges = true;
    }

    if (!hasChanges) {
      this.#logger.debug('No changes to apply', { itemId: this.#id.value });
      return;
    }

    // Apply updates
    Object.assign(this, updates);
    if (updates.alchemy) {
      this.#alchemy = updates.alchemy;
    }
    if (updates.market) {
      this.#market = updates.market;
    }

    // Update audit info
    this.#audit.updatedAt = new Date();
    this.#audit.version += 1;

    this.#logger.debug('Item updated', {
      itemId: this.#id.value,
      changes: Object.keys(updates)
    });
  }

  /**
   * Calculate alchemy profit at current market value
   * @returns {number} Alchemy profit
   */
  getAlchemyProfit() {
    return this.#alchemy.calculateProfit(this.#market.value);
  }

  /**
   * Check if alchemy is profitable at current market value
   * @returns {boolean} True if profitable
   */
  isProfitableAlchemy() {
    return this.#alchemy.isProfitable(this.#market.value);
  }

  /**
   * Get item category based on properties and name
   * @returns {ItemCategory} Item category
   */
  getCategory() {
    const name = this.#name.toLowerCase();

    // Specific category patterns
    if (name.includes('rune') && !name.includes('weapon') && !name.includes('armor')) {
      return 'runes';
    }

    if (name.includes('potion') || name.includes('brew') || name.includes('barbarian herblore')) {
      return 'potions';
    }

    if (name.includes('food') || name.includes('fish') || name.includes('meat') ||
        name.includes('bread') || name.includes('cake') || name.includes('pie')) {
      return 'food';
    }

    if (name.includes('sword') || name.includes('bow') || name.includes('staff') ||
        name.includes('dagger') || name.includes('axe') || name.includes('mace')) {
      return 'weapons';
    }

    if (name.includes('helmet') || name.includes('chestplate') || name.includes('platebody') ||
        name.includes('shield') || name.includes('boots') || name.includes('gloves')) {
      return 'armor';
    }

    if (name.includes('pickaxe') || name.includes('hatchet') || name.includes('hammer') ||
        name.includes('chisel') || name.includes('needle')) {
      return 'tools';
    }

    if (name.includes('ore') || name.includes('log') || name.includes('hide') ||
        name.includes('bone') || name.includes('gem')) {
      return 'resources';
    }

    // Value-based categories
    if (this.#alchemy.highalch > 10000) {
      return 'high_value';
    }

    // Membership-based categories
    if (this.#members) {
      return 'members';
    }

    return 'general';
  }

  /**
   * Check if item needs synchronization
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {boolean} True if sync needed
   */
  needsSync(maxAgeMs = TimeConstants.ONE_DAY) {
    const age = Date.now() - this.#audit.lastSyncedAt.getTime();
    return age > maxAgeMs;
  }

  /**
   * Mark item as synced
   */
  markSynced() {
    this.#audit.lastSyncedAt = new Date();
    this.#audit.updatedAt = new Date();

    this.#logger.debug('Item marked as synced', { itemId: this.#id.value });
  }

  /**
   * Mark item as deprecated
   */
  deprecate() {
    this.#status = 'deprecated';
    this.#audit.updatedAt = new Date();
    this.#audit.version += 1;

    this.#logger.info('Item deprecated', { itemId: this.#id.value });
  }

  /**
   * Mark item as removed
   */
  remove() {
    this.#status = 'removed';
    this.#audit.updatedAt = new Date();
    this.#audit.version += 1;

    this.#logger.info('Item removed', { itemId: this.#id.value });
  }

  /**
   * Check if item is active
   * @returns {boolean} True if active
   */
  isActive() {
    return this.#status === 'active';
  }

  /**
   * Get serializable data for persistence
   * @returns {Object} Persistence data
   */
  toPersistenceData() {
    return {
      itemId: this.#id.value,
      name: this.#name,
      examine: this.#examine,
      members: this.#members,
      lowalch: this.#alchemy.lowalch,
      highalch: this.#alchemy.highalch,
      tradeable_on_ge: this.#market.tradeableOnGE,
      stackable: this.#market.stackable,
      noted: this.#market.noted,
      value: this.#market.value,
      buy_limit: this.#market.buyLimit,
      weight: this.#weight,
      icon: this.#icon,
      status: this.#status,
      dataSource: this.#dataSource,
      createdAt: this.#audit.createdAt,
      updatedAt: this.#audit.updatedAt,
      lastSyncedAt: this.#audit.lastSyncedAt,
      version: this.#audit.version
    };
  }

  /**
   * Get JSON representation
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.#id.value,
      name: this.#name,
      examine: this.#examine,
      members: this.#members,
      alchemy: this.#alchemy.toJSON(),
      market: this.#market,
      weight: this.#weight,
      icon: this.#icon,
      category: this.getCategory(),
      status: this.#status,
      dataSource: this.#dataSource,
      audit: this.#audit,
      alchemyProfit: this.getAlchemyProfit(),
      isProfitableAlchemy: this.isProfitableAlchemy()
    };
  }

  /**
   * Create Item from creation data
   * @param {ItemCreationData} data - Creation data
   * @returns {Item} New Item instance
   */
  static create(data) {
    return new Item(data);
  }

  /**
   * Create Item from persistence data
   * @param {Object} data - Persistence data
   * @returns {Item} Restored Item instance
   */
  static fromPersistenceData(data) {
    const item = new Item({
      itemId: data.itemId,
      name: data.name,
      examine: data.examine,
      members: data.members,
      lowalch: data.lowalch,
      highalch: data.highalch,
      tradeable_on_ge: data.tradeable_on_ge,
      stackable: data.stackable,
      noted: data.noted,
      value: data.value,
      buyLimit: data.buy_limit,
      weight: data.weight,
      icon: data.icon,
      status: data.status,
      dataSource: data.dataSource
    });

    // Restore audit information
    if (data.createdAt) {
      item.#audit.createdAt = new Date(data.createdAt);
    }
    if (data.updatedAt) {
      item.#audit.updatedAt = new Date(data.updatedAt);
    }
    if (data.lastSyncedAt) {
      item.#audit.lastSyncedAt = new Date(data.lastSyncedAt);
    }
    if (data.version) {
      item.#audit.version = data.version;
    }

    return item;
  }
}

module.exports = { Item };
