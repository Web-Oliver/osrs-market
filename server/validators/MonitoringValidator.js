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

    return { isValid: true, errors: [] };
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
   * Context7 Pattern: Validate monitoring business rules
   */
  validateMonitoringBusinessRules(data) {
    const errors = [];
    
    // Validate timestamp is not in the future
    if (data.timestamp > Date.now() + 60000) { // Allow 1 minute future for clock skew
      errors.push('Timestamp cannot be more than 1 minute in the future');
    }
    
    // Validate timestamp is not too old
    if (data.timestamp < Date.now() - 24 * 60 * 60 * 1000) { // 24 hours ago
      errors.push('Timestamp cannot be more than 24 hours old');
    }
    
    // Validate success rate consistency
    if (data.apiRequests > 0 && data.successRate === 0) {
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
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Context7 Pattern: Validate system status request
   */
  validateSystemStatusRequest(data) {
    // System status typically has no parameters
    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate efficiency metrics request
   */
  validateEfficiencyMetricsRequest(data) {
    // Efficiency metrics typically has no parameters
    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate health check request
   */
  validateHealthCheckRequest(data) {
    // Health check typically has no parameters
    return { isValid: true, errors: [] };
  }

  /**
   * Context7 Pattern: Validate time range for statistics
   */
  validateStatisticsTimeRange(timeRange) {
    if (!timeRange) {
      return { isValid: true, timeRange: 3600000 }; // Default 1 hour
    }
    
    const numericRange = parseInt(timeRange);
    if (isNaN(numericRange) || numericRange < 1) {
      return { isValid: false, error: 'Time range must be a positive number' };
    }
    
    // Limit to reasonable time ranges
    const maxRange = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (numericRange > maxRange) {
      return { isValid: false, error: 'Time range cannot exceed 30 days' };
    }
    
    return { isValid: true, timeRange: numericRange };
  }

  /**
   * Context7 Pattern: Validate limit parameter
   */
  validateLimitParameter(limit) {
    if (!limit) {
      return { isValid: true, limit: 50 }; // Default limit
    }
    
    const numericLimit = parseInt(limit);
    if (isNaN(numericLimit) || numericLimit < 1) {
      return { isValid: false, error: 'Limit must be a positive number' };
    }
    
    if (numericLimit > 500) {
      return { isValid: false, error: 'Limit cannot exceed 500' };
    }
    
    return { isValid: true, limit: numericLimit };
  }

  /**
   * Context7 Pattern: Validate rate limit status
   */
  validateRateLimitStatus(status) {
    const validStatuses = ['HEALTHY', 'THROTTLED', 'COOLDOWN', 'OVERLOADED'];
    
    if (!status || typeof status !== 'string') {
      return { isValid: false, error: 'Rate limit status is required and must be a string' };
    }
    
    if (!validStatuses.includes(status)) {
      return { isValid: false, error: `Rate limit status must be one of: ${validStatuses.join(', ')}` };
    }
    
    return { isValid: true, status };
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
   * Context7 Pattern: Validate monitoring data ranges
   */
  validateDataRanges(data) {
    const errors = [];
    
    // Validate percentage values
    const percentageFields = ['successRate', 'itemSelectionEfficiency', 'dataQuality'];
    percentageFields.forEach(field => {
      if (data[field] < 0 || data[field] > 100) {
        errors.push(`${field} must be between 0 and 100`);
      }
    });
    
    // Validate non-negative values
    const nonNegativeFields = ['apiRequests', 'itemsProcessed', 'memoryUsage', 'responseTime'];
    nonNegativeFields.forEach(field => {
      if (data[field] < 0) {
        errors.push(`${field} must be non-negative`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Context7 Pattern: Export validation functions
const validateRequest = new MonitoringValidator();

module.exports = {
  MonitoringValidator,
  validateRequest
};