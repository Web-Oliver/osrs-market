/**
 * 🎯 Item Mapping Controller - Context7 API Layer
 *
 * Context7 Pattern: Controller Layer for Item Mapping API
 * - SOLID: Single Responsibility - Handle HTTP requests for item mapping
 * - DRY: Reusable response patterns and error handling
 * - Clean separation between HTTP concerns and business logic
 * - Comprehensive input validation and sanitization
 * - RESTful API design with proper status codes
 */

const { ItemMappingService } = require('../services/ItemMappingService');
const { ItemValidator } = require('../validators/ItemValidator');
const { ApiResponse } = require('../utils/ApiResponse');
const { Logger } = require('../utils/Logger');

class ItemMappingController {
  constructor() {
    this.itemMappingService = new ItemMappingService();
    this.itemValidator = new ItemValidator();
    this.logger = new Logger('ItemMappingController');

    // Context7 Pattern: Bind methods to preserve 'this' context
    this.importMappings = this.importMappings.bind(this);
    this.getItem = this.getItem.bind(this);
    this.getItems = this.getItems.bind(this);
    this.searchItems = this.searchItems.bind(this);
    this.getHighValueItems = this.getHighValueItems.bind(this);
    this.getItemsByCategory = this.getItemsByCategory.bind(this);
    this.getSyncStatus = this.getSyncStatus.bind(this);
    this.healthCheck = this.healthCheck.bind(this);
    this.createItem = this.createItem.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);

