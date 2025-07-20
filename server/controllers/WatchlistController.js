/**
 * 📋 WatchlistController - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for Watchlist Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const WatchlistModel = require('../models/WatchlistModel');

class WatchlistController extends BaseController {
  constructor() {
    super('WatchlistController');
  }

  /**
   * Context7 Pattern: Get user watchlist
   * GET /api/watchlist?userId=<userId>
   */
  getUserWatchlist = this.createGetEndpoint(
    async (params) => {
      const { userId } = params;
      
      if (!userId) {
        const error = new Error('User ID is required');
        error.statusCode = 400;
        throw error;
      }

      const watchlist = await WatchlistModel.findByUserId(userId);

      return watchlist;
    },
    {
      operationName: 'get user watchlist',
      parseParams: (req) => ({ userId: req.query.userId })
    }
  );

  /**
   * Context7 Pattern: Add item to watchlist
   * POST /api/watchlist
   */
  addItemToWatchlist = this.createPostEndpoint(
    async (itemData) => {
      const { userId, itemId, itemName, addedDate, currentPrice, currentMargin } = itemData;

      // Check if item already exists in watchlist
      const existingItem = await WatchlistModel.findByUserIdAndItemId(userId, itemId);
      if (existingItem) {
        const error = new Error('Item already exists in watchlist');
        error.statusCode = 409;
        throw error;
      }

      // Create new watchlist item
      const watchlistItem = await WatchlistModel.addItem(userId, itemId, itemName, {
        addedDate: addedDate ? new Date(addedDate) : new Date(),
        currentPrice,
        currentMargin
      });

      return watchlistItem;
    },
    {
      operationName: 'add item to watchlist',
      parseBody: (req) => {
        const { userId, itemId, itemName, addedDate, currentPrice, currentMargin } = req.body;
        
        if (!userId || !itemId || !itemName) {
          throw new Error('User ID, Item ID, and Item Name are required');
        }
        
        return {
          userId,
          itemId: parseInt(itemId),
          itemName,
          addedDate,
          currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
          currentMargin: currentMargin ? parseFloat(currentMargin) : undefined
        };
      }
    }
  );

  /**
   * Context7 Pattern: Remove item from watchlist
   * DELETE /api/watchlist/:itemId?userId=<userId>
   */
  removeItemFromWatchlist = this.createDeleteEndpoint(
    async (removeData) => {
      const { userId, itemId } = removeData;

      // Check if item exists in watchlist
      const existingItem = await WatchlistModel.findByUserIdAndItemId(userId, itemId);
      if (!existingItem) {
        const error = new Error('Item not found in watchlist');
        error.statusCode = 404;
        throw error;
      }

      // Remove item from watchlist (soft delete)
      const removedItem = await WatchlistModel.removeByUserIdAndItemId(userId, itemId);

      return removedItem;
    },
    {
      operationName: 'remove item from watchlist',
      parseParams: (req) => {
        const { itemId } = req.params;
        const { userId } = req.query;
        
        if (!userId || !itemId) {
          throw new Error('User ID and Item ID are required');
        }
        
        return {
          userId,
          itemId: parseInt(itemId)
        };
      }
    }
  );

  /**
   * Context7 Pattern: Update watchlist item
   * PUT /api/watchlist/:itemId
   */
  updateWatchlistItem = this.createPostEndpoint(
    async (updateData) => {
      const { userId, itemId, currentPrice, currentMargin, notes } = updateData;

      // Find the watchlist item
      const watchlistItem = await WatchlistModel.findByUserIdAndItemId(userId, itemId);
      if (!watchlistItem) {
        const error = new Error('Item not found in watchlist');
        error.statusCode = 404;
        throw error;
      }

      // Update the item
      if (currentPrice !== undefined) {
        watchlistItem.currentPrice = currentPrice;
      }
      if (currentMargin !== undefined) {
        watchlistItem.currentMargin = currentMargin;
      }
      if (notes !== undefined) {
        watchlistItem.notes = notes;
      }

      const updatedItem = await watchlistItem.save();

      return updatedItem;
    },
    {
      operationName: 'update watchlist item',
      parseBody: (req) => {
        const { itemId } = req.params;
        const { userId, currentPrice, currentMargin, notes } = req.body;
        
        if (!userId || !itemId) {
          throw new Error('User ID and Item ID are required');
        }
        
        return {
          userId,
          itemId: parseInt(itemId),
          currentPrice: currentPrice !== undefined ? parseFloat(currentPrice) : undefined,
          currentMargin: currentMargin !== undefined ? parseFloat(currentMargin) : undefined,
          notes
        };
      }
    }
  );

  /**
   * Context7 Pattern: Get watchlist statistics
   * GET /api/watchlist/stats?userId=<userId>
   */
  getWatchlistStats = this.createGetEndpoint(
    async (params) => {
      const { userId } = params;

      if (!userId) {
        const error = new Error('User ID is required');
        error.statusCode = 400;
        throw error;
      }

      const totalItems = await WatchlistModel.countByUserId(userId);
      const watchlist = await WatchlistModel.findByUserId(userId);

      // Calculate statistics
      const stats = {
        totalItems,
        itemsWithPrice: watchlist.filter(item => item.currentPrice > 0).length,
        itemsWithMargin: watchlist.filter(item => item.currentMargin !== undefined).length,
        averagePrice: watchlist.reduce((sum, item) => sum + (item.currentPrice || 0), 0) / totalItems || 0,
        averageMargin: watchlist.reduce((sum, item) => sum + (item.currentMargin || 0), 0) / totalItems || 0,
        oldestItem: watchlist.length > 0 ? watchlist[watchlist.length - 1] : null,
        newestItem: watchlist.length > 0 ? watchlist[0] : null
      };

      return stats;
    },
    {
      operationName: 'get watchlist statistics',
      parseParams: (req) => ({ userId: req.query.userId })
    }
  );

  /**
   * Context7 Pattern: Health check
   * GET /api/watchlist/health
   */
  healthCheck = this.createGetEndpoint(
    async () => {
      // Test database connection
      const testCount = await WatchlistModel.countDocuments();

      const health = {
        service: 'WatchlistController',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        totalWatchlistItems: testCount,
        database: 'connected'
      };

      return health;
    },
    { operationName: 'watchlist health check' }
  );
}

module.exports = { WatchlistController };
