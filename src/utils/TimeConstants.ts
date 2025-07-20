/**
 * ⏰ Time Constants - Frontend TypeScript Version
 *
 * Context7 Pattern: Centralized time constants for frontend
 * - Single Responsibility: Time value definitions
 * - DRY: Eliminates duplicate time constants across frontend codebase
 * - Open/Closed: Easy to extend with new time constants
 * - Consistent time calculations across the entire frontend application
 */

/**
 * Context7 Pattern: Centralized time constants
 * DRY: Eliminates duplicate time calculations across frontend files
 */
export const TimeConstants = {
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
  
  // Component refresh intervals
  COMPONENT_REFRESH_FAST: 1000,            // 1 second
  COMPONENT_REFRESH_NORMAL: 5 * 1000,      // 5 seconds
  COMPONENT_REFRESH_SLOW: 30 * 1000,       // 30 seconds
  
  // Analytics and reporting periods
  ANALYTICS_SHORT_PERIOD: 1 * 60 * 60 * 1000,      // 1 hour
  ANALYTICS_MEDIUM_PERIOD: 24 * 60 * 60 * 1000,    // 24 hours
  ANALYTICS_LONG_PERIOD: 7 * 24 * 60 * 60 * 1000,  // 7 days
  
  // Retry delays and backoff
  RETRY_DELAY_SHORT: 1000,                 // 1 second
  RETRY_DELAY_MEDIUM: 5 * 1000,           // 5 seconds
  RETRY_DELAY_LONG: 30 * 1000,            // 30 seconds
  EXPONENTIAL_BACKOFF_BASE: 2 * 1000,     // 2 seconds
  
  // Helper methods for common operations
  
  /**
   * Context7 Pattern: Convert hours to milliseconds
   * @param hours - Number of hours
   * @returns Milliseconds
   */
  hoursToMs(hours: number): number {
    return hours * this.ONE_HOUR;
  },
  
  /**
   * Context7 Pattern: Convert days to milliseconds
   * @param days - Number of days
   * @returns Milliseconds
   */
  daysToMs(days: number): number {
    return days * this.ONE_DAY;
  },
  
  /**
   * Context7 Pattern: Convert minutes to milliseconds
   * @param minutes - Number of minutes
   * @returns Milliseconds
   */
  minutesToMs(minutes: number): number {
    return minutes * this.ONE_MINUTE;
  },
  
  /**
   * Context7 Pattern: Get relative timestamp
   * @param offsetMs - Offset in milliseconds (negative for past)
   * @returns Date object
   */
  getRelativeTime(offsetMs: number): Date {
    return new Date(Date.now() + offsetMs);
  },
  
  /**
   * Context7 Pattern: Get past timestamp
   * @param pastMs - Milliseconds in the past
   * @returns Date object
   */
  getPastTime(pastMs: number): Date {
    return new Date(Date.now() - pastMs);
  },
  
  /**
   * Context7 Pattern: Get future timestamp
   * @param futureMs - Milliseconds in the future
   * @returns Date object
   */
  getFutureTime(futureMs: number): Date {
    return new Date(Date.now() + futureMs);
  }
} as const;

export default TimeConstants;