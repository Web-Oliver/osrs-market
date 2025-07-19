#!/usr/bin/env node

/**
 * Integration Test Script for OSRS Market AI Services
 * 
 * This script tests the integration between Node.js backend and Python AI service
 * to ensure proper communication and data flow.
 */

const { PythonRLClientService } = require('./server/services/PythonRLClientService');
const { Logger } = require('./server/utils/Logger');

const logger = new Logger('IntegrationTest');

async function testIntegration() {
  console.log('🔄 Starting integration test between Node.js and Python AI services...\n');

  // Initialize Python RL Client
  const pythonClient = new PythonRLClientService({
    baseUrl: process.env.PYTHON_RL_SERVICE_URL || 'http://localhost:8000',
    timeout: 10000
  });

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const health = await pythonClient.healthCheck();
        console.log('✅ Health Check Result:', {
          status: health.status,
          version: health.version,
          uptime: health.uptime
        });
        return health.status === 'healthy';
      }
    },
    {
      name: 'Prediction Test',
      test: async () => {
        const testFeatures = [
          100, 200, 1500, // high, low, volume
          0.85, // confidence
          25.5, // margin percentage
          75, // RSI
          0.12, // volatility
          45.3, // momentum score
          15.2 // risk score
        ];
        
        const prediction = await pythonClient.predict(testFeatures);
        console.log('✅ Prediction Result:', {
          action: prediction.action,
          action_name: prediction.action_name,
          confidence: prediction.confidence,
          model_version: prediction.modelVersion,
          processing_time: prediction.processingTime
        });
        return prediction.action !== undefined;
      }
    },
    {
      name: 'Training Status Test',
      test: async () => {
        const status = await pythonClient.getTrainingStatus();
        console.log('✅ Training Status Result:', {
          is_training: status.isTraining,
          current_episode: status.currentEpisode,
          model_version: status.modelVersion
        });
        return status !== undefined;
      }
    },
    {
      name: 'Model Metrics Test',
      test: async () => {
        const metrics = await pythonClient.getModelMetrics();
        console.log('✅ Model Metrics Result:', {
          model_id: metrics.modelId,
          total_trades: metrics.totalTrades,
          profitability: metrics.profitability
        });
        return metrics !== undefined;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Running test: ${test.name}`);
      const result = await test.test();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} FAILED - Invalid result`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} FAILED - Error:`, error.message);
    }
  }

  console.log('\n📊 Integration Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All integration tests passed! Services are properly integrated.');
  } else {
    console.log('\n⚠️  Some integration tests failed. Check the Python AI service is running on port 8000.');
  }

  // Test circuit breaker stats
  console.log('\n🔧 Circuit Breaker Statistics:');
  console.log(JSON.stringify(pythonClient.getClientStats(), null, 2));
}

// Environment variable check
function checkEnvironment() {
  console.log('🔧 Environment Configuration:');
  console.log(`PYTHON_RL_SERVICE_URL: ${process.env.PYTHON_RL_SERVICE_URL || 'http://localhost:8000 (default)'}`);
  console.log(`MONGODB_CONNECTION_STRING: ${process.env.MONGODB_CONNECTION_STRING ? 'Set ✅' : 'Not set ❌'}`);
  console.log(`MONGODB_DATABASE: ${process.env.MONGODB_DATABASE || 'osrs_market_data (default)'}`);
  console.log('');
}

// Main execution
async function main() {
  checkEnvironment();
  
  try {
    await testIntegration();
  } catch (error) {
    console.error('❌ Integration test failed with error:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testIntegration };