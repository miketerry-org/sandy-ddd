// ./lib/driver-sql.js

import BaseDriver from "./driver-base.js";

/**
 * SQLDriver
 * -------------------------------------------------------------
 * Abstract relational database driver built on top of BaseDriver.
 *
 * This class provides database-agnostic SQL behavior and is intended
 * to be extended by concrete relational drivers such as:
 *
 * - PostgresDriver
 * - MySQLDriver
 * - MariaDBDriver
 * - SQLiteDriver
 *
 * Dialect-specific concerns (parameter placeholders, RETURNING
 * support, connection / pooling behavior) must be handled by
 * subclasses.
 */
export default class SQLDriver extends BaseDriver {
  constructor(config = {}) {
    super(config);

    // Low-level database connection or pool.
    // Concrete subclasses must initialize this.
    this.db = null;
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */

  /**
   * Inserts a single row and returns the inserted record.
   *
   * Assumes Postgres-style `$1, $2, ...` placeholders and
   * support for `RETURNING *`.
   * Subclasses must override if the dialect differs.
   */
  async insertOne(table, entity) {
    const keys = Object.keys(entity);
    const columns = keys.map(k => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

    const sql = `
      INSERT INTO "${table}" (${columns})
      VALUES (${placeholders})
      RETURNING *
    `;

    const rows = await this.execute(sql, Object.values(entity));
    return rows[0] ?? null;
  }

  /**
   * Inserts multiple rows sequentially.
   * Subclasses may override with optimized bulk inserts.
   */
  async insertMany(table, entities) {
    const results = [];
    for (const entity of entities) {
      results.push(await this.insertOne(table, entity));
    }
    return results;
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */

  async findOne(table, criteria) {
    const { sql, params } = this.buildWhereClause(table, criteria);
    const rows = await this.execute(`${sql} LIMIT 1`, params);
    return rows[0] ?? null;
  }

  async findMany(table, criteria) {
    const { sql, params } = this.buildWhereClause(table, criteria);
    return this.execute(sql, params);
  }

  async count(table, criteria) {
    const { sql, params } = this.buildWhereClause(table, criteria);
    const rows = await this.execute(
      `SELECT COUNT(*) AS count FROM (${sql}) AS t`,
      params
    );
    return Number(rows[0]?.count ?? 0);
  }

  async exists(table, criteria) {
    return Boolean(await this.findOne(table, criteria));
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */

  /**
   * Updates a single row identified by `idField`.
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

    const setClause = keys.map((k, i) => `"${k}"=$${i + 1}`).join(", ");

    const sql = `
      UPDATE "${table}"
      SET ${setClause}
      WHERE "${idField}"=$${keys.length + 1}
      RETURNING *
    `;

    const params = [...keys.map(k => updates[k]), id];
    const rows = await this.execute(sql, params);

    return rows[0] ?? null;
  }

  async updateMany(table, entities, idField = "id") {
    const results = [];
    for (const entity of entities) {
      results.push(await this.updateOne(table, entity, idField));
    }
    return results;
  }

  async upsert(table, entity, idField = "id") {
    if (entity[idField] === undefined) {
      return this.insertOne(table, entity);
    }

    const updated = await this.updateOne(table, entity, idField);
    if (!updated) {
      return this.insertOne(table, entity);
    }

    return updated;
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */

  async deleteOne(table, entity, idField = "id") {
    if (entity[idField] === undefined) {
      throw new Error(`deleteOne requires entity with ${idField}`);
    }

    const sql = `DELETE FROM "${table}" WHERE "${idField}"=$1`;
    const result = await this.execute(sql, [entity[idField]]);

    return Boolean(result?.rowCount ?? result?.affectedRows ?? 0);
  }

  async deleteMany(table, entities, idField = "id") {
    const results = [];
    for (const entity of entities) {
      results.push(await this.deleteOne(table, entity, idField));
    }
    return results;
  }

  async deleteAll(table) {
    const sql = `DELETE FROM "${table}"`;
    const result = await this.execute(sql, []);
    return result?.rowCount ?? result?.affectedRows ?? 0;
  }

  /* =============================================================
   * Helpers
   * ============================================================= */

  /**
   * Builds a SELECT query with an optional WHERE clause.
   *
   * Uses Postgres-style `$n` placeholders.
   * Dialects using `?` placeholders must override this method.
   */
  buildWhereClause(table, criteria = {}) {
    const keys = Object.keys(criteria);
    const params = keys.map(k => criteria[k]);

    const clauses = keys.map((k, i) => `"${k}"=$${i + 1}`);

    const sql =
      `SELECT * FROM "${table}"` +
      (clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "");

    return { sql, params };
  }

  /* =============================================================
   * Low-Level Execution
   * ============================================================= */

  /**
   * Executes a SQL query with bound parameters.
   *
   * Concrete relational drivers must implement this method.
   */
  async execute(sql, params = []) {
    throw new Error("SQLDriver subclasses must implement execute(sql, params)");
  }
}
