#!/usr/bin/env node

/**
 * Direct OSRS Scraper Execution Script
 * Bypasses route issues and directly executes the scraper
 */

const { OSRSDataScraperService } = require('./services/OSRSDataScraperService');

async function executeDirectScraping() {
  console.log('🏺 Starting direct OSRS data scraping...');
  
  try {
    // Initialize scraper service
    const scraperService = new OSRSDataScraperService();
    await scraperService.initialize();
    
    console.log('✅ Scraper service initialized');
    
    // Perform full scrape
    console.log('🚀 Starting comprehensive scrape of top 100 items...');
    const result = await scraperService.performFullScrape();
    
    console.log('✅ Scraping completed successfully!');
    console.log('📊 Results:', {
      success: result.success,
      totalTime: result.totalTime,
      itemsScraped: result.itemsScraped,
      patternsDetected: result.patternsDetected
    });
    
    // Cleanup
    await scraperService.cleanup();
    console.log('🧹 Cleanup completed');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Execute immediately
executeDirectScraping();