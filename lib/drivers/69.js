// ./lib/drivers/driver-mongodb.js

import BaseDriver from "./driver-base.js";

/**
 * MongoDBDriver
 * -------------------------------------------------------------
 * Concrete database driver for MongoDB.
 *
 * This class implements the BaseDriver interface using the official
 * MongoDB Node.js driver. It adapts MongoDB's document-oriented API
 * to a normalized driver contract shared with SQL-based drivers
 * (MySQL, Postgres, SQLite, etc).
 *
 * Key characteristics:
 * - Lazy-loads the `mongodb` package to avoid forcing installations
 *   in projects that do not use MongoDB.
 * - Treats collections as "targets" to match the BaseDriver API.
 * - Normalizes CRUD and transaction semantics where possible.
 */
export default class MongoDBDriver extends BaseDriver {
  /**
   * @param {object} config
   * @param {string} config.uri     MongoDB connection URI
   * @param {string} config.dbName  Database name
   */
  constructor(config = {}) {
    super(config);

    // Active MongoDB client connection
    this.client = null;

    // Selected database instance
    this.db = null;

    // Active session used for transactions
    this.session = null;

    // MongoDB driver references (loaded lazily)
    this.MongoClient = null;
    this.ObjectId = null;

    // Connection configuration
    this.uri = config.database.uri;
    this.dbName = config.database.dbName;

    // Enforce required configuration early
    if (!this.uri || !this.dbName) {
      throw new Error(
        "MongoDBDriver requires `uri` and `dbName` in config.database."
      );
    }
  }

  /**
   * Lazily imports the MongoDB Node.js driver.
   *
   * This keeps MongoDB as an optional dependency and avoids
   * loading native bindings until a MongoDB driver instance
   * is actually used.
   */
  async #loadDriver() {
    if (this.MongoClient && this.ObjectId) return;

    try {
      const mongodb = await import("mongodb");
      this.MongoClient = mongodb.MongoClient;
      this.ObjectId = mongodb.ObjectId;
    } catch {
      throw new Error(
        "Failed to load 'mongodb'. Install it with `npm install mongodb`."
      );
    }
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Establishes a connection to MongoDB.
   *
   * This method is idempotent; calling it multiple times
   * will not create multiple connections.
   */
  async connect() {
    await this.#loadDriver();
    if (this.client) return;

    this.client = new this.MongoClient(this.uri, {
      ignoreUndefined: true,
    });

    const results = await this.client.connect();
    this.db = this.client.db(this.dbName);
  }

  /**
   * Closes the MongoDB connection and clears internal state.
   */
  async disconnect() {
    if (!this.client) return;

    await this.client.close();
    this.client = null;
    this.db = null;
  }

  get connected(){
    // please implment this

  },

  /* =============================================================
   * Create Operations
   * ============================================================= */

  /**
   * Inserts a single document into a collection.
   *
   * @param {string} target  Collection name
   * @param {object} entity Document to insert
   * @returns {object} Inserted entity including generated _id
   */
  async insertOne(target, entity) {
    const collection = this.db.collection(target);
    const { insertedId } = await collection.insertOne(entity);
    return { ...entity, _id: insertedId };
  }

