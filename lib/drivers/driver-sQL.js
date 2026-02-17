// ./lib/driver-sql.js

import BaseDriver from "./driver-base.js";

/**
 * SQLDriver
 * -------------------------------------------------------------
 * Abstract relational database driver.
 *
 * Extends BaseDriver and introduces relational (SQL-specific)
 * DDL responsibilities. Concrete SQL drivers such as
 * PostgresDriver, MySQLDriver, MariaDBDriver, and SQLiteDriver
 * must implement all abstract DDL methods defined here.
 *
 * Provides advanced DML methods with flexible criteria support.
 */
export default class SQLDriver extends BaseDriver {
  constructor(config = undefined) {
    super(config);
  }

  /* =============================================================
   * Schema / DDL Operations (abstract)
   * ============================================================= */

  async createTable(operation) {
    this.requireOverride("createTable");
  }
  async dropTable(operation) {
    this.requireOverride("dropTable");
  }
  async renameTable(operation) {
    this.requireOverride("renameTable");
  }
  async addColumn(operation) {
    this.requireOverride("addColumn");
  }
  async dropColumn(operation) {
    this.requireOverride("dropColumn");
  }
  async alterColumn(operation) {
    this.requireOverride("alterColumn");
  }
  async renameColumn(operation) {
    this.requireOverride("renameColumn");
  }
  async createIndex(operation) {
    this.requireOverride("createIndex");
  }
  async dropIndex(operation) {
    this.requireOverride("dropIndex");
  }
  async createForeignKey(operation) {
    this.requireOverride("createForeignKey");
  }
  async dropForeignKey(operation) {
    this.requireOverride("dropForeignKey");
  }

  /* =============================================================
   * DML Operations
   * ============================================================= */

  // --- Advanced WHERE builder ---
  _buildWhereClause(criteria = {}, startIndex = 1) {
    const params = [];
    let idx = startIndex;

    function parse(obj) {
      const clauses = [];

      for (const [key, value] of Object.entries(obj)) {
        if (key === "$or" && Array.isArray(value)) {
          const orClauses = value.map(parse).map(p => `(${p.clause})`);
          clauses.push(orClauses.join(" OR "));
          params.push(...value.flatMap(v => Object.values(v)));
        } else if (key === "$and" && Array.isArray(value)) {
          const andClauses = value.map(parse).map(p => `(${p.clause})`);
          clauses.push(andClauses.join(" AND "));
          params.push(...value.flatMap(v => Object.values(v)));
        } else if (value && typeof value === "object") {
          for (const [op, val] of Object.entries(value)) {
            switch (op) {
              case "$eq":
                clauses.push(
                  `${this.formatIdentifier(key)} = ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              case "$ne":
                clauses.push(
                  `${this.formatIdentifier(key)} <> ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              case "$gt":
                clauses.push(
                  `${this.formatIdentifier(key)} > ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              case "$gte":
                clauses.push(
                  `${this.formatIdentifier(key)} >= ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              case "$lt":
                clauses.push(
                  `${this.formatIdentifier(key)} < ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              case "$lte":
                clauses.push(
                  `${this.formatIdentifier(key)} <= ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              case "$in":
                clauses.push(
                  `${this.formatIdentifier(key)} IN (${val.map(() => this.placeholder(idx++)).join(", ")})`
                );
                params.push(...val);
                break;
              case "$nin":
                clauses.push(
                  `${this.formatIdentifier(key)} NOT IN (${val.map(() => this.placeholder(idx++)).join(", ")})`
                );
                params.push(...val);
                break;
              case "$like":
                clauses.push(
                  `${this.formatIdentifier(key)} LIKE ${this.placeholder(idx++)}`
                );
                params.push(val);
                break;
              default:
                throw new Error(`Unsupported operator: ${op}`);
            }
          }
        } else {
          clauses.push(
            `${this.formatIdentifier(key)} = ${this.placeholder(idx++)}`
          );
          params.push(value);
        }
      }

      return { clause: clauses.join(" AND "), params: [] };
    }

    const result = parse.call(this, criteria);
    return { clause: result.clause || "1=1", params };
  }

  // --- DML Methods ---

  async findOne(target, criteria = {}) {
    const { clause, params } = this._buildWhereClause(criteria);
    const sql = `SELECT * FROM ${this.formatIdentifier(target)} WHERE ${clause} LIMIT 1`;
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  async findMany(target, criteria = {}, options = {}) {
    const { clause, params } = this._buildWhereClause(criteria);
    let sql = `SELECT * FROM ${this.formatIdentifier(target)} WHERE ${clause}`;

    if (options.orderBy) {
      const orders = options.orderBy.map(
        o => `${this.formatIdentifier(o.column)} ${o.direction || "ASC"}`
      );
      sql += ` ORDER BY ${orders.join(", ")}`;
    }
    if (options.limit) sql += ` LIMIT ${options.limit}`;
    if (options.offset) sql += ` OFFSET ${options.offset}`;

    return this.query(sql, params);
  }

  async count(target, criteria = {}) {
    const { clause, params } = this._buildWhereClause(criteria);
    const sql = `SELECT COUNT(*)::int AS count FROM ${this.formatIdentifier(target)} WHERE ${clause}`;
    const rows = await this.query(sql, params);
    return rows[0] ? parseInt(rows[0].count, 10) : 0;
  }

  async exists(target, criteria = {}) {
    const cnt = await this.count(target, criteria);
    return cnt > 0;
  }

  async insertOne(target, entity) {
    this.requireOverride("insertOne");
  }

  async insertMany(target, entities) {
    this.requireOverride("insertMany");
  }

  async updateOne(target, entity) {
    this.requireOverride("updateOne"); // safe: by PK only
  }

  async updateMany(target, entities) {
    this.requireOverride("updateMany"); // safe: by PK only
  }

  async deleteOne(target, entity) {
    this.requireOverride("deleteOne"); // safe: by PK only
  }

  async deleteMany(target, entities) {
    this.requireOverride("deleteMany"); // safe: by PK only
  }

  async deleteAll(target) {
    this.requireOverride("deleteAll"); // safe: by PK only
  }

  async upsert(target, entity) {
    this.requireOverride("upsert");
  }

  async query(rawQuery, options = {}) {
    this.requireOverride("query");
  }

  // Helper placeholder formatter (for Postgres $1, MySQL ?, etc.)
  placeholder(idx) {
    return `?`; // override in subclass if needed
  }

  // Helper identifier formatter (quote table/column names if needed)
  formatIdentifier(name) {
    return `"${name}"`; // override for dialect-specific quoting
  }
}
