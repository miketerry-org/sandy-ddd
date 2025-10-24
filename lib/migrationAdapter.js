// migrationAdapter.js

"use strict";

export default class MigrationAdapter {
  /**
   * Ensure the migration tracking table exists.
   * @returns {Promise<void>}
   */
  async ensureMigrationTable() {
    throw new Error("ensureMigrationTable must be implemented by subclass");
  }

  /**
   * Execute a single operation (for “up” migration).
   * @param {Operation} operation
   * @returns {Promise<void>}
   */
  async executeOperation(operation) {
    throw new Error("executeOperation must be implemented by subclass");
  }

  /**
   * Revert a single operation (for “down” migration).
   * @param {Operation} operation
   * @returns {Promise<void>}
   */
  async revertOperation(operation) {
    throw new Error("revertOperation must be implemented by subclass");
  }
}
