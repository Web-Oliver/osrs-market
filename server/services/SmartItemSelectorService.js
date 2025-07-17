/**
 * 🎯 Smart Item Selector Service - Context7 Optimized
 * 
 * Context7 Pattern: Service Layer for Smart Item Selection
 * - Focuses on high-value trading opportunities
 * - Reduces API calls by targeting profitable items
 * - Implements intelligent trending discovery
 * - DRY principles with reusable selection patterns
 * - SOLID architecture with single responsibility
 */

const { Logger } = require('../utils/Logger');

// 🎯 PRE-SELECTED HIGH-VALUE OSRS ITEMS (PROVEN PROFITABLE)
const TIER_S_ITEMS = [
  // Whips & High-End Weapons
  4151,   // Abyssal whip
  11802,  // Armadyl godsword
  11804,  // Bandos godsword
  11806,  // Saradomin godsword
  11808,  // Zamorak godsword
  12006,  // Abyssal tentacle
  
  // Barrows Equipment
  4708,   // Ahrim's robetop
  4710,   // Ahrim's robeskirt
  4712,   // Ahrim's staff
  4714,   // Ahrim's hood
  4716,   // Dharok's platebody
  4718,   // Dharok's platelegs
  4720,   // Dharok's helm
  4722,   // Dharok's greataxe
  
  // Dragon Equipment
  1377,   // Dragon battleaxe
  1305,   // Dragon longsword
  1434,   // Dragon mace
  3204,   // Dragon halberd
  4087,   // Dragon platelegs
  4585,   // Dragon plateskirt
  
  // High-Value Consumables
  2434,   // Prayer potion(4)
  139,    // Super strength(4)
  145,    // Super attack(4)
  157,    // Super defence(4)
  12695,  // Super combat potion(4)
  
  // Popular Runes
  554,    // Fire rune
  555,    // Water rune
  556,    // Air rune
  557,    // Earth rune
  558,    // Mind rune
  559,    // Body rune
  560,    // Death rune
  561,    // Nature rune
  562,    // Law rune
  563,    // Cosmic rune
  565,    // Blood rune
  566,    // Soul rune
];

const TIER_A_ITEMS = [
  // Ores & Bars
  440,    // Iron ore
  453,    // Coal
  449,    // Gold ore
  2357,   // Gold bar
  2359,   // Bronze bar
  2361,   // Iron bar
  2363,   // Steel bar
  2365,   // Mithril bar
  2367,   // Adamantite bar
  2369,   // Runite bar
  
  // Logs & Planks
  1511,   // Logs
  1521,   // Oak logs
  1519,   // Willow logs
  1517,   // Maple logs
  1515,   // Yew logs
  1513,   // Magic logs
  960,    // Plank
  8778,   // Oak plank
  8780,   // Teak plank
  8782,   // Mahogany plank
  
  // Food
  385,    // Shark
  391,    // Karambwan
  7946,   // Monkfish
  361,    // Tuna
  379,    // Lobster
  365,    // Bass
];

const TIER_B_ITEMS = [
  // Common Materials
  1735,   // Silver ore
  1747,   // Chocolate bar
  1901,   // Bow string
  1777,   // Bow string
  314,    // Feather
  1949,   // Chef's hat
  2309,   // Silverlight
];

class SmartItemSelectorService {
  constructor(config = {}) {
    this.logger = new Logger('SmartItemSelector');
    this.config = {
      enablePresetItems: true,
      enableTrendingDiscovery: false, // Disabled by default to avoid API spam
      enableUserDefinedItems: true,
      maxItemsToTrack: 100,           // Only track 100 items instead of 3000+
      minimumValueThreshold: 5000,    // 5k GP minimum
      categoryFilters: ['weapons', 'armor', 'consumables', 'materials'],
      customItemIds: [],
      ...config
    };

    this.selectedItems = new Set();
    this.trendingItems = new Map(); // itemId -> score
    this.lastUpdateTime = 0;

    this.initializeItemSelection();
    
    this.logger.info('🎯 Smart Item Selector initialized', {
      totalSelectedItems: this.selectedItems.size,
      enablePresetItems: this.config.enablePresetItems,
      maxItemsToTrack: this.config.maxItemsToTrack,
      trendingDiscovery: this.config.enableTrendingDiscovery
    });
  }

