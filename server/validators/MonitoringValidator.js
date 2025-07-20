/**
 * 📊 Monitoring Validator - Context7 Optimized
 *
 * Context7 Pattern: Validation Layer
 * - Centralized monitoring validation logic
 * - Reusable validation schemas
 * - Comprehensive error reporting
 * - Type-safe validation patterns
 */

const { BaseValidator } = require('./BaseValidator');
const TimeConstants = require('../utils/TimeConstants');

class MonitoringValidator extends BaseValidator {
  constructor() {
    super();
    this.validationSchemas = this.initializeSchemas();
  }

  /**
   * Context7 Pattern: Initialize validation schemas
   */
  initializeSchemas() {
    return {
      getLiveMonitoringData: {
        query: {
          limit: { type: 'number', min: 1, max: 500, optional: true }
        }
      },
      saveLiveMonitoringData: {
        body: {
          timestamp: { type: 'number', required: true },
          apiRequests: { type: 'number', required: true, min: 0 },
          successRate: { type: 'number', required: true, min: 0, max: 100 },
          itemsProcessed: { type: 'number', required: true, min: 0 },
          profit: { type: 'number', required: true },
          memoryUsage: { type: 'number', required: true, min: 0 },
          responseTime: { type: 'number', required: true, min: 0 },
          rateLimitStatus: {
            type: 'string',
            required: true,
            enum: ['HEALTHY', 'THROTTLED', 'COOLDOWN', 'OVERLOADED']
          },
          itemSelectionEfficiency: { type: 'number', required: true, min: 0, max: 100 },
          dataQuality: { type: 'number', required: true, min: 0, max: 100 }
        }
      },
      getAggregatedStats: {
        query: {
          timeRange: { type: 'number', min: 1, optional: true }
        }
      },
      performDataCleanup: {
        body: {
          maxAge: { type: 'number', min: 1, optional: true }
        }
      }
    };
  }

  /**
   * Context7 Pattern: Validate live monitoring data retrieval
   */
  getLiveMonitoringData(data) {
    return this.validateData(data, this.validationSchemas.getLiveMonitoringData);
  }

  /**
   * Context7 Pattern: Validate live monitoring data save
   */
  saveLiveMonitoringData(data) {
    const validation = this.validateData(data, this.validationSchemas.saveLiveMonitoringData);

    if (!validation.isValid) {
      return validation;
    }

    // Context7 Pattern: Additional business logic validation
    const businessValidation = this.validateMonitoringBusinessRules(data);
    if (!businessValidation.isValid) {
      return businessValidation;
    }

    return this.formatSuccessResponse(null, 'Monitoring data validation successful');
  }

  /**
   * Context7 Pattern: Validate aggregated statistics request
   */
  getAggregatedStats(data) {
    return this.validateData(data, this.validationSchemas.getAggregatedStats);
  }

  /**
   * Context7 Pattern: Validate data cleanup request
   */
  performDataCleanup(data) {
    return this.validateData(data, this.validationSchemas.performDataCleanup);
  }

