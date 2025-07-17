/**
 * 🏛️ MongoDB Item Repository - Concrete implementation of IItemRepository
 * 
 * Context7 Pattern: Repository Pattern implementation for MongoDB
 * - SOLID: Liskov Substitution - can replace IItemRepository
 * - DRY: Reusable MongoDB operations and query patterns
 * - Infrastructure layer: Handles external concerns (database)
 */

const { IItemRepository } = require('../../domain/repositories/IItemRepository');
const { Item } = require('../../domain/entities/Item');
const { ItemId } = require('../../domain/value-objects/ItemId');
const { ItemModel } = require('../../models/ItemModel');
const { Logger } = require('../../utils/Logger');

/**
 * @typedef {import('../../types/domain/Item.js').ItemSearchCriteria} ItemSearchCriteria
 * @typedef {import('../../types/shared/Common.js').PaginationOptions} PaginationOptions
 * @typedef {import('../../types/shared/Common.js').PaginationResult} PaginationResult
 * @typedef {import('../../types/shared/Common.js').BulkOperationResult} BulkOperationResult
 * @typedef {import('../../types/domain/Item.js').ItemStatistics} ItemStatistics
 */

class MongoItemRepository extends IItemRepository {
  /**
   * @private
   * @type {Logger}
   */
  #logger;

  /**
   * @private
   * @type {Object}
   */
  #defaultProjection;

  constructor() {
    super();
    this.#logger = new Logger('MongoItemRepository');
    this.#defaultProjection = { __v: 0 };
  }

