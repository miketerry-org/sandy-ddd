// daoPostgrres:

"use strict";

import SQLDAO from "./daosql.js";

/**
 * PostgresDAO
 * -------------------------------------------------------------
 * Concrete DAO implementation using PostgreSQL via `pg`.
 * Dynamically imports `pg` so the module can be loaded without
 * requiring the package unless actually used.
 */
export default class PostgresDAO extends SQLDAO {
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 5432 } = config;
    if (!host || !user || !database) {
      throw new Error(
        "PostgresDAO requires `host`, `user`, and `database` in config."
      );
    }

    this.config = { host, user, password, database, port };
    this.pool = null;
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */
  async connect() {
    if (this.pool) return; // already connected

    // dynamically import pg
    const { Pool } = await import("pg");
    this.pgModule = { Pool };

    this.pool = new Pool(this.config);
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /* =============================================================
   * Execute SQL
   * ============================================================= */
  async execute(sql, params = []) {
    if (!this.pool) throw new Error("Database not connected");

    if (this.client) {
      // in a transaction, use the dedicated client
      const result = await this.client.query(sql, params);
      return result.rows;
    } else {
      const result = await this.pool.query(sql, params);
      return result.rows;
    }
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("Database not connected");

    // get a dedicated client for the transaction
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
}
