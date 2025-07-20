/**
 * 🏺 OSRS Item Model - Context7 MongoDB Schema
 *
 * Context7 Pattern: Domain Model with MongoDB Schema
 * - SOLID: Single Responsibility - Item data modeling
 * - DRY: Reusable schema definitions and validation
 * - Data integrity through schema validation
 * - Optimized indexing for performance
 * - Audit trail and versioning
 */

const mongoose = require('mongoose');
const { Logger } = require('../utils/Logger');

const logger = new Logger('ItemModel');

/**
 * Context7 Pattern: OSRS Item Schema
 * Maps directly to OSRS Wiki API /mapping endpoint
 */
const ItemSchema = new mongoose.Schema({
  // Primary identifier
  itemId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'Item ID must be an integer'
    }
  },

  // Basic item information
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
    index: 'text' // Text search index
  },

  examine: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // Item properties
  members: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },

  // Alchemy values
  lowalch: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  highalch: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
    validate: {
      validator: function(value) {
        return value >= this.lowalch;
      },
      message: 'High alch value must be greater than or equal to low alch value'
    }
  },

  // Grand Exchange properties
  tradeable_on_ge: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },

  stackable: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },

  noted: {
    type: Boolean,
    required: true,
    default: false
  },

  // Market data
  value: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },

  buy_limit: {
    type: Number,
    min: 0,
    default: null,
    sparse: true // Only index non-null values
  },

  // Additional properties
  weight: {
    type: Number,
    min: 0,
    default: 0
  },

  icon: {
    type: String,
    trim: true,
    maxlength: 100
  },

  // Context7 Pattern: Audit fields
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  lastSyncedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Data source tracking
  dataSource: {
    type: String,
    enum: ['osrs_wiki', 'manual', 'import'],
    default: 'osrs_wiki',
    index: true
  },

  // Version tracking for updates
  version: {
    type: Number,
    default: 1,
    min: 1
  },

  // Status tracking
  status: {
    type: String,
    enum: ['active', 'deprecated', 'removed'],
    default: 'active',
    index: true
  },

  // 6-month historical scraping status
  has6MonthHistoryScraped: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  // Context7 Pattern: Schema options
  timestamps: true, // Automatic createdAt/updatedAt
  versionKey: '__v',

  // Optimize for read performance
  collection: 'items',

  // JSON transform options
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret.itemId;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },

  toObject: {
    transform: function(doc, ret) {
      ret.id = ret.itemId;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Context7 Pattern: Compound Indexes for Performance
 */
ItemSchema.index({ members: 1, tradeable_on_ge: 1 }); // Filter by membership and tradeable status
ItemSchema.index({ value: -1, tradeable_on_ge: 1 }); // High-value tradeable items
ItemSchema.index({ highalch: -1, lowalch: -1 }); // Alchemy sorting
ItemSchema.index({ status: 1, lastSyncedAt: -1 }); // Active items by sync date
ItemSchema.index({ dataSource: 1, updatedAt: -1 }); // Source tracking
ItemSchema.index({ name: 'text', examine: 'text' }, {
  weights: { name: 10, examine: 1 },
  name: 'item_text_search'
}); // Full-text search

/**
 * Context7 Pattern: Pre-save middleware for data validation
 */
ItemSchema.pre('save', function(next) {
  try {
    // Update timestamp
    this.updatedAt = new Date();

    // Validate alchemy values
    if (this.highalch < this.lowalch) {
      throw new Error('High alch value cannot be less than low alch value');
    }

    // Ensure positive values
    if (this.value < 0 || this.lowalch < 0 || this.highalch < 0) {
      throw new Error('Values cannot be negative');
    }

    // Increment version on updates
    if (this.isModified() && !this.isNew) {
      this.version += 1;
    }

    logger.debug('Item validation passed', {
      itemId: this.itemId,
      name: this.name,
      version: this.version
    });

    next();
  } catch (error) {
    logger.error('Item validation failed', error, {
      itemId: this.itemId,
      name: this.name
    });
    next(error);
  }
});

/**
 * Context7 Pattern: Static methods for common queries
 */
ItemSchema.statics = {
  /**
   * Find items by members status and tradeable status
   */
  async findByMembershipAndTradeable(members = null, tradeable = null, options = {}) {
    const query = {};

    if (members !== null) {
      query.members = members;
    }
    if (tradeable !== null) {
      query.tradeable_on_ge = tradeable;
    }

    query.status = 'active'; // Only active items

    return this.find(query, null, {
      limit: options.limit || 100,
      sort: options.sort || { name: 1 },
      ...options
    });
  },

  /**
   * Find high-value items
   */
  async findHighValueItems(minValue = 100000, options = {}) {
    return this.find({
      value: { $gte: minValue },
      tradeable_on_ge: true,
      status: 'active'
    }, null, {
      limit: options.limit || 50,
      sort: { value: -1 },
      ...options
    });
  },

  /**
   * Search items by name
   */
  async searchByName(searchTerm, options = {}) {
    return this.find({
      $text: { $search: searchTerm },
      status: 'active'
    }, {
      score: { $meta: 'textScore' }
    }, {
      sort: { score: { $meta: 'textScore' } },
      limit: options.limit || 20,
      ...options
    });
  },

  /**
   * Find items requiring sync
   */
  async findItemsRequiringSync(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = new Date(Date.now() - maxAge);
    return this.find({
      $or: [
        { lastSyncedAt: { $lt: cutoff } },
        { lastSyncedAt: { $exists: false } }
      ],
      status: 'active'
    });
  },

  /**
   * Get items statistics
   */
  async getStatistics() {
    const pipeline = [
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          membersItems: { $sum: { $cond: ['$members', 1, 0] } },
          freeItems: { $sum: { $cond: ['$members', 0, 1] } },
          tradeableItems: { $sum: { $cond: ['$tradeable_on_ge', 1, 0] } },
          stackableItems: { $sum: { $cond: ['$stackable', 1, 0] } },
          avgValue: { $avg: '$value' },
          maxValue: { $max: '$value' },
          minValue: { $min: '$value' },
          avgHighAlch: { $avg: '$highalch' },
          lastSyncDate: { $max: '$lastSyncedAt' }
        }
      }
    ];

    const result = await this.aggregate(pipeline);
    return result[0] || {};
  }
};

