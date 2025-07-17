/**
 * 🔌 Item Model Adapter - Bridge between existing ItemModel and new domain entities
 * 
 * Context7 Pattern: Adapter Pattern for gradual migration
 * - DRY: Reuses existing MongoDB schema while adding domain behavior
 * - SOLID: Single responsibility for model transformation
 * - Practical: Works with your existing codebase
 */

const { Item } = require('../entities/Item');
const { ItemId } = require('../value-objects/ItemId');
const { ItemModel } = require('../../models/ItemModel');
const { Logger } = require('../../utils/Logger');

class ItemModelAdapter {
  /**
   * @private
   * @type {Logger}
   */
  #logger;

  constructor() {
    this.#logger = new Logger('ItemModelAdapter');
  }

  /**
   * Convert MongoDB document to domain Item entity
   * @param {Object} mongoDoc - MongoDB document from ItemModel
   * @returns {Item} Domain Item entity
   */
  toDomainEntity(mongoDoc) {
    if (!mongoDoc) return null;

    try {
      // Convert MongoDB document to creation data format
      const creationData = {
        itemId: mongoDoc.itemId,
        name: mongoDoc.name,
        examine: mongoDoc.examine,
        members: mongoDoc.members,
        lowalch: mongoDoc.lowalch,
        highalch: mongoDoc.highalch,
        tradeable_on_ge: mongoDoc.tradeable_on_ge,
        stackable: mongoDoc.stackable,
        noted: mongoDoc.noted,
        value: mongoDoc.value,
        buyLimit: mongoDoc.buy_limit,
        weight: mongoDoc.weight,
        icon: mongoDoc.icon,
        status: mongoDoc.status,
        dataSource: mongoDoc.dataSource
      };

      return Item.fromPersistenceData({
        ...creationData,
        createdAt: mongoDoc.createdAt,
        updatedAt: mongoDoc.updatedAt,
        lastSyncedAt: mongoDoc.lastSyncedAt,
        version: mongoDoc.version
      });
    } catch (error) {
      this.#logger.error('Error converting MongoDB document to domain entity', error, {
        itemId: mongoDoc?.itemId
      });
      throw error;
    }
  }

  /**
   * Convert domain Item entity to MongoDB document format
   * @param {Item} domainItem - Domain Item entity
   * @returns {Object} Data suitable for MongoDB storage
   */
  toMongoDocument(domainItem) {
    try {
      return domainItem.toPersistenceData();
    } catch (error) {
      this.#logger.error('Error converting domain entity to MongoDB document', error, {
        itemId: domainItem?.id?.value
      });
      throw error;
    }
  }

  /**
   * Convert array of MongoDB documents to domain entities
   * @param {Object[]} mongoDocs - Array of MongoDB documents
   * @returns {Item[]} Array of domain Item entities
   */
  toDomainEntities(mongoDocs) {
    if (!Array.isArray(mongoDocs)) {
      return [];
    }

    return mongoDocs
      .map(doc => {
        try {
          return this.toDomainEntity(doc);
        } catch (error) {
          this.#logger.warn('Skipping invalid document', error, {
            itemId: doc?.itemId
          });
          return null;
        }
      })
      .filter(item => item !== null);
  }

  /**
   * Enhanced findById that returns domain entity
   * @param {number} itemId - Item ID
   * @param {Object} [options] - Query options
   * @returns {Promise<Item|null>} Domain Item entity or null
   */
  async findByIdEnhanced(itemId, options = {}) {
    try {
      const mongoDoc = await ItemModel.findOne({ 
        itemId, 
        status: 'active' 
      }).exec();
      
      return this.toDomainEntity(mongoDoc);
    } catch (error) {
      this.#logger.error('Error in enhanced findById', error, { itemId });
      throw error;
    }
  }

  /**
   * Enhanced find that returns domain entities
   * @param {Object} query - MongoDB query
   * @param {Object} [options] - Query options
   * @returns {Promise<Item[]>} Array of domain Item entities
   */
  async findEnhanced(query = {}, options = {}) {
    try {
      const mongoQuery = ItemModel.find(query);
      
      if (options.sort) mongoQuery.sort(options.sort);
      if (options.limit) mongoQuery.limit(options.limit);
      if (options.skip) mongoQuery.skip(options.skip);
      
      const mongoDocs = await mongoQuery.exec();
      return this.toDomainEntities(mongoDocs);
    } catch (error) {
      this.#logger.error('Error in enhanced find', error, { query });
      throw error;
    }
  }

  /**
   * Save domain entity using existing MongoDB model
   * @param {Item} domainItem - Domain Item entity
   * @returns {Promise<Item>} Saved domain Item entity
   */
  async saveEnhanced(domainItem) {
    try {
      const mongoData = this.toMongoDocument(domainItem);
      
      const savedDoc = await ItemModel.findOneAndUpdate(
        { itemId: domainItem.id.value },
        { $set: mongoData },
        { 
          new: true, 
          upsert: true, 
          runValidators: true 
        }
      );

      return this.toDomainEntity(savedDoc);
    } catch (error) {
      this.#logger.error('Error in enhanced save', error, {
        itemId: domainItem?.id?.value
      });
      throw error;
    }
  }

  /**
   * Find items using domain specifications
   * @param {Object} specification - Domain specification
   * @param {Object} [options] - Query options
   * @returns {Promise<Item[]>} Filtered domain Item entities
   */
  async findBySpecification(specification, options = {}) {
    try {
      // Get all active items first (could be optimized with better query mapping)
      const allItems = await this.findEnhanced({ status: 'active' }, options);
      
      // Apply domain specification
      return allItems.filter(item => specification.isSatisfiedBy(item));
    } catch (error) {
      this.#logger.error('Error finding by specification', error);
      throw error;
    }
  }
}

module.exports = { ItemModelAdapter };