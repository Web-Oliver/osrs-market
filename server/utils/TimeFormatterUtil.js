/**
 * ⏰ Time Formatter Utility - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Utility
 * - SOLID: Single Responsibility Principle (SRP) - Handles ONLY time formatting
 * - DRY: Centralized time formatting to eliminate duplication across controllers
 * - Consistent time formatting throughout the application
 * - Support for multiple time formats and locales
 * - Performance optimized with caching for repeated formats
 */

const { Logger } = require('./Logger');

class TimeFormatterUtil {
  constructor() {
    this.logger = new Logger('TimeFormatterUtil');
    this.formatCache = new Map();
    this.cacheSize = 0;
    this.maxCacheSize = 100;
  }

  /**
   * Context7 Pattern: Format uptime in human-readable format
   * SOLID: Single responsibility for uptime formatting
   * DRY: Centralized uptime formatting logic
   */
  formatUptime(uptime, options = {}) {
    if (typeof uptime !== 'number' || uptime < 0) {
      this.logger.warn('Invalid uptime value provided', { uptime });
      return '0s';
    }

    const { 
      precision = 'auto', 
      units = 'short',
      showSeconds = true 
    } = options;

    // Check cache first
    const cacheKey = `uptime_${uptime}_${precision}_${units}_${showSeconds}`;
    if (this.formatCache.has(cacheKey)) {
      return this.formatCache.get(cacheKey);
    }

    try {
      const totalSeconds = Math.floor(uptime / 1000);
      const days = Math.floor(totalSeconds / (24 * 60 * 60));
      const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
      const seconds = totalSeconds % 60;

      let result;

      if (precision === 'auto') {
        // Auto-select precision based on duration
        if (days > 0) {
          result = this.formatWithUnits({ days, hours, minutes }, units, 'days');
        } else if (hours > 0) {
          result = this.formatWithUnits({ hours, minutes, seconds: showSeconds ? seconds : undefined }, units, 'hours');
        } else if (minutes > 0) {
          result = this.formatWithUnits({ minutes, seconds: showSeconds ? seconds : undefined }, units, 'minutes');
        } else {
          result = this.formatWithUnits({ seconds }, units, 'seconds');
        }
      } else {
        // Use specified precision
        const components = this.selectComponents({ days, hours, minutes, seconds }, precision);
        result = this.formatWithUnits(components, units, precision);
      }

      // Cache the result
      this.cacheResult(cacheKey, result);
      
      this.logger.debug('Formatted uptime', { 
        original: uptime, 
        formatted: result,
        cached: false 
      });

      return result;
    } catch (error) {
      this.logger.error('Error formatting uptime', error, { uptime, options });
      return `${Math.floor(uptime / 1000)}s`;
    }
  }

  /**
   * Context7 Pattern: Format duration between two timestamps
   * SOLID: Single responsibility for duration formatting
   */
  formatDuration(startTime, endTime, options = {}) {
    if (!startTime || !endTime) {
      this.logger.warn('Invalid timestamp provided for duration', { startTime, endTime });
      return '0s';
    }

    const duration = Math.abs(endTime - startTime);
    return this.formatUptime(duration, options);
  }

  /**
   * Context7 Pattern: Format timestamp to human-readable format
   * SOLID: Single responsibility for timestamp formatting
   */
  formatTimestamp(timestamp, format = 'iso', options = {}) {
    if (!timestamp) {
      this.logger.warn('No timestamp provided');
      return '';
    }

    const { 
      locale = 'en-US',
      timezone = 'UTC',
      includeTime = true 
    } = options;

    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid timestamp');
      }

      switch (format.toLowerCase()) {
      case 'iso':
        return date.toISOString();
      
      case 'local':
        return includeTime ? date.toLocaleString(locale) : date.toLocaleDateString(locale);
      
      case 'relative':
        return this.formatRelativeTime(timestamp);
      
      case 'short':
        return date.toLocaleDateString(locale, {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit'
        });
      
      case 'long':
        return date.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          ...(includeTime && {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      
      default:
        return date.toISOString();
      }
    } catch (error) {
      this.logger.error('Error formatting timestamp', error, { timestamp, format });
      return String(timestamp);
    }
  }

  /**
   * Context7 Pattern: Format time difference in relative terms
   * SOLID: Single responsibility for relative time formatting
   */
  formatRelativeTime(timestamp, baseTime = Date.now()) {
    const diff = baseTime - timestamp;
    const absDiff = Math.abs(diff);
    const isPast = diff > 0;

    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let result;
    
    if (years > 0) {
      result = `${years} year${years !== 1 ? 's' : ''}`;
    } else if (months > 0) {
      result = `${months} month${months !== 1 ? 's' : ''}`;
    } else if (weeks > 0) {
      result = `${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else if (days > 0) {
      result = `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
      result = `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      result = `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      result = 'just now';
    }

    return isPast ? `${result} ago` : `in ${result}`;
  }

  /**
   * Context7 Pattern: Format performance metrics timing
   * SOLID: Single responsibility for performance timing
   */
  formatPerformanceTime(milliseconds, precision = 2) {
    if (typeof milliseconds !== 'number' || milliseconds < 0) {
      return '0ms';
    }

    if (milliseconds < 1000) {
      return `${milliseconds.toFixed(precision)}ms`;
    } else if (milliseconds < 60000) {
      return `${(milliseconds / 1000).toFixed(precision)}s`;
    } else {
      const minutes = Math.floor(milliseconds / 60000);
      const seconds = ((milliseconds % 60000) / 1000).toFixed(precision);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Context7 Pattern: Clear formatting cache
   * DRY: Centralized cache management
   */
  clearCache() {
    this.formatCache.clear();
    this.cacheSize = 0;
    this.logger.debug('Time formatter cache cleared');
  }

  // Private Helper Methods

  /**
   * Format time components with specified units
   */
  formatWithUnits(components, units, precision) {
    const unitMappings = {
      short: {
        days: 'd', hours: 'h', minutes: 'm', seconds: 's'
      },
      long: {
        days: ' day', hours: ' hour', minutes: ' minute', seconds: ' second'
      }
    };

    const mapping = unitMappings[units] || unitMappings.short;
    const parts = [];

    Object.entries(components).forEach(([unit, value]) => {
      if (value !== undefined && value > 0) {
        if (units === 'long' && value !== 1) {
          parts.push(`${value}${mapping[unit]}s`);
        } else {
          parts.push(`${value}${mapping[unit]}`);
        }
      }
    });

    return parts.length > 0 ? parts.join(' ') : '0s';
  }

  /**
   * Select components based on precision level
   */
  selectComponents(allComponents, precision) {
    const { days, hours, minutes, seconds } = allComponents;

    switch (precision) {
    case 'days':
      return { days, hours };
    case 'hours':
      return { hours, minutes };
    case 'minutes':
      return { minutes, seconds };
    case 'seconds':
      return { seconds };
    default:
      return allComponents;
    }
  }

  /**
   * Cache formatted result with size management
   */
  cacheResult(key, result) {
    if (this.cacheSize >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.formatCache.keys().next().value;
      this.formatCache.delete(firstKey);
      this.cacheSize--;
    }

    this.formatCache.set(key, result);
    this.cacheSize++;
  }
}

// Export singleton instance for consistent usage
module.exports = { TimeFormatterUtil: new TimeFormatterUtil() };