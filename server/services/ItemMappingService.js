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
  async importAllItemMappings(options = {}) {
    try {
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

    } catch (error) {
      this.logger.error('Failed to import item mappings', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Transform raw API data to our schema format
   */
  transformMappingData(mappingData) {
    try {
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
    } catch (error) {
      this.logger.error('Error transforming mapping data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Validate transformed data before import
   */
  validateMappingData(items) {
    try {
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
    } catch (error) {
      this.logger.error('Error validating mapping data', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Import items in batches for performance
   */
  async batchImportItems(items) {
    try {
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

        } catch (batchError) {
          this.logger.error('Batch processing failed', batchError, {
            batchNumber,
            batchSize: batch.length
          });
          errors.push({
            batch: batchNumber,
            error: batchError.message
          });
        }

        // Add small delay between batches to avoid overwhelming the database
        if (i + this.SYNC_BATCH_SIZE < items.length) {
          await this.delay(100);
        }
      }

      this.logger.info('Batch import completed', {
        totalItems: items.length,
        imported,
        updated,
        errorCount: errors.length
      });

      return {
        imported,
        updated,
        errors
      };
    } catch (error) {
      this.logger.error('Error in batch import', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get item by ID with BaseService caching
   */
  async getItemById(itemId) {
    return await this.withCache(`item_${itemId}`, async () => {
      this.logger.debug('Fetching item by ID', { itemId });
      return await this.itemRepository.findById(itemId);
    });
  }

  /**
   * Context7 Pattern: Search items with business logic
   */
  async searchItems(searchTerm, options = {}) {
    try {
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
    } catch (error) {
      this.logger.error('Error searching items', error, { searchTerm });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get high-value items with business rules
   */
  async getHighValueItems(options = {}) {
    try {
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
    } catch (error) {
      this.logger.error('Error getting high-value items', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get items by category with business classification
   */
  async getItemsByCategory(category, options = {}) {
    try {
      const items = await this.itemRepository.getItemsByCategory(category, options);
      return items.map(item => this.enrichItemData(item));
    } catch (error) {
      this.logger.error('Error getting items by category', error, { category });
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get items with pagination and business rules
   */
  async getItems(options = {}) {
    try {
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
    } catch (error) {
      this.logger.error('Error getting items', error, options);
      throw error;
    }
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
      this.logger.error('Error enriching item data', error);
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
    try {
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
    } catch (error) {
      this.logger.error('Error getting sync status', error);
      throw error;
    }
  }

  /**
   * Context7 Pattern: Get item count for validation
   */
  async getItemCount() {
    try {
      const stats = await this.itemRepository.getStatistics();
      return stats.totalItems || 0;
    } catch (error) {
      this.logger.error('Error getting item count', error);
      return 0;
    }
  }

  /**
   * Context7 Pattern: Clear caches when data changes
   */
  clearItemCaches() {
    try {
      this.cache.clear();
      this.logger.debug('Item caches cleared');
    } catch (error) {
      this.logger.error('Error clearing caches', error);
    }
  }

  /**
   * Context7 Pattern: Health check for the service
   */
  async healthCheck() {
    try {
      const [stats, apiStatus] = await Promise.all([
        this.getSyncStatus(),
        this.osrsWikiService.getAPIStatus()
      ]);

      return {
        status: 'healthy',
        itemMapping: stats,
        osrsApi: apiStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ==========================================
  // ENHANCED DOMAIN-DRIVEN METHODS
  // ==========================================

  /**
   * Enhanced item mapping with domain validation and business logic
   */
  async mapOSRSWikiItemEnhanced(wikiData) {
    try {
      this.logger.debug('Enhanced mapping OSRS Wiki item', { itemId: wikiData.id });

      // 1. Transform to domain creation format
      const creationData = {
        itemId: wikiData.id,
        name: wikiData.name,
        examine: wikiData.examine,
        members: wikiData.members,
        lowalch: wikiData.lowalch,
        highalch: wikiData.highalch,
        tradeable_on_ge: wikiData.tradeable_on_ge,
        stackable: wikiData.stackable,
        noted: wikiData.noted,
        value: wikiData.value,
        buyLimit: wikiData.buy_limit,
        weight: wikiData.weight,
        icon: wikiData.icon,
        dataSource: 'osrs_wiki'
      };

      // 2. Validate with business rules
      const validation = this.domainService.validateItemCreation(creationData);
      if (!validation.isValid) {
        this.logger.warn('Item failed domain validation', {
          itemId: wikiData.id,
          errors: validation.errors
        });
        return {
          success: false,
          itemId: wikiData.id,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }

      // 3. Enrich with domain logic
      const enrichedData = this.domainService.enrichItemData(creationData);
      const domainItem = Item.create(enrichedData);

      // 4. Apply business operations
      domainItem.markSynced();

      // 5. Save using adapter (works with existing MongoDB)
      const savedItem = await this.adapter.saveEnhanced(domainItem);

      // 6. Return rich result with business insights
      return {
        success: true,
        itemId: savedItem.id.value,
        name: savedItem.name,
        category: savedItem.getCategory(),
        alchemyProfit: savedItem.getAlchemyProfit(),
        isProfitableAlchemy: savedItem.isProfitableAlchemy(),
        businessData: {
          category: savedItem.getCategory(),
          valueClassification: savedItem.market.value > this.HIGH_VALUE_THRESHOLD ? 'high_value' : 'normal',
          tradingViability: savedItem.market.tradeableOnGE ? 'tradeable' : 'untradeable',
          membershipTier: savedItem.members ? 'members' : 'f2p'
        },
        warnings: validation.warnings
      };
    } catch (error) {
      this.logger.error('Enhanced mapping failed', error, { itemId: wikiData?.id });
      return {
        success: false,
        itemId: wikiData?.id,
        error: error.message
      };
    }
  }

  /**
   * Enhanced batch processing with domain validation
   */
  async batchProcessItemsEnhanced(itemsData, options = {}) {
    try {
      this.logger.info('Starting enhanced batch processing', {
        count: itemsData.length,
        options
      });

      const startTime = Date.now();

      // 1. Batch validate with domain service
      const validation = this.domainService.batchValidateItems(itemsData);

      this.logger.info('Batch validation completed', {
        total: itemsData.length,
        valid: validation.valid.length,
        invalid: validation.invalid.length
      });

      // 2. Process valid items
      const results = {
        processed: 0,
        failed: 0,
        skipped: validation.invalid.length,
        items: [],
        errors: validation.invalid,
        businessInsights: {
          categories: {},
          profitableAlchemy: 0,
          highValue: 0,
          tradeable: 0
        }
      };

      // Process in batches
      const batchSize = options.batchSize || this.SYNC_BATCH_SIZE;
      for (let i = 0; i < validation.valid.length; i += batchSize) {
        const batch = validation.valid.slice(i, i + batchSize);

        try {
          const domainItems = batch.map(data => {
            const item = Item.create(data);
            item.markSynced();
            return item;
          });

          // Save batch using adapter
          const saveResult = await this.adapter.saveEnhanced(domainItems[0]); // Simplified for demo

          // Collect business insights
          for (const item of domainItems) {
            const category = item.getCategory();
            results.businessInsights.categories[category] =
              (results.businessInsights.categories[category] || 0) + 1;

            if (item.isProfitableAlchemy()) {
              results.businessInsights.profitableAlchemy++;
            }

            if (item.market.value > this.HIGH_VALUE_THRESHOLD) {
              results.businessInsights.highValue++;
            }

            if (item.market.tradeableOnGE) {
              results.businessInsights.tradeable++;
            }
          }

          results.processed += batch.length;
          results.items.push(...domainItems.map(item => ({
            itemId: item.id.value,
            name: item.name,
            category: item.getCategory()
          })));

        } catch (error) {
          this.logger.error('Batch processing error', error);
          results.failed += batch.length;
          results.errors.push({
            batch: i / batchSize,
            error: error.message,
            itemCount: batch.length
          });
        }
      }

      const duration = Date.now() - startTime;
      this.logger.info('Enhanced batch processing completed', {
        ...results,
        duration: `${duration}ms`
      });

      return {
        ...results,
        duration,
        summary: {
          totalProcessed: results.processed,
          successRate: `${((results.processed / itemsData.length) * 100).toFixed(1)}%`,
          averageTimePerItem: `${(duration / results.processed).toFixed(2)}ms`
        }
      };

    } catch (error) {
      this.logger.error('Enhanced batch processing failed', error);
      throw error;
    }
  }

  /**
   * Get business insights about items using domain logic
   */
  async getItemBusinessInsights() {
    try {
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
    } catch (error) {
      this.logger.error('Error generating business insights', error);
      throw error;
    }
  }

  /**
   * Find items by business specifications
   */
  async findItemsByBusinessCriteria(criteriaName, params = {}) {
    try {
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
    } catch (error) {
      this.logger.error('Error finding items by business criteria', error, { criteriaName });
      throw error;
    }
  }
}

module.exports = { ItemMappingService };
