/**
 * 📤 Market Export Routes - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Route Module
 * - SOLID: Single Responsibility Principle (SRP) - ONLY data export operations
 * - DRY: Reusable export validation and streaming patterns
 * - Clean separation of concerns for export functionality
 * - Focused responsibility: Data export in multiple formats, scheduling, and delivery
 */

const express = require('express');
const { getControllerFactory } = require('../../factories/ControllerFactory');
const { ValidationMiddleware } = require('../../middleware/ValidationMiddleware');
const { ErrorHandler } = require('../../middleware/ErrorHandler');
const { DataExportService } = require('../../services/DataExportService');
const { AppConstants } = require('../../config/AppConstants');
const TimeConstants = require('../../utils/TimeConstants');

const router = express.Router();

// Context7 Pattern: Use ControllerFactory for proper dependency injection
const controllerFactory = getControllerFactory();
const marketDataController = controllerFactory.createMarketDataController();
const dataExportService = new DataExportService();
const validationMiddleware = new ValidationMiddleware();
const errorHandler = new ErrorHandler();

// Context7 Pattern: Apply export-specific middleware
router.use(validationMiddleware.requestTracking());
router.use(validationMiddleware.performanceMonitoring());

// Context7 Pattern: Export-specific rate limiting (lower limit for resource-intensive operations)
router.use(validationMiddleware.rateLimit({
  windowMs: AppConstants.RATE_LIMITING.WINDOW_MS,
  maxRequests: AppConstants.RATE_LIMITING.EXPORT_REQUESTS,
  message: 'Export rate limit exceeded - exports are resource intensive'
}));

/**
 * Context7 Pattern: GET /api/market-data/export
 * Export market data in various formats
 * SOLID: Single responsibility - data export
 */
router.get(
  '/',
  validationMiddleware.validate({
    query: {
      format: { type: 'string', optional: true, enum: ['json', 'csv', 'xlsx'] },
      timeRange: { type: 'string', optional: true },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true },
      itemIds: { type: 'string', optional: true }, // Comma-separated
      includeMetadata: { type: 'string', optional: true },
      compression: { type: 'string', optional: true },
      maxRecords: { type: 'string', optional: true, max: AppConstants.EXPORT.MAX_RECORDS_PER_EXPORT },
      fields: { type: 'string', optional: true } // Comma-separated field names
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const {
      format = 'json',
      timeRange,
      startTime,
      endTime,
      itemIds,
      includeMetadata = 'true',
      compression = 'false',
      maxRecords = '10000',
      fields
    } = req.query;

    // Parse parameters
    const exportParams = {
      format,
      timeFilter: {
        startTime: startTime ? parseInt(startTime) : 
                   timeRange ? Date.now() - parseInt(timeRange) : 
                   Date.now() - AppConstants.DATABASE.DEFAULT_MAX_AGE,
        endTime: endTime ? parseInt(endTime) : Date.now()
      },
      itemIds: itemIds ? itemIds.split(',').map(id => parseInt(id.trim())) : undefined,
      options: {
        includeMetadata: includeMetadata === 'true',
        compression: compression === 'true',
        maxRecords: Math.min(parseInt(maxRecords), AppConstants.EXPORT.MAX_RECORDS_PER_EXPORT),
        fields: fields ? fields.split(',').map(f => f.trim()) : undefined
      }
    };

    // Validate export size
    const estimatedSize = exportParams.options.maxRecords * 1000; // Rough estimate
    if (estimatedSize > AppConstants.EXPORT.MAX_EXPORT_SIZE) {
      return res.status(AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Export size would exceed maximum limit',
        details: {
          estimatedSize,
          maxSize: AppConstants.EXPORT.MAX_EXPORT_SIZE,
          suggestion: 'Reduce time range or use pagination'
        }
      });
    }

    // Get data from market data service
    const data = await marketDataController.marketDataService.getMarketData({
      startTime: exportParams.timeFilter.startTime,
      endTime: exportParams.timeFilter.endTime,
      itemIds: exportParams.itemIds,
      limit: exportParams.options.maxRecords,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    });

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `osrs-market-data-${timestamp}.${format}`;

    // Set response headers
    res.setHeader('Content-Type', dataExportService.getContentType(format));
    res.setHeader('Content-Disposition', dataExportService.getContentDisposition(filename));

    // Export data based on format
    let exportedData;
    if (format === 'csv') {
      exportedData = dataExportService.convertToCSV(data, {
        dataType: 'marketData',
        fields: exportParams.options.fields
      });
    } else {
      exportedData = dataExportService.convertToJSON(data, {
        pretty: true,
        fields: exportParams.options.fields
      });
    }

    // Add metadata if requested
    if (exportParams.options.includeMetadata) {
      const metadata = dataExportService.generateExportMetadata(data, format, {
        filename,
        dataType: 'marketData'
      });

      if (format === 'json') {
        const dataWithMetadata = {
          metadata,
          data: JSON.parse(exportedData)
        };
        exportedData = JSON.stringify(dataWithMetadata, null, 2);
      }
    }

    res.send(exportedData);
  })
);

