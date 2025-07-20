/**
 * 🏛️ Item Repository - Context7 Data Access Layer
 *
 * Context7 Pattern: Repository Pattern for Data Access
 * - SOLID: Single Responsibility - Item data access operations
 * - DRY: Reusable query patterns and data transformations
 * - Clean separation between business logic and data access
 * - Centralized error handling and logging
 * - Performance optimized queries with proper indexing
 */

const { BaseService } = require('../services/BaseService');
const { ItemModel } = require('../models/ItemModel');
const { DataTransformer } = require('../utils/DataTransformer');
const { AppConstants } = require('../config/AppConstants');

// DOMAIN ENTITIES INTEGRATION
const { Item } = require('../domain/entities/Item');
const { ItemId } = require('../domain/value-objects/ItemId');
const { ItemModelAdapter } = require('../domain/adapters/ItemModelAdapter');


class ItemRepository extends BaseService {
  constructor() {
    super('ItemRepository', {
      enableCache: true,
      cachePrefix: 'item_repo',
      cacheTTL: 1800, // 30 minutes
      enableMongoDB: true
    });
    
    this.dataTransformer = new DataTransformer();
    this.adapter = new ItemModelAdapter();
    this.defaultProjection = {
      __v: 0 // Exclude version key from results
    };
  }

  /**
   * ENHANCED: Find item by ID returning domain entity
   */
  async findById(itemId, options = {}) {
    return this.execute(async () => {
      // Convert to ItemId value object if needed
      const id = typeof itemId === 'number' ? new ItemId(itemId) : itemId;
      this.logger.debug('Finding item by ID (ENHANCED)', { itemId: id.value });

      // Use adapter for domain entity conversion
      const domainItem = await this.adapter.findByIdEnhanced(id.value, options);

      if (!domainItem) {
        this.logger.debug('Item not found', { itemId: id.value });
        return null;
      }

      this.logger.debug('Item found successfully (ENHANCED)', {
        itemId: id.value,
        name: domainItem.name,
        category: domainItem.getCategory(),
        alchemyProfit: domainItem.getAlchemyProfit()
      });

      return domainItem;
    }, 'findById', { logSuccess: true });
  }

