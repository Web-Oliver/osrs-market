/**
 * 📤 Data Export Service - Context7 Optimized
 *
 * Context7 Pattern: Single Responsibility Service
 * - SOLID: Single Responsibility Principle (SRP) - Handles ONLY data export operations
 * - DRY: Centralized export logic to eliminate duplication
 * - Supports multiple export formats (CSV, JSON, XML)
 * - Configurable field mapping and formatting
 * - Error handling and validation
 */

const { Logger } = require('../utils/Logger');

class DataExportService {
  constructor() {
    this.logger = new Logger('DataExportService');
    
    // Default CSV configuration
    this.csvConfig = {
      delimiter: ',',
      quote: '"',
      escape: '"',
      lineBreak: '\n'
    };
    
    // Default field mappings for different data types
    this.fieldMappings = {
      marketData: [
        'timestamp', 'itemId', 'itemName', 'highPrice', 'lowPrice', 
        'profitMargin', 'spread', 'volume', 'lastUpdate'
      ],
      collectionStats: [
        'timestamp', 'totalCollections', 'successRate', 'itemsProcessed',
        'averageResponseTime', 'memoryUsage', 'errors'
      ],
      performance: [
        'timestamp', 'totalProfit', 'successfulTrades', 'averageProfit',
        'efficiency', 'uptime', 'resourceUsage'
      ]
    };
  }

  /**
   * Context7 Pattern: Convert data to CSV format
   * SOLID: Single responsibility for CSV conversion
   * DRY: Reusable CSV conversion logic
   */
  convertToCSV(data, options = {}) {
    if (!data || data.length === 0) {
      this.logger.warn('No data provided for CSV conversion');
      return '';
    }

    const config = { ...this.csvConfig, ...options.config };
    const dataType = options.dataType || 'marketData';
    const customFields = options.fields;
    
    // Get field mapping based on data type or use custom fields
    const fields = customFields || this.fieldMappings[dataType] || this.detectFields(data[0]);
    
    try {
      this.logger.debug('Converting data to CSV', {
        recordCount: data.length,
        dataType,
        fields: fields.length
      });

      // Generate headers
      const headers = fields.join(config.delimiter);
      
      // Generate rows
      const rows = data.map(item => {
        const row = fields.map(field => {
          const value = this.extractFieldValue(item, field);
          return this.formatCsvCell(value, config);
        });
        return row.join(config.delimiter);
      });

      const csvContent = [headers, ...rows].join(config.lineBreak);
      
      this.logger.debug('CSV conversion completed successfully', {
        totalLines: rows.length + 1,
        totalSize: csvContent.length
      });

      return csvContent;
    } catch (error) {
      this.logger.error('Error converting data to CSV', error, {
        recordCount: data.length,
        dataType
      });
      throw new Error(`CSV conversion failed: ${error.message}`);
    }
  }

  /**
   * Context7 Pattern: Convert data to JSON format
   * SOLID: Single responsibility for JSON conversion
   */
  convertToJSON(data, options = {}) {
    if (!data) {
      this.logger.warn('No data provided for JSON conversion');
      return '[]';
    }

    try {
      const { pretty = false, fields } = options;
      
      // Filter fields if specified
      const processedData = fields ? 
        data.map(item => this.filterFields(item, fields)) : 
        data;

      const jsonContent = pretty ? 
        JSON.stringify(processedData, null, 2) : 
        JSON.stringify(processedData);

      this.logger.debug('JSON conversion completed', {
        recordCount: Array.isArray(data) ? data.length : 1,
        pretty,
        fieldsFiltered: !!fields
      });

      return jsonContent;
    } catch (error) {
      this.logger.error('Error converting data to JSON', error);
      throw new Error(`JSON conversion failed: ${error.message}`);
    }
  }

  /**
   * Context7 Pattern: Generate export metadata
   * SOLID: Single responsibility for metadata generation
   */
  generateExportMetadata(data, format, options = {}) {
    const timestamp = new Date().toISOString();
    const filename = options.filename || 
      `osrs-market-data-${timestamp.split('T')[0]}.${format}`;

    return {
      exportedAt: timestamp,
      format,
      filename,
      recordCount: Array.isArray(data) ? data.length : 1,
      dataType: options.dataType || 'unknown',
      fileSize: this.estimateFileSize(data, format),
      checksum: this.generateChecksum(data),
      version: '1.0'
    };
  }

  /**
   * Context7 Pattern: Get appropriate content type for format
   * SOLID: Single responsibility for content type determination
   */
  getContentType(format) {
    const contentTypes = {
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    return contentTypes[format.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Context7 Pattern: Generate content disposition header
   * SOLID: Single responsibility for header generation
   */
  getContentDisposition(filename, inline = false) {
    const disposition = inline ? 'inline' : 'attachment';
    return `${disposition}; filename="${filename}"`;
  }

  // Private Helper Methods

  /**
   * Extract field value from object using dot notation
   */
  extractFieldValue(obj, field) {
    if (field.includes('.')) {
      return field.split('.').reduce((o, key) => o?.[key], obj);
    }
    
    // Handle special field mappings
    switch (field) {
    case 'timestamp':
      return obj.timestamp ? new Date(obj.timestamp).toISOString() : '';
    case 'highPrice':
      return obj.priceData?.high || '';
    case 'lowPrice':
      return obj.priceData?.low || '';
    case 'profitMargin':
      return obj.profitMargin || '';
    case 'spread':
      return obj.spread || '';
    default:
      return obj[field] || '';
    }
  }

  /**
   * Format CSV cell with proper escaping
   */
  formatCsvCell(value, config) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    
    // Check if we need to quote the value
    const needsQuoting = stringValue.includes(config.delimiter) ||
                        stringValue.includes(config.quote) ||
                        stringValue.includes('\n') ||
                        stringValue.includes('\r');

    if (needsQuoting) {
      // Escape quotes by doubling them
      const escapedValue = stringValue.replace(
        new RegExp(config.quote, 'g'), 
        config.escape + config.quote
      );
      return config.quote + escapedValue + config.quote;
    }

    return stringValue;
  }

  /**
   * Auto-detect fields from first data object
   */
  detectFields(sampleObject) {
    if (!sampleObject || typeof sampleObject !== 'object') {
      return [];
    }

    return Object.keys(sampleObject).filter(key => 
      !key.startsWith('_') && // Skip private fields
      typeof sampleObject[key] !== 'function' // Skip methods
    );
  }

  /**
   * Filter object to include only specified fields
   */
  filterFields(obj, fields) {
    const filtered = {};
    fields.forEach(field => {
      const value = this.extractFieldValue(obj, field);
      if (value !== undefined) {
        filtered[field] = value;
      }
    });
    return filtered;
  }

  /**
   * Estimate file size for given data and format
   */
  estimateFileSize(data, format) {
    try {
      let content;
      switch (format.toLowerCase()) {
      case 'csv':
        content = this.convertToCSV(data);
        break;
      case 'json':
        content = this.convertToJSON(data);
        break;
      default:
        content = JSON.stringify(data);
      }
      return Buffer.byteLength(content, 'utf8');
    } catch (error) {
      this.logger.warn('Could not estimate file size', error);
      return 0;
    }
  }

  /**
   * Generate simple checksum for data integrity
   */
  generateChecksum(data) {
    try {
      const content = JSON.stringify(data);
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash).toString(16);
    } catch (error) {
      this.logger.warn('Could not generate checksum', error);
      return 'unknown';
    }
  }
}

module.exports = { DataExportService };