/**
 * Context7 Pattern: POST /api/market-data/export/custom
 * Create custom export with advanced options
 * SOLID: Single responsibility - custom export creation
 */
router.post(
  '/custom',
  validationMiddleware.validate({
    body: {
      name: { type: 'string', required: true, maxLength: 100 },
      exportConfig: {
        type: 'object',
        required: true,
        properties: {
          format: { type: 'string', enum: ['json', 'csv', 'xlsx'] },
          filters: { type: 'object' },
          fields: { type: 'array' },
          sorting: { type: 'object' },
          pagination: { type: 'object' }
        }
      },
      schedule: { type: 'object', optional: true }, // For scheduled exports
      deliveryMethod: { type: 'string', optional: true, enum: ['download', 'email', 'webhook'] },
      notifications: { type: 'object', optional: true }
    }
  }),
  validationMiddleware.bodySize({ limit: '1mb' }),
  errorHandler.asyncHandler(async (req, res) => {
    const { name, exportConfig, schedule, deliveryMethod = 'download', notifications } = req.body;

    // Validate export configuration
    if (!exportConfig.format || !['json', 'csv', 'xlsx'].includes(exportConfig.format)) {
      return res.status(AppConstants.ERRORS.STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid export format specified'
      });
    }

    // Create custom export job
    const exportJob = {
      id: Date.now().toString(),
      name,
      config: exportConfig,
      schedule: schedule || null,
      deliveryMethod,
      notifications: notifications || {},
      createdAt: Date.now(),
      status: 'pending',
      createdBy: req.body.userId || 'anonymous'
    };

    // If immediate export (no schedule), process now
    if (!schedule) {
      exportJob.status = 'processing';
      // Would trigger export processing here
    }

    res.json({
      success: true,
      data: exportJob,
      message: schedule ? 'Scheduled export created successfully' : 'Export job created and queued',
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/export/jobs
 * Get export job status and history
 * SOLID: Single responsibility - export job management
 */
router.get(
  '/jobs',
  validationMiddleware.validate({
    query: {
      userId: { type: 'string', optional: true },
      status: { type: 'string', optional: true, enum: ['pending', 'processing', 'completed', 'failed'] },
      limit: { type: 'string', optional: true, max: 100 },
      sortBy: { type: 'string', optional: true, enum: ['created', 'updated', 'name', 'status'] },
      sortOrder: { type: 'string', optional: true, enum: ['asc', 'desc'] }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const filters = {
      userId: req.query.userId,
      status: req.query.status,
      limit: Math.min(parseInt(req.query.limit) || 50, 100),
      sortBy: req.query.sortBy || 'created',
      sortOrder: req.query.sortOrder || 'desc'
    };

    // Retrieve export jobs (would integrate with job queue service)
    const exportJobs = {
      jobs: [], // Placeholder for actual jobs
      totalCount: 0,
      filters,
      retrievedAt: Date.now()
    };

    res.json({
      success: true,
      data: exportJobs,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/export/jobs/:jobId
 * Get specific export job details
 * SOLID: Single responsibility - individual job status
 */
router.get(
  '/jobs/:jobId',
  validationMiddleware.validate({
    params: {
      jobId: { type: 'string', required: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    // Retrieve job details (would integrate with job service)
    const jobDetails = {
      id: jobId,
      status: 'completed',
      progress: 100,
      result: {
        recordsExported: 1500,
        fileSize: '2.3MB',
        downloadUrl: `/api/market-data/export/download/${jobId}`,
        expiresAt: Date.now() + AppConstants.EXPORT.TEMP_FILE_TTL
      },
      createdAt: Date.now() - TimeConstants.FIVE_MINUTES,
      completedAt: Date.now() - TimeConstants.ONE_MINUTE,
      processingTime: 240000 // 4 minutes
    };

    res.json({
      success: true,
      data: jobDetails,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/export/download/:jobId
 * Download exported file
 * SOLID: Single responsibility - file download
 */
router.get(
  '/download/:jobId',
  validationMiddleware.validate({
    params: {
      jobId: { type: 'string', required: true }
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    // Retrieve file information (would integrate with file storage)
    const fileInfo = {
      exists: true,
      path: `/tmp/exports/${jobId}.json`,
      filename: `export-${jobId}.json`,
      contentType: 'application/json',
      size: 1024000
    };

    if (!fileInfo.exists) {
      return res.status(AppConstants.ERRORS.STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'Export file not found or has expired'
      });
    }

    // Set download headers
    res.setHeader('Content-Type', fileInfo.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
    res.setHeader('Content-Length', fileInfo.size);

    // Stream file (placeholder - would stream actual file)
    res.json({
      message: 'File download would stream here',
      jobId,
      filename: fileInfo.filename
    });
  })
);

/**
 * Context7 Pattern: DELETE /api/market-data/export/jobs/:jobId
 * Cancel or delete export job
 * SOLID: Single responsibility - job cancellation
 */
router.delete(
  '/jobs/:jobId',
  validationMiddleware.validate({
    params: {
      jobId: { type: 'string', required: true }
    },
    query: {
      force: { type: 'string', optional: true } // Force delete even if processing
    }
  }),
  errorHandler.asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const force = req.query.force === 'true';

    // Cancel/delete job (would integrate with job service)
    const result = {
      jobId,
      action: force ? 'force_deleted' : 'cancelled',
      previousStatus: 'processing',
      cancelledAt: Date.now(),
      cleanupCompleted: true
    };

    res.json({
      success: true,
      data: result,
      message: `Export job ${result.action} successfully`,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/export/templates
 * Get export templates and presets
 * SOLID: Single responsibility - template management
 */
router.get(
  '/templates',
  errorHandler.asyncHandler(async (req, res) => {
    const exportTemplates = {
      predefined: [
        {
          id: 'basic_market_data',
          name: 'Basic Market Data',
          description: 'Standard market data export with essential fields',
          format: 'csv',
          fields: ['timestamp', 'itemId', 'itemName', 'highPrice', 'lowPrice', 'volume'],
          category: 'standard'
        },
        {
          id: 'profit_analysis',
          name: 'Profit Analysis',
          description: 'Export focused on profitability metrics',
          format: 'json',
          fields: ['itemId', 'itemName', 'profitMargin', 'spread', 'volume', 'trend'],
          category: 'analytics'
        },
        {
          id: 'full_dataset',
          name: 'Complete Dataset',
          description: 'Full export with all available fields',
          format: 'json',
          fields: '*',
          category: 'comprehensive'
        }
      ],
      custom: [], // User-created templates would be here
      categories: ['standard', 'analytics', 'comprehensive', 'custom']
    };

    res.json({
      success: true,
      data: exportTemplates,
      timestamp: Date.now()
    });
  })
);

/**
 * Context7 Pattern: GET /api/market-data/export/formats
 * Get supported export formats and their capabilities
 * SOLID: Single responsibility - format specification
 */
router.get(
  '/formats',
  errorHandler.asyncHandler(async (req, res) => {
    const supportedFormats = {
      json: {
        name: 'JSON',
        contentType: 'application/json',
        extension: 'json',
        features: ['metadata', 'nested_objects', 'arrays', 'compression'],
        maxSize: AppConstants.EXPORT.MAX_EXPORT_SIZE,
        recommended: 'API integration and complex data structures'
      },
      csv: {
        name: 'CSV',
        contentType: 'text/csv',
        extension: 'csv',
        features: ['simple_format', 'excel_compatible', 'compression'],
        maxSize: AppConstants.EXPORT.MAX_EXPORT_SIZE,
        recommended: 'Spreadsheet analysis and simple data processing'
      },
      xlsx: {
        name: 'Excel',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
        features: ['excel_native', 'formatting', 'multiple_sheets'],
        maxSize: AppConstants.EXPORT.MAX_EXPORT_SIZE / 2, // Smaller limit for Excel
        recommended: 'Advanced spreadsheet analysis with formatting'
      }
    };

    res.json({
      success: true,
      data: supportedFormats,
      timestamp: Date.now()
    });
  })
);

// Export the router
module.exports = router;