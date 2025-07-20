/**
 * 🔍 Error Classifier - Context7 Optimized
 *
 * Context7 Pattern: Centralized Error Classification System
 * - Intelligent error categorization
 * - Severity assessment
 * - Recovery suggestions
 * - Performance impact analysis
 */

class ErrorClassifier {
  constructor() {
    this.errorPatterns = this.initializeErrorPatterns();
    this.severityLevels = this.initializeSeverityLevels();
  }

  /**
   * Context7 Pattern: Initialize error patterns
   */
  initializeErrorPatterns() {
    return {
      // Database errors
      database: {
        patterns: [
          /connection.*refused/i,
          /connection.*timeout/i,
          /connection.*lost/i,
          /duplicate.*key/i,
          /constraint.*violation/i,
          /table.*doesn't exist/i,
          /column.*not found/i,
          /syntax.*error/i,
          /mongo.*error/i,
          /collection.*not found/i
        ],
        category: 'database',
        severity: 'high'
      },

      // Network errors
      network: {
        patterns: [
          /econnrefused/i,
          /econnreset/i,
          /etimedout/i,
          /enotfound/i,
          /network.*error/i,
          /socket.*timeout/i,
          /request.*timeout/i,
          /fetch.*failed/i
        ],
        category: 'network',
        severity: 'medium'
      },

      // Authentication errors
      authentication: {
        patterns: [
          /authentication.*failed/i,
          /invalid.*credentials/i,
          /unauthorized/i,
          /token.*expired/i,
          /token.*invalid/i,
          /access.*denied/i
        ],
        category: 'authentication',
        severity: 'medium'
      },

      // Authorization errors
      authorization: {
        patterns: [
          /forbidden/i,
          /permission.*denied/i,
          /access.*denied/i,
          /insufficient.*privileges/i,
          /not.*authorized/i
        ],
        category: 'authorization',
        severity: 'medium'
      },

      // Validation errors
      validation: {
        patterns: [
          /validation.*failed/i,
          /invalid.*input/i,
          /bad.*request/i,
          /malformed.*request/i,
          /missing.*required/i,
          /invalid.*format/i
        ],
        category: 'validation',
        severity: 'low'
      },

      // Rate limiting errors
      rateLimit: {
        patterns: [
          /rate.*limit/i,
          /too.*many.*requests/i,
          /quota.*exceeded/i,
          /throttle/i,
          /429/
        ],
        category: 'rate_limit',
        severity: 'medium'
      },

      // File system errors
      filesystem: {
        patterns: [
          /enoent/i,
          /file.*not.*found/i,
          /permission.*denied/i,
          /disk.*full/i,
          /no.*space.*left/i
        ],
        category: 'filesystem',
        severity: 'medium'
      },

      // Memory errors
      memory: {
        patterns: [
          /out.*of.*memory/i,
          /memory.*leak/i,
          /heap.*exhausted/i,
          /maximum.*call.*stack/i,
          /stack.*overflow/i
        ],
        category: 'memory',
        severity: 'high'
      },

      // External service errors
      external: {
        patterns: [
          /service.*unavailable/i,
          /bad.*gateway/i,
          /gateway.*timeout/i,
          /external.*service/i,
          /api.*error/i,
          /third.*party/i
        ],
        category: 'external',
        severity: 'medium'
      },

      // Configuration errors
      configuration: {
        patterns: [
          /configuration.*error/i,
          /config.*not.*found/i,
          /invalid.*config/i,
          /missing.*config/i,
          /environment.*variable/i
        ],
        category: 'configuration',
        severity: 'high'
      },

      // Timeout errors
      timeout: {
        patterns: [
          /timeout/i,
          /request.*timeout/i,
          /operation.*timeout/i,
          /connection.*timeout/i
        ],
        category: 'timeout',
        severity: 'medium'
      }
    };
  }

  /**
   * Context7 Pattern: Initialize severity levels
   */
  initializeSeverityLevels() {
    return {
      critical: {
        level: 4,
        description: 'System is unusable',
        alerting: true,
        autoRestart: true
      },
      high: {
        level: 3,
        description: 'Significant impact on functionality',
        alerting: true,
        autoRestart: false
      },
      medium: {
        level: 2,
        description: 'Moderate impact, degraded performance',
        alerting: false,
        autoRestart: false
      },
      low: {
        level: 1,
        description: 'Minor impact, mostly recoverable',
        alerting: false,
        autoRestart: false
      }
    };
  }

  /**
   * Context7 Pattern: Classify error
   */
  classify(error) {
    const errorMessage = this.extractErrorMessage(error);
    const classification = this.categorizeError(errorMessage);
    const severity = this.assessSeverity(error, classification);
    const recovery = this.suggestRecovery(error, classification);

    return {
      category: classification.category,
      severity: severity.level,
      confidence: classification.confidence,
      description: severity.description,
      recovery: recovery,
      alerting: severity.alerting,
      autoRestart: severity.autoRestart,
      timestamp: new Date().toISOString(),
      errorType: error.constructor.name,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode || error.status
    };
  }

  /**
   * Context7 Pattern: Extract error message
   */
  extractErrorMessage(error) {
    if (typeof error === 'string') {
      return error;
    }

    if (error && error.message) {
      return error.message;
    }

    if (error && error.toString) {
      return error.toString();
    }

    return 'Unknown error';
  }

  /**
   * Context7 Pattern: Categorize error
   */
  categorizeError(errorMessage) {
    const matches = [];

    // Test against all patterns
    for (const [type, config] of Object.entries(this.errorPatterns)) {
      for (const pattern of config.patterns) {
        if (pattern.test(errorMessage)) {
          matches.push({
            type,
            category: config.category,
            severity: config.severity,
            confidence: this.calculateConfidence(errorMessage, pattern)
          });
        }
      }
    }

    // Return best match or default
    if (matches.length > 0) {
      return matches.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
    }

    return {
      type: 'unknown',
      category: 'unknown',
      severity: 'medium',
      confidence: 0
    };
  }

