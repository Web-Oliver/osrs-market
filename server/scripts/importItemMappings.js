#!/usr/bin/env node
/**
 * 📥 Item Mappings Import Script - Context7 One-Time Import
 * 
 * Context7 Pattern: Command-Line Script for Data Migration
 * - SOLID: Single Responsibility - Import OSRS item mappings
 * - DRY: Reusable import logic and error handling
 * - One-time operation to populate MongoDB with OSRS Wiki item data
 * - Comprehensive logging and error reporting
 * - Safe operation with validation and rollback capability
 */

const mongoose = require('mongoose');
const { ItemMappingService } = require('../services/ItemMappingService');
const { Logger } = require('../utils/Logger');

class ImportScript {
  constructor() {
    this.logger = new Logger('ImportScript');
    this.itemMappingService = new ItemMappingService();
  }

  /**
   * Context7 Pattern: Main import execution
   */
  async run() {
    try {
      console.log('🚀 Starting OSRS Item Mappings Import');
      console.log('====================================');
      
      const startTime = Date.now();

      // Parse command line arguments
      const args = this.parseArguments();
      
      // Connect to MongoDB
      await this.connectToMongoDB();
      
      // Perform the import
      console.log('📥 Importing item mappings from OSRS Wiki API...');
      const result = await this.itemMappingService.importAllItemMappings({
        force: args.force
      });

      // Display results
      this.displayResults(result, startTime);
      
      // Close database connection
      await mongoose.disconnect();
      
      console.log('✅ Import completed successfully!');
      process.exit(0);

    } catch (error) {
      this.logger.error('Import script failed', error);
      console.error('❌ Import failed:', error.message);
      
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        this.logger.error('Error disconnecting from MongoDB', disconnectError);
      }
      
      process.exit(1);
    }
  }

  /**
   * Context7 Pattern: Parse command line arguments
   */
  parseArguments() {
    const args = {
      force: false
    };

    const argv = process.argv.slice(2);
    
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i].toLowerCase();
      
      switch (arg) {
        case '--force':
        case '-f':
          args.force = true;
          break;
        case '--help':
        case '-h':
          this.displayHelp();
          process.exit(0);
          break;
        default:
          console.warn(`⚠️  Unknown argument: ${argv[i]}`);
          break;
      }
    }

    return args;
  }

  /**
   * Context7 Pattern: Connect to MongoDB with environment configuration
   */
  async connectToMongoDB() {
    try {
      const mongoConnectionString = 
        process.env.MONGODB_CONNECTION_STRING || 
        'mongodb://localhost:27017';
      
      const databaseName = 
        process.env.MONGODB_DATABASE || 
        'osrs_market_data';

      const connectionUrl = `${mongoConnectionString}/${databaseName}`;
      
      console.log('🔌 Connecting to MongoDB...');
      console.log(`   Database: ${databaseName}`);
      
      await mongoose.connect(connectionUrl, {
        serverSelectionTimeoutMS: 30000, // 30 seconds
        connectTimeoutMS: 30000
      });
      
      console.log('✅ Connected to MongoDB successfully');
      
      // Test the connection
      const adminDb = mongoose.connection.db.admin();
      await adminDb.ping();
      
    } catch (error) {
      this.logger.error('Failed to connect to MongoDB', error);
      throw new Error(`MongoDB connection failed: ${error.message}`);
    }
  }

  /**
   * Context7 Pattern: Display import results
   */
  displayResults(result, startTime) {
    const processingTime = Date.now() - startTime;
    const processingSeconds = Math.round(processingTime / 1000);
    
    console.log('\n📊 Import Results');
    console.log('================');
    console.log(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Message: ${result.message}`);
    
    if (result.skipped) {
      console.log(`Existing Items: ${result.existingCount}`);
      console.log('💡 Use --force to reimport existing data');
    } else {
      console.log(`Total Items: ${result.totalItems || 0}`);
      console.log(`Items Imported: ${result.imported || 0}`);
      console.log(`Items Updated: ${result.updated || 0}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log(`Errors: ${result.errors.length}`);
        console.log('❌ Some items failed to import (check logs for details)');
      }
    }
    
    console.log(`Processing Time: ${processingSeconds}s`);
  }

  /**
   * Context7 Pattern: Display help information
   */
  displayHelp() {
    console.log(`
🗺️  OSRS Item Mappings Import Script

USAGE:
  node scripts/importItemMappings.js [OPTIONS]

OPTIONS:
  --force, -f     Force reimport even if data already exists
  --help, -h      Show this help message

DESCRIPTION:
  This script imports all item mapping data from the OSRS Wiki API
  into your MongoDB database. This is typically a one-time operation
  that should be run when setting up the application for the first time.

  The script will:
  1. Connect to your configured MongoDB database
  2. Fetch all item mappings from the OSRS Wiki API
  3. Validate and transform the data
  4. Import the data using efficient bulk operations
  5. Provide detailed progress and result information

ENVIRONMENT VARIABLES:
  MONGODB_CONNECTION_STRING   MongoDB connection URL (default: mongodb://localhost:27017)
  MONGODB_DATABASE           Database name (default: osrs_market_data)

EXAMPLES:
  # Normal import (will skip if data exists)
  node scripts/importItemMappings.js

  # Force reimport (will overwrite existing data)
  node scripts/importItemMappings.js --force

  # Show help
  node scripts/importItemMappings.js --help
`);
  }
}

// Context7 Pattern: Handle script execution
if (require.main === module) {
  const importScript = new ImportScript();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Import interrupted by user');
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
    process.exit(130); // Standard exit code for SIGINT
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Import terminated');
    try {
      await mongoose.disconnect();
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
    process.exit(143); // Standard exit code for SIGTERM
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught Exception:', error);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error during cleanup:', disconnectError.message);
    }
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error during cleanup:', disconnectError.message);
    }
    process.exit(1);
  });
  
  // Run the import
  importScript.run();
}

module.exports = { ImportScript };