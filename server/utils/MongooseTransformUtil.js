/**
 * 🔄 Mongoose Transform Utility - Context7 Optimized
 *
 * Context7 Pattern: Centralized Mongoose transformation functions
 * - Single Responsibility: Object transformation for API responses
 * - DRY: Eliminates 8+ duplicate transform functions across models
 * - Consistent object transformations across the entire application
 */

class MongooseTransformUtil {
  /**
   * Context7 Pattern: Standard transform function
   * DRY: Eliminates duplicate transform functions across 8+ models
   * Removes MongoDB-specific fields (_id, __v) from API responses
   */
  static standardTransform(doc, ret, options) {
    // Remove MongoDB internal fields
    delete ret._id;
    delete ret.__v;
    
    // Convert dates to ISO strings for consistent API responses
    if (ret.createdAt && ret.createdAt instanceof Date) {
      ret.createdAt = ret.createdAt.toISOString();
    }
    
    if (ret.updatedAt && ret.updatedAt instanceof Date) {
      ret.updatedAt = ret.updatedAt.toISOString();
    }
    
    return ret;
  }

  /**
   * Context7 Pattern: Minimal transform function
   * DRY: For cases where only __v should be removed
   */
  static minimalTransform(doc, ret, options) {
    // Only remove version key, keep _id for some use cases
    delete ret.__v;
    return ret;
  }

  /**
   * Context7 Pattern: Public API transform
   * DRY: For public-facing APIs with additional field filtering
   */
  static publicTransform(doc, ret, options) {
    // Apply standard transform first
    ret = this.standardTransform(doc, ret, options);
    
    // Remove sensitive or internal fields for public APIs
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'internal'];
    sensitiveFields.forEach(field => {
      delete ret[field];
    });
    
    return ret;
  }

  /**
   * Context7 Pattern: Clean transform with ID conversion
   * DRY: Converts _id to id for REST API standards
   */
  static cleanTransform(doc, ret, options) {
    // Convert _id to id
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    
    // Remove version key
    delete ret.__v;
    
    // Convert dates to ISO strings
    if (ret.createdAt && ret.createdAt instanceof Date) {
      ret.createdAt = ret.createdAt.toISOString();
    }
    
    if (ret.updatedAt && ret.updatedAt instanceof Date) {
      ret.updatedAt = ret.updatedAt.toISOString();
    }
    
    return ret;
  }

  /**
   * Context7 Pattern: Summary transform
   * DRY: For list/summary views with minimal data
   */
  static summaryTransform(doc, ret, options, fieldsToKeep = []) {
    // Apply standard transform
    ret = this.standardTransform(doc, ret, options);
    
    // If specific fields are specified, only keep those
    if (fieldsToKeep.length > 0) {
      const summary = {};
      fieldsToKeep.forEach(field => {
        if (ret[field] !== undefined) {
          summary[field] = ret[field];
        }
      });
      return summary;
    }
    
    return ret;
  }

  /**
   * Context7 Pattern: Market data specific transform
   * DRY: For financial/market data with number formatting
   */
  static marketDataTransform(doc, ret, options) {
    // Apply standard transform
    ret = this.standardTransform(doc, ret, options);
    
    // Format financial numbers to appropriate precision
    const financialFields = ['price', 'high', 'low', 'volume', 'margin', 'profit'];
    financialFields.forEach(field => {
      if (typeof ret[field] === 'number') {
        ret[field] = Math.round(ret[field] * 100) / 100; // 2 decimal places
      }
    });
    
    return ret;
  }

  /**
   * Context7 Pattern: Get transform configuration object
   * DRY: Returns complete transform configuration for schema options
   */
  static getStandardTransformConfig() {
    return {
      transform: this.standardTransform,
      virtuals: true,
      versionKey: false
    };
  }

  /**
   * Context7 Pattern: Get public transform configuration
   * DRY: Returns public-safe transform configuration
   */
  static getPublicTransformConfig() {
    return {
      transform: this.publicTransform,
      virtuals: true,
      versionKey: false
    };
  }

  /**
   * Context7 Pattern: Get clean transform configuration
   * DRY: Returns REST API standard transform configuration
   */
  static getCleanTransformConfig() {
    return {
      transform: this.cleanTransform,
      virtuals: true,
      versionKey: false
    };
  }

  /**
   * Context7 Pattern: Get market data transform configuration
   * DRY: Returns market-specific transform configuration
   */
  static getMarketDataTransformConfig() {
    return {
      transform: this.marketDataTransform,
      virtuals: true,
      versionKey: false
    };
  }

  /**
   * Context7 Pattern: Apply transform to any object
   * DRY: Utility method to transform any object using the standard transform
   */
  static transformObject(obj, transformType = 'standard') {
    const transforms = {
      standard: this.standardTransform,
      minimal: this.minimalTransform,
      public: this.publicTransform,
      clean: this.cleanTransform,
      market: this.marketDataTransform
    };

    const transform = transforms[transformType] || transforms.standard;
    return transform(null, { ...obj }, {});
  }
}

module.exports = MongooseTransformUtil;