  /**
   * Inserts multiple documents into a collection.
   *
   * @param {string} target
   * @param {object[]} entities
   * @returns {Array} Array of inserted ObjectIds
   */
  async insertMany(target, entities) {
    const collection = this.db.collection(target);
    const { insertedIds } = await collection.insertMany(entities);
    return Object.values(insertedIds);
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */

  /**
   * Finds a single document matching criteria.
   */
  async findOne(target, criteria) {
    return this.db.collection(target).findOne(criteria);
  }

  /**
   * Finds all documents matching criteria.
   */
  async findMany(target, criteria) {
    return this.db.collection(target).find(criteria).toArray();
  }

  /**
   * Finds a document by its primary identifier.
   */
  async findById(target, id) {
    return this.db.collection(target).findOne({
      _id: new this.ObjectId(id),
    });
  }

  /**
   * Counts documents matching criteria.
   */
  async count(target, criteria) {
    return this.db.collection(target).countDocuments(criteria);
  }

  /**
   * Checks if at least one document exists for criteria.
   */
  async exists(target, criteria) {
    const doc = await this.db
      .collection(target)
      .findOne(criteria, { projection: { _id: 1 } });

    return Boolean(doc);
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */

  /**
   * Updates a single document by _id.
   */
  async updateOne(target, entity) {
    if (!entity._id) {
      throw new Error("updateOne requires an entity with _id.");
    }

    const { _id, ...updates } = entity;

    const result = await this.db
      .collection(target)
      .updateOne({ _id: new this.ObjectId(_id) }, { $set: updates });

    return result.modifiedCount > 0;
  }

  /**
   * Updates multiple documents individually.
   *
   * MongoDB does not support multi-document updates with
   * distinct payloads, so this is executed as multiple
   * updateOne operations.
   */
  async updateMany(target, entities) {
    const collection = this.db.collection(target);
    const results = [];

    for (const entity of entities) {
      if (!entity._id) continue;

      const { _id, ...updates } = entity;
      const result = await collection.updateOne(
        { _id: new this.ObjectId(_id) },
        { $set: updates }
      );

      results.push(result.modifiedCount > 0);
    }

    return results;
  }

  /**
   * Inserts or updates a document based on _id presence.
   */
  async upsert(target, entity) {
    const collection = this.db.collection(target);

    if (!entity._id) {
      const { insertedId } = await collection.insertOne(entity);
      return { ...entity, _id: insertedId };
    }

    const { _id, ...updates } = entity;

    const result = await collection.updateOne(
      { _id: new this.ObjectId(_id) },
      { $set: updates },
      { upsert: true }
    );

    if (result.upsertedId) {
      return { ...entity, _id: result.upsertedId };
    }

    return entity;
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */

  /**
   * Deletes a single document by _id.
   */
  async deleteOne(target, entity) {
    if (!entity._id) {
      throw new Error("deleteOne requires an entity with _id.");
    }

    const result = await this.db.collection(target).deleteOne({
      _id: new this.ObjectId(entity._id),
    });

    return result.deletedCount > 0;
  }

  /**
   * Deletes multiple documents by _id.
   */
  async deleteMany(target, entities) {
    const ids = entities.filter(e => e._id).map(e => new this.ObjectId(e._id));

    if (!ids.length) return 0;

    const result = await this.db.collection(target).deleteMany({
      _id: { $in: ids },
    });

    return result.deletedCount;
  }

  /**
   * Deletes all documents from a collection.
   */
  async deleteAll(target) {
    const result = await this.db.collection(target).deleteMany({});
    return result.deletedCount;
  }

  /* =============================================================
   * Advanced Operations
   * ============================================================= */

  /**
   * Executes an aggregation pipeline.
   *
   * Accepts either a full pipeline array or a single stage.
   */
  async aggregate(target, pipelineOrCriteria) {
    const pipeline = Array.isArray(pipelineOrCriteria)
      ? pipelineOrCriteria
      : [pipelineOrCriteria];

    return this.db.collection(target).aggregate(pipeline).toArray();
  }

  /**
   * Executes a raw MongoDB operation.
   *
   * The provided function receives the database instance
   * and optional execution options.
   */
  async query(rawQuery, options = {}) {
    if (typeof rawQuery !== "function") {
      throw new Error(
        "MongoDBDriver.query expects a function receiving (db, options)."
      );
    }

    return rawQuery(this.db, options);
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  /**
   * Starts a MongoDB transaction using a client session.
   */
  async startTransaction() {
    if (!this.client) {
      throw new Error("MongoDBDriver is not connected.");
    } 

    this.session = this.client.startSession();
    this.session.startTransaction();
  }

  /**
   * Commits the active transaction and releases the session.
   */
  async commitTransaction() {
    if (!this.session) return;

    await this.session.commitTransaction();
    this.session.endSession();
    this.session = null;
  }

  /**
   * Rolls back the active transaction and releases the session.
   */
  async rollbackTransaction() {
    if (!this.session) return;

    await this.session.abortTransaction();
    this.session.endSession();
    this.session = null;
  }
}
