/**
 * 🚀 Scrape Queue Model - Context7 Optimized
 *
 * Context7 Pattern: Queue Management for Scraping Operations
 * - Manages scraping queue for individual item pages
 * - Ensures deduplication and retry logic
 * - Optimized for efficient batch processing
 * - Supports concurrency control and status tracking
 *
 * DRY: Centralized scraping queue management
 * SOLID: Single responsibility for queue operations
 * Hierarchical: Foundation for scraping orchestration
 */

const mongoose = require('mongoose');
const MongooseTransformUtil = require('../utils/MongooseTransformUtil');
const TimeConstants = require('../utils/TimeConstants');
const DateRangeUtil = require('../utils/DateRangeUtil');
const { Schema } = mongoose;

/**
 * Context7 Pattern: Scrape Queue Schema Definition
 *
 * This schema manages the queue for scraping individual item pages
 * to collect 6-month historical data. It prevents duplicate scraping
 * and provides retry logic for failed attempts.
 */
const ScrapeQueueSchema = new Schema({
  /**
   * Core Identification
   */
  itemId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        return v > 0;
      },
      message: 'Item ID must be a positive number'
    }
  },

  /**
   * Queue Status Management
   */
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },

  /**
   * Timestamp Tracking
   */
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  lastAttemptedAt: {
    type: Date,
    default: null,
    index: true
  },

  /**
   * Retry Logic
   */
  retries: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 5;
      },
      message: 'Retries must be between 0 and 5'
    }
  },

  /**
   * Error Information
   */
  error: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        return v === null || typeof v === 'string';
      },
      message: 'Error must be a string or null'
    }
  },

  /**
   * Processing Metadata
   */
  processingStartedAt: {
    type: Date,
    default: null
  },

  processingCompletedAt: {
    type: Date,
    default: null
  },

  /**
   * Priority and Scheduling
   */
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 10,
    validate: {
      validator: function(v) {
        return v >= 0 && v <= 10;
      },
      message: 'Priority must be between 0 and 10'
    }
  },

  /**
   * Audit Trail
   */
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Context7 Pattern: Schema Options
  timestamps: { createdAt: true, updatedAt: true },
  collection: 'scrape_queue',

  // Optimize for queue operations
  autoIndex: true,

  // JSON transformation for API responses
  toJSON: {
    transform: MongooseTransformUtil.minimalTransform
  }
});

/**
 * Context7 Pattern: Indexes for Queue Optimization
 *
 * These indexes are crucial for efficient queue processing and status queries.
 */

// Index for finding pending/failed items ready for processing
ScrapeQueueSchema.index(
  { status: 1, priority: -1, createdAt: 1 },
  {
    name: 'idx_status_priority_created',
    background: true
  }
);

// Index for retry logic (failed items with retry attempts)
ScrapeQueueSchema.index(
  { status: 1, retries: 1, lastAttemptedAt: 1 },
  {
    name: 'idx_status_retries_attempted',
    background: true
  }
);

// Index for processing tracking
ScrapeQueueSchema.index(
  { status: 1, processingStartedAt: 1 },
  {
    name: 'idx_status_processing_started',
    background: true
  }
);

// Index for cleanup operations
ScrapeQueueSchema.index(
  { status: 1, updatedAt: 1 },
  {
    name: 'idx_status_updated',
    background: true
  }
);

/**
 * Context7 Pattern: Pre-save Middleware
 *
 * Ensures data integrity and performs automatic calculations before saving.
 */
ScrapeQueueSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();

  // Set processingStartedAt when status changes to processing
  if (this.status === 'processing' && !this.processingStartedAt) {
    this.processingStartedAt = new Date();
  }

  // Set processingCompletedAt when status changes to completed or failed
  if ((this.status === 'completed' || this.status === 'failed') && !this.processingCompletedAt) {
    this.processingCompletedAt = new Date();
  }

  // Update lastAttemptedAt when retries increment
  if (this.isModified('retries') && this.retries > 0) {
    this.lastAttemptedAt = new Date();
  }

  next();
});

/**
 * Context7 Pattern: Instance Methods
 *
 * Helper methods for common operations on scrape queue items.
 */

/**
 * Mark item as processing
 * @returns {Promise<ScrapeQueueItem>} Updated queue item
 */
ScrapeQueueSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  this.processingStartedAt = new Date();
  return this.save();
};

/**
 * Mark item as completed
 * @returns {Promise<ScrapeQueueItem>} Updated queue item
 */
ScrapeQueueSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  this.processingCompletedAt = new Date();
  return this.save();
};

/**
 * Mark item as failed and increment retries
 * @param {string} errorMessage - Error message to store
 * @returns {Promise<ScrapeQueueItem>} Updated queue item
 */
ScrapeQueueSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.error = errorMessage;
  this.retries += 1;
  this.lastAttemptedAt = new Date();
  this.processingCompletedAt = new Date();

  // Reset to pending if retries haven't exceeded maximum
  if (this.retries < 5) {
    this.status = 'pending';
  }

  return this.save();
};

/**
 * Check if item is ready for retry
 * @returns {boolean} True if ready for retry
 */
ScrapeQueueSchema.methods.isReadyForRetry = function() {
  if (this.status !== 'pending' && this.status !== 'failed') {
    return false;
  }

  if (this.retries >= 5) {
    return false;
  }

  // If never attempted, it's ready
  if (!this.lastAttemptedAt) {
    return true;
  }

  // Wait at least 1 hour between retry attempts
  const hoursSinceLastAttempt = (Date.now() - this.lastAttemptedAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLastAttempt >= 1;
};

/**
 * Get processing duration in milliseconds
 * @returns {number|null} Processing duration or null if not applicable
 */
ScrapeQueueSchema.methods.getProcessingDuration = function() {
  if (!this.processingStartedAt) {
    return null;
  }

  const endTime = this.processingCompletedAt || new Date();
  return endTime.getTime() - this.processingStartedAt.getTime();
};

/**
 * Context7 Pattern: Static Methods
 *
 * Class-level methods for common queries and operations.
 */

/**
 * Get pending items ready for processing
 * @param {number} limit - Maximum number of items to return
 * @returns {Promise<ScrapeQueueItem[]>} Array of pending items
 */
ScrapeQueueSchema.statics.getPendingItems = function(limit = 20) {
  return this.find({
    status: 'pending'
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

/**
 * Get failed items ready for retry
 * @param {number} limit - Maximum number of items to return
 * @returns {Promise<ScrapeQueueItem[]>} Array of failed items ready for retry
 */
ScrapeQueueSchema.statics.getFailedItemsForRetry = function(limit = 10) {
  const oneHourAgo = DateRangeUtil.getHoursAgo(1);

  return this.find({
    status: 'failed',
    retries: { $lt: 5 },
    lastAttemptedAt: { $lt: oneHourAgo }
  })
    .sort({ priority: -1, lastAttemptedAt: 1 })
    .limit(limit);
};

/**
 * Get items ready for processing (pending + retry-ready failed)
 * @param {number} limit - Maximum number of items to return
 * @returns {Promise<ScrapeQueueItem[]>} Array of items ready for processing
 */
ScrapeQueueSchema.statics.getItemsReadyForProcessing = function(limit = 20) {
  const oneHourAgo = DateRangeUtil.getHoursAgo(1);

  return this.find({
    $or: [
      { status: 'pending' },
      {
        status: 'failed',
        retries: { $lt: 5 },
        lastAttemptedAt: { $lt: oneHourAgo }
      }
    ]
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(limit);
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue statistics
 */
ScrapeQueueSchema.statics.getQueueStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgRetries: { $avg: '$retries' },
        oldestItem: { $min: '$createdAt' },
        newestItem: { $max: '$createdAt' }
      }
    },
    {
      $group: {
        _id: null,
        totalItems: { $sum: '$count' },
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            avgRetries: '$avgRetries',
            oldestItem: '$oldestItem',
            newestItem: '$newestItem'
          }
        }
      }
    }
  ]);
};

/**
 * Clean up old completed items
 * @param {number} olderThanDays - Remove completed items older than this many days
 * @returns {Promise<Object>} Deletion result
 */
ScrapeQueueSchema.statics.cleanupOldItems = function(olderThanDays = 30) {
  const cutoffDate = DateRangeUtil.getDaysAgo(olderThanDays);

  return this.deleteMany({
    status: 'completed',
    updatedAt: { $lt: cutoffDate }
  });
};

/**
 * Context7 Pattern: Virtual Properties
 *
 * Computed properties that don't persist to the database.
 */

/**
 * Virtual property for processing duration
 */
ScrapeQueueSchema.virtual('processingDuration').get(function() {
  return this.getProcessingDuration();
});

/**
 * Virtual property for retry readiness
 */
ScrapeQueueSchema.virtual('readyForRetry').get(function() {
  return this.isReadyForRetry();
});

/**
 * Virtual property for formatted status
 */
ScrapeQueueSchema.virtual('statusFormatted').get(function() {
  const statusMap = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed'
  };
  return statusMap[this.status] || this.status;
});

/**
 * Context7 Pattern: Export Model
 */
const ScrapeQueueModel = mongoose.model('ScrapeQueue', ScrapeQueueSchema);

module.exports = {
  ScrapeQueueModel,
  ScrapeQueueSchema
};
