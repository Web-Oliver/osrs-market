/**
 * 🤖 AI Model Metadata Schema - Context7 Optimized
 * 
 * Context7 Pattern: Mongoose Model for AI Model Metadata Storage
 * - Stores metadata about trained AI models
 * - Tracks model performance metrics and versions
 * - Supports model lifecycle management
 * - Integrates with AITradingOrchestratorService
 * - SOLID architecture with single responsibility
 */

const mongoose = require('mongoose');

/**
 * AI Model Metadata Schema
 * 
 * Stores comprehensive metadata about AI models including:
 * - Model identification and versioning
 * - Performance metrics and statistics
 * - Training history and parameters
 * - Deployment status and lifecycle
 */
const AIModelMetadataSchema = new mongoose.Schema({
  // Model identification
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    maxlength: 100
  },
  
  version: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // Training information
  trainingDate: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  
  trainingDuration: {
    type: Number, // Duration in milliseconds
    min: 0
  },
  
  trainingEpisodes: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Performance metrics
  performanceMetrics: {
    roi: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    totalProfit: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    averageProfit: {
      type: Number,
      default: 0
    },
    maxDrawdown: {
      type: Number,
      default: 0
    },
    sharpeRatio: {
      type: Number,
      default: 0
    },
    totalTrades: {
      type: Number,
      min: 0,
      default: 0
    },
    profitableTrades: {
      type: Number,
      min: 0,
      default: 0
    },
    averageTradeDuration: {
      type: Number, // Duration in milliseconds
      min: 0,
      default: 0
    }
  },
  
  // Technical metrics
  technicalMetrics: {
    modelSize: {
      type: Number, // Size in bytes
      min: 0
    },
    parameters: {
      type: Number, // Number of model parameters
      min: 0
    },
    averageLoss: {
      type: Number,
      min: 0,
      default: 0
    },
    averageReward: {
      type: Number,
      default: 0
    },
    epsilon: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.1
    },
    learningRate: {
      type: Number,
      min: 0,
      default: 0.001
    }
  },
  
  // Model configuration
  modelConfig: {
    architecture: {
      type: String,
      trim: true,
      maxlength: 200
    },
    hyperparameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    trainingParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Storage information
  storagePath: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  storageSize: {
    type: Number, // Size in bytes
    min: 0
  },
  
  checksum: {
    type: String,
    trim: true,
    maxlength: 128
  },
  
  // Deployment status
  status: {
    type: String,
    required: true,
    enum: ['training', 'testing', 'production', 'archived', 'failed'],
    default: 'testing',
    index: true
  },
  
  deployedAt: {
    type: Date,
    index: true
  },
  
  archivedAt: {
    type: Date,
    index: true
  },
  
  // Validation metrics
  validationMetrics: {
    backtestPeriod: {
      startDate: Date,
      endDate: Date
    },
    backtestResults: {
      totalReturn: Number,
      volatility: Number,
      maxDrawdown: Number,
      winRate: Number,
      trades: Number
    },
    crossValidationScore: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  
  // Usage statistics
  usageStats: {
    totalPredictions: {
      type: Number,
      min: 0,
      default: 0
    },
    lastUsedAt: {
      type: Date,
      index: true
    },
    successfulPredictions: {
      type: Number,
      min: 0,
      default: 0
    },
    failedPredictions: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  
  // Metadata
  createdBy: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'system'
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient queries
AIModelMetadataSchema.index({ modelId: 1, version: 1 });
AIModelMetadataSchema.index({ status: 1, createdAt: -1 });
AIModelMetadataSchema.index({ 'performanceMetrics.roi': -1 });
AIModelMetadataSchema.index({ 'performanceMetrics.accuracy': -1 });
AIModelMetadataSchema.index({ trainingDate: -1 });
AIModelMetadataSchema.index({ 'usageStats.lastUsedAt': -1 });

// Pre-save middleware to update timestamps
AIModelMetadataSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-update middleware to update timestamps
AIModelMetadataSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance methods

/**
 * Update performance metrics
 */
AIModelMetadataSchema.methods.updatePerformanceMetrics = function(metrics) {
  this.performanceMetrics = {
    ...this.performanceMetrics,
    ...metrics
  };
  return this.save();
};

/**
 * Update usage statistics
 */
AIModelMetadataSchema.methods.updateUsageStats = function(stats) {
  this.usageStats = {
    ...this.usageStats,
    ...stats,
    lastUsedAt: new Date()
  };
  return this.save();
};

/**
 * Mark model as production ready
 */
AIModelMetadataSchema.methods.markAsProduction = function() {
  this.status = 'production';
  this.deployedAt = new Date();
  return this.save();
};

/**
 * Archive model
 */
AIModelMetadataSchema.methods.archive = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

/**
 * Calculate model efficiency score
 */
AIModelMetadataSchema.methods.calculateEfficiencyScore = function() {
  const metrics = this.performanceMetrics;
  const technical = this.technicalMetrics;
  
  // Weighted score calculation
  const profitabilityScore = (metrics.roi || 0) * 0.3;
  const accuracyScore = (metrics.accuracy || 0) * 0.25;
  const winRateScore = (metrics.winRate || 0) * 0.25;
  const efficiencyScore = technical.averageReward ? (technical.averageReward * 0.2) : 0;
  
  return Math.max(0, Math.min(1, profitabilityScore + accuracyScore + winRateScore + efficiencyScore));
};

/**
 * Get model summary
 */
AIModelMetadataSchema.methods.getSummary = function() {
  return {
    modelId: this.modelId,
    version: this.version,
    status: this.status,
    efficiencyScore: this.calculateEfficiencyScore(),
    totalProfit: this.performanceMetrics.totalProfit,
    winRate: this.performanceMetrics.winRate,
    totalTrades: this.performanceMetrics.totalTrades,
    createdAt: this.createdAt,
    lastUsedAt: this.usageStats.lastUsedAt
  };
};

// Static methods

/**
 * Get production model
 */
AIModelMetadataSchema.statics.getProductionModel = function() {
  return this.findOne({ status: 'production' })
    .sort({ deployedAt: -1 });
};

/**
 * Get best performing model
 */
AIModelMetadataSchema.statics.getBestPerformingModel = function() {
  return this.findOne({ status: { $in: ['testing', 'production'] } })
    .sort({ 'performanceMetrics.roi': -1 });
};

/**
 * Get models by performance threshold
 */
AIModelMetadataSchema.statics.getModelsByPerformance = function(minRoi = 0.05) {
  return this.find({
    'performanceMetrics.roi': { $gte: minRoi },
    status: { $in: ['testing', 'production'] }
  }).sort({ 'performanceMetrics.roi': -1 });
};

/**
 * Get recent models
 */
AIModelMetadataSchema.statics.getRecentModels = function(limit = 10) {
  return this.find({})
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get model statistics
 */
AIModelMetadataSchema.statics.getModelStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgRoi: { $avg: '$performanceMetrics.roi' },
        avgAccuracy: { $avg: '$performanceMetrics.accuracy' },
        totalProfit: { $sum: '$performanceMetrics.totalProfit' },
        totalTrades: { $sum: '$performanceMetrics.totalTrades' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

/**
 * Find models for cleanup (old archived models)
 */
AIModelMetadataSchema.statics.findModelsForCleanup = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.find({
    status: 'archived',
    archivedAt: { $lt: cutoffDate }
  });
};

// Virtual fields

/**
 * Model age in days
 */
AIModelMetadataSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (24 * 60 * 60 * 1000));
});

/**
 * Days since last use
 */
AIModelMetadataSchema.virtual('daysSinceLastUse').get(function() {
  if (!this.usageStats.lastUsedAt) return null;
  return Math.floor((Date.now() - this.usageStats.lastUsedAt.getTime()) / (24 * 60 * 60 * 1000));
});

/**
 * Success rate
 */
AIModelMetadataSchema.virtual('successRate').get(function() {
  const total = this.usageStats.totalPredictions;
  const successful = this.usageStats.successfulPredictions;
  return total > 0 ? successful / total : 0;
});

// Ensure virtual fields are included in JSON output
AIModelMetadataSchema.set('toJSON', { virtuals: true });
AIModelMetadataSchema.set('toObject', { virtuals: true });

// Model validation
AIModelMetadataSchema.path('modelId').validate(function(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}, 'Model ID must contain only alphanumeric characters, hyphens, and underscores');

AIModelMetadataSchema.path('version').validate(function(value) {
  return /^[0-9]+\.[0-9]+(\.[0-9]+)?$/.test(value);
}, 'Version must follow semantic versioning format (e.g., 1.0.0)');

const AIModelMetadata = mongoose.model('AIModelMetadata', AIModelMetadataSchema);

module.exports = { AIModelMetadata };