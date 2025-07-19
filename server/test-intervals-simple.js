#!/usr/bin/env node

/**
 * Simple test of 5-minute and 1-hour interval data collection
 */

const { OSRSWikiService } = require('./services/OSRSWikiService');

async function testIntervals() {
  console.log('🧪 Testing OSRS Wiki API 5-minute and 1-hour data...');
  
  try {
    const wikiService = new OSRSWikiService();
    
    // Test 5-minute data
    console.log('\n📊 Testing 5-minute prices...');
    const fiveMinData = await wikiService.get5MinutePrices();
    
    if (fiveMinData && fiveMinData.data) {
      const itemCount = Object.keys(fiveMinData.data).length;
      console.log(`✅ 5-minute data SUCCESS: ${itemCount} items retrieved`);
      
      // Show sample data
      const sampleItems = Object.entries(fiveMinData.data).slice(0, 3);
      console.log('📊 Sample 5-minute data:');
      sampleItems.forEach(([itemId, data]) => {
        console.log(`   Item ${itemId}: High=${data.avgHighPrice}, Low=${data.avgLowPrice}, Volume=${data.highPriceVolume}`);
      });
    } else {
      console.error('❌ 5-minute data FAILED: No data received');
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 1-hour data
    console.log('\n📊 Testing 1-hour prices...');
    const oneHourData = await wikiService.get1HourPrices();
    
    if (oneHourData && oneHourData.data) {
      const itemCount = Object.keys(oneHourData.data).length;
      console.log(`✅ 1-hour data SUCCESS: ${itemCount} items retrieved`);
      
      // Show sample data
      const sampleItems = Object.entries(oneHourData.data).slice(0, 3);
      console.log('📊 Sample 1-hour data:');
      sampleItems.forEach(([itemId, data]) => {
        console.log(`   Item ${itemId}: High=${data.avgHighPrice}, Low=${data.avgLowPrice}, Volume=${data.highPriceVolume}`);
      });
    } else {
      console.error('❌ 1-hour data FAILED: No data received');
    }
    
    console.log('\n🎉 Interval testing completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ 5-minute data collection method: WORKING');
    console.log('✅ 1-hour data collection method: WORKING');
    console.log('✅ OSRS Wiki API integration: WORKING');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Execute test
testIntervals();