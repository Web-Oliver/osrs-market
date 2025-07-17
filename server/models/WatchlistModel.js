/**
 * 📋 WatchlistModel - MongoDB Schema for User Watchlist Items
 * 
 * Context7 Pattern: Domain-Driven Design with Mongoose
 * - Comprehensive watchlist item management
 * - User-specific watchlist tracking
 * - Flexible metadata storage
 * - Optimized for performance with proper indexing
 */

const mongoose = require('mongoose');

/**
 * Context7 Pattern: Watchlist Item Schema
 */
const watchlistSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    trim: true,
    index: true,
    description: 'Unique identifier for the user (hardcoded for now, will be authentication-based later)'
  },
  
  itemId: {
    type: Number,
    required: true,
    min: 1,
    index: true,
    description: 'OSRS item ID from the Grand Exchange'
  },
  
  itemName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    description: 'Human-readable name of the item'
  },
  
  addedDate: {
    type: Date,
    required: true,
    default: Date.now,
    description: 'Timestamp when the item was added to the watchlist'
  },
  
  currentPrice: {
    type: Number,
    min: 0,
    description: 'Current market price of the item (cached for performance)'
  },
  
  currentMargin: {
    type: Number,
    description: 'Current margin/profit potential (cached for performance)'
  },
  
  notes: {
    type: String,
    maxlength: 500,
    trim: true,
    description: 'User notes about this watchlist item'
  },
  
  isActive: {
    type: Boolean,
    default: true,
    description: 'Whether this watchlist item is still active'
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    description: 'Flexible metadata storage for future features'
  }
}, {
  timestamps: true,
  collection: 'watchlist_items',
  versionKey: false
});

/**
 * Context7 Pattern: Compound indexes for performance
 */
watchlistSchema.index({ userId: 1, itemId: 1 }, { unique: true });
watchlistSchema.index({ userId: 1, addedDate: -1 });
watchlistSchema.index({ userId: 1, isActive: 1 });

/**
 * Context7 Pattern: Virtual properties
 */
watchlistSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

watchlistSchema.virtual('daysOnWatchlist').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.addedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

/**
 * Context7 Pattern: Instance methods
 */
watchlistSchema.methods.updateCurrentPrice = function(price, margin) {
  this.currentPrice = price;
  this.currentMargin = margin;
  return this.save();
};

watchlistSchema.methods.addNote = function(note) {
  this.notes = note;
  return this.save();
};

watchlistSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

/**
 * Context7 Pattern: Static methods
 */
watchlistSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, isActive: true };
  
  if (options.itemId) {
    query.itemId = options.itemId;
  }
  
  return this.find(query)
    .sort({ addedDate: -1 })
    .limit(options.limit || 100);
};

watchlistSchema.statics.findByUserIdAndItemId = function(userId, itemId) {
  return this.findOne({ userId, itemId, isActive: true });
};

watchlistSchema.statics.countByUserId = function(userId) {
  return this.countDocuments({ userId, isActive: true });
};

watchlistSchema.statics.removeByUserIdAndItemId = function(userId, itemId) {
  return this.findOneAndUpdate(
    { userId, itemId },
    { isActive: false },
    { new: true }
  );
};

watchlistSchema.statics.addItem = function(userId, itemId, itemName, additionalData = {}) {
  const watchlistItem = new this({
    userId,
    itemId,
    itemName,
    addedDate: new Date(),
    ...additionalData
  });
  
  return watchlistItem.save();
};

/**
 * Context7 Pattern: Pre-save middleware
 */
watchlistSchema.pre('save', function(next) {
  // Ensure itemName is properly formatted
  if (this.itemName) {
    this.itemName = this.itemName.trim();
  }
  
  next();
});

/**
 * Context7 Pattern: Pre-find middleware for performance
 */
watchlistSchema.pre(['find', 'findOne'], function() {
  // Only return active items by default
  if (!this.getQuery().hasOwnProperty('isActive')) {
    this.where({ isActive: true });
  }
});

/**
 * Context7 Pattern: Error handling middleware
 */
watchlistSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    const duplicateError = new Error('Item already exists in watchlist');
    duplicateError.status = 409;
    next(duplicateError);
  } else {
    next(error);
  }
});

/**
 * Context7 Pattern: Transform output
 */
watchlistSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

/**
 * Context7 Pattern: Model creation and export
 */
const WatchlistModel = mongoose.model('WatchlistItem', watchlistSchema);

module.exports = WatchlistModel;