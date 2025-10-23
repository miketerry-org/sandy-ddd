// doaSQL.js:

"use strict";

import DAO from "./dao.js";

export default class SQLDAO extends DAO {
  constructor(config = {}) {
    super(config);
    this.db = null; // concrete subclass must initialize this
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */
  async insertOne(table, entity) {
    const keys = Object.keys(entity);
    const cols = keys.map(k => `"${k}"`).join(", ");
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.execute(sql, Object.values(entity));
    return result[0];
  }

  async insertMany(table, entities) {
    const results = [];
    for (const entity of entities) {
      const r = await this.insertOne(table, entity);
      results.push(r);
    }
    return results;
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */
  async findOne(table, criteria) {
    const { sql, params } = this.buildWhereClause(table, criteria, 1);
    const rows = await this.execute(`${sql} LIMIT 1`, params);
    return rows[0] || null;
  }

  async findMany(table, criteria) {
    const { sql, params } = this.buildWhereClause(table, criteria, 1);
    return await this.execute(sql, params);
  }

  async count(table, criteria) {
    const { sql, params } = this.buildWhereClause(table, criteria, 1);
    const rows = await this.execute(
      `SELECT COUNT(*) AS cnt FROM (${sql}) AS t`,
      params
    );
    return rows[0]?.cnt ?? 0;
  }

  async exists(table, criteria) {
    const row = await this.findOne(table, criteria);
    return !!row;
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */
  async updateOne(table, entity, idField = "id") {
    if (entity[idField] === undefined)
      throw new Error(`updateOne requires entity with ${idField}`);
    const id = entity[idField];
    const updates = { ...entity };
    delete updates[idField];
    const keys = Object.keys(updates);
    if (keys.length === 0) return false;

    const setClause = keys.map((k, i) => `"${k}"=$${i + 1}`).join(", ");
    const sql = `UPDATE "${table}" SET ${setClause} WHERE "${idField}"=$${
      keys.length + 1
    } RETURNING *`;
    const params = [...keys.map(k => updates[k]), id];
    const rows = await this.execute(sql, params);
    return rows[0] || null;
  }

  async updateMany(table, entities, idField = "id") {
    const results = [];
    for (const entity of entities) {
      results.push(await this.updateOne(table, entity, idField));
    }
    return results;
  }

  async upsert(table, entity, idField = "id") {
    if (!entity[idField]) {
      return this.insertOne(table, entity);
    } else {
      const updated = await this.updateOne(table, entity, idField);
      if (!updated) return this.insertOne(table, entity);
      return updated;
    }
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */
  async deleteOne(table, entity, idField = "id") {
    if (entity[idField] === undefined)
      throw new Error(`deleteOne requires entity with ${idField}`);
    const sql = `DELETE FROM "${table}" WHERE "${idField}"=$1`;
    const result = await this.execute(sql, [entity[idField]]);
    return result.rowCount > 0;
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
    return result.rowCount ?? 0;
  }

  /* =============================================================
   * Transactions
   * ============================================================= */
  async transaction(callback) {
    if (!this.db) throw new Error("DB connection not established");
    await this.execute("BEGIN");
    try {
      await callback();
      await this.execute("COMMIT");
    } catch (err) {
      await this.execute("ROLLBACK");
      throw err;
    }
  }

  /* =============================================================
   * Helpers
   * ============================================================= */
  buildWhereClause(table, criteria, startIndex = 1) {
    const keys = Object.keys(criteria || {});
    const params = keys.map(k => criteria[k]);
    const clauses = keys.map((k, i) => `"${k}"=$${i + startIndex}`);
    const sql =
      `SELECT * FROM "${table}"` +
      (clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "");
    return { sql, params };
  }

  // Subclasses must implement this to execute SQL with parameters
  async execute(sql, params = []) {
    throw new Error("Subclasses must implement execute(sql, params)");
  }
}
