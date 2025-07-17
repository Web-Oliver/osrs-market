/**
 * 📋 Watchlist Routes - Context7 Optimized
 * 
 * Context7 Pattern: RESTful API Routes for Watchlist Management
 * - Comprehensive watchlist operations
 * - Proper HTTP methods and status codes
 * - Consistent API response format
 * - Input validation and error handling
 * - Performance monitoring integration
 */

const express = require('express');
const WatchlistController = require('../controllers/WatchlistController');
const { RequestMiddleware } = require('../middleware/RequestMiddleware');
const { Logger } = require('../utils/Logger');

const router = express.Router();

// Context7 Pattern: Initialize dependencies
const watchlistController = new WatchlistController();
const requestMiddleware = new RequestMiddleware();
const logger = new Logger('WatchlistRoutes');

/**
 * Context7 Pattern: Apply route-specific middleware
 */
router.use(requestMiddleware.rateLimit({ windowMs: 60000, max: 100 })); // 100 requests per minute
router.use(requestMiddleware.requestLogger('watchlist'));

/**
 * Context7 Pattern: Watchlist Routes
 */

// GET /api/watchlist - Get user's watchlist
router.get('/', async (req, res) => {
  await watchlistController.getUserWatchlist(req, res);
});

// POST /api/watchlist - Add item to watchlist
router.post('/', async (req, res) => {
  await watchlistController.addItemToWatchlist(req, res);
});

// DELETE /api/watchlist/:itemId - Remove item from watchlist
router.delete('/:itemId', async (req, res) => {
  await watchlistController.removeItemFromWatchlist(req, res);
});

// PUT /api/watchlist/:itemId - Update watchlist item
router.put('/:itemId', async (req, res) => {
  await watchlistController.updateWatchlistItem(req, res);
});

// GET /api/watchlist/stats - Get watchlist statistics
router.get('/stats', async (req, res) => {
  await watchlistController.getWatchlistStats(req, res);
});

// GET /api/watchlist/health - Health check for watchlist service
router.get('/health', async (req, res) => {
  await watchlistController.healthCheck(req, res);
});

/**
 * Context7 Pattern: Route documentation endpoint
 */
router.get('/docs', (req, res) => {
  const documentation = {
    service: 'Watchlist API',
    version: '1.0.0',
    description: 'Comprehensive API for managing user watchlists',
    baseUrl: '/api/watchlist',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        description: 'Get user\'s watchlist',
        query: {
          userId: 'string (required) - User identifier'
        },
        response: 'Array of watchlist items'
      },
      {
        method: 'POST',
        path: '/',
        description: 'Add item to watchlist',
        body: {
          userId: 'string (required) - User identifier',
          itemId: 'number (required) - OSRS item ID',
          itemName: 'string (required) - Item name',
          currentPrice: 'number (optional) - Current market price',
          currentMargin: 'number (optional) - Current margin'
        },
        response: 'Created watchlist item'
      },
      {
        method: 'DELETE',
        path: '/:itemId',
        description: 'Remove item from watchlist',
        params: {
          itemId: 'number (required) - OSRS item ID'
        },
        query: {
          userId: 'string (required) - User identifier'
        },
        response: 'Removed watchlist item'
      },
      {
        method: 'PUT',
        path: '/:itemId',
        description: 'Update watchlist item',
        params: {
          itemId: 'number (required) - OSRS item ID'
        },
        body: {
          userId: 'string (required) - User identifier',
          currentPrice: 'number (optional) - Updated market price',
          currentMargin: 'number (optional) - Updated margin',
          notes: 'string (optional) - User notes'
        },
        response: 'Updated watchlist item'
      },
      {
        method: 'GET',
        path: '/stats',
        description: 'Get watchlist statistics',
        query: {
          userId: 'string (required) - User identifier'
        },
        response: 'Watchlist statistics object'
      },
      {
        method: 'GET',
        path: '/health',
        description: 'Health check for watchlist service',
        response: 'Service health status'
      }
    ],
    examples: {
      addToWatchlist: {
        url: 'POST /api/watchlist',
        body: {
          userId: 'user123',
          itemId: 4151,
          itemName: 'Abyssal whip',
          currentPrice: 2500000,
          currentMargin: 50000
        }
      },
      getWatchlist: {
        url: 'GET /api/watchlist?userId=user123'
      },
      removeFromWatchlist: {
        url: 'DELETE /api/watchlist/4151?userId=user123'
      }
    },
    errorCodes: {
      400: 'Bad Request - Missing required fields',
      404: 'Not Found - Item not found in watchlist',
      409: 'Conflict - Item already exists in watchlist',
      500: 'Internal Server Error - Server-side error'
    }
  };

  res.json({
    success: true,
    data: documentation,
    message: 'Watchlist API Documentation'
  });
});

module.exports = router;