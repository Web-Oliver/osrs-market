/**
 * 🎯 Item Mapping Controller - Context7 Optimized with BaseController
 *
 * Context7 Pattern: Controller Layer for Item Mapping Operations
 * - Extends BaseController for DRY principles
 * - Eliminates repetitive error handling and method binding
 * - SOLID principles with single responsibility
 * - Standardized endpoint creation and validation
 */

const { BaseController } = require('./BaseController');
const { ItemMappingService } = require('../services/ItemMappingService');
const { ItemValidator } = require('../validators/ItemValidator');
const { ErrorHandler } = require('../middleware/ErrorHandler');
const { ApiResponse } = require('../utils/ApiResponse');


class ItemMappingController extends BaseController {
  constructor(dependencies = {}) {
    super('ItemMappingController');
    
    // SOLID: Dependency Injection (DIP) - Eliminates direct dependency violation
    this.itemMappingService = dependencies.itemMappingService || new ItemMappingService();
    this.itemValidator = new ItemValidator();
    
    // Initialize endpoints after service is set
    this.initializeEndpoints();
  }

  initializeEndpoints() {

    // All endpoints that require the service to be initialized
    this.importMappings = this.createPostEndpoint(
    async(importData) => {
      const { force } = importData;
      const options = { force };
      return await this.itemMappingService.importAllItemMappings(options);
    },
    {
      operationName: 'import item mappings',
      parseBody: (req) => ({ force: req.body.force === true })
    }
  );

    this.getItem = this.createGetEndpoint(
    async(params) => {
      const { itemId } = params;

      if (!this.itemValidator.isValidItemId(itemId)) {
        // DRY: Use ErrorHandler for consistent error creation
        throw ErrorHandler.createValidationError('Invalid item ID provided', { itemId });
      }

      const item = await this.itemMappingService.getItemById(itemId);

      // DRY: Use BaseController validation utility
      this.validateService(item, 'Item', itemId);

      return item;
    },
    {
      operationName: 'get item by ID',
      parseParams: (req) => ({ itemId: parseInt(req.params.itemId) })
    }
  );

    this.getItems = this.createPaginatedEndpoint(
    async(params) => {
      return await this.itemMappingService.getItems(params);
    },
    {
      operationName: 'get items with pagination',
      validator: (req) => this.itemValidator.validatePaginationParams(req.query),
      parseParams: (req) => {
        const validation = this.itemValidator.validatePaginationParams(req.query);
        return validation.sanitizedParams;
      }
    }
  );

    this.searchItems = this.createGetEndpoint(
    async(params) => {
      const { searchTerm, sanitizedParams } = params;

      // DRY: Use BaseController validation utility
      this.validateRequiredParams({ searchTerm }, ['searchTerm']);

      const items = await this.itemMappingService.searchItems(searchTerm, sanitizedParams);

      return {
        searchTerm,
        items,
        count: items.length
      };
    },
    {
      operationName: 'search items by name',
      validator: (req) => this.itemValidator.validateSearchParams(req.query),
      parseParams: (req) => {
        const validation = this.itemValidator.validateSearchParams(req.query);
        return {
          searchTerm: validation.sanitizedParams.searchTerm,
          sanitizedParams: validation.sanitizedParams
        };
      }
    }
  );

    this.getHighValueItems = this.createGetEndpoint(
    async(options) => {
      const items = await this.itemMappingService.getHighValueItems(options);
      return {
        items,
        count: items.length,
        criteria: options
      };
    },
    {
      operationName: 'get high-value items',
      parseParams: (req) => {
        const options = {};

        if (req.query.limit) {
          // DRY: Use BaseController validation utility for pagination
          const paginationParams = this.validatePagination({ limit: req.query.limit }, 20, 100);
          options.limit = paginationParams.limit;
        }

        if (req.query.minValue) {
          const minValue = parseInt(req.query.minValue);
          if (minValue < 0) {
            throw new Error('minValue must be non-negative');
          }
          options.minValue = minValue;
        }

        if (req.query.members !== undefined) {
          options.members = this.itemValidator.parseBooleanParam(req.query.members);
        }

        return options;
      }
    }
  );

    this.getSyncStatus = this.createGetEndpoint(
      this.itemMappingService.getSyncStatus,
      { operationName: 'get synchronization status' }
    );

    this.healthCheck = this.createGetEndpoint(
      this.itemMappingService.healthCheck,
      { operationName: 'health check' }
    );
  }

  // ========================================
  // REGULAR ASYNC METHODS (NOT ENDPOINTS)
  // ========================================

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
        try {
          // DRY: Use BaseController validation utility for pagination
          const paginationParams = this.validatePagination({ limit: req.query.limit }, 20, 100);
          options.limit = paginationParams.limit;
        } catch (error) {
          return ApiResponse.badRequest(res, error.message);
        }
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
      // Error handling moved to centralized manager - context: Error getting items by category
      next(error);
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
      // Error handling moved to centralized manager - context: Error creating item
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
      // Error handling moved to centralized manager - context: Error updating item
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
      // Error handling moved to centralized manager - context: Error deleting item
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
      // Error handling moved to centralized manager - context: Error getting enhanced item
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
      // Error handling moved to centralized manager - context: Error getting business insights
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
      // Error handling moved to centralized manager - context: Error finding items by business criteria
      next(error);
    }
  }
}

module.exports = { ItemMappingController };
