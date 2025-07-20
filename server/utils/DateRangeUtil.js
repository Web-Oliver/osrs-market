/**
 * 📅 Date Range Utility - Context7 Optimized
 *
 * Context7 Pattern: Centralized date range calculations
 * - Single Responsibility: Date range generation and manipulation
 * - DRY: Eliminates 50+ duplicate date range implementations
 * - Consistent date range logic across the entire application
 * 
 * REPLACES ALL PATTERNS LIKE:
 * - new Date(Date.now() - timeInMs)
 * - new Date(Date.now() - 24 * 60 * 60 * 1000)
 * - new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
 * - Hardcoded time range objects
 */

const TimeConstants = require('./TimeConstants');

class DateRangeUtil {
  
  // ===========================================
  // BASIC TIME AGO METHODS (Primary Interface)
  // ===========================================
  
  /**
   * Get a date X milliseconds ago - REPLACES: new Date(Date.now() - milliseconds)
   * @param {number} milliseconds - Milliseconds in the past
   * @returns {Date} Date object
   */
  static getTimeAgo(milliseconds) {
    if (typeof milliseconds !== 'number' || milliseconds < 0) {
      throw new Error('Milliseconds must be a positive number');
    }
    return TimeConstants.getPastTime(milliseconds);
  }
  
