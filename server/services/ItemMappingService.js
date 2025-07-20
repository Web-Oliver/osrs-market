/**
 * 🗺️ Item Mapping Service - Context7 Business Logic Layer
 *
 * Context7 Pattern: Service Layer for Item Mapping Operations
 * - SOLID: Single Responsibility - Item mapping business logic
 * - DRY: Reusable business operations and data transformations
 * - Clean separation of concerns with repository pattern
 * - Centralized validation and business rules
 * - Performance optimization through caching and bulk operations
 */

const { BaseService } = require('./BaseService');
const { ItemRepository } = require('../repositories/ItemRepository');
const { OSRSWikiService } = require('./OSRSWikiService');
const { DataTransformer } = require('../utils/DataTransformer');

// Enhanced Domain Components
const { Item } = require('../domain/entities/Item');
const { ItemId } = require('../domain/value-objects/ItemId');
const { ItemDomainService } = require('../domain/services/ItemDomainService');
const { ItemSpecifications } = require('../domain/specifications/ItemSpecifications');
const { ItemModelAdapter } = require('../domain/adapters/ItemModelAdapter');

class ItemMappingService extends BaseService {
  constructor() {
    super('ItemMappingService', {
      enableCache: true,
      cachePrefix: 'item_mapping',
      cacheTTL: 900, // 15 minutes cache
      enableMongoDB: true
    });
    
    this.itemRepository = new ItemRepository();
    this.osrsWikiService = new OSRSWikiService();
    this.dataTransformer = new DataTransformer();

    // Enhanced Domain Components
    this.domainService = new ItemDomainService();
    this.adapter = new ItemModelAdapter();

    // Context7 Pattern: Business rule constants
    this.SYNC_BATCH_SIZE = 1000;
    this.MAX_SYNC_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.HIGH_VALUE_THRESHOLD = 100000;
  }

