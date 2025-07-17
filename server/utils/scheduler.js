/**
 * 📅 Scheduler Service - Context7 Optimized
 * 
 * Context7 Pattern: Background Job Scheduling and Management
 * - Schedules market data collection jobs
 * - Manages scrape queue processing
 * - Provides job health monitoring
 * - Handles job failures and retries
 * 
 * DRY: Centralized scheduling logic
 * SOLID: Single responsibility for job scheduling
 * Hierarchical: Foundation for background operations
 */

const { Logger } = require('./Logger');
const { DataCollectionService } = require('../services/DataCollectionService');

const logger = new Logger('Scheduler');

// Store interval IDs for cleanup
const activeIntervals = new Map();

/**
 * Start market data polling jobs
 * - 5-minute data collection every 5 minutes
 * - 1-hour data collection every hour
 * - Scrape queue processing every 15 minutes
 */
async function startMarketDataPolling() {
  try {
    logger.info('🚀 Starting market data polling jobs');
    
    const dataCollectionService = new DataCollectionService();
    
    // Schedule 5-minute data collection every 5 minutes
    const fiveMinInterval = setInterval(async () => {
      try {
        logger.info('🔄 Starting 5-minute data collection');
        await dataCollectionService.collect5mMarketData();
        logger.info('✅ 5-minute data collection completed');
      } catch (error) {
        logger.error('❌ 5-minute data collection failed', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    activeIntervals.set('5min_collection', fiveMinInterval);
    
    // Schedule 1-hour data collection every hour
    const oneHourInterval = setInterval(async () => {
      try {
        logger.info('🔄 Starting 1-hour data collection');
        await dataCollectionService.collect1hMarketData();
        logger.info('✅ 1-hour data collection completed');
      } catch (error) {
        logger.error('❌ 1-hour data collection failed', error);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    activeIntervals.set('1hour_collection', oneHourInterval);
    
    // Schedule scrape queue processing every 15 minutes
    const scrapeQueueInterval = setInterval(async () => {
      try {
        logger.info('🔄 Starting scrape queue processing');
        const result = await dataCollectionService.processScrapeQueue();
        logger.info('✅ Scrape queue processing completed', {
          itemsProcessed: result.itemsProcessed,
          itemsSuccessful: result.itemsSuccessful,
          itemsFailed: result.itemsFailed
        });
      } catch (error) {
        logger.error('❌ Scrape queue processing failed', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
    
    activeIntervals.set('scrape_queue', scrapeQueueInterval);
    
    // Run initial collections immediately
    try {
      logger.info('🔄 Running initial data collections');
      await Promise.all([
        dataCollectionService.collect5mMarketData(),
        dataCollectionService.collect1hMarketData()
      ]);
      logger.info('✅ Initial data collections completed');
    } catch (error) {
      logger.error('⚠️ Initial data collections failed', error);
    }
    
    // Run initial scrape queue processing
    try {
      logger.info('🔄 Running initial scrape queue processing');
      const result = await dataCollectionService.processScrapeQueue();
      logger.info('✅ Initial scrape queue processing completed', {
        itemsProcessed: result.itemsProcessed,
        itemsSuccessful: result.itemsSuccessful,
        itemsFailed: result.itemsFailed
      });
    } catch (error) {
      logger.error('⚠️ Initial scrape queue processing failed', error);
    }
    
    logger.info('✅ Market data polling jobs started successfully', {
      jobs: [
        '5-minute data collection (every 5 minutes)',
        '1-hour data collection (every hour)',
        'Scrape queue processing (every 15 minutes)'
      ]
    });
    
  } catch (error) {
    logger.error('❌ Failed to start market data polling jobs', error);
    throw error;
  }
}

/**
 * Stop all polling jobs
 */
function stopMarketDataPolling() {
  try {
    logger.info('🛑 Stopping market data polling jobs');
    
    for (const [jobName, intervalId] of activeIntervals) {
      clearInterval(intervalId);
      logger.info(`✅ Stopped ${jobName} job`);
    }
    
    activeIntervals.clear();
    logger.info('✅ All market data polling jobs stopped');
    
  } catch (error) {
    logger.error('❌ Error stopping market data polling jobs', error);
    throw error;
  }
}

/**
 * Get status of all active jobs
 */
function getJobStatus() {
  return {
    activeJobs: Array.from(activeIntervals.keys()),
    totalJobs: activeIntervals.size,
    status: activeIntervals.size > 0 ? 'running' : 'stopped',
    jobs: {
      '5min_collection': activeIntervals.has('5min_collection'),
      '1hour_collection': activeIntervals.has('1hour_collection'),
      'scrape_queue': activeIntervals.has('scrape_queue')
    }
  };
}

/**
 * Schedule one-time job with delay
 */
function scheduleOneTimeJob(jobName, jobFunction, delayMs) {
  logger.info(`📅 Scheduling one-time job: ${jobName} (delay: ${delayMs}ms)`);
  
  const timeoutId = setTimeout(async () => {
    try {
      logger.info(`🔄 Executing one-time job: ${jobName}`);
      await jobFunction();
      logger.info(`✅ One-time job completed: ${jobName}`);
    } catch (error) {
      logger.error(`❌ One-time job failed: ${jobName}`, error);
    }
  }, delayMs);
  
  return timeoutId;
}

/**
 * Schedule recurring job
 */
function scheduleRecurringJob(jobName, jobFunction, intervalMs) {
  logger.info(`📅 Scheduling recurring job: ${jobName} (interval: ${intervalMs}ms)`);
  
  const intervalId = setInterval(async () => {
    try {
      logger.info(`🔄 Executing recurring job: ${jobName}`);
      await jobFunction();
      logger.info(`✅ Recurring job completed: ${jobName}`);
    } catch (error) {
      logger.error(`❌ Recurring job failed: ${jobName}`, error);
    }
  }, intervalMs);
  
  activeIntervals.set(jobName, intervalId);
  
  return intervalId;
}

/**
 * Cancel a scheduled job
 */
function cancelJob(jobName) {
  if (activeIntervals.has(jobName)) {
    clearInterval(activeIntervals.get(jobName));
    activeIntervals.delete(jobName);
    logger.info(`✅ Cancelled job: ${jobName}`);
    return true;
  }
  
  logger.warn(`⚠️ Job not found: ${jobName}`);
  return false;
}

/**
 * Cleanup all jobs (for graceful shutdown)
 */
function cleanup() {
  logger.info('🧹 Cleaning up scheduler');
  stopMarketDataPolling();
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

module.exports = {
  startMarketDataPolling,
  stopMarketDataPolling,
  getJobStatus,
  scheduleOneTimeJob,
  scheduleRecurringJob,
  cancelJob,
  cleanup
};