/**
 * Context7 Pattern: Instance methods
 */
ItemSchema.methods = {
  /**
   * Calculate profit margin for alchemy
   */
  getAlchemyProfit() {
    const natureRuneCost = 200; // Approximate cost
    return Math.max(0, this.highalch - this.value - natureRuneCost);
  },

  /**
   * Check if item is profitable for alchemy
   */
  isProfitableAlchemy(natureRuneCost = 200) {
    return this.getAlchemyProfit() > 0;
  },

  /**
   * Get item category based on properties
   */
  getCategory() {
    if (this.name.toLowerCase().includes('rune')) {
      return 'runes';
    }
    if (this.name.toLowerCase().includes('potion')) {
      return 'potions';
    }
    if (this.name.toLowerCase().includes('food')) {
      return 'food';
    }
    if (this.highalch > 10000) {
      return 'high_value';
    }
    if (this.members) {
      return 'members';
    }
    return 'general';
  },

  /**
   * Mark as synced
   */
  markSynced() {
    this.lastSyncedAt = new Date();
    return this.save();
  }
};

/**
 * Context7 Pattern: Virtual properties
 */
ItemSchema.virtual('id').get(function() {
  return this.itemId;
});

ItemSchema.virtual('alchemyProfit').get(function() {
  return this.getAlchemyProfit();
});

ItemSchema.virtual('category').get(function() {
  return this.getCategory();
});

// Ensure virtual fields are serialized
ItemSchema.set('toJSON', { virtuals: true });
ItemSchema.set('toObject', { virtuals: true });

/**
 * Context7 Pattern: Error handling middleware
 */
ItemSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    logger.error('Duplicate item ID detected', error, { itemId: doc?.itemId });
    next(new Error('Item with this ID already exists'));
  } else {
    next(error);
  }
});

/**
 * Context7 Pattern: Export model with enhanced error handling
 */
let ItemModel;

try {
  ItemModel = mongoose.model('Item', ItemSchema);
  logger.info('Item model initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Item model', error);
  throw error;
}

module.exports = { ItemModel, ItemSchema };