    // Enhanced domain-driven endpoints
    this.getItemEnhanced = this.getItemEnhanced.bind(this);
    this.getBusinessInsights = this.getBusinessInsights.bind(this);
    this.findByBusinessCriteria = this.findByBusinessCriteria.bind(this);
  }

  /**
   * Context7 Pattern: Import all item mappings (one-time operation)
   * POST /api/items/import
   */
  async importMappings(req, res, next) {
    try {
      this.logger.info('Import mappings request received', {
        ip: req.ip,
        requestId: req.id,
        force: req.body.force
      });

      const options = {
        force: req.body.force === true
      };

      const result = await this.itemMappingService.importAllItemMappings(options);

      this.logger.info('Import mappings completed successfully', {
        result: {
          success: result.success,
          totalItems: result.totalItems,
          imported: result.imported,
          updated: result.updated
        },
        requestId: req.id
      });

      return ApiResponse.success(res, result, result.message);

    } catch (error) {
      this.logger.error('Error importing mappings', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get single item by ID
   * GET /api/items/:itemId
   */
  async getItem(req, res, next) {
    try {
      const itemId = parseInt(req.params.itemId);

      this.logger.debug('Get item request', {
        itemId,
        requestId: req.id
      });

      // Validate itemId
      if (!this.itemValidator.isValidItemId(itemId)) {
        return ApiResponse.badRequest(res, 'Invalid item ID provided');
      }

      const item = await this.itemMappingService.getItemById(itemId);

      if (!item) {
        return ApiResponse.notFound(res, 'Item not found');
      }

      this.logger.debug('Item retrieved successfully', {
        itemId,
        itemName: item.name,
        requestId: req.id
      });

      return ApiResponse.success(res, item, 'Item retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting item', error, {
        itemId: req.params.itemId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get items with pagination and filtering
   * GET /api/items
   */
  async getItems(req, res, next) {
    try {
      this.logger.debug('Get items request', {
        query: req.query,
        requestId: req.id
      });

      // Validate pagination parameters
      const validation = this.itemValidator.validatePaginationParams(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid parameters', validation.errors);
      }

      const result = await this.itemMappingService.getItems(validation.sanitizedParams);

      this.logger.debug('Items retrieved successfully', {
        page: result.pagination.page,
        totalCount: result.pagination.totalCount,
        itemCount: result.items.length,
        requestId: req.id
      });

      return ApiResponse.success(res, result, 'Items retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Search items by name
   * GET /api/items/search
   */
  async searchItems(req, res, next) {
    try {
      this.logger.debug('Search items request', {
        query: req.query,
        requestId: req.id
      });

      // Validate search parameters
      const validation = this.itemValidator.validateSearchParams(req.query);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid search parameters', validation.errors);
      }

      const { searchTerm } = validation.sanitizedParams;
      if (!searchTerm) {
        return ApiResponse.badRequest(res, 'Search term is required');
      }

      const items = await this.itemMappingService.searchItems(
        searchTerm,
        validation.sanitizedParams
      );

      this.logger.debug('Search completed successfully', {
        searchTerm,
        resultCount: items.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        searchTerm,
        items,
        count: items.length
      }, 'Search completed successfully');

    } catch (error) {
      this.logger.error('Error searching items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get high-value items
   * GET /api/items/high-value
   */
  async getHighValueItems(req, res, next) {
    try {
      this.logger.debug('Get high-value items request', {
        query: req.query,
        requestId: req.id
      });

      // Validate and sanitize parameters
      const options = {};

      if (req.query.limit) {
        const limit = parseInt(req.query.limit);
        if (limit < 1 || limit > 100) {
          return ApiResponse.badRequest(res, 'Limit must be between 1 and 100');
        }
        options.limit = limit;
      }

      if (req.query.minValue) {
        const minValue = parseInt(req.query.minValue);
        if (minValue < 0) {
          return ApiResponse.badRequest(res, 'minValue must be non-negative');
        }
        options.minValue = minValue;
      }

      if (req.query.members !== undefined) {
        options.members = this.itemValidator.parseBooleanParam(req.query.members);
      }

      const items = await this.itemMappingService.getHighValueItems(options);

      this.logger.debug('High-value items retrieved successfully', {
        itemCount: items.length,
        minValue: options.minValue,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        items,
        count: items.length,
        criteria: options
      }, 'High-value items retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting high-value items', error, {
        query: req.query,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get items by category
   * GET /api/items/category/:category
   */
  async getItemsByCategory(req, res, next) {
    try {
      const { category } = req.params;

      this.logger.debug('Get items by category request', {
        category,
        query: req.query,
        requestId: req.id
      });

      // Validate category
      const categoryValidation = this.itemValidator.validateCategory(category);
      if (!categoryValidation.isValid) {
        return ApiResponse.badRequest(res, categoryValidation.error);
      }

      // Validate query parameters
      const options = {};

      if (req.query.limit) {
        const limit = parseInt(req.query.limit);
        if (limit < 1 || limit > 100) {
          return ApiResponse.badRequest(res, 'Limit must be between 1 and 100');
        }
        options.limit = limit;
      }

      if (req.query.tradeable !== undefined) {
        options.tradeable = this.itemValidator.parseBooleanParam(req.query.tradeable);
      }

      if (req.query.sort) {
        const sortValidation = this.itemValidator.validateSortParam(req.query.sort);
        if (!sortValidation.isValid) {
          return ApiResponse.badRequest(res, 'Invalid sort parameter', sortValidation.errors);
        }
        options.sort = sortValidation.sanitizedSort;
      }

      const items = await this.itemMappingService.getItemsByCategory(
        categoryValidation.sanitizedCategory,
        options
      );

      this.logger.debug('Items by category retrieved successfully', {
        category,
        itemCount: items.length,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        category,
        items,
        count: items.length
      }, 'Items retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting items by category', error, {
        category: req.params.category,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Get synchronization status
   * GET /api/items/sync/status
   */
  async getSyncStatus(req, res, next) {
    try {
      this.logger.debug('Get sync status request', {
        requestId: req.id
      });

      const status = await this.itemMappingService.getSyncStatus();

      this.logger.debug('Sync status retrieved successfully', {
        totalItems: status.totalItems,
        syncHealth: status.sync.syncHealth,
        requestId: req.id
      });

      return ApiResponse.success(res, status, 'Sync status retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting sync status', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Health check endpoint
   * GET /api/items/health
   */
  // eslint-disable-next-line no-unused-vars
  async healthCheck(req, res, next) {
    try {
      this.logger.debug('Health check request', {
        requestId: req.id
      });

      const health = await this.itemMappingService.healthCheck();

      const statusCode = health.status === 'healthy' ? 200 : 503;

      return res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health,
        message: `Service is ${health.status}`
      });

    } catch (error) {
      this.logger.error('Error in health check', error, {
        requestId: req.id
      });

      return res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        },
        message: 'Service is unhealthy'
      });
    }
  }

  /**
   * Context7 Pattern: Create new item (admin operation)
   * POST /api/items
   */
  async createItem(req, res, next) {
    try {
      this.logger.info('Create item request', {
        body: req.body,
        ip: req.ip,
        requestId: req.id
      });

      // Validate item creation data
      const validation = this.itemValidator.validateItemCreation(req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid item data', validation.errors);
      }

      // Check if item already exists
      const existingItem = await this.itemMappingService.getItemById(validation.sanitizedData.itemId);
      if (existingItem) {
        return ApiResponse.conflict(res, 'Item with this ID already exists');
      }

      const item = await this.itemMappingService.itemRepository.createItem(validation.sanitizedData);

      this.logger.info('Item created successfully', {
        itemId: item.itemId,
        itemName: item.name,
        requestId: req.id
      });

      return ApiResponse.created(res, item, 'Item created successfully');

    } catch (error) {
      this.logger.error('Error creating item', error, {
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Update existing item (admin operation)
   * PUT /api/items/:itemId
   */
  async updateItem(req, res, next) {
    try {
      const itemId = parseInt(req.params.itemId);

      this.logger.info('Update item request', {
        itemId,
        body: req.body,
        ip: req.ip,
        requestId: req.id
      });

      // Validate item update data
      const validation = this.itemValidator.validateItemUpdate(itemId, req.body);
      if (!validation.isValid) {
        return ApiResponse.badRequest(res, 'Invalid update data', validation.errors);
      }

      const updatedItem = await this.itemMappingService.itemRepository.updateItem(
        itemId,
        validation.sanitizedData
      );

      if (!updatedItem) {
        return ApiResponse.notFound(res, 'Item not found');
      }

      this.logger.info('Item updated successfully', {
        itemId,
        itemName: updatedItem.name,
        version: updatedItem.version,
        requestId: req.id
      });

      return ApiResponse.success(res, updatedItem, 'Item updated successfully');

    } catch (error) {
      this.logger.error('Error updating item', error, {
        itemId: req.params.itemId,
        body: req.body,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Context7 Pattern: Delete item (admin operation - soft delete)
   * DELETE /api/items/:itemId
   */
  async deleteItem(req, res, next) {
    try {
      const itemId = parseInt(req.params.itemId);

      this.logger.info('Delete item request', {
        itemId,
        ip: req.ip,
        requestId: req.id
      });

      // Validate itemId
      if (!this.itemValidator.isValidItemId(itemId)) {
        return ApiResponse.badRequest(res, 'Invalid item ID provided');
      }

      const deletedItem = await this.itemMappingService.itemRepository.deleteItem(itemId);

      if (!deletedItem) {
        return ApiResponse.notFound(res, 'Item not found');
      }

      this.logger.info('Item deleted successfully', {
        itemId,
        itemName: deletedItem.name,
        requestId: req.id
      });

      return ApiResponse.success(res, {
        itemId: deletedItem.itemId,
        name: deletedItem.name,
        status: deletedItem.status
      }, 'Item deleted successfully');

    } catch (error) {
      this.logger.error('Error deleting item', error, {
        itemId: req.params.itemId,
        requestId: req.id
      });
      next(error);
    }
  }

  // ==========================================
  // ENHANCED DOMAIN-DRIVEN ENDPOINTS
  // ==========================================

  /**
   * Enhanced get item with business insights
   * GET /api/items/:itemId/enhanced
   */
  async getItemEnhanced(req, res, next) {
    try {
      const itemId = parseInt(req.params.itemId);

      this.logger.debug('Get enhanced item request', {
        itemId,
        requestId: req.id
      });

      // Validate itemId
      if (!this.itemValidator.isValidItemId(itemId)) {
        return ApiResponse.badRequest(res, 'Invalid item ID provided');
      }

      // Use enhanced service method
      const result = await this.itemMappingService.adapter.findByIdEnhanced(itemId);

      if (!result) {
        return ApiResponse.notFound(res, 'Item not found');
      }

      // Return rich domain data with business insights
      const enhancedResponse = {
        ...result.toJSON(),
        businessInsights: {
          category: result.getCategory(),
          alchemyProfit: result.getAlchemyProfit(),
          isProfitableAlchemy: result.isProfitableAlchemy(),
          needsSync: result.needsSync(),
          valueClassification: result.market.value > 100000 ? 'high_value' : 'normal',
          tradingViability: result.market.tradeableOnGE ? 'tradeable' : 'untradeable',
          membershipTier: result.members ? 'members' : 'f2p'
        }
      };

      this.logger.debug('Enhanced item retrieved successfully', {
        itemId,
        category: result.getCategory(),
        alchemyProfit: result.getAlchemyProfit(),
        requestId: req.id
      });

      return ApiResponse.success(res, enhancedResponse, 'Enhanced item data retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting enhanced item', error, {
        itemId: req.params.itemId,
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Get comprehensive business insights
   * GET /api/items/business/insights
   */
  async getBusinessInsights(req, res, next) {
    try {
      this.logger.debug('Get business insights request', {
        requestId: req.id
      });

      const insights = await this.itemMappingService.getItemBusinessInsights();

      this.logger.info('Business insights generated successfully', {
        totalItems: insights.statistics.totalItems,
        categoriesAnalyzed: Object.keys(insights.businessCategories).length,
        requestId: req.id
      });

      return ApiResponse.success(res, insights, 'Business insights retrieved successfully');

    } catch (error) {
      this.logger.error('Error getting business insights', error, {
        requestId: req.id
      });
      next(error);
    }
  }

  /**
   * Find items by business criteria
   * GET /api/items/business/:criteria
   */
  async findByBusinessCriteria(req, res, next) {
    try {
      const { criteria } = req.params;
      const params = req.query;

      this.logger.debug('Find by business criteria request', {
        criteria,
        params,
        requestId: req.id
      });

      // Validate criteria
      const validCriteria = [
        'profitableAlchemy',
        'highValueTradeable',
        'flippingCandidates',
        'freeToPlayTradeable',
        'highEndMembersEquipment',
        'newPlayerFriendly',
        'bulkTradingItems',
        'needsDataRefresh',
        'recentlyUpdatedHighValue'
      ];

      if (!validCriteria.includes(criteria)) {
        return ApiResponse.badRequest(res, `Invalid criteria. Valid options: ${validCriteria.join(', ')}`);
      }

      const result = await this.itemMappingService.findItemsByBusinessCriteria(criteria, params);

      this.logger.debug('Business criteria search completed', {
        criteria,
        itemsFound: result.count,
        matchRate: result.summary.matchRate,
        requestId: req.id
      });

      return ApiResponse.success(res, result, `Items found using ${criteria} criteria`);

    } catch (error) {
      this.logger.error('Error finding items by business criteria', error, {
        criteria: req.params.criteria,
        requestId: req.id
      });
      next(error);
    }
  }
}

module.exports = { ItemMappingController };
