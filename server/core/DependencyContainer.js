/**
 * 🏭 Dependency Injection Container - Context7 Pattern
 *
 * Implements Dependency Inversion Principle by providing:
 * - Single point of dependency registration and resolution
 * - Abstracts concrete implementations from high-level modules
 * - Supports singleton and transient lifecycles
 * - Enables easy testing and configuration changes
 *
 * SOLID Principles Applied:
 * - DIP: High-level modules depend on abstractions, not concretions
 * - SRP: Single responsibility for dependency management
 * - OCP: Open for extension with new dependencies
 */

const { Logger } = require('../utils/Logger');

class DependencyContainer {
  constructor() {
    this.dependencies = new Map();
    this.singletons = new Map();
    this.logger = new Logger('DependencyContainer');
  }

  /**
   * Register a dependency with its factory function
   * @param {string} name - Dependency name
   * @param {Function} factory - Factory function to create the dependency
   * @param {Object} options - Configuration options
   * @param {boolean} options.singleton - Whether to create a singleton instance
   */
  register(name, factory, options = { singleton: false }) {
    this.dependencies.set(name, { factory, options });
    this.logger.debug(`Registered dependency: ${name}`, { singleton: options.singleton });
  }

  /**
   * Resolve a dependency by name
   * @param {string} name - Dependency name
   * @returns {*} The resolved dependency instance
   */
  resolve(name) {
    const dependency = this.dependencies.get(name);

    if (!dependency) {
      throw new Error(`Dependency '${name}' not found. Available: ${Array.from(this.dependencies.keys()).join(', ')}`);
    }

    // Return singleton instance if already created
    if (dependency.options.singleton && this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Create new instance
    const instance = dependency.factory(this);

    // Store singleton instance
    if (dependency.options.singleton) {
      this.singletons.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a dependency is registered
   * @param {string} name - Dependency name
   * @returns {boolean}
   */
  has(name) {
    return this.dependencies.has(name);
  }

  /**
   * Clear all dependencies (useful for testing)
   */
  clear() {
    this.dependencies.clear();
    this.singletons.clear();
    this.logger.debug('Cleared all dependencies');
  }

  /**
   * Get list of registered dependency names
   * @returns {string[]}
   */
  getRegisteredNames() {
    return Array.from(this.dependencies.keys());
  }
}

// Export singleton instance
module.exports = { DependencyContainer };
