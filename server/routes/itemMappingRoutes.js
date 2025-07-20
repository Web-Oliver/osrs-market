/**
 * 🛣️ Item Mapping Routes - Context7 Express Router
 *
 * Context7 Pattern: Express Router with RESTful Design
 * - SOLID: Single Responsibility - Item mapping HTTP routing
 * - DRY: Reusable middleware patterns and route handlers
 * - RESTful API design with proper HTTP methods and status codes
 * - Comprehensive middleware integration (validation, rate limiting, etc.)
 * - Security through input validation and rate limiting
 */

const express = require('express');
const { getControllerFactory } = require('../factories/ControllerFactory');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { ErrorMiddleware } = require('../middleware/ErrorMiddleware');

const router = express.Router();

// Context7 Pattern: Use ControllerFactory for proper dependency injection
const controllerFactory = getControllerFactory();
const itemMappingController = controllerFactory.createItemMappingController();
const requestMiddleware = new RequestMiddleware();
const errorMiddleware = new ErrorMiddleware();

// Context7 Pattern: Apply middleware to all routes
router.use(requestMiddleware.performanceMonitoring());
router.use(requestMiddleware.requestTracking());

/**
 * Context7 Pattern: POST /api/items/import
 * One-time import of all item mappings from OSRS Wiki API
 */
