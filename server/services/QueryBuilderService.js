/**
 * 🔍 Query Builder Service - Context7 Optimized
 *
 * Context7 Pattern: Centralized query building service
 * - Single Responsibility: Query construction and standardization
 * - DRY: Eliminates duplicate query building patterns across repositories
 * - Factory Pattern: Creates standardized queries for common operations
 * - Builder Pattern: Fluent query building interface
 * - Consistent query patterns across the entire application
 */

const { DatabaseUtility } = require('../utils/DatabaseUtility');
const { AppConstants } = require('../config/AppConstants');
const { Logger } = require('../utils/Logger');
const DateRangeUtil = require('../utils/DateRangeUtil');

class QueryBuilderService {
  constructor() {
    this.logger = new Logger('QueryBuilderService');
  }

  /**
   * Context7 Pattern: Build active items query
   * DRY: Eliminates duplicate active item filtering (8+ occurrences)
   */
  static activeItemsQuery(additionalFilters = {}) {
    return DatabaseUtility.buildItemQuery({
      includeInactive: false,
      ...additionalFilters
    });
  }

  /**
   * Context7 Pattern: Build tradeable items query
   * DRY: Eliminates duplicate tradeable filtering (4+ occurrences)
   */
  static tradeableItemsQuery(minValue = 0, additionalFilters = {}) {
    return DatabaseUtility.buildItemQuery({
      tradeable: true,
      minValue,
      includeInactive: false,
      ...additionalFilters
    });
  }

  /**
   * Context7 Pattern: Build high-value items query
   * DRY: Eliminates duplicate high-value filtering (3+ occurrences)
   */
  static highValueItemsQuery(minValue = AppConstants.OSRS.HIGH_VALUE_THRESHOLD, additionalFilters = {}) {
    return DatabaseUtility.buildItemQuery({
      minValue,
      tradeable: true,
      includeInactive: false,
      ...additionalFilters
    });
  }

  /**
   * Context7 Pattern: Build time range query
   * DRY: Eliminates duplicate time filtering (6+ occurrences)
   */
  static timeRangeQuery(startTime, endTime, field = 'timestamp') {
    return DatabaseUtility.buildDateRangeQuery(startTime, endTime, field);
  }

  /**
   * Context7 Pattern: Build market data query
   * DRY: Eliminates duplicate market data filtering patterns
   */
  static marketDataQuery(filters = {}) {
    const query = {};

    // Item ID filter
    if (filters.itemId) {
      query.itemId = parseInt(filters.itemId);
    }

    // Time range filter
    if (filters.startTime || filters.endTime) {
      Object.assign(query, this.timeRangeQuery(filters.startTime, filters.endTime, filters.timeField));
    }

    // Price range filter
    if (filters.minPrice !== undefined) {
      query.price = { ...query.price, $gte: filters.minPrice };
    }
    if (filters.maxPrice !== undefined) {
      query.price = { ...query.price, $lte: filters.maxPrice };
    }

    // Volume filter
    if (filters.minVolume !== undefined) {
      query.volume = { ...query.volume, $gte: filters.minVolume };
    }

    return query;
  }

  /**
   * Context7 Pattern: Build watchlist query
   * DRY: Eliminates duplicate watchlist filtering patterns
   */
  static watchlistQuery(userId, filters = {}) {
    const query = { userId };

    // Active items only by default
    if (filters.includeInactive !== true) {
      query.status = 'active';
    }

    // Item ID filter
    if (filters.itemId) {
      query.itemId = parseInt(filters.itemId);
    }

    return query;
  }

  /**
   * Context7 Pattern: Build search query with text and filters
   * DRY: Eliminates duplicate search patterns (5+ occurrences)
   */
  static searchQuery(searchTerm, filters = {}) {
    const query = DatabaseUtility.buildItemQuery({
      searchTerm,
      ...filters
    });

    return query;
  }

