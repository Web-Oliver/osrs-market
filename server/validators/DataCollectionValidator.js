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

    return this.formatSuccessResponse(null, 'Configuration validation successful');
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

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'DATA_COLLECTION_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Data collection validation successful');
  }

  /**
   * Context7 Pattern: Validate collection interval (Enhanced with DRY pattern)
   */
  validateCollectionInterval(interval) {
    const validation = this.validateInteger(interval, 5000, 300000, 'collectionInterval');
    
    if (!validation.isValid) {
      return { isValid: false, error: validation.error };
    }

    return { isValid: true, interval: validation.value };
  }

  /**
   * Context7 Pattern: Validate item tracking limits (Enhanced with DRY pattern)
   */
  validateItemTrackingLimits(maxItems, minProfitMargin, minVolume) {
    const errors = [];

    if (maxItems !== undefined) {
      const maxItemsValidation = this.validateInteger(maxItems, 10, 500, 'maxItems');
      if (!maxItemsValidation.isValid) {
        errors.push(maxItemsValidation.error);
      }
    }

    if (minProfitMargin !== undefined) {
      const profitMarginValidation = this.validatePercentage(minProfitMargin, 'minProfitMargin', false);
      if (!profitMarginValidation.isValid) {
        errors.push(profitMarginValidation.error);
      }
    }

    if (minVolume !== undefined) {
      const volumeValidation = this.validateFloat(minVolume, 0, Number.MAX_VALUE, 'minVolume');
      if (!volumeValidation.isValid) {
        errors.push(volumeValidation.error);
      }
    }

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'DATA_COLLECTION_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Data collection validation successful');
  }

  /**
   * Context7 Pattern: Validate time range parameter (Enhanced with DRY pattern)
   */
  validateTimeRange(timeRange) {
    const TimeConstants = require('../utils/TimeConstants');
    return super.validateTimeRange(timeRange, TimeConstants.ONE_HOUR, TimeConstants.THIRTY_DAYS);
  }

  /**
   * Context7 Pattern: Validate export format (Enhanced with DRY pattern)
   */
  validateExportFormat(format) {
    if (!format) {
      return { isValid: true, format: 'json' }; // Default
    }

    const formatValidation = this.validateEnum(format.toLowerCase(), ['json', 'csv'], 'exportFormat', false);
    
    if (!formatValidation.isValid) {
      return formatValidation;
    }

    return { isValid: true, format: formatValidation.value };
  }

  /**
   * Context7 Pattern: Validate limit parameter (Enhanced with DRY pattern)
   */
  validateLimit(limit) {
    return super.validateLimit(limit, 50, 1000);
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

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'DATA_COLLECTION_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Data collection validation successful');
  }

  /**
   * Context7 Pattern: Validate retry configuration (Enhanced with DRY pattern)
   */
  validateRetryConfig(maxRetries) {
    if (!maxRetries) {
      return { isValid: true, maxRetries: 3 }; // Default
    }

    const validation = this.validateInteger(maxRetries, 1, 10, 'maxRetries');
    
    if (!validation.isValid) {
      return { isValid: false, error: validation.error };
    }

    return { isValid: true, maxRetries: validation.value };
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

    // Additional validation for export size using TimeConstants
    const TimeConstants = require('../utils/TimeConstants');
    if (params.timeRange && params.timeRange > TimeConstants.ONE_DAY) {
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

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'DATA_COLLECTION_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Data collection validation successful');
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

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'DATA_COLLECTION_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Data collection validation successful');
  }
}

// Context7 Pattern: Export validation functions
const validateRequest = new DataCollectionValidator();

module.exports = {
  DataCollectionValidator,
  validateRequest
};
