/**
 * 📊 Market Data Routes Tests - Context7 Pattern
 * 
 * Context7 Pattern: API Endpoint Testing
 * - Integration tests for Express routes
 * - Tests for POST /api/market-data/snapshot
 * - Tests for GET /api/market-data/:itemId
 * - Validation and error handling tests
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const marketDataRoutes = require('../../routes/marketDataRoutes');
const { MarketPriceSnapshotModel } = require('../../models/MarketPriceSnapshotModel');
const { ItemModel } = require('../../models/ItemModel');

// Mock middleware dependencies
jest.mock('../../middleware/RequestMiddleware', () => ({
  RequestMiddleware: jest.fn().mockImplementation(() => ({
    performanceMonitoring: () => (req, res, next) => next(),
    requestTracking: () => (req, res, next) => next(),
    validateRequest: () => (req, res, next) => next(),
    rateLimit: () => (req, res, next) => next(),
    requestSizeLimit: () => (req, res, next) => next(),
    cors: () => (req, res, next) => next(),
    securityHeaders: () => (req, res, next) => next(),
    sanitizeRequest: () => (req, res, next) => next(),
    apiVersioning: () => (req, res, next) => next()
  }))
}));

jest.mock('../../middleware/ErrorMiddleware', () => ({
  ErrorMiddleware: jest.fn().mockImplementation(() => ({
    handleAsyncError: (fn) => fn,
    handleError: (err, req, res, next) => {
      res.status(500).json({ success: false, error: err.message });
    },
    handleNotFound: (req, res) => {
      res.status(404).json({ success: false, error: 'Not found' });
    }
  }))
}));

jest.mock('../../controllers/MarketDataController', () => ({
  MarketDataController: jest.fn().mockImplementation(() => ({
    getMarketData: jest.fn(),
    saveMarketData: jest.fn(),
    getMarketDataSummary: jest.fn(),
    getItemPriceHistory: jest.fn(),
    getTopTradedItems: jest.fn(),
    searchItems: jest.fn(),
    getAnalytics: jest.fn(),
    getRecommendations: jest.fn(),
    getCategories: jest.fn(),
    getAlerts: jest.fn(),
    createAlert: jest.fn(),
    deleteAlert: jest.fn(),
    exportData: jest.fn(),
    compareItems: jest.fn(),
    getPortfolioAnalysis: jest.fn(),
    getLiveMarketData: jest.fn(),
    getLatestPrices: jest.fn(),
    validateData: jest.fn()
  }))
}));

jest.mock('../../validators/MarketDataValidator', () => ({
  validateRequest: jest.fn(() => (req, res, next) => next())
}));

describe('Market Data Routes', () => {
  let app;
  let testItem;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/osrs_market_test');
    }

    // Create test Express app
    app = express();
    app.use(express.json());
    app.use('/api/market-data', marketDataRoutes);

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

  beforeEach(async () => {
    // Clean up test data before each test
    await MarketPriceSnapshotModel.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data and close connection
    await MarketPriceSnapshotModel.deleteMany({});
    await ItemModel.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/market-data/snapshot', () => {
    const validSnapshotData = {
      itemId: 4151,
      timestamp: Date.now(),
      interval: 'latest',
      highPrice: 2500000,
      lowPrice: 2450000,
      volume: 100,
      source: 'osrs_wiki_api'
    };

    test('should create a new market snapshot and return 201', async () => {
      const response = await request(app)
        .post('/api/market-data/snapshot')
        .send(validSnapshotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.itemId).toBe(validSnapshotData.itemId);
      expect(response.body.data.interval).toBe(validSnapshotData.interval);
      expect(response.body.data.highPrice).toBe(validSnapshotData.highPrice);
      expect(response.body.data.lowPrice).toBe(validSnapshotData.lowPrice);
      expect(response.body.data.volume).toBe(validSnapshotData.volume);
      expect(response.body.data.source).toBe(validSnapshotData.source);
    });

    test('should update existing snapshot with same key', async () => {
      // Create initial snapshot
      const initialResponse = await request(app)
        .post('/api/market-data/snapshot')
        .send(validSnapshotData)
        .expect(201);

      const initialId = initialResponse.body.data._id;

      // Update with same key but different prices
      const updatedData = {
        ...validSnapshotData,
        highPrice: 2600000,
        lowPrice: 2550000
      };

      const updateResponse = await request(app)
        .post('/api/market-data/snapshot')
        .send(updatedData)
        .expect(201);

      // Should be same document ID (upsert)
      expect(updateResponse.body.data._id).toBe(initialId);
      expect(updateResponse.body.data.highPrice).toBe(2600000);
      expect(updateResponse.body.data.lowPrice).toBe(2550000);
    });

    test('should return 400 for missing required fields', async () => {
      const invalidData = {
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 2500000,
        lowPrice: 2450000,
        volume: 100
        // Missing itemId
      };

      const response = await request(app)
        .post('/api/market-data/snapshot')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should return 400 for invalid interval', async () => {
      const invalidData = {
        ...validSnapshotData,
        interval: 'invalid_interval'
      };

      const response = await request(app)
        .post('/api/market-data/snapshot')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid interval');
    });

    test('should return 400 for invalid price relationship', async () => {
      const invalidData = {
        ...validSnapshotData,
        highPrice: 2400000,
        lowPrice: 2500000  // lowPrice > highPrice
      };

      const response = await request(app)
        .post('/api/market-data/snapshot')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('High price cannot be less than low price');
    });

    test('should return 400 for invalid RSI value', async () => {
      const invalidData = {
        ...validSnapshotData,
        rsi: 150  // RSI should be 0-100
      };

      const response = await request(app)
        .post('/api/market-data/snapshot')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('RSI must be between 0 and 100');
    });

    test('should accept valid advanced calculated metrics', async () => {
      const dataWithMetrics = {
        ...validSnapshotData,
        marginGp: 50000,
        marginPercent: 2.04,
        volatility: 0.15,
        rsi: 65,
        momentumScore: 15,
        riskScore: 25,
        confidence: 0.95
      };

      const response = await request(app)
        .post('/api/market-data/snapshot')
        .send(dataWithMetrics)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.marginGp).toBe(50000);
      expect(response.body.data.rsi).toBe(65);
      expect(response.body.data.confidence).toBe(0.95);
    });
  });

  describe('GET /api/market-data/:itemId', () => {
    beforeEach(async () => {
      // Create test snapshots
      const baseTime = Date.now();
      const testSnapshots = [
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
          timestamp: baseTime,
          interval: 'latest',
          highPrice: 2500000,
          lowPrice: 2450000,
          volume: 100,
          source: 'osrs_wiki_api'
        },
        {
          itemId: 4151,
          timestamp: baseTime,
          interval: '5m',
          highPrice: 2480000,
          lowPrice: 2430000,
          volume: 80,
          source: 'osrs_wiki_api'
        }
      ];

      // Save test snapshots
      for (const snapshot of testSnapshots) {
        await MarketPriceSnapshotModel.create(snapshot);
      }
    });

    test('should return all snapshots for an item', async () => {
      const response = await request(app)
        .get('/api/market-data/4151')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      expect(response.body.count).toBe(4);
      expect(response.body.data[0].itemId).toBe(4151);
    });

    test('should filter by interval', async () => {
      const response = await request(app)
        .get('/api/market-data/4151')
        .query({ interval: 'latest' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data.every(snap => snap.interval === 'latest')).toBe(true);
    });

    test('should filter by date range', async () => {
      const baseTime = Date.now();
      const startDate = baseTime - 2400000; // 40 minutes ago
      const endDate = baseTime + 1000;      // 1 second from now

      const response = await request(app)
        .get('/api/market-data/4151')
        .query({ startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every(snap => 
        snap.timestamp >= startDate && snap.timestamp <= endDate
      )).toBe(true);
    });

    test('should filter by interval and date range', async () => {
      const baseTime = Date.now();
      const startDate = baseTime - 2400000;
      const endDate = baseTime + 1000;

      const response = await request(app)
        .get('/api/market-data/4151')
        .query({ interval: 'latest', startDate, endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(snap => 
        snap.interval === 'latest' &&
        snap.timestamp >= startDate && 
        snap.timestamp <= endDate
      )).toBe(true);
    });

    test('should return 404 for non-existent item', async () => {
      const response = await request(app)
        .get('/api/market-data/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No market snapshots found');
    });

    test('should return 400 for invalid itemId', async () => {
      const response = await request(app)
        .get('/api/market-data/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('itemId must be a valid number');
    });

    test('should handle startDate only', async () => {
      const baseTime = Date.now();
      const startDate = baseTime - 1800000; // 30 minutes ago

      const response = await request(app)
        .get('/api/market-data/4151')
        .query({ startDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(snap => 
        snap.timestamp >= startDate
      )).toBe(true);
    });

    test('should handle endDate only', async () => {
      const baseTime = Date.now();
      const endDate = baseTime - 1800000; // 30 minutes ago

      const response = await request(app)
        .get('/api/market-data/4151')
        .query({ endDate })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.every(snap => 
        snap.timestamp <= endDate
      )).toBe(true);
    });

    test('should return snapshots sorted by timestamp (newest first)', async () => {
      const response = await request(app)
        .get('/api/market-data/4151')
        .expect(200);

      expect(response.body.success).toBe(true);
      const timestamps = response.body.data.map(snap => snap.timestamp);
      
      // Check if timestamps are sorted in descending order
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  describe('Integration Tests', () => {
    test('should work with real database operations', async () => {
      const snapshotData = {
        itemId: 4151,
        timestamp: Date.now(),
        interval: 'latest',
        highPrice: 2500000,
        lowPrice: 2450000,
        volume: 100,
        source: 'osrs_wiki_api'
      };

      // Create snapshot
      const createResponse = await request(app)
        .post('/api/market-data/snapshot')
        .send(snapshotData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);

      // Retrieve snapshot
      const getResponse = await request(app)
        .get(`/api/market-data/${snapshotData.itemId}`)
        .expect(200);

      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data).toHaveLength(1);
      expect(getResponse.body.data[0].itemId).toBe(snapshotData.itemId);
    });
  });
});