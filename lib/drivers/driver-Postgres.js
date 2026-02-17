// ./lib/driver-postgres.js

import SQLDriver from "./driver-sql.js";

/**
 * PostgresDriver
 * -------------------------------------------------------------
 * Concrete SQL driver for PostgreSQL.
 *
 * Extends SQLDriver and implements:
 * - Connection pooling via pg.Pool
 * - Execute, transactions, and DDL
 * - PostgreSQL dialect hooks
 */
export default class PostgresDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 5432 } = config;
    if (!host || !user || !database) {
      throw new Error(
        "PostgresDriver requires `host`, `user`, and `database` in config."
      );
    }

    this.config = { host, user, password, database, port };
    this.pool = null; // connection pool
    this.client = null; // active transaction client
    this.pg = null; // lazy pg module
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  async connect() {
    if (this.pool) return;

    if (!this.pg) {
      try {
        this.pg = await import("pg");
      } catch {
        throw new Error("Failed to load 'pg'. Install with `npm install pg`.");
      }
    }

    const { Pool } = this.pg;
    this.pool = new Pool(this.config);
    this.db = this.pool; // for SQLDriver if needed
  }

  async disconnect() {
    if (!this.pool) return;
    await this.pool.end();
    this.pool = null;
    this.db = null;
  }

  /* =============================================================
   * Query Execution
   * ============================================================= */

  async execute(sql, params = []) {
    if (!this.pool) throw new Error("PostgresDriver is not connected.");
    const executor = this.client ?? this.pool;
    const result = await executor.query(sql, params);
    return result.rows;
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  async startTransaction() {
    if (!this.pool) throw new Error("PostgresDriver is not connected.");
    this.client = await this.pool.connect();
    await this.client.query("BEGIN");
  }

  async commitTransaction() {
    if (!this.client) return;
    await this.client.query("COMMIT");
    this.client.release();
    this.client = null;
  }

  async rollbackTransaction() {
    if (!this.client) return;
    await this.client.query("ROLLBACK");
    this.client.release();
    this.client = null;
  }

  /* =============================================================
   * DDL Methods
   * ============================================================= */

  async createTable(operation) {
    const { tableName, columns, indexes } = operation.params;

    const columnDefs = columns.map(col => {
      let sql = `${this.formatIdentifier(col.name)} ${col.type.toUpperCase()}`;
      if (col.length) sql += `(${col.length})`;
      if (col.primary)
        sql += col.autoIncrement ? " SERIAL PRIMARY KEY" : " PRIMARY KEY";
      else {
        if (col.required) sql += " NOT NULL";
        if (col.unique) sql += " UNIQUE";
        if (col.default != null) sql += ` DEFAULT ${col.default}`;
      }
      return sql;
    });

    const createTableSQL = `CREATE TABLE IF NOT EXISTS ${this.formatIdentifier(tableName)} (${columnDefs.join(", ")})`;
    await this.execute(createTableSQL);

    // Create indexes
    for (const idx of indexes) {
      if (idx.primary) continue;
      const cols = idx.columns
        .map(
          c =>
            `${this.formatIdentifier(c.name)}${c.order === "DESC" ? " DESC" : ""}`
        )
        .join(", ");
      const unique = idx.unique ? "UNIQUE" : "";
      const sql = `CREATE ${unique} INDEX IF NOT EXISTS ${this.formatIdentifier(idx.name)} ON ${this.formatIdentifier(tableName)} (${cols})`;
      await this.execute(sql);
    }
  }

  async dropTable(operation) {
    const { tableName } = operation.params;
    await this.execute(
      `DROP TABLE IF EXISTS ${this.formatIdentifier(tableName)} CASCADE`
    );
  }

  async renameTable(operation) {
    const { oldName, newName } = operation.params;
    await this.execute(
      `ALTER TABLE ${this.formatIdentifier(oldName)} RENAME TO ${this.formatIdentifier(newName)}`
    );
  }

  async addColumn(operation) {
    const { tableName, column } = operation.params;
    let sql = `ALTER TABLE ${this.formatIdentifier(tableName)} ADD COLUMN ${this.formatIdentifier(column.name)} ${column.type.toUpperCase()}`;
    if (column.length) sql += `(${column.length})`;
    if (column.required) sql += " NOT NULL";
    if (column.unique) sql += " UNIQUE";
    if (column.default != null) sql += ` DEFAULT ${column.default}`;
    await this.execute(sql);
  }

  async dropColumn(operation) {
    const { tableName, columnName } = operation.params;
    await this.execute(
      `ALTER TABLE ${this.formatIdentifier(tableName)} DROP COLUMN IF EXISTS ${this.formatIdentifier(columnName)} CASCADE`
    );
  }

  async alterColumn(operation) {
    const { tableName, columnName, definition } = operation.params;
    const sql = `ALTER TABLE ${this.formatIdentifier(tableName)} ALTER COLUMN ${this.formatIdentifier(columnName)} TYPE ${definition.type.toUpperCase()}`;
    await this.execute(sql);
  }

  async renameColumn(operation) {
    const { tableName, oldName, newName } = operation.params;
    const sql = `ALTER TABLE ${this.formatIdentifier(tableName)} RENAME COLUMN ${this.formatIdentifier(oldName)} TO ${this.formatIdentifier(newName)}`;
    await this.execute(sql);
  }

  async createIndex(operation) {
    const { tableName, name, columns, unique } = operation.params;
    const cols = columns
      .map(
        c =>
          `${this.formatIdentifier(c.name)}${c.order === "DESC" ? " DESC" : ""}`
      )
      .join(", ");
    const sql = `CREATE ${unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${this.formatIdentifier(name)} ON ${this.formatIdentifier(tableName)} (${cols})`;
    await this.execute(sql);
  }

  async dropIndex(operation) {
    const { name } = operation.params;
    const sql = `DROP INDEX IF EXISTS ${this.formatIdentifier(name)}`;
    await this.execute(sql);
  }

  async createForeignKey(operation) {
    const { tableName, column, refTable, refColumn, name } = operation.params;
    const sql = `ALTER TABLE ${this.formatIdentifier(tableName)}
                 ADD CONSTRAINT ${this.formatIdentifier(name)}
                 FOREIGN KEY (${this.formatIdentifier(column)})
                 REFERENCES ${this.formatIdentifier(refTable)}(${this.formatIdentifier(refColumn)})`;
    await this.execute(sql);
  }

  async dropForeignKey(operation) {
    const { tableName, name } = operation.params;
    const sql = `ALTER TABLE ${this.formatIdentifier(tableName)} DROP CONSTRAINT IF EXISTS ${this.formatIdentifier(name)}`;
    await this.execute(sql);
  }

  /* =============================================================
   * Dialect Hooks
   * ============================================================= */

  placeholder(index) {
    return `$${index}`;
  }

  formatIdentifier(name) {
    return `"${name}"`;
  }

  supportsReturning() {
    return true;
  }

  supportsUpsert() {
    return true;
  }
}
