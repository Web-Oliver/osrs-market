#!/usr/bin/env node

/**
 * Frontend Integration Test Script
 * 
 * This script tests the integration between the frontend API services and the backend
 * to ensure proper communication and data flow.
 */

// Simulate environment variables that would be available in the browser
const API_CONFIG = {
  nodeBackend: process.env.VITE_NODE_API_URL || 'http://localhost:3001',
  osrsWiki: process.env.VITE_OSRS_WIKI_API_URL || 'https://prices.runescape.wiki/api/v1/osrs'
}

console.log('🔄 Starting Frontend Integration Test...\n');
console.log('📊 Configuration:');
console.log(`  Backend API: ${API_CONFIG.nodeBackend}`);
console.log(`  OSRS Wiki API: ${API_CONFIG.osrsWiki}\n`);

const tests = [
  {
    name: 'Backend Health Check',
    test: async () => {
      const response = await fetch(`${API_CONFIG.nodeBackend}/api/ping`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ Backend Health:', data.data.message);
      return true;
    }
  },
  {
    name: 'AI Trading System Status',
    test: async () => {
      const response = await fetch(`${API_CONFIG.nodeBackend}/api/ai-trading/system-status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ AI Trading Status:', {
        activeSessions: data.data.activeSessions,
        systemHealth: data.data.systemHealth?.uptime || 'unknown'
      });
      return true;
    }
  },
  {
    name: 'Auto Training Status',
    test: async () => {
      const response = await fetch(`${API_CONFIG.nodeBackend}/api/auto-training/status`);
      // This might return 404 if no training service is running, which is OK
      if (response.status === 404) {
        console.log('✅ Auto Training: No active sessions (expected)');
        return true;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ Auto Training Status:', data.success ? 'Active' : 'Inactive');
      return true;
    }
  },
  {
    name: 'Market Data System',
    test: async () => {
      const response = await fetch(`${API_CONFIG.nodeBackend}/api/market-data/summary`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ Market Data:', {
        success: data.success,
        dataPoints: data.data?.totalRecords || 'unknown'
      });
      return true;
    }
  },
  {
    name: 'Live Monitoring',
    test: async () => {
      const response = await fetch(`${API_CONFIG.nodeBackend}/api/system-status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ Live Monitoring:', {
        api: data.data.api,
        uptime: `${Math.round(data.data.uptime)}s`,
        memory: `${data.data.memory.used}MB`
      });
      return true;
    }
  },
  {
    name: 'OSRS Wiki API (External)',
    test: async () => {
      const response = await fetch(`${API_CONFIG.osrsWiki}/latest?id=4151`); // Abyssal whip
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log('✅ OSRS Wiki API:', {
        dataAvailable: !!data.data,
        itemCount: Object.keys(data.data || {}).length
      });
      return true;
    }
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}`);
      const result = await test.test();
      if (result) {
        passed++;
      } else {
        failed++;
        console.log(`❌ ${test.name} - Test returned false`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} - Error: ${error.message}`);
    }
  }

  console.log('\n📊 Integration Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All integration tests passed! Frontend-backend communication is working properly.');
  } else {
    console.log('\n⚠️  Some integration tests failed. Check that the backend server is running on the expected port.');
    console.log('\nTo start the backend server:');
    console.log('  cd /home/oliver/apps/osrs-market/server');
    console.log('  npm start');
  }

  return failed === 0;
}

// Main execution
async function main() {
  try {
    const success = await runTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Integration test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runTests };