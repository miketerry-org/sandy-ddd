// ./lib/driver-sql.js

import BaseDriver from "./driver-base.js";

/**
 * SQLDriver
 * -------------------------------------------------------------
 * Base class for relational database drivers.
 * Provides:
 *  - Migration table management
 *  - Operation dispatcher
 *  - Shared SQL utilities
 *
 * Concrete drivers (Postgres, MySQL, SQLite) must implement:
 *  - query()
 *  - placeholder()
 *  - formatIdentifier()
 *  - DDL methods (createTable, dropTable, etc.)
 */
export default class SQLDriver extends BaseDriver {
  constructor(config = {}) {
    super(config);
  }

  /* =============================================================
   * SQL Utilities (Must Be Implemented Per Dialect)
   * ============================================================= */

  placeholder(index) {
    this.requireOverride("placeholder");
  }

  formatIdentifier(name) {
    this.requireOverride("formatIdentifier");
  }

  /* =============================================================
   * Migration Table Management
   * ============================================================= */

  async ensureMigrationTable() {
    const table = this.formatIdentifier("turbo_migrations");

    await this.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async fetchAppliedIds() {
    const table = this.formatIdentifier("turbo_migrations");
    const rows = await this.query(`SELECT id FROM ${table}`);
    return rows.map(r => r.id);
  }

  async recordAppliedMigration(id) {
    const table = this.formatIdentifier("turbo_migrations");

    await this.query(
      `INSERT INTO ${table} (id)
       VALUES (${this.placeholder(1)})`,
      [id]
    );
  }

  async recordRolledBackMigration(id) {
    const table = this.formatIdentifier("turbo_migrations");

    await this.query(
      `DELETE FROM ${table}
       WHERE id = ${this.placeholder(1)}`,
      [id]
    );
  }

  /* =============================================================
   * Operation Dispatcher
   * ============================================================= */

  async executeOperation(operation) {
    switch (operation.type) {
      case "createTable":
        return this.createTable(operation);

      case "dropTable":
        return this.dropTable(operation);

      case "addColumn":
        return this.addColumn(operation);

      case "dropColumn":
        return this.dropColumn(operation);

      case "createIndex":
        return this.createIndex(operation);

      case "dropIndex":
        return this.dropIndex(operation);

      case "renameTable":
        return this.renameTable(operation);

      case "renameColumn":
        return this.renameColumn(operation);

      case "alterColumn":
        return this.alterColumn(operation);

      case "createForeignKey":
        return this.createForeignKey(operation);

      case "dropForeignKey":
        return this.dropForeignKey(operation);

      default:
        throw new Error(`Unsupported schema operation type: ${operation.type}`);
    }
  }

  /* =============================================================
   * DDL Methods (Must Be Implemented by Concrete Drivers)
   * ============================================================= */

  async createTable(operation) {
    this.requireOverride("createTable");
  }

  async dropTable(operation) {
    this.requireOverride("dropTable");
  }

  async addColumn(operation) {
    this.requireOverride("addColumn");
  }

  async dropColumn(operation) {
    this.requireOverride("dropColumn");
  }

  async createIndex(operation) {
    this.requireOverride("createIndex");
  }

  async dropIndex(operation) {
    this.requireOverride("dropIndex");
  }

  async renameTable(operation) {
    this.requireOverride("renameTable");
  }

  async renameColumn(operation) {
    this.requireOverride("renameColumn");
  }

  async alterColumn(operation) {
    this.requireOverride("alterColumn");
  }

  async createForeignKey(operation) {
    this.requireOverride("createForeignKey");
  }

  async dropForeignKey(operation) {
    this.requireOverride("dropForeignKey");
  }
}