  /**
   * ENHANCED: Find multiple items by IDs returning domain entities
   */
  async findByIds(itemIds, options = {}) {
    return this.execute(async () => {
      // Convert to ItemId value objects if needed
      const ids = itemIds.map(id => typeof id === 'number' ? new ItemId(id) : id);
      const values = ids.map(id => id.value);

      this.logger.debug('Finding items by IDs (ENHANCED)', {
        count: values.length,
        sample: values.slice(0, 5)
      });

      // Use adapter for domain entity conversion
      const domainItems = await this.adapter.findEnhanced({
        itemId: { $in: values },
        status: 'active'
      }, options);

      this.logger.debug('Items found successfully (ENHANCED)', {
        requested: values.length,
        found: domainItems.length,
        categories: [...new Set(domainItems.map(item => item.getCategory()))]
      });

      return domainItems;
    }, 'findByIds', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Search items with text search optimization
   */
  async searchByName(searchTerm, options = {}) {
    return this.execute(async () => {
      this.logger.debug('Searching items by name', {
        searchTerm,
        options
      });

      const query = ItemModel.find({
        $text: { $search: searchTerm },
        status: 'active'
      }, {
        score: { $meta: 'textScore' },
        ...this.defaultProjection
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

      const items = await query.exec();

      this.logger.debug('Search completed successfully', {
        searchTerm,
        resultCount: items.length
      });

      return items;
    }, 'searchByName', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get high-value tradeable items
   */
  async getHighValueItems(options = {}) {
    return this.execute(async () => {
      const minValue = options.minValue || AppConstants.OSRS.HIGH_VALUE_THRESHOLD;
      const limit = options.limit || 50;

      this.logger.debug('Getting high-value items', {
        minValue,
        limit
      });

      const query = ItemModel.find({
        value: { $gte: minValue },
        tradeable_on_ge: true,
        status: 'active'
      }, this.defaultProjection);

      query.sort({ value: -1 }).limit(limit);

      if (options.members !== undefined) {
        query.where('members').equals(options.members);
      }

      const items = await query.exec();

      this.logger.debug('High-value items retrieved', {
        minValue,
        count: items.length
      });

      return items;
    }, 'getHighValueItems', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get items requiring sync with age-based filtering
   */
  async getItemsRequiringSync(maxAge) {
    return this.execute(async () => {
      const cutoff = new Date(Date.now() - maxAge);

      this.logger.debug('Getting items requiring sync', {
        cutoff,
        maxAgeHours: maxAge / (60 * 60 * 1000)
      });

      const items = await ItemModel.find({
        $or: [
          { lastSyncedAt: { $lt: cutoff } },
          { lastSyncedAt: { $exists: false } }
        ],
        status: 'active'
      }, this.defaultProjection)
        .sort({ lastSyncedAt: 1 })
        .exec();

      this.logger.debug('Items requiring sync found', {
        count: items.length
      });

      return items;
    }, 'getItemsRequiringSync', { logSuccess: true });
  }

  /**
   * ENHANCED: Bulk upsert items using domain entities with business logic
   */
  async upsertItems(itemsData) {
    try {
      const itemCount = itemsData.length;
      this.logger.debug('Upserting items (ENHANCED)', { itemCount });

      // Create domain entities for validation and business logic
      const domainItems = [];
      const errors = [];

      for (const itemData of itemsData) {
        try {
          const domainItem = Item.create({
            ...itemData,
            status: itemData.status || 'active',
            dataSource: itemData.dataSource || 'osrs_wiki'
          });
          domainItem.markSynced(); // Mark as synced since we're importing fresh data
          domainItems.push(domainItem);
        } catch (error) {
          errors.push({ itemData, error: error.message });
          this.logger.warn('Failed to create domain item', { itemData, error: error.message });
        }
      }

      // Bulk upsert using domain entities
      const upsertResults = await Promise.allSettled(
        domainItems.map(domainItem => 
          ItemModel.findOneAndUpdate(
            { itemId: domainItem.itemId.value },
            this.adapter.toPersistence(domainItem),
            { upsert: true, new: true }
          )
        )
      );

      const successCount = upsertResults.filter(result => result.status === 'fulfilled').length;
      const failureCount = upsertResults.filter(result => result.status === 'rejected').length;

      this.logger.info('Items upsert completed (ENHANCED)', {
        total: itemCount,
        success: successCount,
        failures: failureCount + errors.length,
        domainValidationErrors: errors.length
      });

      return {
        total: itemCount,
        success: successCount,
        failures: failureCount + errors.length,
        errors: errors
      };
    } catch (error) {
      this.logger.error('Failed to upsert items', { error: error.message });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Mark items as synced with bulk update
   */
  async markItemsAsSynced(itemIds) {
    return this.execute(async () => {
      this.logger.debug('Marking items as synced', {
        count: itemIds.length
      });

      const result = await ItemModel.updateMany(
        { itemId: { $in: itemIds } },
        {
          $set: {
            lastSyncedAt: new Date(),
            updatedAt: new Date()
          }
        }
      );

      this.logger.debug('Items marked as synced', {
        matched: result.matchedCount,
        modified: result.modifiedCount
      });

      return result;
    }, 'markItemsAsSynced', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get items by category with filtering
   */
  async getItemsByCategory(category, options = {}) {
    return this.execute(async () => {
      this.logger.debug('Getting items by category', {
        category,
        options
      });

      // Build query based on category
      const query = {};

      switch (category) {
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
        query.highalch = { $gt: AppConstants.OSRS.HIGH_ALCH_THRESHOLD };
        break;
      case 'members':
        query.members = true;
        break;
      case 'free':
        query.members = false;
        break;
      default:
        // General category - no specific filter
        break;
      }

      query.status = 'active';

      const mongoQuery = ItemModel.find(query, this.defaultProjection);

      if (options.tradeable !== undefined) {
        mongoQuery.where('tradeable_on_ge').equals(options.tradeable);
      }

      if (options.sort) {
        mongoQuery.sort(options.sort);
      } else {
        mongoQuery.sort({ name: 1 });
      }

      if (options.limit) {
        mongoQuery.limit(options.limit);
      }

      const items = await mongoQuery.exec();

      this.logger.debug('Items retrieved by category', {
        category,
        count: items.length
      });

      return items;
    }, 'getItemsByCategory', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get repository statistics
   */
  async getStatistics() {
    return this.execute(async () => {
      this.logger.debug('Getting repository statistics');

      const stats = await ItemModel.getStatistics();

      this.logger.debug('Statistics retrieved successfully', stats);

      return stats;
    }, 'getStatistics', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get items with pagination
   */
  async getPaginatedItems(options = {}) {
    return this.execute(async () => {
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, Math.max(1, options.limit || 20));
      const skip = (page - 1) * limit;

      this.logger.debug('Getting paginated items', {
        page,
        limit,
        skip
      });

      const query = { status: 'active' };

      if (options.members !== undefined) {
        query.members = options.members;
      }

      if (options.tradeable !== undefined) {
        query.tradeable_on_ge = options.tradeable;
      }

      if (options.minValue) {
        query.value = { $gte: options.minValue };
      }

      if (options.maxValue) {
        query.value = { ...query.value, $lte: options.maxValue };
      }

      const [items, totalCount] = await Promise.all([
        ItemModel.find(query, this.defaultProjection)
          .sort(options.sort || { name: 1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        ItemModel.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      this.logger.debug('Paginated items retrieved', {
        page,
        limit,
        totalCount,
        totalPages,
        itemCount: items.length
      });

      return {
        items,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      };
    }, 'getPaginatedItems', { logSuccess: true });
  }

  /**
   * ENHANCED: Create single item using domain entity
   */
  async createItem(itemData) {
    return this.execute(async () => {
      this.logger.debug('Creating new item (ENHANCED)', {
        itemId: itemData.itemId,
        name: itemData.name
      });

      // Create domain entity first for validation and business logic
      const domainItem = Item.create({
        ...itemData,
        status: 'active',
        dataSource: 'manual'
      });

      // Save using adapter
      const savedItem = await this.adapter.saveEnhanced(domainItem);

      this.logger.info('Item created successfully (ENHANCED)', {
        itemId: savedItem.id.value,
        name: savedItem.name,
        category: savedItem.getCategory(),
        alchemyProfit: savedItem.getAlchemyProfit()
      });

      return savedItem;
    }, 'createItem', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Update item with optimistic concurrency
   */
  async updateItem(itemId, updateData) {
    return this.execute(async () => {
      this.logger.debug('Updating item', {
        itemId,
        updateFields: Object.keys(updateData)
      });

      const updatedItem = await ItemModel.findOneAndUpdate(
        { itemId, status: 'active' },
        {
          $set: {
            ...updateData,
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        },
        {
          new: true,
          runValidators: true,
          select: this.defaultProjection
        }
      );

      if (!updatedItem) {
        this.logger.warn('Item not found for update', { itemId });
        return null;
      }

      this.logger.info('Item updated successfully', {
        itemId,
        name: updatedItem.name,
        version: updatedItem.version
      });

      return updatedItem;
    }, 'updateItem', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Soft delete item (mark as removed)
   */
  async deleteItem(itemId) {
    return this.execute(async () => {
      this.logger.debug('Soft deleting item', { itemId });

      const deletedItem = await ItemModel.findOneAndUpdate(
        { itemId, status: 'active' },
        {
          $set: {
            status: 'removed',
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        },
        { new: true }
      );

      if (!deletedItem) {
        this.logger.warn('Item not found for deletion', { itemId });
        return null;
      }

      this.logger.info('Item soft deleted successfully', {
        itemId,
        name: deletedItem.name
      });

      return deletedItem;
    }, 'deleteItem', { logSuccess: true });
  }
}

module.exports = { ItemRepository };