  /**
   * Convert domain Item entity to MongoDB document
   * @private
   * @param {Item} item - Domain item entity
   * @returns {Object} MongoDB document data
   */
  #itemToDocument(item) {
    return item.toPersistenceData();
  }

  /**
   * Convert MongoDB document to domain Item entity
   * @private
   * @param {Object} doc - MongoDB document
   * @returns {Item} Domain item entity
   */
  #documentToItem(doc) {
    if (!doc) return null;
    return Item.fromPersistenceData(doc);
  }

  /**
   * Build MongoDB query from search criteria
   * @private
   * @param {ItemSearchCriteria} criteria - Search criteria
   * @returns {Object} MongoDB query object
   */
  #buildQuery(criteria) {
    const query = { status: 'active' };

    if (criteria.searchTerm) {
      query.$text = { $search: criteria.searchTerm };
    }

    if (criteria.members !== undefined) {
      query.members = criteria.members;
    }

    if (criteria.tradeable !== undefined) {
      query.tradeable_on_ge = criteria.tradeable;
    }

    if (criteria.stackable !== undefined) {
      query.stackable = criteria.stackable;
    }

    if (criteria.category) {
      // Map category to MongoDB query patterns
      switch (criteria.category) {
        case 'runes':
          query.name = { $regex: /rune/i };
          break;
        case 'potions':
          query.name = { $regex: /potion/i };
          break;
        case 'food':
          query.name = { $regex: /food|fish|meat|bread|cake/i };
          break;
        case 'high_value':
          query.highalch = { $gt: 10000 };
          break;
        case 'members':
          query.members = true;
          break;
        case 'free':
          query.members = false;
          break;
      }
    }

    if (criteria.minValue !== undefined || criteria.maxValue !== undefined) {
      query.value = {};
      if (criteria.minValue !== undefined) {
        query.value.$gte = criteria.minValue;
      }
      if (criteria.maxValue !== undefined) {
        query.value.$lte = criteria.maxValue;
      }
    }

    if (criteria.status) {
      query.status = criteria.status;
    }

    return query;
  }

  async findById(itemId, options = {}) {
    try {
      this.#logger.debug('Finding item by ID', { itemId: itemId.value });

      const query = ItemModel.findOne({ 
        itemId: itemId.value,
        ...(options.includeInactive ? {} : { status: 'active' })
      });

      query.select(this.#defaultProjection);
      
      if (options.lean) {
        query.lean();
      }

      const doc = await query.exec();
      const item = this.#documentToItem(doc);

      this.#logger.debug('Item search completed', {
        itemId: itemId.value,
        found: !!item
      });

      return item;
    } catch (error) {
      this.#logger.error('Error finding item by ID', error, { itemId: itemId.value });
      throw error;
    }
  }

  async findByIds(itemIds, options = {}) {
    try {
      const values = ItemId.toValueArray(itemIds);
      this.#logger.debug('Finding items by IDs', { 
        count: values.length,
        sample: values.slice(0, 5)
      });

      const query = ItemModel.find({
        itemId: { $in: values },
        ...(options.includeInactive ? {} : { status: 'active' })
      });

      query.select(this.#defaultProjection);

      if (options.sort) {
        query.sort(options.sort);
      }

      if (options.lean) {
        query.lean();
      }

      const docs = await query.exec();
      const items = docs.map(doc => this.#documentToItem(doc));

      this.#logger.debug('Items found by IDs', {
        requested: values.length,
        found: items.length
      });

      return items;
    } catch (error) {
      this.#logger.error('Error finding items by IDs', error, {
        itemCount: itemIds.length
      });
      throw error;
    }
  }

  async search(criteria, pagination = {}) {
    try {
      this.#logger.debug('Searching items', { criteria, pagination });

      const query = this.#buildQuery(criteria);
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const skip = (page - 1) * limit;

      // Build projection for text search scoring
      let projection = this.#defaultProjection;
      if (criteria.searchTerm) {
        projection = {
          ...projection,
          score: { $meta: 'textScore' }
        };
      }

      const [docs, totalCount] = await Promise.all([
        ItemModel.find(query, projection)
          .sort(criteria.searchTerm ? 
            { score: { $meta: 'textScore' } } : 
            (pagination.sort || { name: 1 })
          )
          .skip(skip)
          .limit(limit)
          .exec(),
        ItemModel.countDocuments(query)
      ]);

      const items = docs.map(doc => this.#documentToItem(doc));
      
      const totalPages = Math.ceil(totalCount / limit);
      const paginationResult = {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };

      this.#logger.debug('Search completed', {
        totalCount,
        returnedCount: items.length,
        page
      });

      return { items, pagination: paginationResult };
    } catch (error) {
      this.#logger.error('Error searching items', error, { criteria });
      throw error;
    }
  }

  async searchByName(searchTerm, options = {}) {
    try {
      this.#logger.debug('Searching items by name', { searchTerm, options });

      const query = ItemModel.find({
        $text: { $search: searchTerm },
        status: 'active'
      }, {
        score: { $meta: 'textScore' },
        ...this.#defaultProjection
      });

      query.sort({ score: { $meta: 'textScore' } });

      if (options.limit) {
        query.limit(options.limit);
      }

      if (options.members !== undefined) {
        query.where('members').equals(options.members);
      }

      if (options.tradeable !== undefined) {
        query.where('tradeable_on_ge').equals(options.tradeable);
      }

      const docs = await query.exec();
      const items = docs.map(doc => this.#documentToItem(doc));

      this.#logger.debug('Name search completed', {
        searchTerm,
        resultCount: items.length
      });

      return items;
    } catch (error) {
      this.#logger.error('Error searching items by name', error, { searchTerm });
      throw error;
    }
  }

  async getHighValueItems(options = {}) {
    try {
      const minValue = options.minValue || 100000;
      const limit = options.limit || 50;

      this.#logger.debug('Getting high-value items', { minValue, limit });

      const query = ItemModel.find({
        value: { $gte: minValue },
        tradeable_on_ge: true,
        status: 'active'
      }, this.#defaultProjection);

      query.sort({ value: -1 }).limit(limit);

      if (options.members !== undefined) {
        query.where('members').equals(options.members);
      }

      const docs = await query.exec();
      const items = docs.map(doc => this.#documentToItem(doc));

      this.#logger.debug('High-value items retrieved', {
        minValue,
        count: items.length
      });

      return items;
    } catch (error) {
      this.#logger.error('Error getting high-value items', error, { options });
      throw error;
    }
  }

  async getItemsRequiringSync(maxAge = 24 * 60 * 60 * 1000) {
    try {
      const cutoff = new Date(Date.now() - maxAge);

      this.#logger.debug('Getting items requiring sync', { cutoff });

      const docs = await ItemModel.find({
        $or: [
          { lastSyncedAt: { $lt: cutoff } },
          { lastSyncedAt: { $exists: false } }
        ],
        status: 'active'
      }, this.#defaultProjection)
      .sort({ lastSyncedAt: 1 })
      .exec();

      const items = docs.map(doc => this.#documentToItem(doc));

      this.#logger.debug('Items requiring sync found', {
        count: items.length
      });

      return items;
    } catch (error) {
      this.#logger.error('Error getting items requiring sync', error);
      throw error;
    }
  }

  async getItemsByCategory(category, options = {}) {
    try {
      this.#logger.debug('Getting items by category', { category, options });

      const criteria = { category, status: 'active' };
      if (options.tradeable !== undefined) {
        criteria.tradeable = options.tradeable;
      }

      const query = this.#buildQuery(criteria);
      const mongoQuery = ItemModel.find(query, this.#defaultProjection);

      if (options.sort) {
        mongoQuery.sort(options.sort);
      } else {
        mongoQuery.sort({ name: 1 });
      }

      if (options.limit) {
        mongoQuery.limit(options.limit);
      }

      const docs = await mongoQuery.exec();
      const items = docs.map(doc => this.#documentToItem(doc));

      this.#logger.debug('Items retrieved by category', {
        category,
        count: items.length
      });

      return items;
    } catch (error) {
      this.#logger.error('Error getting items by category', error, { category });
      throw error;
    }
  }

  async getPaginatedItems(pagination, filters = {}) {
    try {
      const page = Math.max(1, pagination.page || 1);
      const limit = Math.min(100, Math.max(1, pagination.limit || 20));
      const skip = (page - 1) * limit;

      this.#logger.debug('Getting paginated items', { page, limit, filters });

      const query = { status: 'active', ...filters };

      const [docs, totalCount] = await Promise.all([
        ItemModel.find(query, this.#defaultProjection)
          .sort(pagination.sort || { name: 1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        ItemModel.countDocuments(query)
      ]);

      const items = docs.map(doc => this.#documentToItem(doc));
      
      const totalPages = Math.ceil(totalCount / limit);
      const paginationResult = {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };

      this.#logger.debug('Paginated items retrieved', {
        page,
        limit,
        totalCount,
        itemCount: items.length
      });

      return { items, pagination: paginationResult };
    } catch (error) {
      this.#logger.error('Error getting paginated items', error, { pagination, filters });
      throw error;
    }
  }

  async save(item) {
    try {
      this.#logger.debug('Saving item', {
        itemId: item.id.value,
        name: item.name
      });

      const data = this.#itemToDocument(item);
      
      const doc = await ItemModel.findOneAndUpdate(
        { itemId: item.id.value },
        { $set: data },
        {
          new: true,
          upsert: true,
          runValidators: true,
          select: this.#defaultProjection
        }
      );

      const savedItem = this.#documentToItem(doc);

      this.#logger.info('Item saved successfully', {
        itemId: item.id.value,
        name: item.name
      });

      return savedItem;
    } catch (error) {
      this.#logger.error('Error saving item', error, {
        itemId: item.id.value
      });
      throw error;
    }
  }

  async saveMany(items, options = {}) {
    try {
      this.#logger.debug('Saving multiple items', { count: items.length });

      const operations = items.map(item => {
        const data = this.#itemToDocument(item);
        return {
          updateOne: {
            filter: { itemId: item.id.value },
            update: { $set: data },
            upsert: options.upsert !== false
          }
        };
      });

      const result = await ItemModel.bulkWrite(operations, {
        ordered: options.ordered || false
      });

      const bulkResult = {
        success: true,
        upserted: result.upsertedCount,
        modified: result.modifiedCount,
        matched: result.matchedCount,
        errors: result.writeErrors || []
      };

      this.#logger.info('Items saved successfully', {
        count: items.length,
        ...bulkResult
      });

      return bulkResult;
    } catch (error) {
      this.#logger.error('Error saving multiple items', error, {
        itemCount: items.length
      });
      throw error;
    }
  }

  async delete(itemId) {
    try {
      this.#logger.debug('Soft deleting item', { itemId: itemId.value });

      const result = await ItemModel.findOneAndUpdate(
        { itemId: itemId.value, status: 'active' },
        {
          $set: {
            status: 'removed',
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        },
        { new: true }
      );

      const deleted = !!result;

      this.#logger.info('Item deletion completed', {
        itemId: itemId.value,
        deleted
      });

      return deleted;
    } catch (error) {
      this.#logger.error('Error deleting item', error, { itemId: itemId.value });
      throw error;
    }
  }

  async hardDelete(itemId) {
    try {
      this.#logger.debug('Hard deleting item', { itemId: itemId.value });

      const result = await ItemModel.deleteOne({ itemId: itemId.value });
      const deleted = result.deletedCount > 0;

      this.#logger.info('Item hard deletion completed', {
        itemId: itemId.value,
        deleted
      });

      return deleted;
    } catch (error) {
      this.#logger.error('Error hard deleting item', error, { itemId: itemId.value });
      throw error;
    }
  }

  async markItemsAsSynced(itemIds) {
    try {
      const values = ItemId.toValueArray(itemIds);
      this.#logger.debug('Marking items as synced', { count: values.length });

      const result = await ItemModel.updateMany(
        { itemId: { $in: values } },
        {
          $set: {
            lastSyncedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      const bulkResult = {
        success: true,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: 0,
        errors: []
      };

      this.#logger.debug('Items marked as synced', bulkResult);

      return bulkResult;
    } catch (error) {
      this.#logger.error('Error marking items as synced', error, {
        itemCount: itemIds.length
      });
      throw error;
    }
  }

  async getStatistics() {
    try {
      this.#logger.debug('Getting repository statistics');

      const stats = await ItemModel.getStatistics();

      this.#logger.debug('Statistics retrieved successfully', stats);

      return stats;
    } catch (error) {
      this.#logger.error('Error getting statistics', error);
      throw error;
    }
  }

  async count(criteria = {}) {
    try {
      const query = this.#buildQuery(criteria);
      const count = await ItemModel.countDocuments(query);

      this.#logger.debug('Item count completed', { criteria, count });

      return count;
    } catch (error) {
      this.#logger.error('Error counting items', error, { criteria });
      throw error;
    }
  }

  async exists(itemId) {
    try {
      const count = await ItemModel.countDocuments({
        itemId: itemId.value,
        status: 'active'
      });

      return count > 0;
    } catch (error) {
      this.#logger.error('Error checking item existence', error, { itemId: itemId.value });
      throw error;
    }
  }

  async transaction(operation) {
    const session = await ItemModel.db.startSession();
    session.startTransaction();

    try {
      const result = await operation(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async createIndexes() {
    try {
      this.#logger.info('Creating database indexes');
      await ItemModel.createIndexes();
      this.#logger.info('Database indexes created successfully');
    } catch (error) {
      this.#logger.error('Error creating indexes', error);
      throw error;
    }
  }

  async dropIndexes() {
    try {
      this.#logger.info('Dropping database indexes');
      await ItemModel.collection.dropIndexes();
      this.#logger.info('Database indexes dropped successfully');
    } catch (error) {
      this.#logger.error('Error dropping indexes', error);
      throw error;
    }
  }

  async getHealth() {
    try {
      const stats = await ItemModel.db.db.stats();
      const ping = await ItemModel.db.db.admin().ping();

      return {
        healthy: true,
        details: {
          connected: ItemModel.db.readyState === 1,
          database: stats.db,
          collections: stats.collections,
          ping: ping.ok === 1
        }
      };
    } catch (error) {
      this.#logger.error('Error getting repository health', error);
      return {
        healthy: false,
        details: { error: error.message }
      };
    }
  }

  async backup(destination) {
    // Implementation would depend on specific backup strategy
    throw new Error('Backup functionality not yet implemented');
  }

  async restore(source, options = {}) {
    // Implementation would depend on specific restore strategy
    throw new Error('Restore functionality not yet implemented');
  }
}

module.exports = { MongoItemRepository };