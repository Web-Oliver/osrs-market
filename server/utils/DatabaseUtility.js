/**
 * 🗄️ Database Utility - Context7 Optimized
 *
 * Context7 Pattern: Centralized database operation utilities
 * - Single Responsibility: Database query building and common operations
 * - DRY: Eliminates duplicate query patterns across repositories and services
 * - Open/Closed: Extensible query building patterns
 * - Factory Pattern: Standardized query and aggregation creation
 * - Consistent database operation patterns across the entire application
 */

const { ErrorHandler } = require('../middleware/ErrorHandler');
const { AppConstants } = require('../config/AppConstants');
const { Logger } = require('./Logger');

class DatabaseUtility {
  constructor() {
    this.logger = new Logger('DatabaseUtility');
  }

  /**
   * Context7 Pattern: Build standardized item query
   * DRY: Eliminates duplicate item filtering patterns (8+ occurrences)
   */
  static buildItemQuery(filters = {}) {
    const query = {};

    // Active status filter (used in 8+ locations)
    if (filters.includeInactive !== true) {
      query.status = 'active';
    }

    // Item ID filter
    if (filters.itemId) {
      query.itemId = parseInt(filters.itemId);
    }

    // Text search filter
    if (filters.searchTerm) {
      query.$text = { $search: filters.searchTerm };
    }

    // Value range filter
    if (filters.minValue !== undefined) {
      query.value = { ...query.value, $gte: filters.minValue };
    }
    if (filters.maxValue !== undefined) {
      query.value = { ...query.value, $lte: filters.maxValue };
    }

    // Tradeable filter
    if (filters.tradeable === true) {
      query.tradeable_on_ge = true;
    }

    // Members filter
    if (filters.members !== undefined) {
      query.members = filters.members;
    }

    return query;
  }

  /**
   * Context7 Pattern: Build standardized date range query
   * DRY: Eliminates duplicate date filtering patterns (6+ occurrences)
   */
  static buildDateRangeQuery(startDate, endDate, field = 'createdAt') {
    const query = {};
    
    if (startDate || endDate) {
      query[field] = {};
      if (startDate) {
        query[field].$gte = new Date(startDate);
      }
      if (endDate) {
        query[field].$lte = new Date(endDate);
      }
    }

    return query;
  }

