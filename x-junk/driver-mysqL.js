// ./lib/driver-mysql.js

import SQLDriver from "./driver-sql.js";

/**
 * MySQLDriver
 * -------------------------------------------------------------
 * Concrete relational database driver for MySQL / MariaDB.
 *
 * This driver extends SQLDriver and adapts MySQL-specific behavior
 * to the shared relational driver contract.
 *
 * Key characteristics:
 * - Uses `mysql2/promise` for async/await support.
 * - Lazily loads the MySQL driver to keep it an optional dependency.
 * - Uses connection pooling for normal operations.
 * - Uses a dedicated connection when running transactions.
 *
 * Notes on dialect differences:
 * - MySQL uses `?` placeholders instead of `$1, $2, ...`
 * - MySQL does not support `RETURNING *`
 *   → inserts and updates must be handled differently than Postgres
 */
export default class MySQLDriver extends SQLDriver {
  /**
   * @param {object} config
   * @param {string} config.host
   * @param {string} config.user
   * @param {string} [config.password]
   * @param {string} config.database
   * @param {number} [config.port=3306]
   */
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 3306 } = config;

    if (!host || !user || !database) {
      throw new Error(
        "MySQLDriver requires `host`, `user`, and `database` in config."
      );
    }

    // MySQL connection configuration
    this.config = { host, user, password, database, port };

    // Connection pool for normal queries
    this.pool = null;

    // Active transactional connection (when in a transaction)
    this.connection = null;

    // Lazily-loaded mysql2 module
    this.mysql = null;
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Establishes a MySQL connection pool.
   *
   * This method is idempotent and safe to call multiple times.
   */
  async connect() {
    if (this.pool) return;

    if (!this.mysql) {
      try {
        this.mysql = await import("mysql2/promise");
      } catch {
        throw new Error(
          "Failed to load 'mysql2'. Install it with `npm install mysql2`."
        );
      }
    }

    this.pool = await this.mysql.createPool(this.config);
    this.db = this.pool;
  }

  /**
   * Closes the connection pool and clears state.
   */
  async disconnect() {
    if (!this.pool) return;

    await this.pool.end();
    this.pool = null;
    this.db = null;
  }

  /* =============================================================
   * SQL Execution
   * ============================================================= */

  /**
   * Executes a SQL statement with parameters.
   *
   * Automatically routes queries to the active transaction
   * connection if one exists, otherwise uses the pool.
   *
   * @param {string} sql
   * @param {Array} params
   */
  async execute(sql, params = []) {
    if (!this.pool) {
      throw new Error("MySQLDriver is not connected.");
    }

    const executor = this.connection ?? this.pool;
    const [result] = await executor.execute(sql, params);

    return result;
  }

  /* =============================================================
   * Placeholder Handling
   * ============================================================= */

  /**
   * Overrides SQLDriver's WHERE clause builder to use `?`
   * placeholders instead of `$n`.
   */
  buildWhereClause(table, criteria = {}) {
    const keys = Object.keys(criteria);
    const params = keys.map(k => criteria[k]);

    const clauses = keys.map(k => `\`${k}\`=?`);

    const sql =
      `SELECT * FROM \`${table}\`` +
      (clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "");

    return { sql, params };
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */

  /**
   * Inserts a single row and returns the inserted record.
   *
   * Since MySQL does not support `RETURNING *`, this performs
   * a follow-up SELECT using the generated insert id.
   */
  async insertOne(table, entity) {
    const keys = Object.keys(entity);
    const columns = keys.map(k => `\`${k}\``).join(", ");
    const placeholders = keys.map(() => "?").join(", ");

    const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
    const result = await this.execute(sql, Object.values(entity));

    const id = result.insertId;
    if (id === undefined) return null;

    const rows = await this.execute(
      `SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`,
      [id]
    );

    return rows[0] ?? null;
  }

  /**
   * Updates a single row and returns the updated record.
   */
  async updateOne(table, entity, idField = "id") {
    if (entity[idField] === undefined) {
      throw new Error(`updateOne requires entity with ${idField}`);
    }

    const id = entity[idField];
    const updates = { ...entity };
    delete updates[idField];

    const keys = Object.keys(updates);
    if (!keys.length) return null;

    const setClause = keys.map(k => `\`${k}\`=?`).join(", ");

    const sql = `
      UPDATE \`${table}\`
      SET ${setClause}
      WHERE \`${idField}\`=?
    `;

    await this.execute(sql, [...keys.map(k => updates[k]), id]);

    const rows = await this.execute(
      `SELECT * FROM \`${table}\` WHERE \`${idField}\`=? LIMIT 1`,
      [id]
    );

    return rows[0] ?? null;
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  /**
   * Starts a transaction using a dedicated connection
   * from the pool.
   */
  async startTransaction() {
    if (!this.pool) {
      throw new Error("MySQLDriver is not connected.");
    }

    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
  }

  /**
   * Commits the active transaction and releases the connection.
   */
  async commitTransaction() {
    if (!this.connection) return;

    await this.connection.commit();
    this.connection.release();
    this.connection = null;
  }

  /**
   * Rolls back the active transaction and releases the connection.
   */
  async rollbackTransaction() {
    if (!this.connection) return;

    await this.connection.rollback();
    this.connection.release();
    this.connection = null;
  }
}
