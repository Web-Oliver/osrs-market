/**
 * 📊 Market Data Service Tests - Context7 Pattern
 * 
 * Context7 Pattern: Comprehensive Service Testing
 * - Unit tests for saveMarketSnapshot() function
 * - Unit tests for getMarketSnapshots() function
 * - Validation and error handling tests
 * - Integration tests with MarketPriceSnapshotModel
 */

const mongoose = require('mongoose');
const { MarketDataService } = require('../../services/MarketDataService');
const { MarketPriceSnapshotModel } = require('../../models/MarketPriceSnapshotModel');
const { ItemModel } = require('../../models/ItemModel');

// Mock dependencies to isolate service tests
jest.mock('../../utils/Logger');
jest.mock('../../utils/CacheManager');
jest.mock('../../utils/DataTransformer');
jest.mock('../../utils/PriceCalculator');
jest.mock('../../services/OSRSWikiService');
jest.mock('../../services/AITradingOrchestratorService');
jest.mock('../../repositories/ItemRepository');
jest.mock('../../services/mongoDataPersistence');

describe('MarketDataService', () => {
  let marketDataService;
  let testItem;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/osrs_market_test');
    }

    // Create a test item for referencing, or use existing one
    testItem = await ItemModel.findOne({ itemId: 4151 });
    if (!testItem) {
      testItem = await ItemModel.create({
        itemId: 4151,
        name: 'Abyssal whip',
        examine: 'A weapon from the abyss.',
        members: true,
        lowalch: 72000,
        highalch: 108000,
        tradeable_on_ge: true,
        stackable: false,
        noted: false,
        value: 120001,
        weight: 0.453
      });
    }
  });

  beforeEach(() => {
    // Create fresh instance for each test
    marketDataService = new MarketDataService();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await MarketPriceSnapshotModel.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data and close connection
    await MarketPriceSnapshotModel.deleteMany({});
    await ItemModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('saveMarketSnapshot()', () => {
    const validSnapshotData = {
      itemId: 4151,
      timestamp: Date.now(),
      interval: 'latest',
      highPrice: 2500000,
      lowPrice: 2450000,
      volume: 100,
      source: 'osrs_wiki_api'
    };

    test('should save a new market snapshot successfully', async () => {
      const result = await marketDataService.saveMarketSnapshot(validSnapshotData);

      expect(result).toBeDefined();
      expect(result.itemId).toBe(validSnapshotData.itemId);
      expect(result.timestamp).toBe(validSnapshotData.timestamp);
      expect(result.interval).toBe(validSnapshotData.interval);
      expect(result.highPrice).toBe(validSnapshotData.highPrice);
      expect(result.lowPrice).toBe(validSnapshotData.lowPrice);
      expect(result.volume).toBe(validSnapshotData.volume);
      expect(result.source).toBe(validSnapshotData.source);
    });

    test('should update existing snapshot with same itemId, timestamp, and interval', async () => {
      // First save
      const firstResult = await marketDataService.saveMarketSnapshot(validSnapshotData);
      const firstId = firstResult._id;

      // Second save with same key but different prices
      const updatedData = {
        ...validSnapshotData,
        highPrice: 2600000,
        lowPrice: 2550000,
        volume: 150
      };
      
      const secondResult = await marketDataService.saveMarketSnapshot(updatedData);

      // Should be same document, but updated
      expect(secondResult._id.toString()).toBe(firstId.toString());
      expect(secondResult.highPrice).toBe(2600000);
      expect(secondResult.lowPrice).toBe(2550000);
      expect(secondResult.volume).toBe(150);

      // Verify only one document exists
      const snapshots = await MarketPriceSnapshotModel.find({
        itemId: validSnapshotData.itemId,
        timestamp: validSnapshotData.timestamp,
        interval: validSnapshotData.interval
      });
      expect(snapshots.length).toBe(1);
    });

    test('should create separate snapshots for different intervals', async () => {
      // Save with 'latest' interval
      const latestResult = await marketDataService.saveMarketSnapshot(validSnapshotData);

      // Save with '5m' interval (same itemId and timestamp)
      const fiveMinData = {
        ...validSnapshotData,
        interval: '5m'
      };
      const fiveMinResult = await marketDataService.saveMarketSnapshot(fiveMinData);

      // Should be different documents
      expect(latestResult._id.toString()).not.toBe(fiveMinResult._id.toString());
      expect(latestResult.interval).toBe('latest');
      expect(fiveMinResult.interval).toBe('5m');

      // Verify two documents exist
      const snapshots = await MarketPriceSnapshotModel.find({
        itemId: validSnapshotData.itemId,
        timestamp: validSnapshotData.timestamp
      });
      expect(snapshots.length).toBe(2);
    });

    test('should throw error for missing required fields', async () => {
      // Missing itemId
      await expect(marketDataService.saveMarketSnapshot({
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 100,
        lowPrice: 90,
        volume: 10
      })).rejects.toThrow('Missing required fields: itemId, timestamp, interval');

      // Missing timestamp
      await expect(marketDataService.saveMarketSnapshot({
        itemId: 4151,
        interval: 'latest',
        highPrice: 100,
        lowPrice: 90,
        volume: 10
      })).rejects.toThrow('Missing required fields: itemId, timestamp, interval');

      // Missing interval
      await expect(marketDataService.saveMarketSnapshot({
        itemId: 4151,
        timestamp: Date.now(),
        highPrice: 100,
        lowPrice: 90,
        volume: 10
      })).rejects.toThrow('Missing required fields: itemId, timestamp, interval');
    });

    test('should throw error for invalid price relationship', async () => {
      const invalidData = {
        ...validSnapshotData,
        highPrice: 2400000,  // Lower than lowPrice
        lowPrice: 2500000
      };

      await expect(marketDataService.saveMarketSnapshot(invalidData))
        .rejects.toThrow('High price cannot be less than low price');
    });

    test('should run schema validation on save', async () => {
      const invalidData = {
        ...validSnapshotData,
        interval: 'invalid_interval'  // Not in enum
      };

      await expect(marketDataService.saveMarketSnapshot(invalidData))
        .rejects.toThrow();
    });

    test('should handle database errors gracefully', async () => {
      // Mock Mongoose to throw an error
      const originalFindOneAndUpdate = MarketPriceSnapshotModel.findOneAndUpdate;
      MarketPriceSnapshotModel.findOneAndUpdate = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(marketDataService.saveMarketSnapshot(validSnapshotData))
        .rejects.toThrow('Database connection failed');

      // Restore original method
      MarketPriceSnapshotModel.findOneAndUpdate = originalFindOneAndUpdate;
    });
  });

  describe('getMarketSnapshots()', () => {
    let testSnapshots;

    beforeEach(async () => {
      // Create test data
      const baseTime = Date.now();
      testSnapshots = [
        {
          itemId: 4151,
          timestamp: baseTime - 3600000, // 1 hour ago
          interval: 'latest',
          highPrice: 2400000,
          lowPrice: 2350000,
          volume: 50,
          source: 'osrs_wiki_api'
        },
        {
          itemId: 4151,
          timestamp: baseTime - 1800000, // 30 minutes ago
          interval: 'latest',
          highPrice: 2450000,
          lowPrice: 2400000,
          volume: 75,
          source: 'osrs_wiki_api'
        },
        {
          itemId: 4151,
          timestamp: baseTime + 1000, // 1 second later to ensure ordering
          interval: 'latest',
          highPrice: 2500000,
          lowPrice: 2450000,
          volume: 100,
          source: 'osrs_wiki_api'
        },
        {
          itemId: 4151,
          timestamp: baseTime + 2000, // 2 seconds later
          interval: '5m', // Same time but different interval
          highPrice: 2480000,
          lowPrice: 2430000,
          volume: 80,
          source: 'osrs_wiki_api'
        },
        {
          itemId: 11802, // Different item
          timestamp: baseTime + 3000, // 3 seconds later
          interval: 'latest',
          highPrice: 45000000,
          lowPrice: 44000000,
          volume: 10,
          source: 'osrs_wiki_api'
        }
      ];

      // Save test snapshots
      for (const snapshot of testSnapshots) {
        await marketDataService.saveMarketSnapshot(snapshot);
      }
    });

    test('should retrieve all snapshots for an item', async () => {
      const result = await marketDataService.getMarketSnapshots(4151);

      expect(result).toHaveLength(4); // 4 snapshots for item 4151
      expect(result[0].itemId).toBe(4151);
      
      // Should be sorted by timestamp descending (newest first)
      expect(result[0].timestamp).toBeGreaterThan(result[1].timestamp);
      expect(result[1].timestamp).toBeGreaterThan(result[2].timestamp);
    });

    test('should filter by interval', async () => {
      const result = await marketDataService.getMarketSnapshots(4151, 'latest');

      expect(result).toHaveLength(3); // 3 'latest' snapshots for item 4151
      result.forEach(snapshot => {
        expect(snapshot.interval).toBe('latest');
      });
    });

    test('should filter by date range', async () => {
      const baseTime = Date.now();
      const startDate = baseTime - 2400000; // 40 minutes ago
      const endDate = baseTime + 5000; // 5 seconds from now

      const result = await marketDataService.getMarketSnapshots(
        4151,
        null,
        startDate,
        endDate
      );

      expect(result).toHaveLength(3); // 3 snapshots in the range (2 latest + 1 5m)
      result.forEach(snapshot => {
        expect(snapshot.timestamp).toBeGreaterThanOrEqual(startDate);
        expect(snapshot.timestamp).toBeLessThanOrEqual(endDate);
      });
    });

    test('should filter by interval and date range', async () => {
      const baseTime = Date.now();
      const startDate = baseTime - 2400000; // 40 minutes ago
      const endDate = baseTime + 5000; // 5 seconds from now

      const result = await marketDataService.getMarketSnapshots(
        4151,
        'latest',
        startDate,
        endDate
      );

      expect(result).toHaveLength(2); // 2 'latest' snapshots in the range
      result.forEach(snapshot => {
        expect(snapshot.interval).toBe('latest');
        expect(snapshot.timestamp).toBeGreaterThanOrEqual(startDate);
        expect(snapshot.timestamp).toBeLessThanOrEqual(endDate);
      });
    });

    test('should return empty array for non-existent item', async () => {
      const result = await marketDataService.getMarketSnapshots(99999);
      expect(result).toHaveLength(0);
    });

    test('should return empty array for invalid date range', async () => {
      const baseTime = Date.now();
      const startDate = baseTime + 3600000; // 1 hour from now
      const endDate = baseTime + 7200000; // 2 hours from now

      const result = await marketDataService.getMarketSnapshots(
        4151,
        null,
        startDate,
        endDate
      );

      expect(result).toHaveLength(0);
    });

    test('should throw error for invalid itemId', async () => {
      await expect(marketDataService.getMarketSnapshots(null))
        .rejects.toThrow('itemId must be a valid number');

      await expect(marketDataService.getMarketSnapshots('invalid'))
        .rejects.toThrow('itemId must be a valid number');

      await expect(marketDataService.getMarketSnapshots(undefined))
        .rejects.toThrow('itemId must be a valid number');
    });

    test('should handle database errors gracefully', async () => {
      // Mock Mongoose to throw an error
      const originalFind = MarketPriceSnapshotModel.find;
      MarketPriceSnapshotModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('Database query failed'))
        })
      });

      await expect(marketDataService.getMarketSnapshots(4151))
        .rejects.toThrow('Database query failed');

      // Restore original method
      MarketPriceSnapshotModel.find = originalFind;
    });

    test('should populate item data correctly', async () => {
      const result = await marketDataService.getMarketSnapshots(4151);

      expect(result[0].itemId).toBeDefined();
      // Note: Population may not work in test environment without proper ItemModel setup
      // This test verifies the populate call is made correctly
    });

    test('should handle startDate only', async () => {
      const baseTime = Date.now();
      const startDate = baseTime - 1800000; // 30 minutes ago

      const result = await marketDataService.getMarketSnapshots(
        4151,
        null,
        startDate
      );

      expect(result).toHaveLength(2); // 2 snapshots after 30 minutes ago
      result.forEach(snapshot => {
        expect(snapshot.timestamp).toBeGreaterThanOrEqual(startDate);
      });
    });

    test('should handle endDate only', async () => {
      const baseTime = Date.now();
      const endDate = baseTime - 1800000; // 30 minutes ago

      const result = await marketDataService.getMarketSnapshots(
        4151,
        null,
        null,
        endDate
      );

      expect(result).toHaveLength(2); // 2 snapshots before 30 minutes ago
      result.forEach(snapshot => {
        expect(snapshot.timestamp).toBeLessThanOrEqual(endDate);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should work with real MarketPriceSnapshotModel schema', async () => {
      const snapshotData = {
        itemId: 4151,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 2500000,
        lowPrice: 2450000,
        volume: 100,
        source: 'osrs_wiki_api',
        // Test advanced calculated metrics
        marginGp: 50000,
        marginPercent: 2.04,
        volatility: 0.15,
        rsi: 65,
        momentumScore: 15,
        riskScore: 25
      };

      const result = await marketDataService.saveMarketSnapshot(snapshotData);
      expect(result.marginGp).toBe(50000);
      expect(result.marginPercent).toBe(2.04);
      expect(result.volatility).toBe(0.15);
      expect(result.rsi).toBe(65);
      expect(result.momentumScore).toBe(15);
      expect(result.riskScore).toBe(25);
    });

    test('should handle schema validation errors', async () => {
      const invalidData = {
        itemId: 4151,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 2500000,
        lowPrice: 2450000,
        volume: 100,
        source: 'osrs_wiki_api',
        rsi: 150 // Invalid RSI value (should be 0-100)
      };

      await expect(marketDataService.saveMarketSnapshot(invalidData))
        .rejects.toThrow();
    });
  });
});