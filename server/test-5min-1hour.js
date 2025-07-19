#!/usr/bin/env node

/**
 * Test 5-minute and 1-hour data collection methods
 */

const { DataCollectionService } = require('./services/DataCollectionService');

async function test5MinAnd1Hour() {
  console.log('🧪 Testing 5-minute and 1-hour data collection methods...');
  
  try {
    // Initialize data collection service
    const dataCollectionService = new DataCollectionService();
    
    // Wait for MongoDB initialization to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Data Collection Service initialized');
    
    // Test 5-minute data collection
    console.log('\n📊 Testing 5-minute data collection...');
    try {
      const result5min = await dataCollectionService.collect5mMarketData();
      console.log('✅ 5-minute data collection SUCCESS!');
      console.log(`   - Items saved: ${result5min.itemsSaved}`);
      console.log(`   - Errors: ${result5min.errors}`);
      console.log(`   - Total items: ${result5min.totalItems}`);
    } catch (error) {
      console.error('❌ 5-minute data collection FAILED:', error.message);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1-hour data collection
    console.log('\n📊 Testing 1-hour data collection...');
    try {
      const result1hour = await dataCollectionService.collect1hMarketData();
      console.log('✅ 1-hour data collection SUCCESS!');
      console.log(`   - Items saved: ${result1hour.itemsSaved}`);
      console.log(`   - Errors: ${result1hour.errors}`);
      console.log(`   - Total items: ${result1hour.totalItems}`);
    } catch (error) {
      console.error('❌ 1-hour data collection FAILED:', error.message);
    }
    
    // Test if we can retrieve the data from MongoDB
    console.log('\n📈 Testing data retrieval from MongoDB...');
    try {
      const { MarketDataService } = require('./services/MarketDataService');
      const marketDataService = new MarketDataService();
      
      // Get recent 5-minute data
      const recent5min = await marketDataService.getMarketSnapshots(null, '5m', 
        new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        new Date()
      );
      
      // Get recent 1-hour data
      const recent1hour = await marketDataService.getMarketSnapshots(null, '1h',
        new Date(Date.now() - 2 * 60 * 60 * 1000), // Last 2 hours
        new Date()
      );
      
      console.log(`✅ Retrieved ${recent5min.length} recent 5-minute data points`);
      console.log(`✅ Retrieved ${recent1hour.length} recent 1-hour data points`);
      
      if (recent5min.length > 0) {
        console.log('📊 Sample 5-minute data:');
        console.log(JSON.stringify(recent5min[0], null, 2));
      }
      
      if (recent1hour.length > 0) {
        console.log('📊 Sample 1-hour data:');
        console.log(JSON.stringify(recent1hour[0], null, 2));
      }
      
    } catch (error) {
      console.error('❌ Data retrieval FAILED:', error.message);
    }
    
    // Cleanup
    if (dataCollectionService.mongoPersistence) {
      await dataCollectionService.mongoPersistence.disconnect();
    }
    console.log('\n🧹 Cleanup completed');
    console.log('\n🎉 5-minute and 1-hour testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Execute test
test5MinAnd1Hour();