  /**
   * Context7 Pattern: Build standardized pagination query
   * DRY: Eliminates duplicate pagination patterns (15+ occurrences)
   */
  static buildPaginationQuery(page = 1, limit = 20, maxLimit = 100) {
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));
    const skip = (validatedPage - 1) * validatedLimit;

    return {
      page: validatedPage,
      limit: validatedLimit,
      skip,
      maxLimit
    };
  }

  /**
   * Context7 Pattern: Build market data aggregation pipeline
   * DRY: Eliminates duplicate statistics aggregation patterns (4+ occurrences)
   */
  static buildStatisticsAggregation(filters = {}) {
    const matchStage = { $match: this.buildItemQuery(filters) };
    
    const groupStage = {
      $group: {
        _id: null,
        totalItems: { $sum: 1 },
        membersItems: { $sum: { $cond: ['$members', 1, 0] } },
        freeItems: { $sum: { $cond: ['$members', 0, 1] } },
        averageValue: { $avg: '$value' },
        maxValue: { $max: '$value' },
        minValue: { $min: '$value' },
        totalValue: { $sum: '$value' }
      }
    };

    return [matchStage, groupStage];
  }

  /**
   * Context7 Pattern: Build time-based aggregation pipeline
   * DRY: Eliminates duplicate time-based grouping patterns
   */
  static buildTimeBasedAggregation(timeField = 'createdAt', interval = 'hour') {
    const dateExpression = {
      hour: {
        year: { $year: `$${timeField}` },
        month: { $month: `$${timeField}` },
        day: { $dayOfMonth: `$${timeField}` },
        hour: { $hour: `$${timeField}` }
      },
      day: {
        year: { $year: `$${timeField}` },
        month: { $month: `$${timeField}` },
        day: { $dayOfMonth: `$${timeField}` }
      },
      month: {
        year: { $year: `$${timeField}` },
        month: { $month: `$${timeField}` }
      }
    };

    return {
      $group: {
        _id: dateExpression[interval] || dateExpression.hour,
        count: { $sum: 1 },
        averagePrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        volume: { $sum: '$volume' }
      }
    };
  }

  /**
   * Context7 Pattern: Perform standardized upsert operation
   * DRY: Eliminates duplicate upsert patterns (6+ occurrences)
   */
  static async performUpsert(model, query, data, options = {}) {
    const defaultOptions = {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      ...options
    };

    try {
      const result = await model.findOneAndUpdate(query, data, defaultOptions);
      return result;
    } catch (error) {
      throw this.handleMongoError(error, 'upsert operation');
    }
  }

  /**
   * Context7 Pattern: Perform paginated query with total count
   * DRY: Eliminates duplicate paginated query patterns (12+ occurrences)
   */
  static async performPaginatedQuery(model, query = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      projection = {},
      populate = null
    } = options;

    const paginationParams = this.buildPaginationQuery(page, limit, options.maxLimit);
    
    try {
      // Execute query and count in parallel for better performance
      const [items, totalCount] = await Promise.all([
        model
          .find(query, projection)
          .sort(sort)
          .skip(paginationParams.skip)
          .limit(paginationParams.limit)
          .populate(populate || [])
          .lean(),
        model.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / paginationParams.limit);

      return {
        items,
        pagination: {
          page: paginationParams.page,
          limit: paginationParams.limit,
          totalCount,
          totalPages,
          hasNextPage: paginationParams.page < totalPages,
          hasPrevPage: paginationParams.page > 1,
          nextPage: paginationParams.page < totalPages ? paginationParams.page + 1 : null,
          prevPage: paginationParams.page > 1 ? paginationParams.page - 1 : null
        }
      };
    } catch (error) {
      throw this.handleMongoError(error, 'paginated query');
    }
  }

  /**
   * Context7 Pattern: Perform bulk operations with error handling
   * DRY: Eliminates duplicate bulk operation patterns
   */
  static async performBulkOperation(model, operations, options = {}) {
    const defaultOptions = {
      ordered: false,
      ...options
    };

    try {
      if (!operations || operations.length === 0) {
        return { acknowledged: true, insertedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      }

      const result = await model.bulkWrite(operations, defaultOptions);
      return result;
    } catch (error) {
      throw this.handleMongoError(error, 'bulk operation');
    }
  }

  /**
   * Context7 Pattern: Build search projection
   * DRY: Eliminates duplicate projection patterns
   */
  static buildSearchProjection(includeScore = false) {
    const projection = {
      itemId: 1,
      name: 1,
      description: 1,
      value: 1,
      members: 1,
      tradeable_on_ge: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1
    };

    if (includeScore) {
      projection.score = { $meta: 'textScore' };
    }

    return projection;
  }

  /**
   * Context7 Pattern: Build sorting options
   * DRY: Eliminates duplicate sorting patterns (10+ occurrences)
   */
  static buildSortOptions(sortBy = 'createdAt', sortOrder = 'desc') {
    const validSortFields = {
      name: 'name',
      value: 'value',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      timestamp: 'timestamp',
      price: 'price',
      volume: 'volume',
      score: { $meta: 'textScore' }
    };

    const field = validSortFields[sortBy] || validSortFields.createdAt;
    const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    return typeof field === 'object' ? field : { [field]: order };
  }

  /**
   * Context7 Pattern: Handle MongoDB errors consistently
   * DRY: Eliminates duplicate error handling patterns (8+ occurrences)
   */
  static handleMongoError(error, operation = 'database operation') {
    const logger = new Logger('DatabaseUtility');
    
    // Log the error for monitoring
    logger.error(`MongoDB error during ${operation}`, error);

    // Handle specific MongoDB error types
    if (error.name === 'MongoNetworkError') {
      return ErrorHandler.createError(
        'Database connection failed',
        503,
        'Please try again later',
        'DATABASE_CONNECTION_ERROR'
      );
    }

    if (error.name === 'MongoServerError' && error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return ErrorHandler.createError(
        `Duplicate ${field} value`,
        409,
        `A record with this ${field} already exists`,
        'DUPLICATE_KEY_ERROR'
      );
    }

    if (error.name === 'ValidationError') {
      return ErrorHandler.createValidationError(
        'Database validation failed',
        { validationErrors: error.errors }
      );
    }

    if (error.name === 'CastError') {
      return ErrorHandler.createValidationError(
        'Invalid data format',
        { field: error.path, value: error.value, expectedType: error.kind }
      );
    }

    // Default database error
    return ErrorHandler.createError(
      `Database error during ${operation}`,
      500,
      process.env.NODE_ENV === 'development' ? error.message : 'Please try again later',
      'DATABASE_ERROR'
    );
  }

  /**
   * Context7 Pattern: Validate database connection
   * DRY: Eliminates duplicate connection validation patterns
   */
  static async validateConnection(connection, serviceName = 'Database') {
    try {
      if (!connection) {
        throw ErrorHandler.createError(
          `${serviceName} connection not available`,
          503,
          'Please try again later',
          'DATABASE_UNAVAILABLE'
        );
      }

      // Test connection with a simple ping
      await connection.db.admin().ping();
      return true;
    } catch (error) {
      throw this.handleMongoError(error, 'connection validation');
    }
  }

  /**
   * Context7 Pattern: Build aggregation pipeline for market analysis
   * DRY: Eliminates duplicate market analysis patterns
   */
  static buildMarketAnalysisPipeline(itemId, timeRange = '24h') {
    const timeRanges = {
      '1h': new Date(Date.now() - 60 * 60 * 1000),
      '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
      '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    };

    const startTime = timeRanges[timeRange] || timeRanges['24h'];

    return [
      {
        $match: {
          itemId: parseInt(itemId),
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$itemId',
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          totalVolume: { $sum: '$volume' },
          priceChange: {
            $last: '$price'
          },
          firstPrice: { $first: '$price' },
          dataPoints: { $sum: 1 }
        }
      },
      {
        $addFields: {
          priceChangePercent: {
            $cond: {
              if: { $ne: ['$firstPrice', 0] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ['$priceChange', '$firstPrice'] }, '$firstPrice'] },
                  100
                ]
              },
              else: 0
            }
          },
          volatility: {
            $divide: [{ $subtract: ['$maxPrice', '$minPrice'] }, '$avgPrice']
          }
        }
      }
    ];
  }
}

module.exports = { DatabaseUtility };