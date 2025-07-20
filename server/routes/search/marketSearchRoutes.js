/**
 * 🔍 Market Search Routes - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Route Module
 * - SOLID: Single Responsibility Principle (SRP) - ONLY search and discovery operations
 * - DRY: Reusable search validation and caching patterns
 * - Clean separation of concerns for search functionality
 * - Focused responsibility: Item search, filtering, and discovery
 */

const express = require('express');
const { getControllerFactory } = require('../../factories/ControllerFactory');
const { ValidationMiddleware } = require('../../middleware/ValidationMiddleware');
const { ErrorHandler } = require('../../middleware/ErrorHandler');
const { AppConstants } = require('../../config/AppConstants');

const router = express.Router();

// Context7 Pattern: Use ControllerFactory for proper dependency injection
const controllerFactory = getControllerFactory();
const marketDataController = controllerFactory.createMarketDataController();
const validationMiddleware = new ValidationMiddleware();
const errorHandler = new ErrorHandler();

// Context7 Pattern: Apply search-specific middleware
router.use(validationMiddleware.requestTracking());
router.use(validationMiddleware.performanceMonitoring());

// Context7 Pattern: Search-specific rate limiting (higher limit for search)
router.use(validationMiddleware.rateLimit({
  windowMs: AppConstants.RATE_LIMITING.WINDOW_MS,
  maxRequests: AppConstants.RATE_LIMITING.SEARCH_REQUESTS,
  message: 'Search rate limit exceeded'
}));

/**
 * Context7 Pattern: GET /api/market-data/search
 * General item search with multiple criteria
 * SOLID: Single responsibility - multi-criteria search
 */
