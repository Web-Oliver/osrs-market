/**
 * 📊 Data Collection Validator - Context7 Optimized
 * 
 * Context7 Pattern: Validation Layer for Data Collection Operations
 * - Centralized validation logic for data collection endpoints
 * - Reusable validation schemas
 * - Comprehensive error reporting
 * - Configuration validation
 */

const { BaseValidator } = require('./BaseValidator');

class DataCollectionValidator extends BaseValidator {
  constructor() {
    super();
    this.validationSchemas = this.initializeSchemas();
  }

  /**
   * Context7 Pattern: Initialize validation schemas
   */
  initializeSchemas() {
    return {
      updateConfiguration: {
        body: {
          collectionInterval: { type: 'number', optional: true, min: 5000, max: 300000 },
          maxItemsToTrack: { type: 'number', optional: true, min: 10, max: 500 },
          minProfitMargin: { type: 'number', optional: true, min: 0, max: 100 },
          minVolume: { type: 'number', optional: true, min: 0, max: 1000 },
          maxRetries: { type: 'number', optional: true, min: 1, max: 10 },
          smartSelectionEnabled: { type: 'boolean', optional: true },
          adaptiveThresholds: { type: 'boolean', optional: true }
        }
      },
      getLatestData: {
        query: {
          limit: { type: 'number', optional: true, min: 1, max: 1000 }
        }
      },
      getMetrics: {
        query: {
          timeRange: { type: 'number', optional: true, min: 60000, max: 86400000 }
        }
      },
      exportData: {
        query: {
          format: { type: 'string', optional: true, enum: ['json', 'csv'] },
          timeRange: { type: 'number', optional: true, min: 60000, max: 2592000000 }
        }
      }
    };
  }