  /**
   * Context7 Pattern: Initialize the smart item selection
   */
  initializeItemSelection() {
    this.selectedItems.clear();

    // Add preset high-value items
    if (this.config.enablePresetItems) {
      TIER_S_ITEMS.forEach(id => this.selectedItems.add(id));
      TIER_A_ITEMS.forEach(id => this.selectedItems.add(id));
      
      // Add Tier B items only if we have space
      if (this.selectedItems.size < this.config.maxItemsToTrack) {
        const remainingSlots = this.config.maxItemsToTrack - this.selectedItems.size;
        TIER_B_ITEMS.slice(0, remainingSlots).forEach(id => this.selectedItems.add(id));
      }
    }

    // Add user-defined items
    if (this.config.enableUserDefinedItems) {
      this.config.customItemIds.forEach(id => {
        if (this.selectedItems.size < this.config.maxItemsToTrack) {
          this.selectedItems.add(id);
        }
      });
    }

    this.logger.debug('✅ Item selection initialized', {
      tierSItems: TIER_S_ITEMS.length,
      tierAItems: TIER_A_ITEMS.length,
      tierBItems: TIER_B_ITEMS.length,
      customItems: this.config.customItemIds.length,
      totalSelected: this.selectedItems.size
    });
  }

  /**
   * Context7 Pattern: Get the current list of selected items to track
   */
  getSelectedItems() {
    return Array.from(this.selectedItems);
  }

  /**
   * Context7 Pattern: Get items grouped by tier/priority
   */
  getItemsByTier() {
    const result = {
      tierS: TIER_S_ITEMS.filter(id => this.selectedItems.has(id)),
      tierA: TIER_A_ITEMS.filter(id => this.selectedItems.has(id)),
      tierB: TIER_B_ITEMS.filter(id => this.selectedItems.has(id)),
      custom: this.config.customItemIds.filter(id => this.selectedItems.has(id)),
      trending: Array.from(this.trendingItems.keys()).filter(id => this.selectedItems.has(id))
    };

    this.logger.debug('📊 Items grouped by tier', {
      tierS: result.tierS.length,
      tierA: result.tierA.length,
      tierB: result.tierB.length,
      custom: result.custom.length,
      trending: result.trending.length
    });

    return result;
  }

  /**
   * Context7 Pattern: Add custom items to track
   */
  addCustomItems(itemIds) {
    const addedItems = [];
    
    for (const itemId of itemIds) {
      if (this.selectedItems.size >= this.config.maxItemsToTrack) {
        this.logger.warn('⚠️ Cannot add more items - limit reached', {
          limit: this.config.maxItemsToTrack,
          attempted: itemId
        });
        break;
      }
      
      if (!this.selectedItems.has(itemId)) {
        this.selectedItems.add(itemId);
        addedItems.push(itemId);
      }
    }

    this.logger.debug('➕ Custom items added', {
      addedItems,
      totalSelected: this.selectedItems.size
    });

    return addedItems;
  }

  /**
   * Context7 Pattern: Remove items from tracking
   */
  removeItems(itemIds) {
    const removedItems = [];
    
    for (const itemId of itemIds) {
      if (this.selectedItems.has(itemId)) {
        this.selectedItems.delete(itemId);
        removedItems.push(itemId);
      }
    }

    this.logger.debug('➖ Items removed', {
      removedItems,
      totalSelected: this.selectedItems.size
    });

    return removedItems;
  }