  /**
   * Context7 Pattern: Validate monitoring business rules (Enhanced with DRY pattern)
   */
  validateMonitoringBusinessRules(data) {
    const errors = [];

    // Enhanced timestamp validation using BaseValidator method
    const timestampValidation = this.validateTimestampEnhanced(
      data.timestamp, 
      'timestamp', 
      true, // allow future (within limits)
      TimeConstants.ONE_DAY
    );
    
    if (!timestampValidation.isValid) {
      errors.push(timestampValidation.error);
    }

    // Validate success rate consistency with percentage validation
    const successRateValidation = this.validatePercentage(data.successRate, 'successRate');
    if (!successRateValidation.isValid) {
      errors.push(successRateValidation.error);
    } else if (data.apiRequests > 0 && successRateValidation.value === 0) {
      errors.push('Success rate cannot be 0 when API requests are made');
    }

    // Validate profit consistency
    if (data.itemsProcessed > 0 && data.profit === 0) {
      // This is a warning, not an error - could be legitimate
    }

    // Validate memory usage is reasonable
    if (data.memoryUsage > 1000) { // 1GB
      errors.push('Memory usage seems unreasonably high (>1GB)');
    }

    // Validate response time is reasonable
    if (data.responseTime > 60000) { // 60 seconds
      errors.push('Response time seems unreasonably high (>60s)');
    }

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'MONITORING_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Monitoring validation successful');
  }

  /**
   * Context7 Pattern: Validate system status request
   */
  validateSystemStatusRequest(data) {
    // System status typically has no parameters
    return this.formatSuccessResponse(null, 'Monitoring data validation successful');
  }

  /**
   * Context7 Pattern: Validate efficiency metrics request
   */
  validateEfficiencyMetricsRequest(data) {
    // Efficiency metrics typically has no parameters
    return this.formatSuccessResponse(null, 'Monitoring data validation successful');
  }

  /**
   * Context7 Pattern: Validate health check request
   */
  validateHealthCheckRequest(data) {
    // Health check typically has no parameters
    return this.formatSuccessResponse(null, 'Monitoring data validation successful');
  }

  /**
   * Context7 Pattern: Validate time range for statistics (Enhanced with DRY pattern)
   */
  validateStatisticsTimeRange(timeRange) {
    return super.validateTimeRange(timeRange, TimeConstants.ONE_HOUR, TimeConstants.THIRTY_DAYS);
  }

  /**
   * Context7 Pattern: Validate limit parameter (Enhanced with DRY pattern)
   */
  validateLimitParameter(limit) {
    return super.validateLimit(limit, 50, 500);
  }

  /**
   * Context7 Pattern: Validate rate limit status (Enhanced with DRY pattern)
   */
  validateRateLimitStatus(status) {
    const validStatuses = ['HEALTHY', 'THROTTLED', 'COOLDOWN', 'OVERLOADED'];
    return this.validateEnum(status, validStatuses, 'rateLimitStatus');
  }

  /**
   * Context7 Pattern: Validate monitoring data completeness
   */
  validateDataCompleteness(data) {
    const requiredFields = [
      'timestamp', 'apiRequests', 'successRate', 'itemsProcessed',
      'profit', 'memoryUsage', 'responseTime', 'rateLimitStatus',
      'itemSelectionEfficiency', 'dataQuality'
    ];

    const missingFields = requiredFields.filter(field =>
      data[field] === undefined || data[field] === null
    );

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    return { isValid: true };
  }

  /**
   * Context7 Pattern: Validate monitoring data ranges (Enhanced with DRY pattern)
   */
  validateDataRanges(data) {
    const errors = [];

    // Validate percentage values using BaseValidator
    const percentageFields = ['successRate', 'itemSelectionEfficiency', 'dataQuality'];
    percentageFields.forEach(field => {
      if (data[field] !== undefined) {
        const validation = this.validatePercentage(data[field], field);
        if (!validation.isValid) {
          errors.push(validation.error);
        }
      }
    });

    // Validate non-negative values using BaseValidator
    const nonNegativeFields = ['apiRequests', 'itemsProcessed', 'memoryUsage', 'responseTime'];
    nonNegativeFields.forEach(field => {
      if (data[field] !== undefined) {
        const validation = this.validateFloat(data[field], 0, Number.MAX_VALUE, field);
        if (!validation.isValid) {
          errors.push(validation.error);
        }
      }
    });

    if (errors.length > 0) {
      return this.formatErrorResponse(errors, 'MONITORING_VALIDATION_ERROR');
    }
    
    return this.formatSuccessResponse(null, 'Monitoring validation successful');
  }
}

// Context7 Pattern: Export validation functions
const validateRequest = new MonitoringValidator();

module.exports = {
  MonitoringValidator,
  validateRequest
};
