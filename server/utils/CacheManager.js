/**
 * 🗄️ Cache Manager - Context7 Optimized
 * 
 * Context7 Pattern: Centralized Cache Management System
 * - In-memory caching with TTL support
 * - Pattern-based cache invalidation
 * - Memory usage monitoring
 * - Performance optimization
 */

class CacheManager {
  constructor(namespace = 'default', defaultTTL = 300000) { // 5 minutes default
    this.namespace = namespace;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      expired: 0
    };
    
    // Context7 Pattern: Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Context7 Pattern: Get value from cache
   */
  get(key) {
    const namespacedKey = this.getNamespacedKey(key);
    const item = this.cache.get(namespacedKey);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (this.isExpired(item)) {
      this.delete(key);
      this.stats.expired++;
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.value;
  }

  /**
   * Context7 Pattern: Set value in cache
   */
  set(key, value, ttl = null) {
    const namespacedKey = this.getNamespacedKey(key);
    const expiry = ttl || this.defaultTTL;
    const expiresAt = Date.now() + expiry;
    
    const item = {
      value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    };
    
    // Clear existing timer if present
    if (this.timers.has(namespacedKey)) {
      clearTimeout(this.timers.get(namespacedKey));
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, expiry);
    
    this.cache.set(namespacedKey, item);
    this.timers.set(namespacedKey, timer);
    this.stats.sets++;
    
    return true;
  }

  /**
   * Context7 Pattern: Delete value from cache
   */
  delete(key) {
    const namespacedKey = this.getNamespacedKey(key);
    
    // Clear timer
    if (this.timers.has(namespacedKey)) {
      clearTimeout(this.timers.get(namespacedKey));
      this.timers.delete(namespacedKey);
    }
    
    const deleted = this.cache.delete(namespacedKey);
    if (deleted) {
      this.stats.deletes++;
    }
    
    return deleted;
  }

  /**
   * Context7 Pattern: Check if key exists
   */
  has(key) {
    const namespacedKey = this.getNamespacedKey(key);
    const item = this.cache.get(namespacedKey);
    
    if (!item) {
      return false;
    }
    
    if (this.isExpired(item)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Context7 Pattern: Get or set pattern
   */
  async getOrSet(key, factory, ttl = null) {
    const cachedValue = this.get(key);
    
    if (cachedValue !== null) {
      return cachedValue;
    }
    
    // Execute factory function
    const value = await factory();
    this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Context7 Pattern: Delete by pattern
   */
  deletePattern(pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = [];
    
    for (const namespacedKey of this.cache.keys()) {
      const key = this.removeNamespace(namespacedKey);
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Context7 Pattern: Clear all cache
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    this.stats.deletes += this.cache.size;
    
    return true;
  }

  /**
   * Context7 Pattern: Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
      size: this.cache.size,
      memoryUsage: this.getMemoryUsage(),
      namespace: this.namespace
    };
  }

  /**
   * Context7 Pattern: Get all keys
   */
  getKeys() {
    return Array.from(this.cache.keys()).map(key => this.removeNamespace(key));
  }

  /**
   * Context7 Pattern: Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Context7 Pattern: Get cache info
   */
  getInfo() {
    const info = {
      namespace: this.namespace,
      defaultTTL: this.defaultTTL,
      size: this.cache.size,
      stats: this.getStats(),
      keys: this.getKeys()
    };
    
    return info;
  }

  /**
   * Context7 Pattern: Extend TTL for existing key
   */
  extend(key, additionalTTL) {
    const namespacedKey = this.getNamespacedKey(key);
    const item = this.cache.get(namespacedKey);
    
    if (!item || this.isExpired(item)) {
      return false;
    }
    
    // Update expiry
    item.expiresAt += additionalTTL;
    
    // Clear existing timer
    if (this.timers.has(namespacedKey)) {
      clearTimeout(this.timers.get(namespacedKey));
    }
    
    // Set new timer
    const newTTL = item.expiresAt - Date.now();
    const timer = setTimeout(() => {
      this.delete(key);
    }, newTTL);
    
    this.timers.set(namespacedKey, timer);
    
    return true;
  }

  /**
   * Context7 Pattern: Get TTL for key
   */
  getTTL(key) {
    const namespacedKey = this.getNamespacedKey(key);
    const item = this.cache.get(namespacedKey);
    
    if (!item || this.isExpired(item)) {
      return -1;
    }
    
    return item.expiresAt - Date.now();
  }

  /**
   * Context7 Pattern: Touch key (update access time)
   */
  touch(key) {
    const namespacedKey = this.getNamespacedKey(key);
    const item = this.cache.get(namespacedKey);
    
    if (!item || this.isExpired(item)) {
      return false;
    }
    
    item.accessCount++;
    return true;
  }

  /**
   * Context7 Pattern: Export cache data
   */
  export() {
    const data = {};
    
    for (const [namespacedKey, item] of this.cache.entries()) {
      if (!this.isExpired(item)) {
        const key = this.removeNamespace(namespacedKey);
        data[key] = {
          value: item.value,
          expiresAt: item.expiresAt,
          createdAt: item.createdAt,
          accessCount: item.accessCount
        };
      }
    }
    
    return data;
  }

  /**
   * Context7 Pattern: Import cache data
   */
  import(data) {
    for (const [key, item] of Object.entries(data)) {
      if (!this.isExpired(item)) {
        const namespacedKey = this.getNamespacedKey(key);
        this.cache.set(namespacedKey, item);
        
        // Set timer for remaining TTL
        const remainingTTL = item.expiresAt - Date.now();
        if (remainingTTL > 0) {
          const timer = setTimeout(() => {
            this.delete(key);
          }, remainingTTL);
          
          this.timers.set(namespacedKey, timer);
        }
      }
    }
  }

  /**
   * Context7 Pattern: Get namespaced key
   */
  getNamespacedKey(key) {
    return `${this.namespace}:${key}`;
  }

  /**
   * Context7 Pattern: Remove namespace from key
   */
  removeNamespace(namespacedKey) {
    return namespacedKey.replace(`${this.namespace}:`, '');
  }

  /**
   * Context7 Pattern: Check if item is expired
   */
  isExpired(item) {
    return Date.now() > item.expiresAt;
  }

  /**
   * Context7 Pattern: Cleanup expired items
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [namespacedKey, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(this.removeNamespace(namespacedKey));
      }
    }
    
    keysToDelete.forEach(key => this.delete(key));
    
    return keysToDelete.length;
  }

  /**
   * Context7 Pattern: Get memory usage estimate
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, item] of this.cache.entries()) {
      totalSize += this.getObjectSize(key);
      totalSize += this.getObjectSize(item);
    }
    
    return {
      bytes: totalSize,
      kb: Math.round(totalSize / 1024 * 100) / 100,
      mb: Math.round(totalSize / 1024 / 1024 * 100) / 100
    };
  }

  /**
   * Context7 Pattern: Estimate object size
   */
  getObjectSize(obj) {
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate
    } catch (error) {
      return 0;
    }
  }

  /**
   * Context7 Pattern: Destroy cache manager
   */
  destroy() {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    // Clear cache
    this.cache.clear();
    this.timers.clear();
  }
}

module.exports = { CacheManager };