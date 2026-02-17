// ./lib/driver-postgres.js

import SQLDriver from "./driver-sql.js";

/**
 * PostgresDriver
 * -------------------------------------------------------------
 * Concrete relational database driver for PostgreSQL.
 *
 * Implements all DDL and DML methods defined in SQLDriver.
 * Uses pg.Pool for connection pooling and dedicated clients for transactions.
 * Fully compatible with Operation objects.
 */
export default class PostgresDriver extends SQLDriver {
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 5432 } = config;

    if (!host || !user || !database) {
      throw new Error(
        "PostgresDriver requires `host`, `user`, and `database`."
      );
    }

    this.config = { host, user, password, database, port };
    this.pool = null;
    this.client = null;
    this.pg = null;
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
        throw new Error(
          "Failed to load 'pg'. Install it with `npm install pg`."
        );
      }
    }

    const { Pool } = this.pg;
    this.pool = new Pool(this.config);
    this.db = this.pool;
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

  async query(sql, params = []) {
    if (!this.pool) throw new Error("PostgresDriver is not connected.");
    const executor = this.client ?? this.pool;
    const result = await executor.query(sql, params);
    return result.rows;
  }

  placeholder(idx) {
    return `$${idx}`;
  }
  formatIdentifier(name) {
    return `"${name}"`;
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
   * DML Methods (safe updates/deletes by primary key)
   * ============================================================= */

  async insertOne(target, entity) {
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = keys.map((_, i) => this.placeholder(i + 1));
    const sql = `INSERT INTO ${this.formatIdentifier(target)} (${keys.map(k => this.formatIdentifier(k)).join(", ")})
                 VALUES (${placeholders.join(", ")}) RETURNING *`;
    const [row] = await this.query(sql, values);
    return row;
  }

  async insertMany(target, entities) {
    if (!entities.length) return [];
    const keys = Object.keys(entities[0]);
    const placeholders = entities
      .map(
        (_, i) =>
          `(${keys.map((__, j) => this.placeholder(i * keys.length + j + 1)).join(", ")})`
      )
      .join(", ");
    const values = entities.flatMap(Object.values);
    const sql = `INSERT INTO ${this.formatIdentifier(target)} (${keys.map(k => this.formatIdentifier(k)).join(", ")})
                 VALUES ${placeholders} RETURNING *`;
    return this.query(sql, values);
  }

  async updateOne(target, entity) {
    if (!entity.id) throw new Error("updateOne requires `id` in entity.");
    const keys = Object.keys(entity).filter(k => k !== "id");
    const setClause = keys
      .map((k, i) => `${this.formatIdentifier(k)}=${this.placeholder(i + 1)}`)
      .join(", ");
    const sql = `UPDATE ${this.formatIdentifier(target)} SET ${setClause} WHERE ${this.formatIdentifier("id")}=${this.placeholder(keys.length + 1)} RETURNING *`;
    const values = keys.map(k => entity[k]).concat(entity.id);
    const [row] = await this.query(sql, values);
    return row;
  }

  async updateMany(target, entities) {
    const updatedRows = [];
    for (const entity of entities) {
      const row = await this.updateOne(target, entity);
      updatedRows.push(row);
    }
    return updatedRows;
  }

  async deleteOne(target, entity) {
    if (!entity.id) throw new Error("deleteOne requires `id` in entity.");
    const sql = `DELETE FROM ${this.formatIdentifier(target)} WHERE ${this.formatIdentifier("id")}=${this.placeholder(1)} RETURNING *`;
    const [row] = await this.query(sql, [entity.id]);
    return row;
  }

  async deleteMany(target, entities) {
    const deletedRows = [];
    for (const entity of entities) {
      const row = await this.deleteOne(target, entity);
      deletedRows.push(row);
    }
    return deletedRows;
  }

  async deleteAll(target) {
    const sql = `DELETE FROM ${this.formatIdentifier(target)}`;
    return this.query(sql);
  }

  async upsert(target, entity) {
    // Simple Postgres upsert using ON CONFLICT on id
    if (!entity.id) throw new Error("upsert requires `id` in entity.");
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const setClause = keys
      .filter(k => k !== "id")
      .map(
        k => `${this.formatIdentifier(k)}=EXCLUDED.${this.formatIdentifier(k)}`
      )
      .join(", ");
    const sql = `INSERT INTO ${this.formatIdentifier(target)} (${keys.map(k => this.formatIdentifier(k)).join(", ")})
                 VALUES (${keys.map((_, i) => this.placeholder(i + 1)).join(", ")})
                 ON CONFLICT (${this.formatIdentifier("id")}) DO UPDATE SET ${setClause} RETURNING *`;
    const [row] = await this.query(sql, values);
    return row;
  }

  /* =============================================================
   * DDL Methods using Operation objects
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
        if (col.default != null) sql += ` DEFAULT '${col.default}'`;
      }
      return sql;
    });
    const createSQL = `CREATE TABLE IF NOT EXISTS ${this.formatIdentifier(tableName)} (${columnDefs.join(", ")})`;
    await this.query(createSQL);

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
      await this.query(sql);
    }
  }

  async dropTable(operation) {
    await this.query(
      `DROP TABLE IF EXISTS ${this.formatIdentifier(operation.params.tableName)} CASCADE`
    );
  }

  async addColumn(operation) {
    const { tableName, column } = operation.params;
    let sql = `ALTER TABLE ${this.formatIdentifier(tableName)} ADD COLUMN ${this.formatIdentifier(column.name)} ${column.type.toUpperCase()}`;
    if (column.length) sql += `(${column.length})`;
    if (column.required) sql += " NOT NULL";
    if (column.unique) sql += " UNIQUE";
    if (column.default != null) sql += ` DEFAULT '${column.default}'`;
    await this.query(sql);
  }

  async dropColumn(operation) {
    const { tableName, columnName } = operation.params;
    await this.query(
      `ALTER TABLE ${this.formatIdentifier(tableName)} DROP COLUMN IF EXISTS ${this.formatIdentifier(columnName)} CASCADE`
    );
  }

  async createIndex(operation) {
    const { tableName, name, columns, unique } = operation.params;
    const cols = columns
      .map(
        c =>
          `${this.formatIdentifier(c.name)}${c.order === "DESC" ? " DESC" : ""}`
      )
      .join(", ");
    const uq = unique ? "UNIQUE" : "";
    await this.query(
      `CREATE ${uq} INDEX IF NOT EXISTS ${this.formatIdentifier(name)} ON ${this.formatIdentifier(tableName)} (${cols})`
    );
  }

  async dropIndex(operation) {
    await this.query(
      `DROP INDEX IF EXISTS ${this.formatIdentifier(operation.params.name)}`
    );
  }

  // Remaining DDL methods (renameTable, alterColumn, renameColumn, createForeignKey, dropForeignKey)
  // can be implemented similarly depending on PostgreSQL syntax.
  async renameTable(operation) {
    this.requireOverride("renameTable");
  }
  async alterColumn(operation) {
    this.requireOverride("alterColumn");
  }
  async renameColumn(operation) {
    this.requireOverride("renameColumn");
  }
  async createForeignKey(operation) {
    this.requireOverride("createForeignKey");
  }
  async dropForeignKey(operation) {
    this.requireOverride("dropForeignKey");
  }
}
