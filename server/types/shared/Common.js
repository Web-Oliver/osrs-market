/**
 * 🔧 Common Types - Shared type definitions across the application
 * 
 * Context7 Pattern: Centralized type definitions using JSDoc
 * - DRY: Single source of truth for common types
 * - SOLID: Interface segregation through focused type definitions
 */

/**
 * @typedef {Object} EntityId
 * @property {number} value - The numeric identifier value
 */

/**
 * @typedef {Object} AuditFields
 * @property {Date} createdAt - When the entity was created
 * @property {Date} updatedAt - When the entity was last updated
 * @property {Date} lastSyncedAt - When the entity was last synced with external source
 * @property {number} version - Version number for optimistic concurrency
 */

/**
 * @typedef {'active'|'deprecated'|'removed'} EntityStatus
 */

/**
 * @typedef {'osrs_wiki'|'manual'|'import'} DataSource
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} page - Page number (1-based)
 * @property {number} limit - Number of items per page
 * @property {Object} [sort] - Sort criteria
 */

/**
 * @typedef {Object} PaginationResult
 * @property {number} page - Current page number
 * @property {number} limit - Items per page
 * @property {number} totalCount - Total number of items
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasNextPage - Whether there's a next page
 * @property {boolean} hasPrevPage - Whether there's a previous page
 */

/**
 * @typedef {Object} OperationResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {string} [message] - Optional message
 * @property {Error} [error] - Optional error details
 * @property {*} [data] - Optional result data
 */

/**
 * @typedef {Object} BulkOperationResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {number} upserted - Number of items created
 * @property {number} modified - Number of items updated
 * @property {number} matched - Number of items matched
 * @property {Array} errors - Any errors that occurred
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {Array<string>} errors - Validation error messages
 * @property {Object} [sanitized] - Sanitized data if validation passed
 */

/**
 * @typedef {Object} CacheOptions
 * @property {number} ttl - Time to live in seconds
 * @property {string} [key] - Cache key override
 * @property {boolean} [refresh] - Force cache refresh
 */

module.exports = {};