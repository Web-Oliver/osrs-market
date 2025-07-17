/**
 * 🚀 Domain Usage Examples - How to integrate new domain entities with existing code
 * 
 * Context7 Pattern: Integration examples showing practical usage
 * - Shows how to gradually adopt domain entities
 * - Works with your existing ItemModel and services
 * - Provides immediate value without major refactoring
 */

const { Item } = require('../domain/entities/Item');
const { ItemId } = require('../domain/value-objects/ItemId');
const { AlchemyInfo } = require('../domain/value-objects/AlchemyInfo');
const { ItemSpecifications } = require('../domain/specifications/ItemSpecifications');
const { ItemDomainService } = require('../domain/services/ItemDomainService');
const { ItemModelAdapter } = require('../domain/adapters/ItemModelAdapter');

/**
 * Example 1: Enhanced Item Creation with Business Logic
 */
async function createItemWithBusinessLogic() {
  const domainService = new ItemDomainService();
  
  // Raw data from external API or user input
  const rawItemData = {
    itemId: 4151,
    name: "Abyssal whip",
    examine: "A weapon from the abyss.",
    members: true,
    lowalch: 72000,
    highalch: 120000,
    tradeable_on_ge: true,
    stackable: false,
    noted: false,
    value: 150000,
    weight: 0.5
  };

  // 1. Validate with business rules
  const validation = domainService.validateItemCreation(rawItemData);
  if (!validation.isValid) {
    console.log('Validation errors:', validation.errors);
    return;
  }

  // 2. Enrich data
  const enrichedData = domainService.enrichItemData(rawItemData);

  // 3. Create domain entity
  const item = Item.create(enrichedData);

  // 4. Use business methods
  console.log('Item category:', item.getCategory());
  console.log('Alchemy profit:', item.getAlchemyProfit());
  console.log('Is profitable alchemy:', item.isProfitableAlchemy());

  // 5. Save using adapter (works with existing MongoDB model)
  const adapter = new ItemModelAdapter();
  const savedItem = await adapter.saveEnhanced(item);
  
  console.log('Item saved with ID:', savedItem.id.value);
  return savedItem;
}

/**
 * Example 2: Enhanced Queries with Specifications
 */
async function findItemsWithBusinessRules() {
  const adapter = new ItemModelAdapter();
  
  // Find profitable alchemy items
  const profitableItems = await adapter.findBySpecification(
    ItemSpecifications.profitableAlchemy(100) // Minimum 100gp profit
  );
  
  console.log(`Found ${profitableItems.length} profitable alchemy items`);
  
  // Find high-value F2P items
  const f2pHighValue = await adapter.findBySpecification(
    ItemSpecifications.freeToPlayTradeable()
      .and(ItemSpecifications.highValueTradeable(50000))
  );
  
  console.log(`Found ${f2pHighValue.length} high-value F2P items`);
  
  // Find items needing data refresh
  const staleItems = await adapter.findBySpecification(
    ItemSpecifications.needsDataRefresh(12 * 60 * 60 * 1000) // 12 hours
  );
  
  console.log(`Found ${staleItems.length} items needing refresh`);
  
  return { profitableItems, f2pHighValue, staleItems };
}

/**
 * Example 3: Enhance Existing Service Methods
 */
class EnhancedItemMappingService {
  constructor() {
    this.adapter = new ItemModelAdapter();
    this.domainService = new ItemDomainService();
  }

