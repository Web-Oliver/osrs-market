/**
 * 📊 Market Price Snapshot Model - Context7 Optimized
 * 
 * Context7 Pattern: Unified Time-Series Market Data Model
 * - Single source of truth for all market price data
 * - Supports multiple data granularities (daily, 5m, 1h, latest)
 * - Optimized for time-series queries and analytics
 * - Integrated with ItemModel for referential integrity
 * - Advanced calculated metrics for AI training
 * 
 * DRY: Centralized market data structure
 * SOLID: Single responsibility for market snapshots
 * Hierarchical: Foundation for market analytics services
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Context7 Pattern: Market Price Snapshot Schema Definition
 * 
 * This schema serves as the unified time-series data model for all market price information.
 * It consolidates data from multiple sources (OSRS Wiki API, Grand Exchange scraping, etc.)
 * into a single, queryable format optimized for AI training and market analysis.
 */
const MarketPriceSnapshotSchema = new Schema({
  /**
   * Core Identification Fields
   */
  itemId: {
    type: Number,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Item ID must be a positive number'
    }
  },

  timestamp: {
    type: Number,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return v > 0 && v <= Date.now() + 86400000; // Not more than 24 hours in the future
      },
      message: 'Timestamp must be a valid Unix timestamp'
    }
  },

  /**
   * Data Granularity Identifier
   * 
   * Distinguishes between different data collection intervals:
   * - 'daily_scrape': Daily Grand Exchange scraping data
   * - '5m': 5-minute intervals from OSRS Wiki API
   * - '1h': 1-hour intervals from OSRS Wiki API
   * - 'latest': Real-time latest prices
   * - '6m_scrape': 6-month historical scraping data
   */
  interval: {
    type: String,
    required: true,
    enum: ['daily_scrape', '5m', '1h', 'latest', '6m_scrape'],
    index: true
  },

  /**
   * Core Market Data Fields
   */
  highPrice: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v >= this.lowPrice;
      },
      message: 'High price must be greater than or equal to low price'
    }
  },

  lowPrice: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(v) {
        return v <= this.highPrice;
      },
      message: 'Low price must be less than or equal to high price'
    }
  },

  volume: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  /**
   * Advanced Calculated Metrics (Placeholder Fields)
   * 
   * These fields will be populated by analytical services in subsequent steps.
   * They represent key trading indicators and risk metrics for AI training.
   */

  // Profit Margin Calculations
  marginGp: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || typeof v === 'number';
      },
      message: 'Margin GP must be a number or null'
    }
  },

  marginPercent: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || (v >= -100 && v <= 1000);
      },
      message: 'Margin percent must be between -100% and 1000%'
    }
  },

  // Market Volatility Indicators
  volatility: {
    type: Number,
    default: null,
    min: 0,
    validate: {
      validator: function(v) {
        return v === null || v >= 0;
      },
      message: 'Volatility must be non-negative'
    }
  },

  velocity: {
    type: Number,
    default: null,
    min: 0,
    validate: {
      validator: function(v) {
        return v === null || v >= 0;
      },
      message: 'Velocity must be non-negative'
    }
  },

  // Technical Analysis Indicators
  trendMovingAverage: {
    type: Number,
    default: null,
    min: 0
  },

  rsi: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || (v >= 0 && v <= 100);
      },
      message: 'RSI must be between 0 and 100'
    }
  },

  macd: {
    type: Number,
    default: null
  },

  // Risk and Profitability Metrics
  momentumScore: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || (v >= -100 && v <= 100);
      },
      message: 'Momentum score must be between -100 and 100'
    }
  },

  riskScore: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || (v >= 0 && v <= 100);
      },
      message: 'Risk score must be between 0 and 100'
    }
  },

  expectedProfitPerHour: {
    type: Number,
    default: null,
    min: 0
  },

  profitPerGeSlot: {
    type: Number,
    default: null,
    min: 0
  },

  /**
   * Data Source and Quality Metadata
   */
  source: {
    type: String,
    required: true,
    enum: ['osrs_wiki_api', 'ge_scraper', 'manual_entry', 'calculated'],
    default: 'osrs_wiki_api'
  },

  confidence: {
    type: Number,
    default: 1.0,
    min: 0,
    max: 1,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 1;
      },
      message: 'Confidence must be between 0 and 1'
    }
  },

  /**
   * Audit Trail
   */
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Context7 Pattern: Schema Options
  timestamps: { createdAt: true, updatedAt: true },
  collection: 'market_price_snapshots',
  
  // Optimize for time-series queries
  autoIndex: true,
  
  // JSON transformation for API responses
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Context7 Pattern: Compound Indexes for Time-Series Optimization
 * 
 * These indexes are crucial for efficient time-series queries and analytics.
 * The compound index on (itemId, interval, timestamp) ensures fast lookups
 * for specific items across time periods.
 */

// Primary compound index for time-series queries
MarketPriceSnapshotSchema.index(
  { itemId: 1, interval: 1, timestamp: 1 }, 
  { 
    unique: true,
    name: 'idx_item_interval_timestamp_unique',
    background: true 
  }
);

// Index for recent data queries
MarketPriceSnapshotSchema.index(
  { timestamp: -1, interval: 1 },
  { 
    name: 'idx_timestamp_interval_desc',
    background: true 
  }
);

