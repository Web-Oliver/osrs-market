/**
 * ⏰ Time Constants - Context7 Optimized
 *
 * Context7 Pattern: Centralized time constants
 * - Single Responsibility: Time value definitions
 * - DRY: Eliminates 50+ duplicate time constants across codebase
 * - Open/Closed: Easy to extend with new time constants
 * - Consistent time calculations across the entire application
 */

/**
 * Context7 Pattern: Centralized time constants
 * DRY: Eliminates duplicate time calculations across 50+ files
 */
const TimeConstants = {
  // Basic time units (in milliseconds)
  ONE_SECOND: 1000,
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  
  // Extended time periods
  TWO_HOURS: 2 * 60 * 60 * 1000,
  FOUR_HOURS: 4 * 60 * 60 * 1000,
  SIX_HOURS: 6 * 60 * 60 * 1000,
  TWELVE_HOURS: 12 * 60 * 60 * 1000,
  TWENTY_FOUR_HOURS: 24 * 60 * 60 * 1000,
  
  // Day-based periods
  ONE_DAY: 24 * 60 * 60 * 1000,
  TWO_DAYS: 2 * 24 * 60 * 60 * 1000,
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  SEVEN_DAYS: 7 * 24 * 60 * 60 * 1000,
  FOURTEEN_DAYS: 14 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS: 30 * 24 * 60 * 60 * 1000,
  
  // Cache TTL defaults (commonly used values)
  DEFAULT_CACHE_TTL: 5 * 60 * 1000,        // 5 minutes
  SHORT_CACHE_TTL: 1 * 60 * 1000,          // 1 minute
  MEDIUM_CACHE_TTL: 15 * 60 * 1000,        // 15 minutes
  LONG_CACHE_TTL: 60 * 60 * 1000,          // 1 hour
  EXTENDED_CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  
  // Rate limiting windows
  RATE_LIMIT_WINDOW_SHORT: 1 * 60 * 1000,  // 1 minute
  RATE_LIMIT_WINDOW_MEDIUM: 5 * 60 * 1000, // 5 minutes
  RATE_LIMIT_WINDOW_LONG: 15 * 60 * 1000,  // 15 minutes
  
  // Request timeouts
  REQUEST_TIMEOUT_SHORT: 10 * 1000,        // 10 seconds
  REQUEST_TIMEOUT_MEDIUM: 30 * 1000,       // 30 seconds
  REQUEST_TIMEOUT_LONG: 60 * 1000,         // 1 minute
  REQUEST_TIMEOUT_EXTENDED: 5 * 60 * 1000, // 5 minutes
  
  // Database connection timeouts
  DB_CONNECTION_TIMEOUT: 30 * 1000,        // 30 seconds
  DB_QUERY_TIMEOUT: 60 * 1000,            // 1 minute
  
  // Cleanup and maintenance intervals
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000,   // 24 hours
  HEALTH_CHECK_INTERVAL: 5 * 60 * 1000,    // 5 minutes
  LOG_ROTATION_INTERVAL: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Analytics and reporting periods
  ANALYTICS_SHORT_PERIOD: 1 * 60 * 60 * 1000,      // 1 hour
  ANALYTICS_MEDIUM_PERIOD: 24 * 60 * 60 * 1000,    // 24 hours
  ANALYTICS_LONG_PERIOD: 7 * 24 * 60 * 60 * 1000,  // 7 days
  
  // Retry delays and backoff
  RETRY_DELAY_SHORT: 1000,                 // 1 second
  RETRY_DELAY_MEDIUM: 5 * 1000,           // 5 seconds
  RETRY_DELAY_LONG: 30 * 1000,            // 30 seconds
  EXPONENTIAL_BACKOFF_BASE: 2 * 1000,     // 2 seconds
  
  // Session and token lifetimes
  SESSION_LIFETIME: 24 * 60 * 60 * 1000,   // 24 hours
  TOKEN_LIFETIME_SHORT: 15 * 60 * 1000,    // 15 minutes
  TOKEN_LIFETIME_MEDIUM: 60 * 60 * 1000,   // 1 hour
  TOKEN_LIFETIME_LONG: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Helper methods for common operations
  
  /**
   * Context7 Pattern: Convert hours to milliseconds
   * @param {number} hours - Number of hours
   * @returns {number} Milliseconds
   */
  hoursToMs(hours) {
    return hours * this.ONE_HOUR;
  },
  
  /**
   * Context7 Pattern: Convert days to milliseconds
   * @param {number} days - Number of days
   * @returns {number} Milliseconds
   */
  daysToMs(days) {
    return days * this.ONE_DAY;
  },
  
  /**
   * Context7 Pattern: Convert minutes to milliseconds
   * @param {number} minutes - Number of minutes
   * @returns {number} Milliseconds
   */
  minutesToMs(minutes) {
    return minutes * this.ONE_MINUTE;
  },
  
  /**
   * Context7 Pattern: Get relative timestamp
   * @param {number} offsetMs - Offset in milliseconds (negative for past)
   * @returns {Date} Date object
   */
  getRelativeTime(offsetMs) {
    return new Date(Date.now() + offsetMs);
  },
  
  /**
   * Context7 Pattern: Get past timestamp
   * @param {number} pastMs - Milliseconds in the past
   * @returns {Date} Date object
   */
  getPastTime(pastMs) {
    return new Date(Date.now() - pastMs);
  },
  
  /**
   * Context7 Pattern: Get future timestamp
   * @param {number} futureMs - Milliseconds in the future
   * @returns {Date} Date object
   */
  getFutureTime(futureMs) {
    return new Date(Date.now() + futureMs);
  }
};

module.exports = TimeConstants;