  /**
   * Enhanced version of your existing mapOSRSWikiItem method
   */
  async mapOSRSWikiItemEnhanced(wikiData) {
    try {
      // 1. Transform wiki data to creation format
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
        throw new Error(`Invalid item data: ${validation.errors.join(', ')}`);
      }

      // 3. Enrich and create domain entity
      const enrichedData = this.domainService.enrichItemData(creationData);
      const item = Item.create(enrichedData);

      // 4. Apply business logic
      item.markSynced(); // Mark as freshly synced

      // 5. Save using existing infrastructure
      const savedItem = await this.adapter.saveEnhanced(item);
      
      return {
        success: true,
        item: savedItem,
        category: savedItem.getCategory(),
        alchemyProfit: savedItem.getAlchemyProfit(),
        warnings: validation.warnings
      };
    } catch (error) {
      console.error('Enhanced mapping failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Batch process items with domain validation
   */
  async batchProcessItemsEnhanced(itemsData) {
    const results = this.domainService.batchValidateItems(itemsData);
    
    const processed = [];
    const errors = [];

    for (const validData of results.valid) {
      try {
        const item = Item.create(validData);
        const saved = await this.adapter.saveEnhanced(item);
        processed.push(saved);
      } catch (error) {
        errors.push({ itemId: validData.itemId, error: error.message });
      }
    }

    return {
      processed: processed.length,
      errors: errors.length + results.invalid.length,
      details: {
        saved: processed,
        validationErrors: results.invalid,
        saveErrors: errors
      }
    };
  }

  /**
   * Get business insights about items
   */
  async getItemInsights() {
    // Get all active items
    const items = await this.adapter.findEnhanced({ status: 'active' });
    
    // Calculate comprehensive statistics
    const stats = this.domainService.calculateItemStatistics(items);
    
    // Find items by business criteria
    const insights = {
      statistics: stats,
      profitableAlchemy: this.domainService.findItemsByCriteria(items, 'profitableAlchemy'),
      flippingCandidates: this.domainService.findItemsByCriteria(items, 'flippingCandidates'),
      highValueMembers: this.domainService.findItemsByCriteria(items, 'highEndMembersEquipment'),
      needsRefresh: this.domainService.findItemsByCriteria(items, 'needsDataRefresh')
    };

    return insights;
  }
}

/**
 * Example 4: Drop-in Enhancement for Existing Controller
 */
class EnhancedItemController {
  constructor() {
    this.adapter = new ItemModelAdapter();
    this.domainService = new ItemDomainService();
  }

  /**
   * Enhanced version of existing getItem endpoint
   */
  async getItemEnhanced(req, res) {
    try {
      const itemId = new ItemId(req.params.itemId);
      const item = await this.adapter.findByIdEnhanced(itemId.value);
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Return rich domain data
      const response = {
        ...item.toJSON(),
        insights: {
          category: item.getCategory(),
          alchemyProfit: item.getAlchemyProfit(),
          isProfitableAlchemy: item.isProfitableAlchemy(),
          needsSync: item.needsSync()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Enhanced getItem error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Business-driven search endpoint
   */
  async searchByBusinessCriteria(req, res) {
    try {
      const { criteria, ...params } = req.query;
      
      const items = await this.adapter.findEnhanced({ status: 'active' });
      const filtered = this.domainService.findItemsByCriteria(items, criteria, params);
      
      const response = {
        items: filtered.map(item => item.toJSON()),
        count: filtered.length,
        criteria,
        appliedParams: params
      };

      res.json(response);
    } catch (error) {
      console.error('Business criteria search error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Export examples for use in your application
module.exports = {
  createItemWithBusinessLogic,
  findItemsWithBusinessRules,
  EnhancedItemMappingService,
  EnhancedItemController
};

/**
 * USAGE INSTRUCTIONS:
 * 
 * 1. Gradual Adoption:
 *    - Start using ItemModelAdapter in one service method
 *    - Replace complex business logic with domain entity methods
 *    - Use specifications for complex queries
 * 
 * 2. Immediate Benefits:
 *    - Type safety with ItemId value object
 *    - Centralized business logic in Item entity
 *    - Reusable business rules with specifications
 *    - Better validation and error handling
 * 
 * 3. Integration Points:
 *    - ItemMappingService: Use EnhancedItemMappingService methods
 *    - Controllers: Add enhanced endpoints alongside existing ones
 *    - Repositories: Use adapter for domain-aware queries
 * 
 * 4. Migration Strategy:
 *    - Phase 1: Use adapter in new features
 *    - Phase 2: Enhance existing critical methods
 *    - Phase 3: Gradually replace scattered business logic
 *    - Phase 4: Full domain-driven architecture (if needed)
 */