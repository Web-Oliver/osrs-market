#!/usr/bin/env node

/**
 * Comprehensive OSRS Historical Data Scraper
 * Scrapes 6-month historical data from EVERY individual item page
 */

const { OSRSDataScraperService } = require('./services/OSRSDataScraperService');

async function scrapeAllHistoricalData() {
  console.log('🏺 Starting comprehensive 6-month historical data scraping for ALL items...');
  
  try {
    // Initialize scraper service
    const scraperService = new OSRSDataScraperService();
    await scraperService.initialize();
    
    console.log('✅ Scraper service initialized');
    
    // First get the list of all items from top 100 lists
    console.log('📊 Getting all items from top 100 lists...');
    const allCategories = [
      { name: 'mostTraded', listId: 0 },
      { name: 'greatestRise', listId: 1 }, 
      { name: 'mostValuable', listId: 2 },
      { name: 'greatestFall', listId: 3 }
    ];
    
    const allItems = [];
    
    // Scrape all categories to get item list
    for (const category of allCategories) {
      console.log(`📈 Getting items from ${category.name}...`);
      try {
        const categoryItems = await scraperService.scrapeCategoryList(
          `https://secure.runescape.com/m=itemdb_oldschool/top100?list=${category.listId}&scale=3`,
          category.name
        );
        
        // Add category info to each item
        const itemsWithCategory = categoryItems.map(item => ({
          ...item,
          category: category.name,
          listId: category.listId
        }));
        
        allItems.push(...itemsWithCategory);
        console.log(`✅ Got ${categoryItems.length} items from ${category.name}`);
        
        // Wait between categories
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to get items from ${category.name}:`, error.message);
      }
    }
    
    // Remove duplicates based on itemId
    const uniqueItems = allItems.filter((item, index, self) => 
      item.itemId && self.findIndex(i => i.itemId === item.itemId) === index
    );
    
    console.log(`📊 Total unique items to scrape: ${uniqueItems.length}`);
    
    if (uniqueItems.length === 0) {
      console.log('❌ No items found to scrape');
      return;
    }
    
    // Check which items already have historical data scraped
    console.log('🔍 Checking for already scraped items...');
    const scrapedCollection = scraperService.mongoPersistence.database.collection('osrs_historical_data');
    const alreadyScraped = await scrapedCollection.distinct('itemId');
    
    // Filter out already scraped items
    const itemsToScrape = uniqueItems.filter(item => !alreadyScraped.includes(item.itemId));
    
    console.log(`📊 Items already scraped: ${alreadyScraped.length}`);
    console.log(`📊 Items remaining to scrape: ${itemsToScrape.length}`);
    
    if (itemsToScrape.length === 0) {
      console.log('✅ All items already have historical data!');
      await scraperService.cleanup();
      return;
    }
    
    // Now scrape 6-month historical data for EVERY remaining item
    console.log('🚀 Starting individual item historical data scraping...');
    
    const historicalData = [];
    const batchSize = 5; // Process 5 items at a time to avoid overwhelming servers
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < itemsToScrape.length; i += batchSize) {
      const batch = itemsToScrape.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(itemsToScrape.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)...`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (item, batchIndex) => {
        const overallIndex = i + batchIndex + 1;
        try {
          console.log(`📊 [${overallIndex}/${itemsToScrape.length}] Scraping ${item.name} (ID: ${item.itemId})...`);
          
          // Scrape individual item page for 6-month historical data
          const itemHistoricalData = await scraperService.scrapeIndividualItemPage(item.itemId, item.name);
          
          if (itemHistoricalData && itemHistoricalData.length > 0) {
            // Add item metadata to each historical data point
            const enrichedData = itemHistoricalData.map(dataPoint => ({
              ...dataPoint,
              itemName: item.name,
              itemId: item.itemId,
              category: item.category,
              listId: item.listId,
              rank: item.rank,
              scrapedAt: Date.now(),
              source: 'OSRS_GE_Individual_Page'
            }));
            
            historicalData.push(...enrichedData);
            console.log(`✅ [${overallIndex}/${itemsToScrape.length}] ${item.name}: ${itemHistoricalData.length} data points`);
            successCount++;
          } else {
            console.log(`⚠️ [${overallIndex}/${itemsToScrape.length}] ${item.name}: No historical data found`);
            errorCount++;
          }
          
        } catch (error) {
          console.error(`❌ [${overallIndex}/${itemsToScrape.length}] Failed to scrape ${item.name}:`, error.message);
          errorCount++;
        }
      });
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Progress update
      const progressPercent = Math.round((i + batch.length) / itemsToScrape.length * 100);
      console.log(`📈 Progress: ${progressPercent}% (${successCount} success, ${errorCount} errors)`);
      
      // Wait between batches to be respectful
      if (i + batchSize < itemsToScrape.length) {
        console.log('⏳ Waiting 3 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log(`\n🎯 Historical data scraping completed!`);
    console.log(`📊 Summary:`);
    console.log(`   - Total unique items from 4 lists: ${uniqueItems.length}`);
    console.log(`   - Items already scraped: ${alreadyScraped.length}`);
    console.log(`   - Items processed this run: ${itemsToScrape.length}`);
    console.log(`   - Successfully scraped: ${successCount}`);
    console.log(`   - Errors: ${errorCount}`);
    console.log(`   - Total historical data points: ${historicalData.length}`);
    
    if (historicalData.length > 0) {
      // Save all historical data to MongoDB
      console.log('💾 Saving historical data to MongoDB...');
      
      try {
        // Save to historical_prices collection for AI training
        await scraperService.mongoPersistence.bulkSaveHistoricalPrices(historicalData);
        
        // Also save raw data to osrs_historical_data collection
        const collection = scraperService.mongoPersistence.database.collection('osrs_historical_data');
        await collection.insertMany(historicalData.map(data => ({
          ...data,
          savedAt: Date.now(),
          scrapeSession: `comprehensive_${Date.now()}`
        })));
        
        console.log(`✅ Saved ${historicalData.length} historical data points to MongoDB`);
        
        // Generate summary
        const summary = {
          scrapeId: `comprehensive_historical_${Date.now()}`,
          timestamp: Date.now(),
          totalItems: uniqueItems.length,
          successfulItems: successCount,
          failedItems: errorCount,
          totalDataPoints: historicalData.length,
          avgDataPointsPerItem: Math.round(historicalData.length / successCount),
          categories: allCategories.map(cat => cat.name),
          timeRange: '6 months historical data',
          source: 'OSRS Grand Exchange Individual Pages'
        };
        
        // Save summary
        const summaryCollection = scraperService.mongoPersistence.database.collection('osrs_scrape_summaries');
        await summaryCollection.insertOne(summary);
        
        console.log(`📋 Scrape summary saved with ID: ${summary.scrapeId}`);
        
      } catch (error) {
        console.error('❌ Error saving historical data:', error.message);
      }
    }
    
    // Cleanup
    await scraperService.cleanup();
    console.log('🧹 Cleanup completed');
    
    console.log(`\n🎉 MISSION ACCOMPLISHED!`);
    console.log(`📊 Successfully scraped 6-month historical data for ${successCount} OSRS items`);
    console.log(`💾 ${historicalData.length} total data points saved to MongoDB`);
    
  } catch (error) {
    console.error('❌ Comprehensive scraping failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Execute immediately
scrapeAllHistoricalData();