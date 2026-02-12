// ./lib/driver-postgres.js

import SQLDriver from "./driver-sql.js";

/**
 * PostgresDriver
 * -------------------------------------------------------------
 * Concrete relational database driver for PostgreSQL.
 *
 * This driver extends SQLDriver and implements PostgreSQL-specific
 * connection, execution, and transaction behavior using the
 * official `pg` package.
 *
 * Key characteristics:
 * - Uses `pg.Pool` for connection pooling.
 * - Lazily loads the `pg` package so PostgreSQL remains optional.
 * - Fully supports `$1, $2, ...` parameter placeholders.
 * - Supports `RETURNING *`, allowing SQLDriver's default CRUD
 *   implementations to work without overrides.
 * - Uses a dedicated client connection for transactions.
 */
export default class PostgresDriver extends SQLDriver {
  /**
   * @param {object} config
   * @param {string} config.host
   * @param {string} config.user
   * @param {string} [config.password]
   * @param {string} config.database
   * @param {number} [config.port=5432]
   */
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 5432 } = config;

    if (!host || !user || !database) {
      throw new Error(
        "PostgresDriver requires `host`, `user`, and `database` in config."
      );
    }

    // PostgreSQL connection configuration
    this.config = { host, user, password, database, port };

    // Connection pool
    this.pool = null;

    // Dedicated client for active transactions
    this.client = null;

    // Lazily-loaded pg module reference
    this.pg = null;
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Establishes the PostgreSQL connection pool.
   *
   * Safe to call multiple times.
   */
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
   * Routes queries to the active transaction client if one exists;
   * otherwise uses the connection pool.
   *
   * @param {string} sql
   * @param {Array} params
   * @returns {Array} Result rows
   */
  async execute(sql, params = []) {
    if (!this.pool) {
      throw new Error("PostgresDriver is not connected.");
    }

    const executor = this.client ?? this.pool;
    const result = await executor.query(sql, params);
    return result.rows;
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  /**
   * Starts a database transaction using a dedicated client
   * from the connection pool.
   */
  async startTransaction() {
    if (!this.pool) {
      throw new Error("PostgresDriver is not connected.");
    }

    this.client = await this.pool.connect();
    await this.client.query("BEGIN");
  }

  /**
   * Commits the active transaction and releases the client.
   */
  async commitTransaction() {
    if (!this.client) return;

    await this.client.query("COMMIT");
    this.client.release();
    this.client = null;
  }

  /**
   * Rolls back the active transaction and releases the client.
   */
  async rollbackTransaction() {
    if (!this.client) return;

    await this.client.query("ROLLBACK");
    this.client.release();
    this.client = null;
  }
}