  /**
   * Context7 Pattern: Validate configuration update
   */
  updateConfiguration(data) {
    const validation = this.validateData(data, this.validationSchemas.updateConfiguration);
    
    if (!validation.isValid) {
      return validation;
    }

    // Additional business rule validation
    const businessValidation = this.validateConfigurationBusinessRules(data);
    if (!businessValidation.isValid) {
      return businessValidation;
    }

    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate latest data request
   */
  getLatestData(data) {
    return this.validateData(data, this.validationSchemas.getLatestData);
  }

  /**
   * Context7 Pattern: Validate metrics request
   */
  getMetrics(data) {
    return this.validateData(data, this.validationSchemas.getMetrics);
  }

  /**
   * Context7 Pattern: Validate export data request
   */
  exportData(data) {
    return this.validateData(data, this.validationSchemas.exportData);
  }

  /**
   * Context7 Pattern: Validate configuration business rules
   */
  validateConfigurationBusinessRules(config) {
    const errors = [];

    // Collection interval validation
    if (config.collectionInterval !== undefined) {
      if (config.collectionInterval < 5000) {
        errors.push('Collection interval must be at least 5 seconds to avoid rate limiting');
      }
      
      if (config.collectionInterval > 300000) {
        errors.push('Collection interval cannot exceed 5 minutes');
      }
    }

    // Max items to track validation
    if (config.maxItemsToTrack !== undefined) {
      if (config.maxItemsToTrack < 10) {
        errors.push('Must track at least 10 items for meaningful data');
      }
      
      if (config.maxItemsToTrack > 500) {
        errors.push('Tracking more than 500 items may impact performance');
      }
    }

    // Profit margin validation
    if (config.minProfitMargin !== undefined) {
      if (config.minProfitMargin < 0) {
        errors.push('Minimum profit margin cannot be negative');
      }
      
      if (config.minProfitMargin > 100) {
        errors.push('Minimum profit margin cannot exceed 100%');
      }
    }

    // Volume validation
    if (config.minVolume !== undefined) {
      if (config.minVolume < 0) {
        errors.push('Minimum volume cannot be negative');
      }
    }

    // Retry validation
    if (config.maxRetries !== undefined) {
      if (config.maxRetries < 1) {
        errors.push('Must allow at least 1 retry attempt');
      }
      
      if (config.maxRetries > 10) {
        errors.push('Too many retries may cause performance issues');
      }
    }

    // Consistency checks
    if (config.collectionInterval && config.maxItemsToTrack) {
      const estimatedApiCalls = config.maxItemsToTrack / config.collectionInterval * 60000; // per minute
      if (estimatedApiCalls > 25) {
        errors.push('Configuration may exceed API rate limits (estimated ' + 
          Math.round(estimatedApiCalls) + ' calls per minute)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate collection interval
   */
  validateCollectionInterval(interval) {
    if (typeof interval !== 'number') {
      return { isValid: false, error: 'Collection interval must be a number' };
    }
    
    if (interval < 5000) {
      return { isValid: false, error: 'Collection interval must be at least 5 seconds' };
    }
    
    if (interval > 300000) {
      return { isValid: false, error: 'Collection interval cannot exceed 5 minutes' };
    }
    
    return { isValid: true, interval };
  }

  /**
   * Context7 Pattern: Validate item tracking limits
   */
  validateItemTrackingLimits(maxItems, minProfitMargin, minVolume) {
    const errors = [];
    
    if (maxItems !== undefined) {
      if (typeof maxItems !== 'number' || maxItems < 10 || maxItems > 500) {
        errors.push('Max items to track must be between 10 and 500');
      }
    }
    
    if (minProfitMargin !== undefined) {
      if (typeof minProfitMargin !== 'number' || minProfitMargin < 0 || minProfitMargin > 100) {
        errors.push('Minimum profit margin must be between 0 and 100%');
      }
    }
    
    if (minVolume !== undefined) {
      if (typeof minVolume !== 'number' || minVolume < 0) {
        errors.push('Minimum volume must be non-negative');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate time range parameter
   */
  validateTimeRange(timeRange) {
    if (!timeRange) {
      return { isValid: true, timeRange: 3600000 }; // Default 1 hour
    }
    
    if (typeof timeRange !== 'number') {
      return { isValid: false, error: 'Time range must be a number' };
    }
    
    if (timeRange < 60000) {
      return { isValid: false, error: 'Time range must be at least 1 minute' };
    }
    
    if (timeRange > 2592000000) { // 30 days
      return { isValid: false, error: 'Time range cannot exceed 30 days' };
    }
    
    return { isValid: true, timeRange };
  }

  /**
   * Context7 Pattern: Validate export format
   */
  validateExportFormat(format) {
    if (!format) {
      return { isValid: true, format: 'json' }; // Default
    }
    
    if (typeof format !== 'string') {
      return { isValid: false, error: 'Export format must be a string' };
    }
    
    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format.toLowerCase())) {
      return { 
        isValid: false, 
        error: `Export format must be one of: ${validFormats.join(', ')}` 
      };
    }
    
    return { isValid: true, format: format.toLowerCase() };
  }

  /**
   * Context7 Pattern: Validate limit parameter
   */
  validateLimit(limit) {
    if (!limit) {
      return { isValid: true, limit: 50 }; // Default
    }
    
    if (typeof limit !== 'number') {
      return { isValid: false, error: 'Limit must be a number' };
    }
    
    if (limit < 1) {
      return { isValid: false, error: 'Limit must be at least 1' };
    }
    
    if (limit > 1000) {
      return { isValid: false, error: 'Limit cannot exceed 1000' };
    }
    
    return { isValid: true, limit };
  }

  /**
   * Context7 Pattern: Validate smart selection parameters
   */
  validateSmartSelectionParams(params) {
    const errors = [];
    
    if (params.smartSelectionEnabled !== undefined) {
      if (typeof params.smartSelectionEnabled !== 'boolean') {
        errors.push('Smart selection enabled must be a boolean');
      }
    }
    
    if (params.adaptiveThresholds !== undefined) {
      if (typeof params.adaptiveThresholds !== 'boolean') {
        errors.push('Adaptive thresholds must be a boolean');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate retry configuration
   */
  validateRetryConfig(maxRetries) {
    if (!maxRetries) {
      return { isValid: true, maxRetries: 3 }; // Default
    }
    
    if (typeof maxRetries !== 'number') {
      return { isValid: false, error: 'Max retries must be a number' };
    }
    
    if (maxRetries < 1) {
      return { isValid: false, error: 'Must allow at least 1 retry' };
    }
    
    if (maxRetries > 10) {
      return { isValid: false, error: 'Max retries cannot exceed 10' };
    }
    
    return { isValid: true, maxRetries };
  }

  /**
   * Context7 Pattern: Validate performance thresholds
   */
  validatePerformanceThresholds(config) {
    const errors = [];
    const warnings = [];
    
    // Check for potentially problematic configurations
    if (config.collectionInterval && config.maxItemsToTrack) {
      const callsPerMinute = (60000 / config.collectionInterval) * 
        Math.ceil(config.maxItemsToTrack / 100); // Estimate API calls needed
      
      if (callsPerMinute > 25) {
        errors.push('Configuration may exceed API rate limits');
      } else if (callsPerMinute > 20) {
        warnings.push('Configuration approaches API rate limits');
      }
    }
    
    // Check memory usage estimates
    if (config.maxItemsToTrack && config.maxItemsToTrack > 300) {
      warnings.push('Tracking many items may increase memory usage');
    }
    
    // Check collection frequency
    if (config.collectionInterval && config.collectionInterval < 10000) {
      warnings.push('High collection frequency may impact performance');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Context7 Pattern: Validate data export parameters
   */
  validateDataExportParams(params) {
    const errors = [];
    
    const formatValidation = this.validateExportFormat(params.format);
    if (!formatValidation.isValid) {
      errors.push(formatValidation.error);
    }
    
    const timeRangeValidation = this.validateTimeRange(params.timeRange);
    if (!timeRangeValidation.isValid) {
      errors.push(timeRangeValidation.error);
    }
    
    // Additional validation for export size
    if (params.timeRange && params.timeRange > 86400000) { // 24 hours
      const estimatedRecords = (params.timeRange / 30000) * 100; // Rough estimate
      if (estimatedRecords > 100000) {
        errors.push('Export time range too large, may result in excessive data');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedParams: {
        format: formatValidation.format,
        timeRange: timeRangeValidation.timeRange
      }
    };
  }

  /**
   * Context7 Pattern: Validate collection start parameters
   */
  validateCollectionStart(config) {
    const errors = [];
    
    // Validate required services are available
    if (!config.osrsApiAvailable) {
      errors.push('OSRS API must be available to start collection');
    }
    
    if (!config.databaseAvailable) {
      errors.push('Database must be available to start collection');
    }
    
    // Validate system resources
    if (config.memoryUsage && config.memoryUsage > 90) {
      errors.push('Insufficient memory to start collection');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate collection stop parameters
   */
  validateCollectionStop(params) {
    const errors = [];
    
    // Validate stop options if provided
    if (params.saveStats !== undefined && typeof params.saveStats !== 'boolean') {
      errors.push('Save stats option must be a boolean');
    }
    
    if (params.gracefulShutdown !== undefined && typeof params.gracefulShutdown !== 'boolean') {
      errors.push('Graceful shutdown option must be a boolean');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Context7 Pattern: Export validation functions
const validateRequest = new DataCollectionValidator();

module.exports = {
  DataCollectionValidator,
  validateRequest
};