router.get(
  '/',
  validationMiddleware.validate({
    query: {
      q: { type: 'string', required: true, minLength: 2, maxLength: 100 },
      limit: { type: 'string', optional: true, max: 100 },
      onlyTradeable: { type: 'string', optional: true },
      sortBy: { type: 'string', optional: true, enum: ['relevance', 'name', 'price', 'volume'] },
      category: { type: 'string', optional: true },
      minPrice: { type: 'string', optional: true },
      maxPrice: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(marketDataController.searchItems)
);

/**
 * Context7 Pattern: GET /api/market-data/search/advanced
 * Advanced search with complex filtering
 * SOLID: Single responsibility - advanced search functionality
 */
router.get(
  '/advanced',
  validationMiddleware.validate({
    query: {
      name: { type: 'string', optional: true },
      description: { type: 'string', optional: true },
      category: { type: 'string', optional: true },
      minPrice: { type: 'string', optional: true },
      maxPrice: { type: 'string', optional: true },
      minVolume: { type: 'string', optional: true },
      maxVolume: { type: 'string', optional: true },
      minMargin: { type: 'string', optional: true },
      maxMargin: { type: 'string', optional: true },
      tradeable: { type: 'string', optional: true },
      members: { type: 'string', optional: true },
      limit: { type: 'string', optional: true, max: 200 },
      sortBy: { type: 'string', optional: true, enum: ['name', 'price', 'volume', 'margin', 'updated'] },
      sortOrder: { type: 'string', optional: true, enum: ['asc', 'desc'] }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const searchCriteria = {
      filters: {},
      sorting: {
        sortBy: req.query.sortBy || 'relevance',
        sortOrder: req.query.sortOrder || 'desc'
      },
      pagination: {
        limit: Math.min(parseInt(req.query.limit) || 50, 200)
      }
    };

    // Build dynamic filters
    if (req.query.name) searchCriteria.filters.name = { $regex: req.query.name, $options: 'i' };
    if (req.query.description) searchCriteria.filters.description = { $regex: req.query.description, $options: 'i' };
    if (req.query.category) searchCriteria.filters.category = req.query.category;
    if (req.query.tradeable) searchCriteria.filters.tradeable = req.query.tradeable === 'true';
    if (req.query.members) searchCriteria.filters.members = req.query.members === 'true';

    // Price range filters
    if (req.query.minPrice || req.query.maxPrice) {
      searchCriteria.filters.currentPrice = {};
      if (req.query.minPrice) searchCriteria.filters.currentPrice.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) searchCriteria.filters.currentPrice.$lte = parseInt(req.query.maxPrice);
    }

    // Volume range filters
    if (req.query.minVolume || req.query.maxVolume) {
      searchCriteria.filters.volume = {};
      if (req.query.minVolume) searchCriteria.filters.volume.$gte = parseInt(req.query.minVolume);
      if (req.query.maxVolume) searchCriteria.filters.volume.$lte = parseInt(req.query.maxVolume);
    }

    // Margin range filters
    if (req.query.minMargin || req.query.maxMargin) {
      searchCriteria.filters.profitMargin = {};
      if (req.query.minMargin) searchCriteria.filters.profitMargin.$gte = parseFloat(req.query.minMargin);
      if (req.query.maxMargin) searchCriteria.filters.profitMargin.$lte = parseFloat(req.query.maxMargin);
    }

    // Execute search (would integrate with actual search service)
    const searchResults = {
      results: [], // Placeholder
      totalCount: 0,
      searchCriteria,
      executionTime: Date.now(),
      suggestions: []
    };

    res.json({
      success: true,
      data: searchResults,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/search/suggestions
 * Get search suggestions and autocomplete
 * SOLID: Single responsibility - search suggestions
 */
router.get(
  '/suggestions',
  validationMiddleware.validate({
    query: {
      q: { type: 'string', required: true, minLength: 1, maxLength: 50 },
      limit: { type: 'string', optional: true, max: 20 },
      type: { type: 'string', optional: true, enum: ['items', 'categories', 'both'] }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const query = req.query.q.toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const type = req.query.type || 'both';

    // Generate suggestions (would integrate with actual search index)
    const suggestions = {
      items: type === 'categories' ? [] : [
        // Placeholder item suggestions
      ],
      categories: type === 'items' ? [] : [
        // Placeholder category suggestions
      ],
      totalSuggestions: 0,
      query,
      responseTime: Date.now()
    };

    res.json({
      success: true,
      data: suggestions,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/search/filters
 * Get available search filters and their options
 * SOLID: Single responsibility - filter metadata
 */
router.get(
  '/filters',
  errorHandler.asyncHandler(async (req, res) => {
    const availableFilters = {
      categories: [
        'weapons', 'armour', 'runes', 'food', 'potions', 'crafting', 
        'raw_materials', 'jewelry', 'miscellaneous'
      ],
      priceRanges: [
        { label: 'Under 1K', min: 0, max: 1000 },
        { label: '1K - 10K', min: 1000, max: 10000 },
        { label: '10K - 100K', min: 10000, max: 100000 },
        { label: '100K - 1M', min: 100000, max: 1000000 },
        { label: 'Over 1M', min: 1000000, max: null }
      ],
      volumeRanges: [
        { label: 'Low Volume', min: 0, max: 100 },
        { label: 'Medium Volume', min: 100, max: 1000 },
        { label: 'High Volume', min: 1000, max: null }
      ],
      marginRanges: [
        { label: 'Low Margin (0-5%)', min: 0, max: 5 },
        { label: 'Medium Margin (5-15%)', min: 5, max: 15 },
        { label: 'High Margin (15%+)', min: 15, max: null }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'name', label: 'Name' },
        { value: 'price', label: 'Price' },
        { value: 'volume', label: 'Volume' },
        { value: 'margin', label: 'Profit Margin' },
        { value: 'updated', label: 'Last Updated' }
      ],
      booleanFilters: [
        { key: 'tradeable', label: 'Tradeable Only' },
        { key: 'members', label: 'Members Items' },
        { key: 'f2p', label: 'Free-to-Play Items' }
      ]
    };

    res.json({
      success: true,
      data: availableFilters,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: POST /api/market-data/search/saved
 * Save search criteria for future use
 * SOLID: Single responsibility - search persistence
 */
router.post(
  '/saved',
  validationMiddleware.validate({
    body: {
      name: { type: 'string', required: true, minLength: 1, maxLength: 100 },
      searchCriteria: { type: 'object', required: true },
      userId: { type: 'string', optional: true },
      isPublic: { type: 'boolean', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { name, searchCriteria, userId = 'anonymous', isPublic = false } = req.body;

    // Save search criteria (would integrate with database)
    const savedSearch = {
      id: Date.now().toString(), // Placeholder ID
      name,
      searchCriteria,
      userId,
      isPublic,
      createdAt: Date.now(),
      usageCount: 0
    };

    res.json({
      success: true,
      data: savedSearch,
      message: 'Search criteria saved successfully',
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/search/saved
 * Get saved search criteria
 * SOLID: Single responsibility - saved search retrieval
 */
router.get(
  '/saved',
  validationMiddleware.validate({
    query: {
      userId: { type: 'string', optional: true },
      includePublic: { type: 'string', optional: true },
      limit: { type: 'string', optional: true, max: 50 }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const userId = req.query.userId || 'anonymous';
    const includePublic = req.query.includePublic === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Retrieve saved searches (would integrate with database)
    const savedSearches = {
      userSearches: [], // User's private searches
      publicSearches: includePublic ? [] : undefined, // Public searches if requested
      totalCount: 0,
      userId,
      retrievedAt: Date.now()
    };

    res.json({
      success: true,
      data: savedSearches,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: DELETE /api/market-data/search/saved/:searchId
 * Delete saved search criteria
 * SOLID: Single responsibility - saved search deletion
 */
router.delete(
  '/saved/:searchId',
  validationMiddleware.validate({
    params: {
      searchId: { type: 'string', required: true }
    },
    query: {
      userId: { type: 'string', optional: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { searchId } = req.params;
    const userId = req.query.userId || 'anonymous';

    // Delete saved search (would integrate with database)
    const result = {
      deleted: true,
      searchId,
      userId,
      deletedAt: Date.now()
    };

    res.json({
      success: true,
      data: result,
      message: 'Saved search deleted successfully',
      timestamp: Date.now()
    });
  })
);

// Export the router
module.exports = router;