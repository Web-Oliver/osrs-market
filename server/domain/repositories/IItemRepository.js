/**
 * 📚 Item Repository Interface - Abstract repository contract
 *
 * Context7 Pattern: Repository Pattern interface for dependency inversion
 * - SOLID: Dependency Inversion Principle - depend on abstractions
 * - DRY: Single interface definition for all implementations
 * - Clean Architecture: Domain layer independent of infrastructure
 */

const TimeConstants = require('../../utils/TimeConstants');

/**
 * @typedef {import('../entities/Item.js').Item} Item
 * @typedef {import('../../types/domain/Item.js').ItemSearchCriteria} ItemSearchCriteria
 * @typedef {import('../../types/shared/Common.js').PaginationOptions} PaginationOptions
 * @typedef {import('../../types/shared/Common.js').PaginationResult} PaginationResult
 * @typedef {import('../../types/shared/Common.js').BulkOperationResult} BulkOperationResult
 * @typedef {import('../../types/domain/Item.js').ItemStatistics} ItemStatistics
 */

/**
 * Abstract Item Repository Interface
 *
 * This interface defines the contract that all item repository implementations must follow.
 * It provides abstraction over data access operations, allowing the domain layer to remain
 * independent of specific persistence technologies.
 */
class IItemRepository {
  /**
   * Find an item by its ID
   * @param {ItemId} itemId - Item identifier
   * @param {Object} [options] - Query options
   * @param {boolean} [options.includeInactive=false] - Include inactive items
   * @returns {Promise<Item|null>} Item if found, null otherwise
   * @throws {Error} If operation fails
   */
  async findById(itemId, options = {}) {

    throw new Error('IItemRepository.findById must be implemented');
  }

  /**
   * Find multiple items by their IDs
   * @param {ItemId[]} itemIds - Array of item identifiers
   * @param {Object} [options] - Query options
   * @param {boolean} [options.includeInactive=false] - Include inactive items
   * @param {Object} [options.sort] - Sort criteria
   * @returns {Promise<Item[]>} Array of found items
   * @throws {Error} If operation fails
   */
  async findByIds(itemIds, options = {}) {

    throw new Error('IItemRepository.findByIds must be implemented');
  }

  /**
   * Search items using various criteria
   * @param {ItemSearchCriteria} criteria - Search criteria
   * @param {PaginationOptions} [pagination] - Pagination options
   * @returns {Promise<{items: Item[], pagination: PaginationResult}>} Search results with pagination
   * @throws {Error} If operation fails
   */
  async search(criteria, pagination = {}) {

    throw new Error('IItemRepository.search must be implemented');
  }

  /**
   * Find items by text search
   * @param {string} searchTerm - Text to search for
   * @param {Object} [options] - Search options
   * @param {boolean} [options.members] - Filter by members status
   * @param {boolean} [options.tradeable] - Filter by tradeable status
   * @param {number} [options.limit=20] - Maximum results to return
   * @returns {Promise<Item[]>} Array of matching items
   * @throws {Error} If operation fails
   */
  async searchByName(searchTerm, options = {}) {

    throw new Error('IItemRepository.searchByName must be implemented');
  }

  /**
   * Get high-value items
   * @param {Object} [options] - Filter options
   * @param {number} [options.minValue=100000] - Minimum value threshold
   * @param {number} [options.limit=50] - Maximum results to return
   * @param {boolean} [options.members] - Filter by members status
   * @returns {Promise<Item[]>} Array of high-value items
   * @throws {Error} If operation fails
   */
  async getHighValueItems(options = {}) {

    throw new Error('IItemRepository.getHighValueItems must be implemented');
  }

  /**
   * Get items requiring synchronization
   * @param {number} [maxAge=24*60*60*1000] - Maximum age in milliseconds
   * @returns {Promise<Item[]>} Array of items needing sync
   * @throws {Error} If operation fails
   */
  async getItemsRequiringSync(maxAge = TimeConstants.ONE_DAY) {

    throw new Error('IItemRepository.getItemsRequiringSync must be implemented');
  }

  /**
   * Get items by category
   * @param {string} category - Item category
   * @param {Object} [options] - Filter options
   * @param {boolean} [options.tradeable] - Filter by tradeable status
   * @param {Object} [options.sort] - Sort criteria
   * @param {number} [options.limit] - Maximum results to return
   * @returns {Promise<Item[]>} Array of items in category
   * @throws {Error} If operation fails
   */
  async getItemsByCategory(category, options = {}) {

    throw new Error('IItemRepository.getItemsByCategory must be implemented');
  }

