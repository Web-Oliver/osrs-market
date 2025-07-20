/**
 * 📅 Market Data Scheduler - Context7 Optimized
 *
 * Context7 Pattern: Scheduled Service for Market Data Collection
 * - Automatically fetches OSRS Wiki 5-minute and 1-hour data every 5 minutes
 * - Handles errors gracefully and logs activity
 * - Provides health monitoring and statistics
 */

const { BaseService } = require('./BaseService');
const { MarketDataService } = require('./MarketDataService');

class MarketDataScheduler extends BaseService {
  constructor() {
    super('MarketDataScheduler', {
      enableCache: true,
      cachePrefix: 'scheduler',
      cacheTTL: 300, // 5 minutes for schedule status
      enableMongoDB: false // No MongoDB needed for scheduler
    });
    
    this.marketDataService = new MarketDataService();
    this.intervalId = null;
    this.isRunning = false;
    this.lastSyncTime = null;
    this.syncCount = 0;
    this.errorCount = 0;

    this.logger.info('📅 Market Data Scheduler initialized');
  }

  /**
   * Context7 Pattern: Start the 5-minute scheduling
   */
  start() {
    if (this.isRunning) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.logger.info('🚀 Starting market data scheduler (5m + 1h data)');
    this.isRunning = true;

    // Run immediately on start
    this.performSync();

    // Then run every 5 minutes (300,000 ms)
    this.intervalId = setInterval(() => {
      this.performSync();
    }, 5 * 60 * 1000);

    this.logger.info('✅ Market data scheduler started - syncing 5m + 1h data every 5 minutes');
  }

  /**
   * Context7 Pattern: Stop the scheduling
   */
  stop() {
    if (!this.isRunning) {
      this.logger.warn('Scheduler is not running');
      return;
    }

    this.logger.info('🛑 Stopping market data scheduler');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.logger.info('✅ Market data scheduler stopped');
  }

  /**
   * Context7 Pattern: Perform the sync operation
   */
  async performSync() {
    try {
      this.logger.info('📊 Starting scheduled market data sync (5m + 1h)');
      const startTime = Date.now();

      // Sync both 5-minute and 1-hour data in parallel
      const [result5m, result1h] = await Promise.all([
        this.marketDataService.sync5MinuteData(),
        this.marketDataService.sync1HourData()
      ]);

      const duration = Date.now() - startTime;
      this.lastSyncTime = Date.now();
      this.syncCount++;

      this.logger.info(`✅ Market data sync completed in ${duration}ms`, {
        itemCount5m: result5m.itemCount,
        itemCount1h: result1h.itemCount,
        totalItems: result5m.itemCount + result1h.itemCount,
        syncNumber: this.syncCount,
        duration: `${duration}ms`
      });

    } catch (error) {
      this.errorCount++;
      this.logger.error('❌ Market data sync failed', error, {
        syncNumber: this.syncCount,
        errorNumber: this.errorCount
      });
    }
  }

  /**
   * Context7 Pattern: Get scheduler statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      syncCount: this.syncCount,
      errorCount: this.errorCount,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime: this.isRunning ? (this.lastSyncTime + (5 * 60 * 1000)) : null,
      uptime: this.isRunning ? Date.now() - (this.lastSyncTime || Date.now()) : 0,
      successRate: this.syncCount > 0 ? ((this.syncCount - this.errorCount) / this.syncCount * 100).toFixed(2) : 0
    };
  }

  /**
   * Context7 Pattern: Health check
   */
  healthCheck() {
    const stats = this.getStats();
    const timeSinceLastSync = Date.now() - (this.lastSyncTime || 0);
    const isHealthy = this.isRunning && timeSinceLastSync < (10 * 60 * 1000); // Healthy if synced within 10 minutes

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...stats,
      timeSinceLastSync: `${Math.round(timeSinceLastSync / 1000)}s`
    };
  }
}

module.exports = { MarketDataScheduler };