router.post(
  '/import',
  requestMiddleware.validateRequest({
    body: {
      force: { type: 'boolean', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.importMappings)
);

/**
 * Context7 Pattern: GET /api/items/health
 * Health check endpoint for monitoring
 */
router.get(
  '/health',
  errorMiddleware.handleAsyncError(itemMappingController.healthCheck)
);

/**
 * Context7 Pattern: GET /api/items/sync/status
 * Get synchronization status and statistics
 */
router.get(
  '/sync/status',
  errorMiddleware.handleAsyncError(itemMappingController.getSyncStatus)
);

/**
 * Context7 Pattern: GET /api/items/search
 * Search items by name with text search
 */
router.get(
  '/search',
  requestMiddleware.validateRequest({
    query: {
      searchTerm: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      limit: { type: 'string', optional: true },
      members: { type: 'boolean', optional: true },
      tradeable: { type: 'boolean', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.searchItems)
);

/**
 * Context7 Pattern: GET /api/items/high-value
 * Get high-value items for trading analysis
 */
router.get(
  '/high-value',
  requestMiddleware.validateRequest({
    query: {
      limit: { type: 'string', optional: true },
      minValue: { type: 'string', optional: true },
      members: { type: 'boolean', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.getHighValueItems)
);

/**
 * Context7 Pattern: GET /api/items/category/:category
 * Get items by category classification
 */
router.get(
  '/category/:category',
  requestMiddleware.validateRequest({
    params: {
      category: {
        type: 'string',
        required: true,
        enum: ['runes', 'potions', 'food', 'smithing', 'woodcutting', 'farming', 'high_value', 'members', 'free', 'general']
      }
    },
    query: {
      limit: { type: 'string', optional: true },
      tradeable: { type: 'boolean', optional: true },
      sort: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.getItemsByCategory)
);

/**
 * Context7 Pattern: GET /api/items
 * Get items with pagination, filtering, and sorting
 */
router.get(
  '/',
  requestMiddleware.validateRequest({
    query: {
      page: { type: 'string', optional: true },
      limit: { type: 'string', optional: true },
      members: { type: 'boolean', optional: true },
      tradeable: { type: 'boolean', optional: true },
      minValue: { type: 'string', optional: true },
      maxValue: { type: 'string', optional: true },
      sort: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.getItems)
);

// ==========================================
// ENHANCED DOMAIN-DRIVEN ROUTES
// ==========================================

/**
 * Enhanced: GET /api/items/business/insights
 * Get comprehensive business insights about items
 */
router.get(
  '/business/insights',
  errorMiddleware.handleAsyncError(itemMappingController.getBusinessInsights)
);

/**
 * Enhanced: GET /api/items/business/:criteria
 * Find items by business criteria using specifications
 */
router.get(
  '/business/:criteria',
  requestMiddleware.validateRequest({
    params: {
      criteria: {
        type: 'string',
        required: true,
        enum: [
          'profitableAlchemy',
          'highValueTradeable',
          'flippingCandidates',
          'freeToPlayTradeable',
          'highEndMembersEquipment',
          'newPlayerFriendly',
          'bulkTradingItems',
          'needsDataRefresh',
          'recentlyUpdatedHighValue'
        ]
      }
    },
    query: {
      valueThreshold: { type: 'string', optional: true },
      minimumProfit: { type: 'string', optional: true },
      maxAge: { type: 'string', optional: true },
      maxValue: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.findByBusinessCriteria)
);

/**
 * Enhanced: GET /api/items/:itemId/enhanced
 * Get single item by ID with business insights
 */
router.get(
  '/:itemId/enhanced',
  requestMiddleware.validateRequest({
    params: {
      itemId: { type: 'string', required: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.getItemEnhanced)
);

/**
 * Context7 Pattern: GET /api/items/:itemId/ge-limits
 * Get Grand Exchange buy limits for a specific item
 */
router.get(
  '/:itemId/ge-limits',
  requestMiddleware.validateRequest({
    params: {
      itemId: { type: 'string', required: true }
    }
  }),
  async(req, res) => {
    try {
      const itemId = parseInt(req.params.itemId);
      const { ItemMappingService } = require('../services/ItemMappingService');
      const itemMappingService = new ItemMappingService();

      const item = await itemMappingService.getItemById(itemId);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found',
          timestamp: Date.now()
        });
      }

      const geLimits = {
        itemId: itemId,
        buyLimit: item.buy_limit || null,
        tradeableOnGE: item.tradeable_on_ge || false,
        members: item.members || false,
        stackable: item.stackable || false
      };

      res.status(200).json({
        success: true,
        data: geLimits,
        timestamp: Date.now()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: Date.now()
      });
    }
  }
);

/**
 * Context7 Pattern: GET /api/items/:itemId
 * Get single item by ID
 */
router.get(
  '/:itemId',
  requestMiddleware.validateRequest({
    params: {
      itemId: { type: 'string', required: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.getItem)
);

/**
 * Context7 Pattern: POST /api/items
 * Create new item (admin operation)
 */
router.post(
  '/',
  requestMiddleware.requestSizeLimit({ limit: '1mb' }),
  requestMiddleware.validateRequest({
    body: {
      itemId: { type: 'number', required: true, min: 1 },
      name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
      examine: { type: 'string', optional: true, maxLength: 500 },
      members: { type: 'boolean', optional: true },
      lowalch: { type: 'number', min: 0, optional: true },
      highalch: { type: 'number', min: 0, optional: true },
      tradeable_on_ge: { type: 'boolean', optional: true },
      stackable: { type: 'boolean', optional: true },
      noted: { type: 'boolean', optional: true },
      value: { type: 'number', min: 0, optional: true },
      buy_limit: { type: 'number', min: 1, optional: true },
      weight: { type: 'number', min: 0, optional: true },
      icon: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.createItem)
);

/**
 * Context7 Pattern: PUT /api/items/:itemId
 * Update existing item (admin operation)
 */
router.put(
  '/:itemId',
  requestMiddleware.requestSizeLimit({ limit: '1mb' }),
  requestMiddleware.validateRequest({
    params: {
      itemId: { type: 'number', required: true, min: 1 }
    },
    body: {
      name: { type: 'string', optional: true, minLength: 1, maxLength: 200 },
      examine: { type: 'string', optional: true, maxLength: 500 },
      members: { type: 'boolean', optional: true },
      lowalch: { type: 'number', min: 0, optional: true },
      highalch: { type: 'number', min: 0, optional: true },
      tradeable_on_ge: { type: 'boolean', optional: true },
      stackable: { type: 'boolean', optional: true },
      noted: { type: 'boolean', optional: true },
      value: { type: 'number', min: 0, optional: true },
      buy_limit: { type: 'number', min: 1, optional: true },
      weight: { type: 'number', min: 0, optional: true },
      icon: { type: 'string', optional: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.updateItem)
);

/**
 * Context7 Pattern: DELETE /api/items/:itemId
 * Delete item (admin operation - soft delete)
 */
router.delete(
  '/:itemId',
  requestMiddleware.validateRequest({
    params: {
      itemId: { type: 'string', required: true }
    }
  }),
  errorMiddleware.handleAsyncError(itemMappingController.deleteItem)
);

/**
 * Context7 Pattern: Error handling middleware
 */
router.use(errorMiddleware.handleError);

/**
 * Context7 Pattern: 404 handler for item mapping routes
 */
router.use(errorMiddleware.handleNotFound);

module.exports = router;
