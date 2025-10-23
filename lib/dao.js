// dao.js:

"use strict";

// load all necessary modules
import { Base } from "milwaukee-foundation";

/**
 * Data Access Object (DAO)
 * -------------------------------------------------------------
 * Abstract base class defining standard data access operations.
 * Subclasses (e.g., SequelizeDAO, MongooseDAO, PrismaDAO)
 * should override each method to implement actual persistence logic.
 */
export default class DAO extends Base {
  constructor(config = undefined) {
    super(config);
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Establishes a connection to the data store.
   */
  async connect() {
    this.requireOverride("connect");
  }

  /**
   * Closes the connection to the data store.
   */
  async disconnect() {
    this.requireOverride("disconnect");
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */

  /**
   * Inserts a single entity.
   * @param {any} target - The model or collection.
   * @param {object} entity - The entity to insert.
   */
  async insertOne(target, entity) {
    this.requireOverride("insertOne");
  }

  /**
   * Inserts multiple entities.
   * @param {any} target - The model or collection.
   * @param {object[]} entities - The entities to insert.
   */
  async insertMany(target, entities) {
    this.requireOverride("insertMany");
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */

  /**
   * Finds a single entity matching given criteria.
   * @param {any} target - The model or collection.
   * @param {object} criteria - The query filter.
   */
  async findOne(target, criteria) {
    this.requireOverride("findOne");
  }

  /**
   * Finds multiple entities matching given criteria.
   * @param {any} target - The model or collection.
   * @param {object} criteria - The query filter.
   */
  async findMany(target, criteria) {
    this.requireOverride("findMany");
  }

  /**
   * Finds a single entity by its primary key or unique identifier.
   * @param {any} target - The model or collection.
   * @param {string|number} id - The entity ID.
   */
  async findById(target, id) {
    this.requireOverride("findById");
  }

  /**
   * Counts how many entities match the given criteria.
   * @param {any} target - The model or collection.
   * @param {object} criteria - The query filter.
   */
  async count(target, criteria) {
    this.requireOverride("count");
  }

  /**
   * Checks whether any entity exists for the given criteria.
   * @param {any} target - The model or collection.
   * @param {object} criteria - The query filter.
   */
  async exists(target, criteria) {
    this.requireOverride("exists");
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */

  /**
   * Updates a single entity.
   * @param {any} target - The model or collection.
   * @param {object} entity - The entity to update.
   */
  async updateOne(target, entity) {
    this.requireOverride("updateOne");
  }

  /**
   * Updates multiple entities.
   * @param {any} target - The model or collection.
   * @param {object[]} entities - The entities to update.
   */
  async updateMany(target, entities) {
    this.requireOverride("updateMany");
  }

  /**
   * Inserts a new entity or updates it if it already exists.
   * (a.k.a. "upsert" operation)
   * @param {any} target - The model or collection.
   * @param {object} entity - The entity to insert or update.
   */
  async upsert(target, entity) {
    this.requireOverride("upsert");
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */

  /**
   * Deletes a single entity.
   * @param {any} target - The model or collection.
   * @param {object} entity - The entity to delete.
   */
  async deleteOne(target, entity) {
    this.requireOverride("deleteOne");
  }

  /**
   * Deletes multiple entities.
   * @param {any} target - The model or collection.
   * @param {object[]} entities - The entities to delete.
   */
  async deleteMany(target, entities) {
    this.requireOverride("deleteMany");
  }

  /**
   * Deletes all entities in the target (truncate / clear).
   * @param {any} target - The model or collection.
   */
  async deleteAll(target) {
    this.requireOverride("deleteAll");
  }

  /* =============================================================
   * Advanced Operations
   * ============================================================= */

  /**
   * Executes an aggregation or pipeline operation.
   * @param {any} target - The model or collection.
   * @param {any} pipelineOrCriteria - Aggregation pipeline or query.
   */
  async aggregate(target, pipelineOrCriteria) {
    this.requireOverride("aggregate");
  }

  /**
   * Executes a raw query directly against the data store.
   * @param {string|object} rawQuery - The raw query or command.
   * @param {object} [options] - Query execution options.
   */
  async query(rawQuery, options = {}) {
    this.requireOverride("query");
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  /**
   * Runs a function within a database transaction.
   * Automatically commits or rolls back on success/failure.
   * @param {Function} callback - The transactional operation.
   */
  async transaction(callback) {
    await this.startTransaction();
    try {
      await callback();
      await this.commitTransaction();
    } catch (err) {
      await this.rollbackTransaction();
      throw err;
    }
  }

  /**
   * Begins a new transaction.
   */
  async startTransaction() {
    this.requireOverride("startTransaction");
  }

  /**
   * Commits the active transaction.
   */
  async commitTransaction() {
    this.requireOverride("commitTransaction");
  }

  /**
   * Rolls back the active transaction.
   */
  async rollbackTransaction() {
    this.requireOverride("rollbackTransaction");
  }
}
