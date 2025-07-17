/**
 * 🚦 Rate Limiter - Context7 Optimized
 * 
 * Context7 Pattern: Advanced Rate Limiting System
 * - Token bucket algorithm for smooth rate limiting
 * - Sliding window implementation
 * - Multiple rate limiting strategies
 * - Memory-efficient IP tracking
 */

class RateLimiter {
  constructor() {
    this.windows = new Map(); // IP -> Window data
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Context7 Pattern: Check rate limit for key
   */
  async checkLimit(key, options = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // requests per window
      skipFailedRequests = false,
      skipSuccessfulRequests = false
    } = options;

    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get or create window for key
    let window = this.windows.get(key);
    if (!window) {
      window = {
        requests: [],
        count: 0,
        resetTime: now + windowMs
      };
      this.windows.set(key, window);
    }

    // Remove old requests outside the window
    window.requests = window.requests.filter(timestamp => timestamp > windowStart);
    window.count = window.requests.length;

    // Check if limit exceeded
    const exceeded = window.count >= max;
    
    if (!exceeded) {
      // Add current request
      window.requests.push(now);
      window.count++;
    }

    // Calculate remaining and reset time
    const remaining = Math.max(0, max - window.count);
    const resetTime = windowStart + windowMs;
    const retryAfter = exceeded ? Math.ceil((resetTime - now) / 1000) : 0;

    return {
      exceeded,
      remaining,
      resetTime,
      retryAfter,
      limit: max,
      windowMs
    };
  }

  /**
   * Context7 Pattern: Token bucket rate limiting
   */
  async checkTokenBucket(key, options = {}) {
    const {
      capacity = 100,
      refillRate = 10, // tokens per second
      cost = 1
    } = options;

    const now = Date.now();
    
    // Get or create bucket for key
    let bucket = this.windows.get(`bucket_${key}`);
    if (!bucket) {
      bucket = {
        tokens: capacity,
        lastRefill: now
      };
      this.windows.set(`bucket_${key}`, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = Math.floor(elapsed * refillRate);
    bucket.tokens = Math.min(capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if enough tokens available
    const exceeded = bucket.tokens < cost;
    
    if (!exceeded) {
      bucket.tokens -= cost;
    }

    return {
      exceeded,
      remaining: bucket.tokens,
      capacity,
      cost,
      retryAfter: exceeded ? Math.ceil((cost - bucket.tokens) / refillRate) : 0
    };
  }

  /**
   * Context7 Pattern: Sliding window rate limiting
   */
  async checkSlidingWindow(key, options = {}) {
    const {
      windowMs = 60 * 1000, // 1 minute
      max = 60, // requests per window
      precision = 10 // number of sub-windows
    } = options;

    const now = Date.now();
    const subWindowMs = windowMs / precision;
    const currentWindow = Math.floor(now / subWindowMs);
    
    // Get or create sliding window for key
    let window = this.windows.get(`sliding_${key}`);
    if (!window) {
      window = {
        subWindows: new Map(),
        totalCount: 0
      };
      this.windows.set(`sliding_${key}`, window);
    }

    // Remove old sub-windows
    const oldestWindow = currentWindow - precision;
    for (const [windowId, count] of window.subWindows.entries()) {
      if (windowId <= oldestWindow) {
        window.totalCount -= count;
        window.subWindows.delete(windowId);
      }
    }

    // Check if limit exceeded
    const exceeded = window.totalCount >= max;
    
    if (!exceeded) {
      // Add to current sub-window
      const currentCount = window.subWindows.get(currentWindow) || 0;
      window.subWindows.set(currentWindow, currentCount + 1);
      window.totalCount++;
    }

    const remaining = Math.max(0, max - window.totalCount);
    const resetTime = (currentWindow + 1) * subWindowMs;

    return {
      exceeded,
      remaining,
      resetTime,
      limit: max,
      windowMs
    };
  }

  /**
   * Context7 Pattern: Adaptive rate limiting
   */
  async checkAdaptive(key, options = {}) {
    const {
      baseLimit = 100,
      windowMs = 60 * 1000,
      errorThreshold = 0.1, // 10% error rate
      adaptionFactor = 0.5
    } = options;

    const now = Date.now();
    
    // Get or create adaptive window for key
    let window = this.windows.get(`adaptive_${key}`);
    if (!window) {
      window = {
        requests: [],
        errors: [],
        currentLimit: baseLimit,
        lastAdaption: now
      };
      this.windows.set(`adaptive_${key}`, window);
    }

    const windowStart = now - windowMs;
    
    // Remove old data
    window.requests = window.requests.filter(r => r.timestamp > windowStart);
    window.errors = window.errors.filter(e => e.timestamp > windowStart);

    // Calculate error rate
    const errorRate = window.requests.length > 0 ? 
      window.errors.length / window.requests.length : 0;

    // Adapt limit based on error rate
    if (now - window.lastAdaption > windowMs / 2) { // Adapt every half window
      if (errorRate > errorThreshold) {
        window.currentLimit = Math.max(1, Math.floor(window.currentLimit * adaptionFactor));
      } else if (errorRate < errorThreshold / 2) {
        window.currentLimit = Math.min(baseLimit, Math.floor(window.currentLimit / adaptionFactor));
      }
      window.lastAdaption = now;
    }

    // Check current limit
    const exceeded = window.requests.length >= window.currentLimit;
    
    if (!exceeded) {
      window.requests.push({ timestamp: now });
    }

    return {
      exceeded,
      remaining: Math.max(0, window.currentLimit - window.requests.length),
      limit: window.currentLimit,
      errorRate,
      adaptedLimit: window.currentLimit !== baseLimit
    };
  }

  /**
   * Context7 Pattern: Record error for adaptive limiting
   */
  recordError(key) {
    const window = this.windows.get(`adaptive_${key}`);
    if (window) {
      window.errors.push({ timestamp: Date.now() });
    }
  }

  /**
   * Context7 Pattern: Get rate limit stats
   */
  getStats(key) {
    const stats = {
      totalKeys: this.windows.size,
      keyStats: {}
    };

    if (key) {
      const window = this.windows.get(key);
      if (window) {
        stats.keyStats[key] = {
          requestCount: window.count || window.requests?.length || 0,
          resetTime: window.resetTime,
          tokens: window.tokens
        };
      }
    } else {
      // Return stats for all keys
      for (const [windowKey, window] of this.windows.entries()) {
        stats.keyStats[windowKey] = {
          requestCount: window.count || window.requests?.length || 0,
          resetTime: window.resetTime,
          tokens: window.tokens
        };
      }
    }

    return stats;
  }

  /**
   * Context7 Pattern: Reset rate limit for key
   */
  reset(key) {
    if (key) {
      this.windows.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Context7 Pattern: Clear all rate limits
   */
  clear() {
    this.windows.clear();
  }

  /**
   * Context7 Pattern: Cleanup expired windows
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, window] of this.windows.entries()) {
      // Check if window has expired
      if (window.resetTime && now > window.resetTime + 60000) { // 1 minute grace period
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.windows.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Context7 Pattern: Get memory usage
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, window] of this.windows.entries()) {
      totalSize += key.length * 2; // String overhead
      totalSize += JSON.stringify(window).length * 2; // Rough estimate
    }

    return {
      windows: this.windows.size,
      estimatedBytes: totalSize,
      estimatedMB: Math.round(totalSize / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Context7 Pattern: Destroy rate limiter
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.windows.clear();
  }
}

module.exports = { RateLimiter };