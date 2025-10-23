// daoSqlite

"use strict";

import SQLDAO from "./sql-dao.js";

/**
 * SqliteDAO (using libsql)
 * -------------------------------------------------------------
 * Concrete DAO implementation using libsql for SQLite.
 * Dynamically imports `@libsql/client` so the module
 * can be loaded without requiring libsql to be installed
 * unless actually used.
 */
export default class SqliteDAO extends SQLDAO {
  constructor(config = {}) {
    super(config);

    if (!config.url) {
      throw new Error(
        "SqliteDAO requires a `url` in config (e.g., file:path/to/db.sqlite)"
      );
    }

    this.url = config.url;
    this.db = null; // will hold the libsql client
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.db) return; // already connected

    // dynamically import libsql client
    const { createClient } = await import("@libsql/client");
    this.clientModule = { createClient };

    this.db = createClient({ url: this.url });
  }

  async disconnect() {
    if (this.db && this.db.close) {
      await this.db.close();
      this.db = null;
    }
  }

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.db) throw new Error("Database not connected");

    // libsql expects params as object with keys 1..n or named
    // convert array params to object with 1-based indices
    const boundParams = params.reduce((acc, val, idx) => {
      acc[idx + 1] = val;
      return acc;
    }, {});

    const result = await this.db.execute(sql, boundParams);

    // libsql returns rows for SELECT, changes for INSERT/UPDATE/DELETE
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      return result.rows;
    } else {
      return result;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    await this.execute("BEGIN TRANSACTION");
  }

  async commitTransaction() {
    await this.execute("COMMIT");
  }

  async rollbackTransaction() {
    await this.execute("ROLLBACK");
  }
}