  /**
   * Context7 Pattern: Smart discovery of trending items (use sparingly to avoid API spam)
   */
  async discoverTrendingItems(apiClient, maxDiscovery = 10) {
    if (!this.config.enableTrendingDiscovery) {
      this.logger.debug('📈 Trending discovery disabled');
      return [];
    }

    // Only run discovery once per hour to avoid API spam
    const oneHourAgo = Date.now() - 3600000;
    if (this.lastUpdateTime > oneHourAgo) {
      this.logger.debug('⏳ Trending discovery skipped - too recent', {
        lastUpdate: new Date(this.lastUpdateTime).toISOString(),
        nextUpdate: new Date(this.lastUpdateTime + 3600000).toISOString()
      });
      return Array.from(this.trendingItems.keys());
    }

    try {
      this.logger.debug('📈 Starting trending item discovery...', { maxDiscovery });
      
      // Sample a small subset of popular categories only
      const sampleItemIds = [
        ...TIER_S_ITEMS.slice(0, 5),  // Top 5 Tier S items
        ...TIER_A_ITEMS.slice(0, 10)  // Top 10 Tier A items
      ];

      const trendingScores = new Map();

      for (const itemId of sampleItemIds) {
        try {
          // Get recent trading data with delays to avoid spamming
          await this.delay(1000); // 1 second delay between requests
          
          const timeseries = await apiClient.fetchTimeseriesData(itemId, '1h');
          
          if (timeseries && timeseries.length > 0) {
            const score = this.calculateTrendingScore(timeseries);
            if (score > 50) { // Only items with good trending score
              trendingScores.set(itemId, score);
            }
          }
        } catch (error) {
          this.logger.debug('⚠️ Failed to fetch trending data for item', { itemId, error: error.message });
        }
      }

      // Sort by trending score and take top items
      const sortedTrending = Array.from(trendingScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxDiscovery);

      // Update trending items map
      this.trendingItems.clear();
      sortedTrending.forEach(([itemId, score]) => {
        this.trendingItems.set(itemId, score);
      });

      // Add trending items to selected items if we have space
      const trendingIds = sortedTrending.map(([itemId]) => itemId);
      for (const itemId of trendingIds) {
        if (this.selectedItems.size < this.config.maxItemsToTrack) {
          this.selectedItems.add(itemId);
        }
      }

      this.lastUpdateTime = Date.now();

      this.logger.debug('✅ Trending discovery completed', {
        discovered: trendingIds.length,
        totalSelected: this.selectedItems.size,
        topTrending: trendingIds.slice(0, 3)
      });

      return trendingIds;

    } catch (error) {
      this.logger.error('❌ Trending discovery failed', error);
      return [];
    }
  }

  /**
   * Context7 Pattern: Calculate trending score for an item based on recent activity
   */
  calculateTrendingScore(timeseries) {
    if (timeseries.length < 2) return 0;

    // Calculate volume and price change
    const recent = timeseries.slice(-5); // Last 5 data points
    const older = timeseries.slice(-10, -5); // Previous 5 data points

    if (recent.length === 0 || older.length === 0) return 0;

    const recentAvgPrice = recent.reduce((sum, item) => sum + ((item.high + item.low) / 2), 0) / recent.length;
    const olderAvgPrice = older.reduce((sum, item) => sum + ((item.high + item.low) / 2), 0) / older.length;

    const priceChange = ((recentAvgPrice - olderAvgPrice) / olderAvgPrice) * 100;
    const volumeIndicator = recent.filter(item => item.high && item.low).length / recent.length * 100;

    // Score based on price movement and trading activity
    return Math.abs(priceChange) * 10 + volumeIndicator;
  }

  /**
   * Context7 Pattern: Get recommended items for different trading strategies
   */
  getRecommendedItems(strategy = 'BALANCED') {
    const tiers = this.getItemsByTier();

    switch (strategy) {
      case 'CONSERVATIVE':
        // Focus on stable, high-volume items
        return [...tiers.tierS.slice(0, 20), ...tiers.tierA.slice(0, 10)];

      case 'AGGRESSIVE':
        // Include trending and volatile items
        return [...tiers.tierS, ...tiers.trending, ...tiers.custom];

      case 'BALANCED':
      default:
        // Mix of stable and opportunity items
        return [
          ...tiers.tierS.slice(0, 30),
          ...tiers.tierA.slice(0, 20),
          ...tiers.trending.slice(0, 5)
        ];
    }
  }

