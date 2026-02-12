// domainModel.js
"use strict";

/**
 * DomainModel
 * -------------------------------------------------------------------------
 * A domain-level model that wraps a schema and a DAO implementation.
 * It provides validated CRUD operations and domain-centric access
 * to persistence functionality.
 */
export default class DomainModel {
  /**
   * @param {string} name - Logical name of the model (e.g. "User", "Order").
   * @param {DomainSchema} schema - Associated DomainSchema instance.
   * @param {DAO} dao - DAO instance responsible for persistence.
   */
  constructor(name, schema, dao) {
    if (!name) {
      throw new Error("DomainModel requires a name");
    }
    if (!schema) {
      throw new Error("DomainModel requires a schema");
    }
    if (!dao) {
      throw new Error("DomainModel requires a DAO");
    }

    /** @readonly */
    this.name = name;

    /** @readonly */
    this.schema = schema;

    /** @readonly */
    this.dao = dao;
  }

  // -------------------------------------------------------------------------
  // Core CRUD Operations
  // -------------------------------------------------------------------------

  /**
   * Inserts a single entity after schema validation.
   * @param {object} entity - The entity to insert.
   * @returns {Promise<object>} The persisted entity.
   */
  async insertOne(entity) {
    const validated = this.#validateEntity(entity);
    return await this.dao.insertOne(this.name, validated);
  }

  /**
   * Inserts multiple entities.
   * @param {object[]} entities - Array of entities to insert.
   * @returns {Promise<object[]>} Persisted entities.
   */
  async insertMany(entities) {
    const validated = entities.map(e => this.#validateEntity(e));
    return await this.dao.insertMany(this.name, validated);
  }

  /**
   * Finds a single entity matching given criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<object|null>} Matching entity or null.
   */
  async findOne(criteria) {
    return await this.dao.findOne(this.name, criteria);
  }

  /**
   * Finds multiple entities matching given criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<object[]>} Matching entities.
   */
  async findMany(criteria) {
    return await this.dao.findMany(this.name, criteria);
  }

  /**
   * Finds an entity by ID.
   * @param {string|number} id - Entity identifier.
   * @returns {Promise<object|null>} Entity or null if not found.
   */
  async findById(id) {
    return await this.dao.findById(this.name, id);
  }

  /**
   * Updates a single entity.
   * @param {object} entity - Entity to update.
   * @returns {Promise<object>} Updated entity.
   */
  async updateOne(entity) {
    const validated = this.#validateEntity(entity, { partial: true });
    return await this.dao.updateOne(this.name, validated);
  }

  /**
   * Updates multiple entities.
   * @param {object[]} entities - Entities to update.
   * @returns {Promise<object[]>} Updated entities.
   */
  async updateMany(entities) {
    const validated = entities.map(e =>
      this.#validateEntity(e, { partial: true })
    );
    return await this.dao.updateMany(this.name, validated);
  }

  /**
   * Inserts or updates (upserts) a single entity.
   * @param {object} entity - Entity to upsert.
   * @returns {Promise<object>} Upserted entity.
   */
  async upsert(entity) {
    const validated = this.#validateEntity(entity);
    return await this.dao.upsert(this.name, validated);
  }

  /**
   * Deletes a single entity.
   * @param {object} entity - Entity to delete.
   * @returns {Promise<void>}
   */
  async deleteOne(entity) {
    return await this.dao.deleteOne(this.name, entity);
  }

  /**
   * Deletes multiple entities.
   * @param {object[]} entities - Entities to delete.
   * @returns {Promise<void>}
   */
  async deleteMany(entities) {
    return await this.dao.deleteMany(this.name, entities);
  }

  /**
   * Deletes all entities (truncate/clear).
   * @returns {Promise<void>}
   */
  async deleteAll() {
    return await this.dao.deleteAll(this.name);
  }

  // -------------------------------------------------------------------------
  // Query & Utility
  // -------------------------------------------------------------------------

  /**
   * Counts entities matching given criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<number>}
   */
  async count(criteria) {
    return await this.dao.count(this.name, criteria);
  }

  /**
   * Checks whether any entity exists matching the given criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<boolean>}
   */
  async exists(criteria) {
    return await this.dao.exists(this.name, criteria);
  }

  /**
   * Executes an aggregation or pipeline operation.
   * @param {any} pipelineOrCriteria - Aggregation or query.
   * @returns {Promise<any>}
   */
  async aggregate(pipelineOrCriteria) {
    return await this.dao.aggregate(this.name, pipelineOrCriteria);
  }

  /**
   * Executes a raw query directly through the DAO.
   * @param {string|object} rawQuery - Raw query.
   * @param {object} [options] - Optional execution options.
   * @returns {Promise<any>}
   */
  async query(rawQuery, options = {}) {
    return await this.dao.query(rawQuery, options);
  }

  // -------------------------------------------------------------------------
  // Transaction Support (proxied to DAO)
  // -------------------------------------------------------------------------

  /**
   * Runs a function within a transaction.
   * @param {Function} callback - Operation to run.
   * @returns {Promise<void>}
   */
  async transaction(callback) {
    return await this.dao.transaction(callback);
  }

  /**
   * Begins a transaction.
   * @returns {Promise<void>}
   */
  async startTransaction() {
    return await this.dao.startTransaction();
  }

  /**
   * Commits the active transaction.
   * @returns {Promise<void>}
   */
  async commitTransaction() {
    return await this.dao.commitTransaction();
  }

  /**
   * Rolls back the active transaction.
   * @returns {Promise<void>}
   */
  async rollbackTransaction() {
    return await this.dao.rollbackTransaction();
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /**
   * Returns the model's schema definition.
   * @returns {{ fields: Record<string, object>, indexes: Array<object> }}
   */
  getSchema() {
    return this.schema.getSchema();
  }

  /**
   * Returns the DAO backing this model.
   * @returns {DAO}
   */
  getDAO() {
    return this.dao;
  }

  // -------------------------------------------------------------------------
  // Internal helpers (minimally commented)
  // -------------------------------------------------------------------------
  #validateEntity(entity, options = {}) {
    const result = this.schema.validate(entity, options);
    if (!result.valid) {
      const msg = `Validation failed for model "${
        this.name
      }":\n${result.errors.join("\n")}`;
      throw new Error(msg);
    }
    return result.value;
  }
}
