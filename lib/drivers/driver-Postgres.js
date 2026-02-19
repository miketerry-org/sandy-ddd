// ./lib/driver-postgres.js

import SQLDriver from "./driver-sql.js";

/**
 * PostgresDriver
 * -------------------------------------------------------------
 * Concrete relational database driver for PostgreSQL.
 * Implements all DDL/DML methods from SQLDriver and the migration contract.
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

    const executor = this.client || this.pool;

    if (typeof executor.query !== "function") {
      throw new Error(
        "PostgresDriver executor is not ready. Did you forget to await connect()?"
      );
    }

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
   * DML Methods
   * ============================================================= */

  async insertOne(target, entity) {
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const placeholders = keys.map((_, i) => this.placeholder(i + 1));
    const sql = `INSERT INTO ${this.formatIdentifier(target)} (${keys
      .map(k => this.formatIdentifier(k))
      .join(", ")})
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
          `(${keys
            .map((__, j) => this.placeholder(i * keys.length + j + 1))
            .join(", ")})`
      )
      .join(", ");
    const values = entities.flatMap(Object.values);
    const sql = `INSERT INTO ${this.formatIdentifier(target)} (${keys
      .map(k => this.formatIdentifier(k))
      .join(", ")})
      VALUES ${placeholders} RETURNING *`;
    return this.query(sql, values);
  }

  async updateOne(target, entity) {
    if (!entity.id) throw new Error("updateOne requires `id` in entity.");
    const keys = Object.keys(entity).filter(k => k !== "id");
    const setClause = keys
      .map((k, i) => `${this.formatIdentifier(k)}=${this.placeholder(i + 1)}`)
      .join(", ");
    const sql = `UPDATE ${this.formatIdentifier(target)} SET ${setClause} WHERE ${this.formatIdentifier(
      "id"
    )}=${this.placeholder(keys.length + 1)} RETURNING *`;
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
    const sql = `DELETE FROM ${this.formatIdentifier(target)} WHERE ${this.formatIdentifier(
      "id"
    )}=${this.placeholder(1)} RETURNING *`;
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
    if (!entity.id) throw new Error("upsert requires `id` in entity.");
    const keys = Object.keys(entity);
    const values = Object.values(entity);
    const setClause = keys
      .filter(k => k !== "id")
      .map(
        k => `${this.formatIdentifier(k)}=EXCLUDED.${this.formatIdentifier(k)}`
      )
      .join(", ");
    const sql = `INSERT INTO ${this.formatIdentifier(target)} (${keys
      .map(k => this.formatIdentifier(k))
      .join(", ")})
      VALUES (${keys.map((_, i) => this.placeholder(i + 1)).join(", ")})
      ON CONFLICT (${this.formatIdentifier("id")}) DO UPDATE SET ${setClause} RETURNING *`;
    const [row] = await this.query(sql, values);
    return row;
  }

  /* =============================================================
   * DDL Methods
   * ============================================================= */

  async createTable(operation) {
    if (!this.pool) throw new Error("PostgresDriver is not connected.");

    const { tableName, columns = [], indexes = [] } = operation.params;
    if (!tableName) throw new Error("createTable requires a tableName");

    const columnDefs = [];
    const primaryColumns = [];

    for (const col of columns) {
      let sql = `"${col.name}" `;

      switch (col.type) {
        case "INTEGER":
          sql += col.primary && col.autoIncrement ? "SERIAL" : "INTEGER";
          break;
        case "VARCHAR":
          sql += `VARCHAR(${col.length || 255})`;
          break;
        case "BOOLEAN":
          sql += "BOOLEAN";
          break;
        case "TIMESTAMP":
          sql += "TIMESTAMP";
          break;
        default:
          throw new Error(`Unsupported column type: ${col.type}`);
      }

      if (col.required) sql += " NOT NULL";
      if (col.default !== undefined && col.default !== null)
        sql += ` DEFAULT ${col.default}`;

      if (col.primary) primaryColumns.push(`"${col.name}"`);
      columnDefs.push(sql);
    }

    if (primaryColumns.length) {
      columnDefs.push(`PRIMARY KEY (${primaryColumns.join(", ")})`);
    }

    const createSQL = `
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        ${columnDefs.join(",\n")}
      );
    `;

    await this.pool.query(createSQL);

    for (const index of indexes) {
      const cols = index.columns.map(c => `"${c.name}"`).join(", ");
      const unique = index.unique ? "UNIQUE" : "";
      const indexSQL = `CREATE ${unique} INDEX IF NOT EXISTS "${index.name}" ON "${tableName}" (${cols});`;
      await this.pool.query(indexSQL);
    }

    return true;
  }

  async dropTable(operation) {
    if (!this.pool) throw new Error("PostgresDriver is not connected.");
    const { tableName } = operation.params;
    if (!tableName) throw new Error("dropTable requires tableName");
    const sql = `DROP TABLE IF EXISTS "${tableName}" CASCADE`;
    await this.pool.query(sql);
    return true;
  }

  // For other DDL operations, implement similar patterns
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