  /**
   * Context7 Pattern: One-time import of all item mapping data
   * This is the main method for initial data population
   */
  async importAllItemMappings() {
    return this.execute(async () => {
this.logger.info('Starting complete item mapping import');

      const startTime = Date.now();
      const forceReimport = options.force || false;

      // Check if we already have data (unless forcing reimport)
      if (!forceReimport) {
        const existingCount = await this.getItemCount();
        if (existingCount > 0) {
          this.logger.info('Item mappings already exist, skipping import', {
            existingCount,
            tip: 'Use force:true option to reimport'
          });
          return {
            success: true,
            skipped: true,
            existingCount,
            message: 'Import skipped - data already exists'
          };
        }
      }

      // Fetch all item mappings from OSRS Wiki API
      this.logger.info('Fetching item mappings from OSRS Wiki API');
      const mappingData = await this.osrsWikiService.getItemMapping();

      if (!mappingData || !Array.isArray(mappingData)) {
        throw new Error('Invalid mapping data received from OSRS Wiki API');
      }

      this.logger.info('Received item mappings from API', {
        totalItems: mappingData.length
      });

      // Transform and validate the data
      const transformedItems = this.transformMappingData(mappingData);

      // Validate the transformed data
      const validationResult = this.validateMappingData(transformedItems);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Import in batches for performance
      const importResult = await this.batchImportItems(transformedItems);

      const processingTime = Date.now() - startTime;

      this.logger.info('Item mapping import completed successfully', {
        totalItems: mappingData.length,
        imported: importResult.imported,
        updated: importResult.updated,
        errors: importResult.errors.length,
        processingTimeMs: processingTime
      });

      // Clear related caches
      await this.cache.deletePattern('item_*');

      return {
        success: true,
        totalItems: mappingData.length,
        imported: importResult.imported,
        updated: importResult.updated,
        errors: importResult.errors,
        processingTime: processingTime,
        message: 'Item mappings imported successfully'
      };
    }, 'importAllItemMappings', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Transform raw API data to our schema format
   */
  transformMappingData(mappingData) {
    this.execute(async () => {
this.logger.debug('Transforming mapping data', {
        itemCount: mappingData.length
      });

      const transformedItems = mappingData.map(apiItem => ({
        itemId: apiItem.id,
        name: apiItem.name || 'Unknown Item',
        examine: apiItem.examine || 'No description available',
        members: Boolean(apiItem.members),
        lowalch: Math.max(0, parseInt(apiItem.lowalch) || 0),
        highalch: Math.max(0, parseInt(apiItem.highalch) || 0),
        tradeable_on_ge: Boolean(apiItem.tradeable_on_ge),
        stackable: Boolean(apiItem.stackable),
        noted: Boolean(apiItem.noted),
        value: Math.max(1, parseInt(apiItem.value) || 1),
        buy_limit: apiItem.limit ? parseInt(apiItem.limit) : null,
        weight: parseFloat(apiItem.weight) || 0,
        icon: apiItem.icon || null,
        dataSource: 'osrs_wiki',
        lastSyncedAt: new Date(),
        status: 'active'
      }));

      this.logger.debug('Data transformation completed', {
        transformedCount: transformedItems.length
      });

      return transformedItems;
    }, 'operation', { logSuccess: false })
  }

  /**
   * Context7 Pattern: Validate transformed data before import
   */
  validateMappingData(items) {
    this.execute(async () => {
this.logger.debug('Validating mapping data', {
        itemCount: items.length
      });

      const errors = [];
      const seenIds = new Set();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const context = `Item ${i + 1} (ID: ${item.itemId})`;

        // Check required fields
        if (!item.itemId || !Number.isInteger(item.itemId) || item.itemId <= 0) {
          errors.push(`${context}: Invalid or missing itemId`);
        }

        if (!item.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
          errors.push(`${context}: Invalid or missing name`);
        }

        // Check for duplicates
        if (seenIds.has(item.itemId)) {
          errors.push(`${context}: Duplicate itemId found`);
        } else {
          seenIds.add(item.itemId);
        }

        // Validate alchemy values
        if (item.highalch < item.lowalch) {
          errors.push(`${context}: High alch value cannot be less than low alch value`);
        }

        // Validate numeric fields
        if (item.value < 0 || item.lowalch < 0 || item.highalch < 0) {
          errors.push(`${context}: Negative values not allowed`);
        }

        // Stop after too many errors to prevent log spam
        if (errors.length > 100) {
          errors.push('... and more (validation stopped due to too many errors)');
          break;
        }
      }

      const isValid = errors.length === 0;

      this.logger.debug('Data validation completed', {
        isValid,
        errorCount: errors.length,
        validItems: items.length - errors.length
      });

      return {
        isValid,
        errors,
        validItemCount: isValid ? items.length : items.length - errors.length
      };
    }, 'operation', { logSuccess: false })
  }

  /**
   * Context7 Pattern: Import items in batches for performance
   */
  async batchImportItems() {
    return this.execute(async () => {
this.logger.info('Starting batch import', {
        totalItems: items.length,
        batchSize: this.SYNC_BATCH_SIZE
      });

      let imported = 0;
      let updated = 0;
      const errors = [];

      // Process in batches
      for (let i = 0; i < items.length; i += this.SYNC_BATCH_SIZE) {
        const batch = items.slice(i, i + this.SYNC_BATCH_SIZE);
        const batchNumber = Math.floor(i / this.SYNC_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(items.length / this.SYNC_BATCH_SIZE);

        this.logger.debug('Processing batch', {
          batchNumber,
          totalBatches,
          batchSize: batch.length
        });

        try {
          const batchResult = await this.itemRepository.upsertItems(batch);

          imported += batchResult.upserted;
          updated += batchResult.modified;

          if (batchResult.errors && batchResult.errors.length > 0) {
            errors.push(...batchResult.errors);
          }

          this.logger.debug('Batch processed successfully', {
            batchNumber,
            upserted: batchResult.upserted,
            modified: batchResult.modified,
            errors: batchResult.errors.length
          });
    }, 'batchImportItems', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get item by ID with BaseService caching
   */
  async getItemById() {
    return this.execute(async () => {
this.logger.debug('Searching items', { searchTerm, options });

      // Apply business rules
      const searchOptions = {
        limit: Math.min(options.limit || 20, 100), // Max 100 results
        members: options.members,
        tradeable: options.tradeable
      };

      const items = await this.itemRepository.searchByName(searchTerm, searchOptions);

      // Add business logic enrichments
      const enrichedItems = items.map(item => this.enrichItemData(item));

      return enrichedItems;
    }, 'getItemById', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get high-value items with business rules
   */
  async getHighValueItems() {
    return this.execute(async () => {
const businessOptions = {
        minValue: options.minValue || this.HIGH_VALUE_THRESHOLD,
        limit: Math.min(options.limit || 50, 100),
        members: options.members
      };

      const items = await this.itemRepository.getHighValueItems(businessOptions);

      // Sort by business value (considering alchemy profit)
      const enrichedItems = items
        .map(item => this.enrichItemData(item))
        .sort((a, b) => b.businessValue - a.businessValue);

      return enrichedItems;
    }, 'getHighValueItems', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get items by category with business classification
   */
  async getItemsByCategory() {
    return this.execute(async () => {
const items = await this.itemRepository.getItemsByCategory(category, options);
      return items.map(item => this.enrichItemData(item));
    }, 'getItemsByCategory', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get items with pagination and business rules
   */
  async getItems() {
    return this.execute(async () => {
// Apply business validation to options
      const validatedOptions = {
        page: Math.max(1, options.page || 1),
        limit: Math.min(100, Math.max(1, options.limit || 20)),
        members: options.members,
        tradeable: options.tradeable,
        minValue: options.minValue ? Math.max(0, options.minValue) : undefined,
        maxValue: options.maxValue ? Math.max(0, options.maxValue) : undefined,
        sort: options.sort || { name: 1 }
      };

      const result = await this.itemRepository.getPaginatedItems(validatedOptions);

      // Enrich items with business data
      result.items = result.items.map(item => this.enrichItemData(item));

      return result;
    }, 'getItems', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Enrich item data with business calculations
   */
  enrichItemData(item) {
    try {
      const itemObj = item.toObject ? item.toObject() : item;

      // Calculate business metrics
      const alchemyProfit = Math.max(0, itemObj.highalch - itemObj.value - 200); // Nature rune cost
      const isProfitableAlchemy = alchemyProfit > 0;
      const profitMargin = itemObj.value > 0 ? (alchemyProfit / itemObj.value) * 100 : 0;

      // Business value score (combines value and profit potential)
      const businessValue = itemObj.value + (alchemyProfit * 2);

      // Category classification
      const category = this.classifyItem(itemObj);

      return {
        ...itemObj,
        // Business calculations
        alchemyProfit,
        isProfitableAlchemy,
        profitMargin: Math.round(profitMargin * 100) / 100,
        businessValue,
        category,
        // Convenience flags
        isHighValue: itemObj.value >= this.HIGH_VALUE_THRESHOLD,
        isTradeable: itemObj.tradeable_on_ge,
        isMembersOnly: itemObj.members
      };
    } catch (error) {
      // Error handling moved to centralized manager - context: Error enriching item data
      return item;
    }
  }

  /**
   * Context7 Pattern: Classify items based on business rules
   */
  classifyItem(item) {
    const name = item.name.toLowerCase();

    if (name.includes('rune')) {
      return 'runes';
    }
    if (name.includes('potion') || name.includes('brew')) {
      return 'potions';
    }
    if (name.includes('food') || name.includes('fish') || name.includes('meat') ||
        name.includes('bread') || name.includes('cake')) {
      return 'food';
    }
    if (name.includes('ore') || name.includes('bar')) {
      return 'smithing';
    }
    if (name.includes('log') || name.includes('plank')) {
      return 'woodcutting';
    }
    if (name.includes('seed') || name.includes('herb')) {
      return 'farming';
    }
    if (item.highalch > 10000) {
      return 'high_value';
    }
    if (item.members) {
      return 'members';
    }

    return 'general';
  }

  /**
   * Context7 Pattern: Get synchronization status
   */
  async getSyncStatus() {
    return this.execute(async () => {
const [stats, oldItems] = await Promise.all([
        this.itemRepository.getStatistics(),
        this.itemRepository.getItemsRequiringSync(this.MAX_SYNC_AGE)
      ]);

      const syncStatus = {
        totalItems: stats.totalItems || 0,
        lastSyncDate: stats.lastSyncDate,
        itemsRequiringSync: oldItems.length,
        syncHealth: oldItems.length === 0 ? 'healthy' :
          oldItems.length < 100 ? 'good' :
            oldItems.length < 1000 ? 'needs_attention' : 'critical'
      };

      return {
        ...stats,
        sync: syncStatus
      };
    }, 'getSyncStatus', { logSuccess: true });
  }

  /**
   * Context7 Pattern: Get item count for validation
   */
  async getItemCount() {
    return this.execute(async () => {
const stats = await this.itemRepository.getStatistics();
      return stats.totalItems || 0;
    }, 'getItemCount', { logSuccess: true });
  }

  /**
   * Get business insights about items using domain logic
   */
  async getItemBusinessInsights() {
    return this.execute(async () => {
this.logger.debug('Generating business insights');

      // Get all active items as domain entities
      const items = await this.adapter.findEnhanced({ status: 'active' });

      // Generate comprehensive statistics
      const stats = this.domainService.calculateItemStatistics(items);

      // Find items by business criteria
      const insights = {
        statistics: stats,
        businessCategories: {
          profitableAlchemy: this.domainService.findItemsByCriteria(items, 'profitableAlchemy').length,
          flippingCandidates: this.domainService.findItemsByCriteria(items, 'flippingCandidates').length,
          highValueTradeable: this.domainService.findItemsByCriteria(items, 'highValueTradeable').length,
          newPlayerFriendly: this.domainService.findItemsByCriteria(items, 'newPlayerFriendly').length,
          highEndMembersEquipment: this.domainService.findItemsByCriteria(items, 'highEndMembersEquipment').length,
          needsDataRefresh: this.domainService.findItemsByCriteria(items, 'needsDataRefresh').length
        },
        topItems: {
          highestValue: items
            .sort((a, b) => b.market.value - a.market.value)
            .slice(0, 10)
            .map(item => ({
              itemId: item.id.value,
              name: item.name,
              value: item.market.value,
              category: item.getCategory()
            })),
          mostProfitableAlchemy: items
            .filter(item => item.isProfitableAlchemy())
            .sort((a, b) => b.getAlchemyProfit() - a.getAlchemyProfit())
            .slice(0, 10)
            .map(item => ({
              itemId: item.id.value,
              name: item.name,
              profit: item.getAlchemyProfit(),
              category: item.getCategory()
            }))
        }
      };

      this.logger.debug('Business insights generated', {
        totalItems: items.length,
        categoriesAnalyzed: Object.keys(insights.businessCategories).length
      });

      return insights;
    }, 'getItemBusinessInsights', { logSuccess: true });
  }

  /**
   * Find items by business specifications
   */
  async findItemsByBusinessCriteria() {
    return this.execute(async () => {
this.logger.debug('Finding items by business criteria', { criteriaName, params });

      const items = await this.adapter.findEnhanced({ status: 'active' });
      const filtered = this.domainService.findItemsByCriteria(items, criteriaName, params);

      return {
        criteriaName,
        params,
        items: filtered.map(item => ({
          ...item.toJSON(),
          businessInsights: {
            category: item.getCategory(),
            alchemyProfit: item.getAlchemyProfit(),
            isProfitableAlchemy: item.isProfitableAlchemy(),
            needsSync: item.needsSync()
          }
        })),
        count: filtered.length,
        summary: {
          totalScanned: items.length,
          matchRate: `${((filtered.length / items.length) * 100).toFixed(1)}%`
        }
      };
    }, 'findItemsByBusinessCriteria', { logSuccess: true });
  }
}

module.exports = { ItemMappingService };
