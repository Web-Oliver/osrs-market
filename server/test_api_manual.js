/**
 * Manual API Test Script
 * Tests the new MarketDataService API endpoints
 */

const express = require('express');
const mongoose = require('mongoose');
const marketDataRoutes = require('./routes/marketDataRoutes');

// Create test Express app
const app = express();
app.use(express.json());
app.use('/api/market-data', marketDataRoutes);

async function testApiEndpoints() {
  try {
    // Connect to test database
    await mongoose.connect('mongodb://localhost:27017/osrs_market_test');
    console.log('Connected to MongoDB');

    // Start server
    const server = app.listen(3002, () => {
      console.log('Test server running on port 3002');
    });

    // Test data
    const testSnapshot = {
      itemId: 4151,
      timestamp: Date.now(),
      interval: 'latest',
      highPrice: 2500000,
      lowPrice: 2450000,
      volume: 100,
      source: 'osrs_wiki_api'
    };

    // Test POST endpoint
    console.log('\n=== Testing POST /api/market-data/snapshot ===');
    const response1 = await fetch('http://localhost:3002/api/market-data/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSnapshot)
    });

    const result1 = await response1.json();
    console.log('POST Response:', response1.status, result1);

    // Test GET endpoint
    console.log('\n=== Testing GET /api/market-data/4151 ===');
    const response2 = await fetch('http://localhost:3002/api/market-data/4151');
    const result2 = await response2.json();
    console.log('GET Response:', response2.status, result2);

    // Cleanup
    server.close();
    await mongoose.connection.close();
    console.log('\nTest completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run if script is executed directly
if (require.main === module) {
  testApiEndpoints();
}

module.exports = { testApiEndpoints };
