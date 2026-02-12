//

"use strict";

import MigrationAdapter from "./migrationAdapter.js";
import pkg from "pg";
const { Client } = pkg;

export default class MigrationAdapterPostgres extends MigrationAdapter {
  /**
   * @param {Object} config - PostgreSQL connection config (host, user, password, database, port)
   */
  constructor(config) {
    super();
    this.config = config;
    this.client = new Client(config);
    this.connected = false;
  }

  async _connect() {
    if (!this.connected) {
      await this.client.connect();
      this.connected = true;
    }
  }

  async ensureMigrationTable() {
    await this._connect();
    const sql = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await this.client.query(sql);
  }

  async fetchAppliedIds() {
    await this._connect();
    const res = await this.client.query("SELECT id FROM _migrations");
    return res.rows.map(row => row.id);
  }

  async recordAppliedMigration(id) {
    await this._connect();
    await this.client.query(
      "INSERT INTO _migrations (id, applied_at) VALUES ($1, CURRENT_TIMESTAMP)",
      [id]
    );
  }

  async recordRolledBackMigration(id) {
    await this._connect();
    await this.client.query("DELETE FROM _migrations WHERE id = $1", [id]);
  }

  async executeOperation(operation) {
    await this._connect();
    const { tableName, columns, indexes } = operation.params;

    const columnDefs = columns.map(col => {
      let sql = `"${col.name}" ${col.type.toUpperCase()}`;
      if (col.length) sql += `(${col.length})`;
      if (col.primary) {
        sql += col.autoIncrement ? " SERIAL PRIMARY KEY" : " PRIMARY KEY";
      } else {
        if (col.required) sql += " NOT NULL";
        if (col.unique) sql += " UNIQUE";
        if (col.default != null) sql += ` DEFAULT '${col.default}'`;
      }
      return sql;
    });

    const createTableSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs.join(
      ", "
    )})`;
    await this.client.query(createTableSQL);

    // Create indexes
    for (const idx of indexes) {
      if (idx.primary) continue; // primary handled in table
      const cols = idx.columns
        .map(c => `"${c.name}"${c.order === "DESC" ? " DESC" : ""}`)
        .join(", ");
      const unique = idx.unique ? "UNIQUE" : "";
      const sql = `CREATE ${unique} INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}" (${cols})`;
      await this.client.query(sql);
    }
  }

  async revertOperation(operation) {
    await this._connect();
    const { tableName, indexes } = operation.params;

    for (const idx of indexes) {
      if (idx.primary) continue;
      const sql = `DROP INDEX IF EXISTS "${idx.name}"`;
      try {
        await this.client.query(sql);
      } catch (err) {
        // ignore missing index
      }
    }

    // Dropping columns or tables is not handled automatically
  }

  async close() {
    if (this.connected) {
      await this.client.end();
      this.connected = false;
    }
  }
}
