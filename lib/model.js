// ./lib/model.js

import ModelSchema from "./modelSchema.js";

/**
 * Model
 * -------------------------------------------------------------------------
 * A database-agnostic model class that wraps a table/collection name, a
 * schema, and a database instance. Provides validated CRUD operations,
 * schema enforcement, and transaction support.
 */
export default class Model {
  /** @type {import('./database.js').default} */
  #database;

  /** @type {string} */
  name;

  /** @type {ModelSchema} */
  schema;

  /**
   * @param {import('./database.js').default} database - Database instance or compatible driver.
   * @param {string} name - Table or collection name.
   * @param {ModelSchema} modelSchema - Associated ModelSchema instance.
   */
  constructor(database, name, modelSchema) {
    if (!database) throw new Error("Model requires a database instance");
    if (!name) throw new Error("Model requires a table/collection name");
    if (!modelSchema) throw new Error("Model requires a ModelSchema");

    this.#database = database;
    this.name = name;
    this.schema = modelSchema;
  }

  /**
   * Inserts a single entity after schema validation.
   * @param {object} entity - Entity to insert.
   * @returns {Promise<object>} Inserted entity with defaults applied.
   */
  async insertOne(entity) {
    const validated = this.#validateEntity(entity);
    return await this.#database.insertOne(this.name, validated);
  }

  /**
   * Inserts multiple entities after validation.
   * @param {object[]} entities - Entities to insert.
   * @returns {Promise<object[]>} Inserted entities.
   */
  async insertMany(entities) {
    const validated = entities.map(e => this.#validateEntity(e));
    return await this.#database.insertMany(this.name, validated);
  }

  /**
   * Finds a single entity matching criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<object|null>} Entity or null.
   */
  async findOne(criteria) {
    return await this.#database.findOne(this.name, criteria);
  }

  /**
   * Finds multiple entities matching criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<object[]>} Matching entities.
   */
  async findMany(criteria) {
    return await this.#database.findMany(this.name, criteria);
  }

  /**
   * Finds an entity by ID.
   * @param {string|number} id - Entity identifier.
   * @returns {Promise<object|null>} Entity or null.
   */
  async findById(id) {
    return await this.#database.findById(this.name, id);
  }

  /**
   * Updates a single entity with schema validation (partial allowed).
   * @param {object} entity - Entity to update.
   * @returns {Promise<object>} Updated entity.
   */
  async updateOne(entity) {
    const validated = this.#validateEntity(entity, { partial: true });
    return await this.#database.updateOne(this.name, validated);
  }

  /**
   * Updates multiple entities after validation.
   * @param {object[]} entities - Entities to update.
   * @returns {Promise<object[]>} Updated entities.
   */
  async updateMany(entities) {
    const validated = entities.map(e =>
      this.#validateEntity(e, { partial: true })
    );
    return await this.#database.updateMany(this.name, validated);
  }

  /**
   * Inserts or updates (upsert) a single entity.
   * @param {object} entity - Entity to upsert.
   * @returns {Promise<object>} Upserted entity.
   */
  async upsert(entity) {
    const validated = this.#validateEntity(entity);
    return await this.#database.upsert(this.name, validated);
  }

  /**
   * Deletes a single entity.
   * @param {object} entity - Entity to delete.
   * @returns {Promise<void>}
   */
  async deleteOne(entity) {
    return await this.#database.deleteOne(this.name, entity);
  }

  /**
   * Deletes multiple entities.
   * @param {object[]} entities - Entities to delete.
   * @returns {Promise<void>}
   */
  async deleteMany(entities) {
    return await this.#database.deleteMany(this.name, entities);
  }

  /**
   * Deletes all entities (truncate/clear).
   * @returns {Promise<void>}
   */
  async deleteAll() {
    return await this.#database.deleteAll(this.name);
  }

  /**
   * Counts entities matching criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<number>}
   */
  async count(criteria) {
    return await this.#database.count(this.name, criteria);
  }

  /**
   * Checks if any entity exists matching criteria.
   * @param {object} criteria - Query filter.
   * @returns {Promise<boolean>}
   */
  async exists(criteria) {
    return await this.#database.exists(this.name, criteria);
  }

  /**
   * Executes aggregation or pipeline operations.
   * @param {any} pipelineOrCriteria - Aggregation or query.
   * @returns {Promise<any>}
   */
  async aggregate(pipelineOrCriteria) {
    return await this.#database.aggregate(this.name, pipelineOrCriteria);
  }

  /**
   * Executes a raw query through the database.
   * @param {string|object} rawQuery - Raw query.
   * @param {object} [options] - Optional execution options.
   * @returns {Promise<any>}
   */
  async query(rawQuery, options = {}) {
    return await this.#database.query(rawQuery, options);
  }

  /**
   * Starts a transaction.
   * @returns {Promise<void>}
   */
  async startTransaction() {
    return await this.#database.startTransaction();
  }

  /**
   * Commits the current transaction.
   * @returns {Promise<void>}
   */
  async commitTransaction() {
    return await this.#database.commitTransaction();
  }

  /**
   * Rolls back the current transaction.
   * @returns {Promise<void>}
   */
  async rollbackTransaction() {
    return await this.#database.rollbackTransaction();
  }

  /**
   * Runs a function within a transaction context.
   * @param {Function} callback - Callback to run within a transaction.
   * @returns {Promise<void>}
   */
  async transaction(callback) {
    return await this.#database.transaction(callback);
  }

  /**
   * Returns the model's schema definition.
   * @returns {{ fields: Record<string, object>, indexes: Array<object> }}
   */
  getSchema() {
    return this.schema.getSchema();
  }

  /**
   * Returns the underlying database instance.
   * @returns {import('./database.js').default}
   */
  get database() {
    return this.#database;
  }

  // -------------------------------------------------------------------------
  // Internal Helpers
  // -------------------------------------------------------------------------

  /**
   * Validates an entity against the model's schema.
   * @param {object} entity - Entity to validate.
   * @param {object} [options={}] - Validation options.
   * @returns {object} Validated entity with defaults applied.
   * @throws {Error} If validation fails.
   */
  #validateEntity(entity, options = {}) {
    const result = this.schema.validate(entity, options);
    if (!result.valid) {
      const msg = `Validation failed for model "${this.name}":\n${result.errors.join("\n")}`;
      throw new Error(msg);
    }
    return result.value;
  }
}