  /**
   * Context7 Pattern: Build aggregation for top items
   * DRY: Eliminates duplicate "top items" aggregation patterns
   */
  static buildTopItemsAggregation(metric = 'volume', timeRange = '24h', limit = 10) {
    const timeRanges = DateRangeUtil.getQueryTimeRanges();
    const startTime = timeRanges[timeRange] || timeRanges['24h'];

    const groupFields = {
      volume: { totalVolume: { $sum: '$volume' } },
      profit: { totalProfit: { $sum: '$profit' } },
      margin: { avgMargin: { $avg: '$margin' } },
      activity: { dataPoints: { $sum: 1 } }
    };

    const sortFields = {
      volume: { totalVolume: -1 },
      profit: { totalProfit: -1 },
      margin: { avgMargin: -1 },
      activity: { dataPoints: -1 }
    };

    return [
      {
        $match: {
          timestamp: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$itemId',
          itemName: { $first: '$itemName' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          ...groupFields[metric]
        }
      },
      {
        $sort: sortFields[metric]
      },
      {
        $limit: limit
      },
      {
        $project: {
          itemId: '$_id',
          itemName: 1,
          avgPrice: 1,
          minPrice: 1,
          maxPrice: 1,
          metric: Object.keys(groupFields[metric])[0],
          _id: 0
        }
      }
    ];
  }

  /**
   * Context7 Pattern: Build user activity aggregation
   * DRY: Eliminates duplicate user activity patterns
   */
  static buildUserActivityAggregation(userId, timeRange = '7d') {
    const timeRanges = DateRangeUtil.getMonitoringTimeRanges();
    const startTime = timeRanges[timeRange] || timeRanges['7d'];

    return [
      {
        $match: {
          userId,
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          actionsCount: { $sum: 1 },
          uniqueItems: { $addToSet: '$itemId' }
        }
      },
      {
        $project: {
          date: '$_id',
          actionsCount: 1,
          uniqueItemsCount: { $size: '$uniqueItems' },
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ];
  }

  /**
   * Context7 Pattern: Build performance metrics aggregation
   * DRY: Eliminates duplicate performance calculation patterns
   */
  static buildPerformanceMetricsAggregation(filters = {}) {
    const matchQuery = this.marketDataQuery(filters);

    return [
      { $match: matchQuery },
      {
        $group: {
          _id: '$itemId',
          itemName: { $first: '$itemName' },
          totalProfit: { $sum: '$profit' },
          totalVolume: { $sum: '$volume' },
          avgMargin: { $avg: '$margin' },
          dataPoints: { $sum: 1 },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' },
          firstPrice: { $first: '$price' },
          lastPrice: { $last: '$price' }
        }
      },
      {
        $addFields: {
          profitPerVolume: {
            $cond: {
              if: { $gt: ['$totalVolume', 0] },
              then: { $divide: ['$totalProfit', '$totalVolume'] },
              else: 0
            }
          },
          priceChangePercent: {
            $cond: {
              if: { $ne: ['$firstPrice', 0] },
              then: {
                $multiply: [
                  { $divide: [{ $subtract: ['$lastPrice', '$firstPrice'] }, '$firstPrice'] },
                  100
                ]
              },
              else: 0
            }
          },
          volatility: {
            $cond: {
              if: { $ne: ['$avgPrice', 0] },
              then: { $divide: [{ $subtract: ['$maxPrice', '$minPrice'] }, '$avgPrice'] },
              else: 0
            }
          }
        }
      },
      {
        $sort: { totalProfit: -1 }
      }
    ];
  }

  /**
   * Context7 Pattern: Build data export query
   * DRY: Eliminates duplicate export query patterns
   */
  static buildExportQuery(collection, filters = {}, format = 'json') {
    const query = {};

    // Apply standard filters
    if (filters.itemId) {
      query.itemId = parseInt(filters.itemId);
    }

    if (filters.startDate || filters.endDate) {
      Object.assign(query, this.timeRangeQuery(filters.startDate, filters.endDate));
    }

    if (filters.userId) {
      query.userId = filters.userId;
    }

    // Format-specific projections
    const projections = {
      json: {}, // Include all fields
      csv: {
        _id: 0,
        itemId: 1,
        itemName: 1,
        price: 1,
        volume: 1,
        timestamp: 1
      },
      minimal: {
        _id: 0,
        itemId: 1,
        price: 1,
        timestamp: 1
      }
    };

    return {
      query,
      projection: projections[format] || projections.json
    };
  }

  /**
   * Context7 Pattern: Build complex filter query
   * DRY: Eliminates duplicate complex filtering patterns
   */
  static buildComplexFilterQuery(filters = {}) {
    const query = {};

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Multiple item IDs
    if (filters.itemIds && Array.isArray(filters.itemIds)) {
      query.itemId = { $in: filters.itemIds.map(id => parseInt(id)) };
    }

    // Category filter
    if (filters.category) {
      query.category = filters.category;
    }

    // Boolean filters
    if (filters.members !== undefined) {
      query.members = filters.members;
    }

    if (filters.tradeable !== undefined) {
      query.tradeable_on_ge = filters.tradeable;
    }

    // Range filters
    if (filters.valueRange) {
      const { min, max } = filters.valueRange;
      if (min !== undefined) query.value = { ...query.value, $gte: min };
      if (max !== undefined) query.value = { ...query.value, $lte: max };
    }

    // Date range
    if (filters.dateRange) {
      const { startDate, endDate, field = 'createdAt' } = filters.dateRange;
      Object.assign(query, this.timeRangeQuery(startDate, endDate, field));
    }

    // Status filter (default to active unless explicitly specified)
    if (filters.includeInactive !== true) {
      query.status = 'active';
    }

    return query;
  }

  /**
   * Context7 Pattern: Get common query options
   * DRY: Eliminates duplicate query option patterns
   */
  static getCommonQueryOptions(options = {}) {
    return {
      sort: DatabaseUtility.buildSortOptions(options.sortBy, options.sortOrder),
      projection: options.fields ? this.buildProjection(options.fields) : {},
      limit: options.limit ? Math.min(options.limit, AppConstants.DATABASE.MAX_LIMIT) : undefined,
      lean: options.lean !== false, // Default to lean queries for better performance
      populate: options.populate || []
    };
  }

  /**
   * Context7 Pattern: Build projection from field list
   * DRY: Eliminates duplicate projection building
   */
  static buildProjection(fields = []) {
    if (!Array.isArray(fields) || fields.length === 0) {
      return {};
    }

    const projection = {};
    fields.forEach(field => {
      projection[field] = 1;
    });

    // Always include _id unless explicitly excluded
    if (!fields.includes('-_id')) {
      projection._id = 1;
    }

    return projection;
  }
}

module.exports = { QueryBuilderService };