// migrationAdapterMySQL.js
"use strict";

import MigrationAdapter from "./migrationAdapter.js";
import mysql from "mysql2/promise";

export default class MigrationAdapterMySQL extends MigrationAdapter {
  /**
   * @param {Object} config - MySQL connection config (host, user, password, database)
   */
  constructor(config) {
    super();
    this.config = config;
    this.connection = null;
  }

  async _connect() {
    if (!this.connection) {
      this.connection = await mysql.createConnection(this.config);
    }
  }

  async ensureMigrationTable() {
    await this._connect();
    const sql = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.connection.execute(sql);
  }

  async fetchAppliedIds() {
    await this._connect();
    const [rows] = await this.connection.execute("SELECT id FROM _migrations");
    return rows.map(row => row.id);
  }

  async recordAppliedMigration(id) {
    await this._connect();
    await this.connection.execute(
      "INSERT INTO _migrations (id, applied_at) VALUES (?, NOW())",
      [id]
    );
  }

  async recordRolledBackMigration(id) {
    await this._connect();
    await this.connection.execute("DELETE FROM _migrations WHERE id = ?", [id]);
  }

  async executeOperation(operation) {
    await this._connect();
    const { tableName, columns, indexes } = operation.params;

    // Build CREATE TABLE
    const columnDefs = columns.map(col => {
      let sql = `\`${col.name}\` ${col.type.toUpperCase()}`;
      if (col.length) sql += `(${col.length})`;
      if (col.required || col.primary) sql += " NOT NULL"; // primary implies required
      if (col.primary) sql += " PRIMARY KEY";
      if (col.autoIncrement) sql += " AUTO_INCREMENT";
      if (col.unique && !col.primary) sql += " UNIQUE";
      if (col.default != null) sql += ` DEFAULT '${col.default}'`;
      return sql;
    });

    const createTableSQL = `CREATE TABLE IF NOT EXISTS \`${tableName}\` (${columnDefs.join(
      ", "
    )}) ENGINE=InnoDB`;
    await this.connection.execute(createTableSQL);

    // Create indexes
    for (const idx of indexes) {
      if (idx.primary) continue; // primary handled in table
      const cols = idx.columns
        .map(c => `\`${c.name}${c.order === "DESC" ? " DESC" : ""}\``)
        .join(", ");
      const unique = idx.unique ? "UNIQUE" : "";
      const sql = `CREATE ${unique} INDEX \`${idx.name}\` ON \`${tableName}\` (${cols})`;
      await this.connection.execute(sql);
    }
  }

  async revertOperation(operation) {
    await this._connect();
    const { tableName, indexes } = operation.params;

    // Drop indexes created by this operation
    for (const idx of indexes) {
      if (idx.primary) continue; // primary handled in table
      const sql = `DROP INDEX \`${idx.name}\` ON \`${tableName}\``;
      try {
        await this.connection.execute(sql);
      } catch (err) {
        // Ignore if index does not exist
      }
    }

    // Dropping columns or tables is not handled automatically here
  }

  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }
}
