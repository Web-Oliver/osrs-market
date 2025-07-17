/**
 * 📋 WatchlistController - Context7 Optimized
 * 
 * Context7 Pattern: Clean Architecture Controller
 * - Handles HTTP requests for watchlist operations
 * - Implements proper error handling and validation
 * - Follows Single Responsibility Principle
 * - Provides consistent API responses
 */

const WatchlistModel = require('../models/WatchlistModel');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class WatchlistController {
  constructor() {
    this.logger = new Logger('WatchlistController');
  }

  /**
   * Context7 Pattern: Get user watchlist
   * GET /api/watchlist?userId=<userId>
   */
  async getUserWatchlist(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return ApiResponse.error(res, 'User ID is required', 'MISSING_USER_ID', 400);
      }

      const watchlist = await WatchlistModel.findByUserId(userId);

      this.logger.info(`Retrieved watchlist for user ${userId}, ${watchlist.length} items`);

      return ApiResponse.success(res, watchlist, 'Watchlist retrieved successfully');
    } catch (error) {
      this.logger.error('Error retrieving watchlist:', error);
      return ApiResponse.error(res, 'Failed to retrieve watchlist', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Add item to watchlist
   * POST /api/watchlist
   */
  async addItemToWatchlist(req, res) {
    try {
      const { userId, itemId, itemName, addedDate, currentPrice, currentMargin } = req.body;

      // Validate required fields
      if (!userId || !itemId || !itemName) {
        return ApiResponse.error(res, 'User ID, Item ID, and Item Name are required', 'MISSING_REQUIRED_FIELDS', 400);
      }

      // Check if item already exists in watchlist
      const existingItem = await WatchlistModel.findByUserIdAndItemId(userId, itemId);
      if (existingItem) {
        return ApiResponse.error(res, 'Item already exists in watchlist', 'ITEM_ALREADY_EXISTS', 409);
      }

      // Create new watchlist item
      const watchlistItem = await WatchlistModel.addItem(userId, itemId, itemName, {
        addedDate: addedDate ? new Date(addedDate) : new Date(),
        currentPrice,
        currentMargin
      });

      this.logger.info(`Added item ${itemName} (ID: ${itemId}) to watchlist for user ${userId}`);

      return ApiResponse.success(res, watchlistItem, 'Item added to watchlist successfully');
    } catch (error) {
      this.logger.error('Error adding item to watchlist:', error);
      
      // Handle duplicate key error
      if (error.code === 11000) {
        return ApiResponse.error(res, 'Item already exists in watchlist', 'ITEM_ALREADY_EXISTS', 409);
      }
      
      return ApiResponse.error(res, 'Failed to add item to watchlist', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Remove item from watchlist
   * DELETE /api/watchlist/:itemId?userId=<userId>
   */
  async removeItemFromWatchlist(req, res) {
    try {
      const { itemId } = req.params;
      const { userId } = req.query;

      if (!userId || !itemId) {
        return ApiResponse.error(res, 'User ID and Item ID are required', 'MISSING_REQUIRED_FIELDS', 400);
      }

      // Check if item exists in watchlist
      const existingItem = await WatchlistModel.findByUserIdAndItemId(userId, parseInt(itemId));
      if (!existingItem) {
        return ApiResponse.error(res, 'Item not found in watchlist', 'ITEM_NOT_FOUND', 404);
      }

      // Remove item from watchlist (soft delete)
      const removedItem = await WatchlistModel.removeByUserIdAndItemId(userId, parseInt(itemId));

      this.logger.info(`Removed item ${itemId} from watchlist for user ${userId}`);

      return ApiResponse.success(res, removedItem, 'Item removed from watchlist successfully');
    } catch (error) {
      this.logger.error('Error removing item from watchlist:', error);
      return ApiResponse.error(res, 'Failed to remove item from watchlist', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Update watchlist item
   * PUT /api/watchlist/:itemId
   */
  async updateWatchlistItem(req, res) {
    try {
      const { itemId } = req.params;
      const { userId, currentPrice, currentMargin, notes } = req.body;

      if (!userId || !itemId) {
        return ApiResponse.error(res, 'User ID and Item ID are required', 'MISSING_REQUIRED_FIELDS', 400);
      }

      // Find the watchlist item
      const watchlistItem = await WatchlistModel.findByUserIdAndItemId(userId, parseInt(itemId));
      if (!watchlistItem) {
        return ApiResponse.error(res, 'Item not found in watchlist', 'ITEM_NOT_FOUND', 404);
      }

      // Update the item
      if (currentPrice !== undefined) watchlistItem.currentPrice = currentPrice;
      if (currentMargin !== undefined) watchlistItem.currentMargin = currentMargin;
      if (notes !== undefined) watchlistItem.notes = notes;

      const updatedItem = await watchlistItem.save();

      this.logger.info(`Updated watchlist item ${itemId} for user ${userId}`);

      return ApiResponse.success(res, updatedItem, 'Watchlist item updated successfully');
    } catch (error) {
      this.logger.error('Error updating watchlist item:', error);
      return ApiResponse.error(res, 'Failed to update watchlist item', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Get watchlist statistics
   * GET /api/watchlist/stats?userId=<userId>
   */
  async getWatchlistStats(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return ApiResponse.error(res, 'User ID is required', 'MISSING_USER_ID', 400);
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

      this.logger.info(`Retrieved watchlist stats for user ${userId}: ${totalItems} items`);

      return ApiResponse.success(res, stats, 'Watchlist statistics retrieved successfully');
    } catch (error) {
      this.logger.error('Error retrieving watchlist stats:', error);
      return ApiResponse.error(res, 'Failed to retrieve watchlist statistics', error.message, 500);
    }
  }

  /**
   * Context7 Pattern: Health check
   * GET /api/watchlist/health
   */
  async healthCheck(req, res) {
    try {
      // Test database connection
      const testCount = await WatchlistModel.countDocuments();
      
      const health = {
        service: 'WatchlistController',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        totalWatchlistItems: testCount,
        database: 'connected'
      };

      return ApiResponse.success(res, health, 'Watchlist service is healthy');
    } catch (error) {
      this.logger.error('Watchlist health check failed:', error);
      return ApiResponse.error(res, 'Watchlist service is unhealthy', error.message, 500);
    }
  }
}

module.exports = WatchlistController;