/**
 * 🏺 Item Domain Types - Core item modeling type definitions
 * 
 * Context7 Pattern: Domain-driven type definitions
 * - DRY: Centralized item-related type definitions
 * - SOLID: Single responsibility for item domain types
 */

/**
 * @typedef {import('../shared/Common.js').EntityId} EntityId
 * @typedef {import('../shared/Common.js').AuditFields} AuditFields
 * @typedef {import('../shared/Common.js').EntityStatus} EntityStatus
 * @typedef {import('../shared/Common.js').DataSource} DataSource
 */

/**
 * @typedef {Object} ItemId
 * @extends EntityId
 */

/**
 * @typedef {'runes'|'potions'|'food'|'weapons'|'armor'|'tools'|'resources'|'quest'|'high_value'|'members'|'free'|'general'} ItemCategory
 */

/**
 * @typedef {Object} AlchemyInfo
 * @property {number} lowalch - Low alchemy value in coins
 * @property {number} highalch - High alchemy value in coins
 * @property {number} profit - Calculated profit from high alchemy
 * @property {boolean} isProfitable - Whether alchemy is profitable
 */

/**
 * @typedef {Object} MarketInfo
 * @property {number} value - Base item value
 * @property {number} [buyLimit] - Grand Exchange buy limit
 * @property {boolean} tradeableOnGE - Whether tradeable on Grand Exchange
 * @property {boolean} stackable - Whether item is stackable
 * @property {boolean} noted - Whether item can be noted
 */

/**
 * @typedef {Object} ItemProperties
 * @property {string} name - Item name
 * @property {string} examine - Item examine text
 * @property {boolean} members - Whether item is members-only
 * @property {number} weight - Item weight in kg
 * @property {string} [icon] - Icon identifier
 */

/**
 * @typedef {Object} ItemData
 * @property {number} itemId - Unique item identifier
 * @property {ItemProperties} properties - Basic item properties
 * @property {AlchemyInfo} alchemy - Alchemy-related information
 * @property {MarketInfo} market - Market-related information
 * @property {ItemCategory} category - Item category
 * @property {EntityStatus} status - Entity status
 * @property {DataSource} dataSource - Where the data came from
 * @property {AuditFields} audit - Audit trail information
 */

/**
 * @typedef {Object} ItemCreationData
 * @property {number} itemId - Unique item identifier
 * @property {string} name - Item name
 * @property {string} examine - Item examine text
 * @property {boolean} members - Whether item is members-only
 * @property {number} lowalch - Low alchemy value
 * @property {number} highalch - High alchemy value
 * @property {boolean} tradeable_on_ge - Whether tradeable on GE
 * @property {boolean} stackable - Whether stackable
 * @property {boolean} noted - Whether can be noted
 * @property {number} value - Base value
 * @property {number} [buyLimit] - Buy limit
 * @property {number} [weight] - Weight in kg
 * @property {string} [icon] - Icon identifier
 * @property {DataSource} [dataSource] - Data source
 */

/**
 * @typedef {Object} ItemUpdateData
 * @property {string} [name] - Updated name
 * @property {string} [examine] - Updated examine text
 * @property {boolean} [members] - Updated members status
 * @property {number} [lowalch] - Updated low alchemy value
 * @property {number} [highalch] - Updated high alchemy value
 * @property {boolean} [tradeable_on_ge] - Updated GE tradeable status
 * @property {boolean} [stackable] - Updated stackable status
 * @property {boolean} [noted] - Updated noted status
 * @property {number} [value] - Updated base value
 * @property {number} [buyLimit] - Updated buy limit
 * @property {number} [weight] - Updated weight
 * @property {string} [icon] - Updated icon
 * @property {EntityStatus} [status] - Updated status
 */

/**
 * @typedef {Object} ItemSearchCriteria
 * @property {string} [searchTerm] - Text search term
 * @property {boolean} [members] - Filter by members status
 * @property {boolean} [tradeable] - Filter by tradeable status
 * @property {number} [minValue] - Minimum value filter
 * @property {number} [maxValue] - Maximum value filter
 * @property {ItemCategory} [category] - Category filter
 * @property {EntityStatus} [status] - Status filter
 * @property {boolean} [stackable] - Filter by stackable status
 */

/**
 * @typedef {Object} ItemBusinessRules
 * @property {number} MIN_ALCHEMY_PROFIT - Minimum profitable alchemy value
 * @property {number} HIGH_VALUE_THRESHOLD - Threshold for high-value items
 * @property {number} NATURE_RUNE_COST - Cost of nature rune for alchemy
 * @property {number} MAX_SYNC_AGE_MS - Maximum age before item needs sync
 */

/**
 * @typedef {Object} ItemStatistics
 * @property {number} totalItems - Total number of items
 * @property {number} membersItems - Number of members items
 * @property {number} freeItems - Number of free-to-play items
 * @property {number} tradeableItems - Number of tradeable items
 * @property {number} stackableItems - Number of stackable items
 * @property {number} avgValue - Average item value
 * @property {number} maxValue - Maximum item value
 * @property {number} minValue - Minimum item value
 * @property {number} avgHighAlch - Average high alchemy value
 * @property {Date} lastSyncDate - Most recent sync date
 * @property {Object<ItemCategory, number>} categoryBreakdown - Items per category
 */

module.exports = {};