// Index for volume-based queries
MarketPriceSnapshotSchema.index(
  { volume: -1, interval: 1 },
  { 
    name: 'idx_volume_interval_desc',
    background: true 
  }
);

// Index for source-based queries
MarketPriceSnapshotSchema.index(
  { source: 1, createdAt: -1 },
  { 
    name: 'idx_source_created_desc',
    background: true 
  }
);

/**
 * Context7 Pattern: Pre-save Middleware
 * 
 * Ensures data integrity and performs automatic calculations before saving.
 */
MarketPriceSnapshotSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  // Validate price consistency
  if (this.highPrice < this.lowPrice) {
    return next(new Error('High price cannot be less than low price'));
  }
  
  // Ensure timestamp is reasonable
  const now = Date.now();
  if (this.timestamp > now + 86400000) { // More than 24 hours in future
    return next(new Error('Timestamp cannot be more than 24 hours in the future'));
  }
  
  next();
});

/**
 * Context7 Pattern: Instance Methods
 * 
 * Helper methods for common operations on market price snapshots.
 */

/**
 * Calculate the average price for this snapshot
 * @returns {number} Average of high and low price
 */
MarketPriceSnapshotSchema.methods.getAveragePrice = function() {
  return (this.highPrice + this.lowPrice) / 2;
};

/**
 * Calculate the price spread for this snapshot
 * @returns {number} Difference between high and low price
 */
MarketPriceSnapshotSchema.methods.getPriceSpread = function() {
  return this.highPrice - this.lowPrice;
};

/**
 * Calculate the price spread percentage
 * @returns {number} Price spread as percentage of average price
 */
MarketPriceSnapshotSchema.methods.getPriceSpreadPercent = function() {
  const avg = this.getAveragePrice();
  return avg > 0 ? (this.getPriceSpread() / avg) * 100 : 0;
};

/**
 * Check if this snapshot represents active trading
 * @returns {boolean} True if volume is above minimum threshold
 */
MarketPriceSnapshotSchema.methods.isActiveTrading = function() {
  return this.volume > 0;
};

/**
 * Get a formatted timestamp string
 * @returns {string} ISO timestamp string
 */
MarketPriceSnapshotSchema.methods.getFormattedTimestamp = function() {
  return new Date(this.timestamp).toISOString();
};

/**
 * Context7 Pattern: Static Methods
 * 
 * Class-level methods for common queries and operations.
 */

/**
 * Get the latest snapshot for a specific item and interval
 * @param {number} itemId - The item ID
 * @param {string} interval - The data interval
 * @returns {Promise<MarketPriceSnapshot|null>} Latest snapshot or null
 */
MarketPriceSnapshotSchema.statics.getLatestSnapshot = function(itemId, interval = 'latest') {
  return this.findOne({ itemId, interval })
    .sort({ timestamp: -1 });
};

/**
 * Get snapshots for a specific item within a time range
 * @param {number} itemId - The item ID
 * @param {number} startTime - Start timestamp
 * @param {number} endTime - End timestamp
 * @param {string} interval - The data interval
 * @returns {Promise<MarketPriceSnapshot[]>} Array of snapshots
 */
MarketPriceSnapshotSchema.statics.getSnapshotsInTimeRange = function(itemId, startTime, endTime, interval = 'latest') {
  return this.find({
    itemId,
    interval,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: 1 });
};

/**
 * Get high-volume snapshots for market analysis
 * @param {number} minVolume - Minimum volume threshold
 * @param {string} interval - The data interval
 * @param {number} limit - Maximum number of results
 * @returns {Promise<MarketPriceSnapshot[]>} Array of high-volume snapshots
 */
MarketPriceSnapshotSchema.statics.getHighVolumeSnapshots = function(minVolume = 1000, interval = 'latest', limit = 100) {
  return this.find({
    volume: { $gte: minVolume },
    interval
  })
  .sort({ volume: -1, timestamp: -1 })
  .limit(limit);
};

/**
 * Get snapshots by source for data quality analysis
 * @param {string} source - Data source
 * @param {number} limit - Maximum number of results
 * @returns {Promise<MarketPriceSnapshot[]>} Array of snapshots
 */
MarketPriceSnapshotSchema.statics.getSnapshotsBySource = function(source, limit = 100) {
  return this.find({ source })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Context7 Pattern: Virtual Properties
 * 
 * Computed properties that don't persist to the database.
 */

/**
 * Virtual property for average price
 */
MarketPriceSnapshotSchema.virtual('averagePrice').get(function() {
  return this.getAveragePrice();
});

/**
 * Virtual property for price spread
 */
MarketPriceSnapshotSchema.virtual('priceSpread').get(function() {
  return this.getPriceSpread();
});

/**
 * Virtual property for formatted timestamp
 */
MarketPriceSnapshotSchema.virtual('formattedTimestamp').get(function() {
  return this.getFormattedTimestamp();
});

/**
 * Context7 Pattern: Export Model
 */
const MarketPriceSnapshotModel = mongoose.model('MarketPriceSnapshot', MarketPriceSnapshotSchema);

module.exports = { 
  MarketPriceSnapshotModel,
  MarketPriceSnapshotSchema 
};