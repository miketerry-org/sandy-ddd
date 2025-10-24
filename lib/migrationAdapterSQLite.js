//

"use strict";

import MigrationAdapter from "./migrationAdapter.js";
import { createClient } from "libsql";

export default class MigrationAdapterSQLite extends MigrationAdapter {
  /**
   * @param {string} url - SQLite connection string for libsql
   */
  constructor(url) {
    super();
    this.client = createClient({ url });
  }

  async ensureMigrationTable() {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async fetchAppliedIds() {
    const res = await this.client.execute("SELECT id FROM _migrations");
    return res.rows.map(row => row.id);
  }

  async recordAppliedMigration(id) {
    await this.client.execute(
      "INSERT INTO _migrations (id, applied_at) VALUES (?, CURRENT_TIMESTAMP)",
      [id]
    );
  }

  async recordRolledBackMigration(id) {
    await this.client.execute("DELETE FROM _migrations WHERE id = ?", [id]);
  }

  async executeOperation(operation) {
    const { tableName, columns, indexes } = operation.params;

    // Construct CREATE TABLE statement
    const columnDefs = columns.map(col => {
      let sql = `"${col.name}" ${col.type}`;
      if (col.length) sql += `(${col.length})`;
      if (col.required) sql += " NOT NULL";
      if (col.primary) sql += " PRIMARY KEY";
      if (col.autoIncrement) sql += " AUTOINCREMENT";
      if (col.unique && !col.primary) sql += " UNIQUE";
      if (col.default != null) sql += ` DEFAULT ${col.default}`;
      return sql;
    });

    const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs.join(
      ", "
    )})`;
    await this.client.execute(createTableSQL);

    // Create indexes
    for (const idx of indexes) {
      if (idx.primary) continue; // primary handled in table
      const cols = idx.columns
        .map(c => `"${c.name}" ${c.order === "DESC" ? "DESC" : "ASC"}`)
        .join(", ");
      const unique = idx.unique ? "UNIQUE" : "";
      const sql = `CREATE ${unique} INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}" (${cols})`;
      await this.client.execute(sql);
    }
  }

  async revertOperation(operation) {
    const { tableName, indexes } = operation.params;

    // Drop indexes created by this operation
    for (const idx of indexes) {
      if (idx.primary) continue; // can't drop primary via index
      const sql = `DROP INDEX IF EXISTS "${idx.name}"`;
      await this.client.execute(sql);
    }

    // SQLite does not support dropping columns easily, so we won't handle column drops
  }

  async close() {
    if (this.client) await this.client.close();
  }
}