  /**
   * Context7 Pattern: Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize if significant changes
    if (newConfig.enablePresetItems !== undefined || 
        newConfig.maxItemsToTrack !== undefined ||
        newConfig.customItemIds !== undefined) {
      this.initializeItemSelection();
    }

    this.logger.debug('⚙️ Configuration updated', newConfig);
  }

  /**
   * Context7 Pattern: Get statistics about current selection
   */
  getStats() {
    const tiers = this.getItemsByTier();
    
    return {
      totalSelected: this.selectedItems.size,
      tierBreakdown: {
        tierS: tiers.tierS.length,
        tierA: tiers.tierA.length,
        tierB: tiers.tierB.length,
        custom: tiers.custom.length,
        trending: tiers.trending.length
      },
      lastTrendingUpdate: this.lastUpdateTime > 0 
        ? new Date(this.lastUpdateTime).toISOString() 
        : null,
      trendingItems: this.trendingItems.size,
      capacity: this.config.maxItemsToTrack,
      utilizationPercent: (this.selectedItems.size / this.config.maxItemsToTrack) * 100
    };
  }

  /**
   * Context7 Pattern: Export current selection for backup/sharing
   */
  exportSelection() {
    return {
      config: this.config,
      selectedItems: this.getSelectedItems(),
      trendingItems: Object.fromEntries(this.trendingItems),
      timestamp: Date.now()
    };
  }

  /**
   * Context7 Pattern: Import selection from backup
   */
  importSelection(data) {
    if (data.config) {
      this.updateConfig(data.config);
    }

    if (data.selectedItems) {
      this.selectedItems.clear();
      data.selectedItems.forEach(id => {
        if (this.selectedItems.size < this.config.maxItemsToTrack) {
          this.selectedItems.add(id);
        }
      });
    }

    if (data.trendingItems) {
      this.trendingItems.clear();
      Object.entries(data.trendingItems).forEach(([itemId, score]) => {
        this.trendingItems.set(parseInt(itemId), score);
      });
    }

    this.logger.debug('📥 Selection imported', {
      selectedItems: this.selectedItems.size,
      trendingItems: this.trendingItems.size
    });
  }

  /**
   * Context7 Pattern: Get tier constants for external use
   */
  getTierConstants() {
    return {
      TIER_S_ITEMS: [...TIER_S_ITEMS],
      TIER_A_ITEMS: [...TIER_A_ITEMS],
      TIER_B_ITEMS: [...TIER_B_ITEMS]
    };
  }

  /**
   * Context7 Pattern: Filter items by criteria
   */
  filterItems(items, criteria = {}) {
    const {
      minPrice = 0,
      maxPrice = Infinity,
      minSpread = 0,
      requireGrandExchange = true,
      requireTradeable = true
    } = criteria;

    return items.filter(item => {
      // Price range filter
      const avgPrice = ((item.priceData?.high || 0) + (item.priceData?.low || 0)) / 2;
      if (avgPrice < minPrice || avgPrice > maxPrice) return false;

      // Spread filter
      const high = item.priceData?.high || 0;
      const low = item.priceData?.low || 0;
      if (high === 0 || low === 0) return false;
      
      const spreadPercentage = ((high - low) / low) * 100;
      if (spreadPercentage < minSpread) return false;

      // Grand Exchange filter
      if (requireGrandExchange && !item.grandExchange) return false;

      // Tradeable filter
      if (requireTradeable && !item.tradeable) return false;

      return true;
    });
  }

  /**
   * Context7 Pattern: Get health status
   */
  getHealthStatus() {
    const stats = this.getStats();
    
    return {
      status: this.selectedItems.size > 0 ? 'HEALTHY' : 'NO_ITEMS',
      itemCount: this.selectedItems.size,
      capacity: this.config.maxItemsToTrack,
      utilization: stats.utilizationPercent,
      lastTrendingUpdate: stats.lastTrendingUpdate,
      trendingEnabled: this.config.enableTrendingDiscovery
    };
  }

  /**
   * Context7 Pattern: Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { SmartItemSelectorService, TIER_S_ITEMS, TIER_A_ITEMS, TIER_B_ITEMS };