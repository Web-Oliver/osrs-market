/**
 * 📊 Market Price Snapshot Model Tests - Context7 Pattern
 *
 * Context7 Pattern: Comprehensive Model Testing
 * - Schema validation tests
 * - Index verification tests
 * - Method functionality tests
 * - Integration tests with ItemModel
 */

const mongoose = require('mongoose');
const { MarketPriceSnapshotModel } = require('../../models/MarketPriceSnapshotModel');
const { ItemModel } = require('../../models/ItemModel');

describe('MarketPriceSnapshotModel', () => {
  let testItem;

  beforeAll(async() => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/osrs_market_test');
    }

    // Create a test item for referencing
    testItem = await ItemModel.create({
      itemId: 554,
      name: 'Fire rune',
      examine: 'One of the four basic elemental runes.',
      members: false,
      lowalch: 2,
      highalch: 3,
      tradeable_on_ge: true,
      stackable: true,
      noted: false,
      value: 5,
      weight: 0.007
    });
  });


  afterAll(async() => {
    // Clean up test data
    await MarketPriceSnapshotModel.deleteMany({});
    await ItemModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Schema Validation', () => {
    afterEach(async() => {
      // Clean up snapshots after each test in this block
      await MarketPriceSnapshotModel.deleteMany({});
    });

    test('should create a valid market price snapshot', async() => {
      const snapshot = new MarketPriceSnapshotModel({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 6,
        lowPrice: 4,
        volume: 1000000,
        source: 'osrs_wiki_api'
      });

      expect(snapshot).toBeDefined();
      expect(snapshot.itemId).toBe(testItem.itemId);
      expect(snapshot.interval).toBe('latest');
      expect(snapshot.highPrice).toBe(6);
      expect(snapshot.lowPrice).toBe(4);
      expect(snapshot.volume).toBe(1000000);
      expect(snapshot.source).toBe('osrs_wiki_api');
    });

    test('should reject invalid interval values', async() => {
      const snapshot = new MarketPriceSnapshotModel({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'invalid_interval',
        highPrice: 6,
        lowPrice: 4,
        volume: 1000000
      });

      await expect(snapshot.save()).rejects.toThrow();
    });

    test('should reject negative prices', async() => {
      const snapshot = new MarketPriceSnapshotModel({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: -1,
        lowPrice: 4,
        volume: 1000000
      });

      await expect(snapshot.save()).rejects.toThrow();
    });

    test('should reject high price less than low price', async() => {
      const snapshot = new MarketPriceSnapshotModel({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 4,
        lowPrice: 6,
        volume: 1000000
      });

      await expect(snapshot.save()).rejects.toThrow();
    });

    test('should validate advanced calculated metrics', async() => {
      const snapshot = new MarketPriceSnapshotModel({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 6,
        lowPrice: 4,
        volume: 1000000,
        marginPercent: 150,
        rsi: 65,
        riskScore: 25,
        momentumScore: 10
      });

      await expect(snapshot.save()).resolves.toBeDefined();
    });

    test('should reject invalid RSI values', async() => {
      const snapshot = new MarketPriceSnapshotModel({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 6,
        lowPrice: 4,
        volume: 1000000,
        rsi: 150 // Invalid RSI (should be 0-100)
      });

      await expect(snapshot.save()).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let snapshot;

    beforeEach(async() => {
      snapshot = await MarketPriceSnapshotModel.create({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 10,
        lowPrice: 6,
        volume: 500000,
        source: 'osrs_wiki_api'
      });
    });

    afterEach(async() => {
      // Clean up snapshots after each test in this block
      await MarketPriceSnapshotModel.deleteMany({});
    });

    test('should calculate average price correctly', () => {
      expect(snapshot.getAveragePrice()).toBe(8);
    });

    test('should calculate price spread correctly', () => {
      expect(snapshot.getPriceSpread()).toBe(4);
    });

    test('should calculate price spread percentage correctly', () => {
      expect(snapshot.getPriceSpreadPercent()).toBe(50);
    });

    test('should detect active trading correctly', () => {
      expect(snapshot.isActiveTrading()).toBe(true);

      snapshot.volume = 0;
      expect(snapshot.isActiveTrading()).toBe(false);
    });

    test('should format timestamp correctly', () => {
      const formatted = snapshot.getFormattedTimestamp();
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('Static Methods', () => {
    afterEach(async() => {
      // Clean up snapshots after each test in this block
      await MarketPriceSnapshotModel.deleteMany({});
    });

    beforeEach(async() => {
      // Create test snapshots
      await MarketPriceSnapshotModel.create([
        {
          itemId: testItem.itemId,
          timestamp: Date.now() - 3600000,
          interval: 'latest',
          highPrice: 8,
          lowPrice: 6,
          volume: 300000,
          source: 'osrs_wiki_api'
        },
        {
          itemId: testItem.itemId,
          timestamp: Date.now(),
          interval: 'latest',
          highPrice: 10,
          lowPrice: 8,
          volume: 500000,
          source: 'osrs_wiki_api'
        }
      ]);
    });

    test('should get latest snapshot for item', async() => {
      const latest = await MarketPriceSnapshotModel.getLatestSnapshot(testItem.itemId);
      expect(latest).toBeDefined();
      expect(latest.itemId).toBe(testItem.itemId);
      expect(latest.highPrice).toBe(10);
    });

    test('should get snapshots in time range', async() => {
      const endTime = Date.now() + 1000;
      const startTime = Date.now() - 7200000; // 2 hours ago

      const snapshots = await MarketPriceSnapshotModel.getSnapshotsInTimeRange(
        testItem.itemId,
        startTime,
        endTime
      );

      expect(snapshots.length).toBe(2);
      expect(snapshots[0].timestamp).toBeLessThan(snapshots[1].timestamp);
    });

    test('should get high volume snapshots', async() => {
      const highVolume = await MarketPriceSnapshotModel.getHighVolumeSnapshots(400000);
      expect(highVolume.length).toBe(1);
      expect(highVolume[0].volume).toBe(500000);
    });

    test('should get snapshots by source', async() => {
      const bySource = await MarketPriceSnapshotModel.getSnapshotsBySource('osrs_wiki_api');
      expect(bySource.length).toBe(2);
      expect(bySource[0].source).toBe('osrs_wiki_api');
    });
  });

  describe('Virtual Properties', () => {
    afterEach(async() => {
      // Clean up snapshots after each test in this block
      await MarketPriceSnapshotModel.deleteMany({});
    });

    test('should expose virtual properties', async() => {
      const snapshot = await MarketPriceSnapshotModel.create({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 12,
        lowPrice: 8,
        volume: 250000,
        source: 'osrs_wiki_api'
      });

      expect(snapshot.averagePrice).toBe(10);
      expect(snapshot.priceSpread).toBe(4);
      expect(snapshot.formattedTimestamp).toBeDefined();
    });
  });

  describe('Indexes', () => {
    afterEach(async() => {
      // Clean up snapshots after each test in this block
      await MarketPriceSnapshotModel.deleteMany({});
    });

    test('should have proper compound index on itemId, interval, timestamp', async() => {
      const indexes = await MarketPriceSnapshotModel.collection.getIndexes();

      const compoundIndex = indexes['idx_item_interval_timestamp_unique'];

      expect(compoundIndex).toBeDefined();
      // Check if it's an array with index definition [[key, order], ...]
      if (Array.isArray(compoundIndex)) {
        expect(compoundIndex).toContainEqual(['itemId', 1]);
        expect(compoundIndex).toContainEqual(['interval', 1]);
        expect(compoundIndex).toContainEqual(['timestamp', 1]);
      }
    });

    test('should enforce unique constraint on compound index', async() => {
      const timestamp = Date.now();
      const itemId = testItem.itemId;
      const interval = 'latest';

      await MarketPriceSnapshotModel.create({
        itemId,
        timestamp,
        interval,
        highPrice: 10,
        lowPrice: 8,
        volume: 100000,
        source: 'osrs_wiki_api'
      });

      // Attempt to create duplicate
      await expect(
        MarketPriceSnapshotModel.create({
          itemId,
          timestamp,
          interval,
          highPrice: 12,
          lowPrice: 9,
          volume: 150000,
          source: 'ge_scraper'
        })
      ).rejects.toThrow();
    });
  });

  describe('Integration with ItemModel', () => {
    afterEach(async() => {
      // Clean up snapshots after each test in this block
      await MarketPriceSnapshotModel.deleteMany({});
    });

    test('should reference item data correctly', async() => {
      // Ensure testItem exists in the database
      const existingItem = await ItemModel.findOne({ itemId: testItem.itemId });
      if (!existingItem) {
        await ItemModel.create({
          itemId: testItem.itemId,
          name: 'Fire rune',
          examine: 'One of the four basic elemental runes.',
          members: false,
          lowalch: 2,
          highalch: 3,
          tradeable_on_ge: true,
          stackable: true,
          noted: false,
          value: 5,
          weight: 0.007
        });
      }

      const snapshot = await MarketPriceSnapshotModel.create({
        itemId: testItem.itemId,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 6,
        lowPrice: 4,
        volume: 1000000,
        source: 'osrs_wiki_api'
      });

      // Since itemId is a number, we can manually lookup the item
      const item = await ItemModel.findOne({ itemId: snapshot.itemId });

      expect(item).toBeDefined();
      expect(item).not.toBeNull();
      expect(item.name).toBe('Fire rune');
      expect(item.examine).toBe('One of the four basic elemental runes.');
      expect(item.value).toBe(5);
      expect(snapshot.itemId).toBe(testItem.itemId);
    });
  });
});