  /**
   * Get paginated items with filtering
   * @param {PaginationOptions} pagination - Pagination options
   * @param {Object} [filters] - Additional filters
   * @param {boolean} [filters.members] - Filter by members status
   * @param {boolean} [filters.tradeable] - Filter by tradeable status
   * @param {number} [filters.minValue] - Minimum value filter
   * @param {number} [filters.maxValue] - Maximum value filter
   * @returns {Promise<{items: Item[], pagination: PaginationResult}>} Paginated results
   * @throws {Error} If operation fails
   */
  async getPaginatedItems(pagination, filters = {}) {

    throw new Error('IItemRepository.getPaginatedItems must be implemented');
  }

  /**
   * Save a single item (create or update)
   * @param {Item} item - Item to save
   * @returns {Promise<Item>} Saved item
   * @throws {Error} If operation fails
   */
  async save(item) {

    throw new Error('IItemRepository.save must be implemented');
  }

  /**
   * Save multiple items in a batch operation
   * @param {Item[]} items - Items to save
   * @param {Object} [options] - Save options
   * @param {boolean} [options.upsert=true] - Create if not exists
   * @param {boolean} [options.ordered=false] - Stop on first error
   * @returns {Promise<BulkOperationResult>} Bulk operation result
   * @throws {Error} If operation fails
   */
  async saveMany(items, options = {}) {

    throw new Error('IItemRepository.saveMany must be implemented');
  }

  /**
   * Delete an item (soft delete - mark as removed)
   * @param {ItemId} itemId - Item identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If operation fails
   */
  async delete(itemId) {

    throw new Error('IItemRepository.delete must be implemented');
  }

  /**
   * Permanently delete an item from storage
   * @param {ItemId} itemId - Item identifier
   * @returns {Promise<boolean>} True if deleted, false if not found
   * @throws {Error} If operation fails
   */
  async hardDelete(itemId) {

    throw new Error('IItemRepository.hardDelete must be implemented');
  }

  /**
   * Mark items as synced
   * @param {ItemId[]} itemIds - Item identifiers
   * @returns {Promise<BulkOperationResult>} Bulk operation result
   * @throws {Error} If operation fails
   */
  async markItemsAsSynced(itemIds) {

    throw new Error('IItemRepository.markItemsAsSynced must be implemented');
  }

  /**
   * Get repository statistics
   * @returns {Promise<ItemStatistics>} Repository statistics
   * @throws {Error} If operation fails
   */
  async getStatistics() {
    throw new Error('IItemRepository.getStatistics must be implemented');
  }

  /**
   * Count items matching criteria
   * @param {ItemSearchCriteria} [criteria] - Search criteria
   * @returns {Promise<number>} Number of matching items
   * @throws {Error} If operation fails
   */
  async count(criteria = {}) {

    throw new Error('IItemRepository.count must be implemented');
  }

  /**
   * Check if an item exists
   * @param {ItemId} itemId - Item identifier
   * @returns {Promise<boolean>} True if exists, false otherwise
   * @throws {Error} If operation fails
   */
  async exists(itemId) {

    throw new Error('IItemRepository.exists must be implemented');
  }

  /**
   * Execute a transaction
   * @param {Function} operation - Function to execute within transaction
   * @returns {Promise<*>} Result of the operation
   * @throws {Error} If operation fails
   */
  async transaction(operation) {

    throw new Error('IItemRepository.transaction must be implemented');
  }

  /**
   * Create indexes for optimal query performance
   * @returns {Promise<void>}
   * @throws {Error} If operation fails
   */
  async createIndexes() {
    throw new Error('IItemRepository.createIndexes must be implemented');
  }

  /**
   * Drop all indexes
   * @returns {Promise<void>}
   * @throws {Error} If operation fails
   */
  async dropIndexes() {
    throw new Error('IItemRepository.dropIndexes must be implemented');
  }

  /**
   * Get health status of the repository
   * @returns {Promise<{healthy: boolean, details: Object}>} Health status
   * @throws {Error} If operation fails
   */
  async getHealth() {
    throw new Error('IItemRepository.getHealth must be implemented');
  }

  /**
   * Backup repository data
   * @param {string} [destination] - Backup destination
   * @returns {Promise<{success: boolean, location: string, size: number}>} Backup result
   * @throws {Error} If operation fails
   */
  async backup(destination) {

    throw new Error('IItemRepository.backup must be implemented');
  }

  /**
   * Restore repository data from backup
   * @param {string} source - Backup source location
   * @param {Object} [options] - Restore options
   * @param {boolean} [options.overwrite=false] - Overwrite existing data
   * @returns {Promise<{success: boolean, itemsRestored: number}>} Restore result
   * @throws {Error} If operation fails
   */
  async restore(source, options = {}) {

    throw new Error('IItemRepository.restore must be implemented');
  }
}

module.exports = { IItemRepository };