  /**
   * Context7 Pattern: Calculate pattern confidence
   */
  calculateConfidence(message, pattern) {
    const match = message.match(pattern);
    if (!match) {
      return 0;
    }

    // Higher confidence for more specific matches
    const matchLength = match[0].length;
    const messageLength = message.length;
    const specificity = matchLength / messageLength;

    return Math.min(specificity * 100, 100);
  }

  /**
   * Context7 Pattern: Assess error severity
   */
  assessSeverity(error, classification) {
    let baseSeverity = classification.severity;

    // Adjust severity based on error characteristics
    if (error.statusCode >= 500) {
      baseSeverity = this.elevateSeverity(baseSeverity);
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      baseSeverity = this.elevateSeverity(baseSeverity);
    }

    if (this.isRecurringError(error)) {
      baseSeverity = this.elevateSeverity(baseSeverity);
    }

    return {
      level: baseSeverity,
      ...this.severityLevels[baseSeverity]
    };
  }

  /**
   * Context7 Pattern: Elevate severity level
   */
  elevateSeverity(currentSeverity) {
    const levels = ['low', 'medium', 'high', 'critical'];
    const currentIndex = levels.indexOf(currentSeverity);
    const nextIndex = Math.min(currentIndex + 1, levels.length - 1);
    return levels[nextIndex];
  }

  /**
   * Context7 Pattern: Check if error is recurring
   */
  isRecurringError() {
    // This would typically check against a history of errors
    // For now, we'll return false as a placeholder
    return false;
  }

  /**
   * Context7 Pattern: Suggest recovery actions
   */
  suggestRecovery(error, classification) {
    const suggestions = [];

    switch (classification.category) {
    case 'database':
      suggestions.push('Check database connection');
      suggestions.push('Verify database server status');
      suggestions.push('Review connection pool settings');
      suggestions.push('Check database credentials');
      break;

    case 'network':
      suggestions.push('Verify network connectivity');
      suggestions.push('Check firewall settings');
      suggestions.push('Retry with exponential backoff');
      suggestions.push('Check DNS resolution');
      break;

    case 'authentication':
      suggestions.push('Verify credentials');
      suggestions.push('Check token expiration');
      suggestions.push('Refresh authentication tokens');
      suggestions.push('Review authentication configuration');
      break;

    case 'authorization':
      suggestions.push('Check user permissions');
      suggestions.push('Verify role assignments');
      suggestions.push('Review access control rules');
      suggestions.push('Check resource ownership');
      break;

    case 'validation':
      suggestions.push('Validate input data');
      suggestions.push('Check required fields');
      suggestions.push('Verify data formats');
      suggestions.push('Review validation rules');
      break;

    case 'rate_limit':
      suggestions.push('Implement exponential backoff');
      suggestions.push('Reduce request frequency');
      suggestions.push('Check rate limit quotas');
      suggestions.push('Consider request batching');
      break;

    case 'memory':
      suggestions.push('Check memory usage');
      suggestions.push('Review memory leaks');
      suggestions.push('Optimize data structures');
      suggestions.push('Consider garbage collection');
      break;

    case 'external':
      suggestions.push('Check external service status');
      suggestions.push('Implement circuit breaker');
      suggestions.push('Add retry logic');
      suggestions.push('Use fallback mechanisms');
      break;

    case 'configuration':
      suggestions.push('Review configuration files');
      suggestions.push('Check environment variables');
      suggestions.push('Verify config syntax');
      suggestions.push('Validate config values');
      break;

    case 'timeout':
      suggestions.push('Increase timeout values');
      suggestions.push('Optimize slow operations');
      suggestions.push('Check network latency');
      suggestions.push('Implement async processing');
      break;

    default:
      suggestions.push('Review error details');
      suggestions.push('Check application logs');
      suggestions.push('Verify system resources');
      suggestions.push('Contact system administrator');
    }

    return {
      immediate: suggestions.slice(0, 2),
      longTerm: suggestions.slice(2),
      priority: this.getRecoveryPriority(classification.severity)
    };
  }

  /**
   * Context7 Pattern: Get recovery priority
   */
  getRecoveryPriority(severity) {
    switch (severity) {
    case 'critical':
      return 'urgent';
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    default:
      return 'medium';
    }
  }

  /**
   * Context7 Pattern: Get classification statistics
   */
  getStatistics() {
    const categories = Object.keys(this.errorPatterns);
    const severities = Object.keys(this.severityLevels);

    return {
      categories,
      severities,
      totalPatterns: Object.values(this.errorPatterns)
        .reduce((total, config) => total + config.patterns.length, 0)
    };
  }

  /**
   * Context7 Pattern: Test error against specific category
   */
  testCategory(error, category) {
    const errorMessage = this.extractErrorMessage(error);
    const config = this.errorPatterns[category];

    if (!config) {
      return false;
    }

    return config.patterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Context7 Pattern: Add custom error pattern
   */
  addPattern(category, pattern, severity = 'medium') {
    if (!this.errorPatterns[category]) {
      this.errorPatterns[category] = {
        patterns: [],
        category,
        severity
      };
    }

    this.errorPatterns[category].patterns.push(pattern);
  }

  /**
   * Context7 Pattern: Remove error pattern
   */
  removePattern(category, pattern) {
    if (this.errorPatterns[category]) {
      this.errorPatterns[category].patterns =
        this.errorPatterns[category].patterns.filter(p => p !== pattern);
    }
  }
}

module.exports = { ErrorClassifier };
