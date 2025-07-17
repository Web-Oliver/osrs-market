/**
 * 🔄 Scrape Queue Model - Context7 Optimized
 * 
 * Context7 Pattern: Queue Management Model
 * - Single responsibility for managing scraping queue operations
 * - DRY principles with reusable queue status management
 * - Hierarchical architecture with clear separation of concerns
 * - Optimized for concurrent scraping operations
 * 
 * DRY: Centralized queue management structure
 * SOLID: Single responsibility for queue operations
 * Hierarchical: Foundation for scraping orchestration services
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Context7 Pattern: Scrape Queue Schema Definition
 * 
 * This schema manages the queue for scraping individual item pages
 * for 6-month historical data as specified in the TODO-PROGRESS.md
 */
const ScrapeQueueSchema = new Schema({
  /**
   * Core Queue Fields
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
   * Timestamp Fields for Queue Management
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
   * Error Handling and Retry Logic
   */
  retries: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    validate: {
      validator: function(v) {
        return Number.isInteger(v) && v >= 0;
      },
      message: 'Retries must be a non-negative integer'
    }
  },

  error: {
    type: String,
    default: null,
    maxlength: 1000
  },

  /**
   * Processing Metadata
   */
  processingStartedAt: {
    type: Date,
    default: null
  },

  completedAt: {
    type: Date,
    default: null
  },

  /**
   * Data Quality Metadata
   */
  expectedDataPoints: {
    type: Number,
    default: null,
    min: 0
  },

  actualDataPoints: {
    type: Number,
    default: null,
    min: 0
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
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Context7 Pattern: Indexes for Queue Performance
 * 
 * These indexes optimize queue processing operations
 */

// Primary index for queue processing
ScrapeQueueSchema.index(
  { status: 1, createdAt: 1 },
  { 
    name: 'idx_status_created_queue',
    background: true 
  }
);

// Index for retry management
ScrapeQueueSchema.index(
  { status: 1, retries: 1, lastAttemptedAt: 1 },
  { 
    name: 'idx_status_retries_last_attempt',
    background: true 
  }
);

// Index for failed items analysis
ScrapeQueueSchema.index(
  { status: 1, error: 1 },
  { 
    name: 'idx_status_error',
    background: true 
  }
);

/**
 * Context7 Pattern: Pre-save Middleware
 * 
 * Ensures data integrity and automatic field updates
 */
ScrapeQueueSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  // Set processingStartedAt when status changes to processing
  if (this.isModified('status') && this.status === 'processing' && !this.processingStartedAt) {
    this.processingStartedAt = new Date();
  }
  
  // Set completedAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Update lastAttemptedAt when retries increase
  if (this.isModified('retries') && this.retries > 0) {
    this.lastAttemptedAt = new Date();
  }
  
  next();
});

/**
 * Context7 Pattern: Static Methods
 * 
 * Class-level methods for queue management operations
 */

/**
 * Get next batch of items ready for processing
 * @param {number} limit - Maximum number of items to fetch
 * @returns {Promise<ScrapeQueueItem[]>} Array of queue items
 */
ScrapeQueueSchema.statics.getNextBatch = function(limit = 20) {
  return this.find({ 
    status: { $in: ['pending', 'failed'] },
    $or: [
      { lastAttemptedAt: { $exists: false } },
      { lastAttemptedAt: null },
      { lastAttemptedAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } } // 15 minutes ago
    ]
  })
  .sort({ createdAt: 1 })
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
 * Mark item as processing
 * @param {number} itemId - The item ID to mark as processing
 * @returns {Promise<ScrapeQueueItem>} Updated queue item
 */
ScrapeQueueSchema.statics.markAsProcessing = function(itemId) {
  return this.findOneAndUpdate(
    { itemId, status: { $in: ['pending', 'failed'] } },
    { 
      status: 'processing',
      processingStartedAt: new Date(),
      updatedAt: new Date()
    },
    { new: true }
  );
};

/**
 * Mark item as completed
 * @param {number} itemId - The item ID to mark as completed
 * @param {number} dataPoints - Number of data points collected
 * @returns {Promise<ScrapeQueueItem>} Updated queue item
 */
ScrapeQueueSchema.statics.markAsCompleted = function(itemId, dataPoints = null) {
  return this.findOneAndUpdate(
    { itemId, status: 'processing' },
    { 
      status: 'completed',
      completedAt: new Date(),
      actualDataPoints: dataPoints,
      updatedAt: new Date()
    },
    { new: true }
  );
};

/**
 * Mark item as failed and increment retries
 * @param {number} itemId - The item ID to mark as failed
 * @param {string} error - Error message
 * @returns {Promise<ScrapeQueueItem>} Updated queue item
 */
ScrapeQueueSchema.statics.markAsFailed = function(itemId, error) {
  return this.findOneAndUpdate(
    { itemId, status: 'processing' },
    { 
      $set: {
        status: 'failed',
        error: error,
        lastAttemptedAt: new Date(),
        updatedAt: new Date()
      },
      $inc: { retries: 1 }
    },
    { new: true }
  );
};

/**
 * Context7 Pattern: Instance Methods
 * 
 * Helper methods for individual queue items
 */

/**
 * Check if item is ready for retry
 * @returns {boolean} True if item is ready for retry
 */
ScrapeQueueSchema.methods.isReadyForRetry = function() {
  if (this.status !== 'failed' || this.retries >= 5) {
    return false;
  }
  
  if (!this.lastAttemptedAt) {
    return true;
  }
  
  // Exponential backoff: 15 minutes * 2^retries
  const backoffMs = 15 * 60 * 1000 * Math.pow(2, this.retries);
  return Date.now() - this.lastAttemptedAt.getTime() > backoffMs;
};

/**
 * Get processing duration if currently processing
 * @returns {number|null} Processing duration in milliseconds or null
 */
ScrapeQueueSchema.methods.getProcessingDuration = function() {
  if (this.status !== 'processing' || !this.processingStartedAt) {
    return null;
  }
  
  return Date.now() - this.processingStartedAt.getTime();
};

/**
 * Get total time in queue
 * @returns {number} Total time in queue in milliseconds
 */
ScrapeQueueSchema.methods.getTotalQueueTime = function() {
  const endTime = this.completedAt || new Date();
  return endTime.getTime() - this.createdAt.getTime();
};

/**
 * Context7 Pattern: Virtual Properties
 * 
 * Computed properties for queue item analysis
 */

/**
 * Virtual property for current processing duration
 */
ScrapeQueueSchema.virtual('processingDuration').get(function() {
  return this.getProcessingDuration();
});

/**
 * Virtual property for total queue time
 */
ScrapeQueueSchema.virtual('totalQueueTime').get(function() {
  return this.getTotalQueueTime();
});

/**
 * Virtual property for retry readiness
 */
ScrapeQueueSchema.virtual('readyForRetry').get(function() {
  return this.isReadyForRetry();
});

/**
 * Context7 Pattern: Export Model
 */
const ScrapeQueueModel = mongoose.model('ScrapeQueue', ScrapeQueueSchema);

module.exports = { 
  ScrapeQueueModel,
  ScrapeQueueSchema 
};