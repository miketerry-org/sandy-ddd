// ./lib/driver-sqlite.js

import SQLDriver from "./driver-sql.js";

/**
 * SqliteDriver
 * -------------------------------------------------------------
 * Concrete relational database driver for SQLite using libsql.
 *
 * This driver adapts SQLite (via `@libsql/client`) to the shared
 * SQLDriver contract used by all relational databases.
 *
 * Key characteristics:
 * - Uses `@libsql/client` (local or remote SQLite/libsql backends).
 * - Lazily loads the libsql client so SQLite remains optional.
 * - Supports transactional semantics via explicit BEGIN / COMMIT.
 * - Uses positional parameters mapped to libsql's expected format.
 *
 * Notes on dialect behavior:
 * - SQLite does NOT reliably support `RETURNING *` in all builds.
 * - SQLDriver methods relying on `RETURNING` may need overrides
 *   in higher layers if strict portability is required.
 */
export default class SqliteDriver extends SQLDriver {
  /**
   * @param {object} config
   * @param {string} config.url SQLite/libsql connection URL
   *   (e.g. file:./db.sqlite or libsql://...)
   */
  constructor(config = {}) {
    super(config);

    if (!config.url) {
      throw new Error(
        "SqliteDriver requires a `url` in config (e.g. file:./db.sqlite)"
      );
    }

    // SQLite / libsql connection URL
    this.url = config.url;

    // Active libsql client
    this.db = null;

    // Lazily loaded libsql module
    this.libsql = null;
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Establishes a SQLite/libsql connection.
   *
   * Safe to call multiple times.
   */
  async connect() {
    if (this.db) return;

    if (!this.libsql) {
      try {
        this.libsql = await import("@libsql/client");
      } catch {
        throw new Error(
          "Failed to load '@libsql/client'. Install it with `npm install @libsql/client`."
        );
      }
    }

    const { createClient } = this.libsql;
    this.db = createClient({ url: this.url });
  }

  /**
   * Closes the SQLite/libsql connection if supported.
   */
  async disconnect() {
    if (!this.db) return;

    if (typeof this.db.close === "function") {
      await this.db.close();
    }

    this.db = null;
  }

  /* =============================================================
   * SQL Execution
   * ============================================================= */

  /**
   * Executes a SQL statement with bound parameters.
   *
   * libsql expects parameters as an object keyed by 1-based
   * positional indexes or named parameters. This method
   * normalizes array-style params to the required format.
   *
   * @param {string} sql
   * @param {Array} params
   * @returns {Array|object} Result rows or execution metadata
   */
  async execute(sql, params = []) {
    if (!this.db) {
      throw new Error("SqliteDriver is not connected.");
    }

    // Convert array params to libsql positional bindings: { 1: v1, 2: v2 }
    const boundParams = params.reduce((acc, value, index) => {
      acc[index + 1] = value;
      return acc;
    }, {});

    const result = await this.db.execute(sql, boundParams);

    // libsql returns rows only for SELECT statements
    if (/^\s*select/i.test(sql)) {
      return result.rows;
    }

    // For INSERT / UPDATE / DELETE, return the raw result
    return result;
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  /**
   * Begins a SQLite transaction.
   */
  async startTransaction() {
    await this.execute("BEGIN TRANSACTION");
  }

  /**
   * Commits the active transaction.
   */
  async commitTransaction() {
    await this.execute("COMMIT");
  }

  /**
   * Rolls back the active transaction.
   */
  async rollbackTransaction() {
    await this.execute("ROLLBACK");
  }
}