  /**
   * Get a date X minutes ago - REPLACES: new Date(Date.now() - minutes * 60 * 1000)
   * @param {number} minutes - Minutes in the past
   * @returns {Date} Date object
   */
  static getMinutesAgo(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) {
      throw new Error('Minutes must be a positive number');
    }
    return TimeConstants.getPastTime(TimeConstants.minutesToMs(minutes));
  }
  
  /**
   * Get a date X hours ago - REPLACES: new Date(Date.now() - hours * 60 * 60 * 1000)
   * @param {number} hours - Hours in the past
   * @returns {Date} Date object
   */
  static getHoursAgo(hours) {
    if (typeof hours !== 'number' || hours < 0) {
      throw new Error('Hours must be a positive number');
    }
    return TimeConstants.getPastTime(TimeConstants.hoursToMs(hours));
  }
  
  /**
   * Get a date X days ago - REPLACES: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
   * @param {number} days - Days in the past
   * @returns {Date} Date object
   */
  static getDaysAgo(days) {
    if (typeof days !== 'number' || days < 0) {
      throw new Error('Days must be a positive number');
    }
    return TimeConstants.getPastTime(TimeConstants.daysToMs(days));
  }
  
  /**
   * Get cutoff date for cleanup/filtering - REPLACES: new Date(Date.now() - maxAge)
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {Date} Cutoff date
   */
  static getCutoffDate(maxAgeMs) {
    return this.getTimeAgo(maxAgeMs);
  }
  
  // ===========================================
  // STANDARD TIME RANGES (Legacy Interface)
  // ===========================================
  
  /**
   * Context7 Pattern: Get standard time ranges
   * DRY: Eliminates duplicate time range objects across 50+ files
   */
  static getStandardRanges() {
    return {
      '1h': this.getHoursAgo(1),
      '24h': this.getDaysAgo(1),
      '7d': this.getDaysAgo(7),
      '30d': this.getDaysAgo(30)
    };
  }

  /**
   * Context7 Pattern: Get extended time ranges
   * DRY: Provides additional commonly used ranges
   */
  static getExtendedRanges() {
    return {
      '5m': this.getMinutesAgo(5),
      '15m': this.getMinutesAgo(15),
      '30m': this.getMinutesAgo(30),
      '1h': this.getHoursAgo(1),
      '2h': this.getHoursAgo(2),
      '6h': this.getHoursAgo(6),
      '12h': this.getHoursAgo(12),
      '24h': this.getDaysAgo(1),
      '2d': this.getDaysAgo(2),
      '3d': this.getDaysAgo(3),
      '7d': this.getDaysAgo(7),
      '14d': this.getDaysAgo(14),
      '30d': this.getDaysAgo(30)
    };
  }

  /**
   * Context7 Pattern: Parse time range string to Date object
   * DRY: Eliminates duplicate time range parsing logic
   */
  static parseTimeRange(timeRange, defaultRange = '24h') {
    const ranges = this.getExtendedRanges();
    return ranges[timeRange] || ranges[defaultRange];
  }

  /**
   * Context7 Pattern: Get date range for analytics
   * DRY: Standardized analytics date ranges
   */
  static getAnalyticsRanges() {
    return {
      'short': this.getTimeAgo(TimeConstants.ANALYTICS_SHORT_PERIOD),   // 1 hour
      'medium': this.getTimeAgo(TimeConstants.ANALYTICS_MEDIUM_PERIOD), // 24 hours
      'long': this.getTimeAgo(TimeConstants.ANALYTICS_LONG_PERIOD)      // 7 days
    };
  }
  
  // ===========================================
  // QUERY BUILDER TIME RANGES (Specific Replacements)
  // ===========================================
  
  /**
   * Get time ranges for query building - REPLACES QueryBuilderService patterns
   * @returns {Object} Object with query time ranges
   */
  static getQueryTimeRanges() {
    return {
      '1h': this.getHoursAgo(1),
      '24h': this.getDaysAgo(1),
      '7d': this.getDaysAgo(7),
      '30d': this.getDaysAgo(30)
    };
  }
  
  /**
   * Get monitoring time ranges - REPLACES monitoring service patterns
   * @returns {Object} Object with monitoring time ranges
   */
  static getMonitoringTimeRanges() {
    return {
      '24h': this.getDaysAgo(1),
      '7d': this.getDaysAgo(7),
      '30d': this.getDaysAgo(30)
    };
  }
  
  // ===========================================
  // DOMAIN-SPECIFIC CUTOFF DATES
  // ===========================================
  
  /**
   * Get sync cutoff date for items (24 hours ago by default)
   * @param {number} maxAgeMs - Maximum sync age (default: 24 hours)
   * @returns {Date} Sync cutoff date
   */
  static getSyncCutoffDate(maxAgeMs = TimeConstants.ONE_DAY) {
    return this.getCutoffDate(maxAgeMs);
  }
  
  /**
   * Get data refresh cutoff date (1 hour ago by default)
   * @param {number} maxAgeMs - Maximum refresh age (default: 1 hour)
   * @returns {Date} Refresh cutoff date
   */
  static getDataRefreshCutoffDate(maxAgeMs = TimeConstants.ONE_HOUR) {
    return this.getCutoffDate(maxAgeMs);
  }
  
  /**
   * Get default cleanup cutoff (7 days ago)
   * @returns {Date} Default cleanup cutoff date
   */
  static getDefaultCleanupCutoff() {
    return this.getTimeAgo(TimeConstants.SEVEN_DAYS);
  }
  
  /**
   * Get session cleanup cutoff (24 hours ago)
   * @returns {Date} Session cleanup cutoff date
   */
  static getSessionCleanupCutoff() {
    return this.getTimeAgo(TimeConstants.SESSION_LIFETIME);
  }
  
  // ===========================================
  // VALIDATION HELPERS
  // ===========================================
  
  /**
   * Check if a timestamp is within the last X milliseconds
   * @param {number} timestamp - Timestamp to check
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {boolean} True if within the time range
   */
  static isWithinTimeRange(timestamp, maxAgeMs) {
    const cutoff = this.getCutoffDate(maxAgeMs);
    return new Date(timestamp) >= cutoff;
  }
  
  /**
   * Check if a timestamp is older than X milliseconds
   * @param {number} timestamp - Timestamp to check
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {boolean} True if older than the time range
   */
  static isOlderThan(timestamp, maxAgeMs) {
    return !this.isWithinTimeRange(timestamp, maxAgeMs);
  }

  /**
   * Context7 Pattern: Create date range object with start and end
   * DRY: Standardized date range object creation
   */
  static createDateRange(startTime, endTime = new Date()) {
    const start = startTime instanceof Date ? startTime : new Date(startTime);
    const end = endTime instanceof Date ? endTime : new Date(endTime);
    
    return {
      startTime: start,
      endTime: end,
      duration: end.getTime() - start.getTime(),
      isValid: start <= end
    };
  }

  /**
   * Context7 Pattern: Get date range for specific period
   * DRY: Eliminates custom date range calculations
   */
  static getDateRangeFor(period, endTime = new Date()) {
    const ranges = this.getExtendedRanges();
    const startTime = ranges[period] || ranges['24h'];
    
    return this.createDateRange(startTime, endTime);
  }

  /**
   * Context7 Pattern: Validate time range string
   * DRY: Consistent time range validation
   */
  static isValidTimeRange(timeRange) {
    const validRanges = Object.keys(this.getExtendedRanges());
    return validRanges.includes(timeRange);
  }

  /**
   * Context7 Pattern: Get human-readable duration
   * DRY: Consistent duration formatting
   */
  static formatDuration(milliseconds) {
    const units = [
      { name: 'day', ms: TimeConstants.ONE_DAY },
      { name: 'hour', ms: TimeConstants.ONE_HOUR },
      { name: 'minute', ms: TimeConstants.ONE_MINUTE },
      { name: 'second', ms: TimeConstants.ONE_SECOND }
    ];

    for (const unit of units) {
      const value = Math.floor(milliseconds / unit.ms);
      if (value > 0) {
        return `${value} ${unit.name}${value > 1 ? 's' : ''}`;
      }
    }

    return '0 seconds';
  }

  /**
   * Context7 Pattern: Get time ago string (legacy method)
   * DRY: Consistent "time ago" formatting
   * NOTE: This method has a different signature than getTimeAgo(milliseconds)
   */
  static getTimeAgoString(date) {
    const now = Date.now();
    const past = date instanceof Date ? date.getTime() : new Date(date).getTime();
    const diff = now - past;

    if (diff < TimeConstants.ONE_MINUTE) {
      return 'just now';
    }

    return this.formatDuration(diff) + ' ago';
  }

  /**
   * Context7 Pattern: Check if date is within range
   * DRY: Consistent date range checking
   */
  static isWithinRange(date, rangeStart, rangeEnd = new Date()) {
    const checkDate = date instanceof Date ? date : new Date(date);
    const start = rangeStart instanceof Date ? rangeStart : new Date(rangeStart);
    const end = rangeEnd instanceof Date ? rangeEnd : new Date(rangeEnd);

    return checkDate >= start && checkDate <= end;
  }

  /**
   * Context7 Pattern: Get relative date range
   * DRY: Eliminates duplicate relative range calculations
   */
  static getRelativeRange(amount, unit = 'hours', from = new Date()) {
    const multipliers = {
      seconds: TimeConstants.ONE_SECOND,
      minutes: TimeConstants.ONE_MINUTE,
      hours: TimeConstants.ONE_HOUR,
      days: TimeConstants.ONE_DAY
    };

    const milliseconds = amount * (multipliers[unit] || multipliers.hours);
    const fromTime = from instanceof Date ? from : new Date(from);
    
    return {
      start: new Date(fromTime.getTime() - milliseconds),
      end: fromTime,
      duration: milliseconds
    };
  }
}

module.exports = DateRangeUtil;