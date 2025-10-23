// daoMysql:

"use strict";

import SQLDAO from "./sql-dao.js";

/**
 * MySQLDAO
 * -------------------------------------------------------------
 * Concrete DAO implementation using MySQL via `mysql2/promise`.
 * Dynamically imports `mysql2/promise` so the module can be
 * loaded without requiring mysql2 to be installed unless used.
 */
export default class MySQLDAO extends SQLDAO {
  constructor(config = {}) {
    super(config);

    const { host, user, password, database, port = 3306 } = config;
    if (!host || !user || !database) {
      throw new Error(
        "MySQLDAO requires `host`, `user`, and `database` in config."
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

    // dynamically import mysql2/promise
    const mysql = await import("mysql2/promise");
    this.mysqlModule = mysql;

    this.pool = await mysql.createPool(this.config);
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

    const [rows] = await this.pool.execute(sql, params);
    return rows;
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */
  async startTransaction() {
    if (!this.pool) throw new Error("Database not connected");
    this.connection = await this.pool.getConnection();
    await this.connection.beginTransaction();
  }

  async commitTransaction() {
    if (!this.connection) return;
    await this.connection.commit();
    await this.connection.release();
    this.connection = null;
  }

  async rollbackTransaction() {
    if (!this.connection) return;
    await this.connection.rollback();
    await this.connection.release();
    this.connection = null;
  }
}
