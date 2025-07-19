#!/usr/bin/env node

/**
 * Test single item historical data scraping
 */

const { OSRSDataScraperService } = require('./services/OSRSDataScraperService');

async function testSingleItem() {
  console.log('🧪 Testing single item historical data scraping...');
  
  try {
    // Initialize scraper service
    const scraperService = new OSRSDataScraperService();
    await scraperService.initialize();
    
    console.log('✅ Scraper service initialized');
    
    // Test with Bow string (item ID 1777) - we know this one has data
    const itemId = 1777;
    const itemName = 'Bow string';
    
    console.log(`🎯 Testing scraping for: ${itemName} (ID: ${itemId})`);
    
    const historicalData = await scraperService.scrapeIndividualItemPage(itemId, itemName);
    
    if (historicalData && historicalData.length > 0) {
      console.log(`✅ SUCCESS! Scraped ${historicalData.length} historical data points`);
      console.log('📊 Sample data:');
      console.log(JSON.stringify(historicalData.slice(0, 3), null, 2));
      
      console.log('📈 Data range:');
      console.log(`   First date: ${new Date(historicalData[0].timestamp).toISOString()}`);
      console.log(`   Last date: ${new Date(historicalData[historicalData.length - 1].timestamp).toISOString()}`);
      console.log(`   Price range: ${Math.min(...historicalData.map(d => d.dailyPrice))} - ${Math.max(...historicalData.map(d => d.dailyPrice))} GP`);
      console.log(`   Volume range: ${Math.min(...historicalData.map(d => d.volume))} - ${Math.max(...historicalData.map(d => d.volume))}`);
    } else {
      console.log('❌ No historical data extracted');
    }
    
    // Cleanup
    await scraperService.cleanup();
    console.log('🧹 Cleanup completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Execute test
testSingleItem();