"use strict";

import DAO from "./dao.js";

/**
 * MongoDBDAO
 * -------------------------------------------------------------
 * Concrete DAO implementation using the official MongoDB driver.
 *
 * The `mongodb` package is only loaded when an instance is created,
 * so users who don't use MongoDB don't need to install it.
 */
export default class MongoDBDAO extends DAO {
  constructor(config = {}) {
    super(config);
    this.client = null;
    this.db = null;
    this.MongoClient = null;
    this.ObjectId = null;

    this.uri = config.uri;
    this.dbName = config.dbName;
    if (!this.uri || !this.dbName) {
      throw new Error("MongoDBDAO requires both `uri` and `dbName` in config.");
    }
  }

  /**
   * Lazily loads the `mongodb` package if not already loaded.
   */
  async #loadDriver() {
    if (!this.MongoClient || !this.ObjectId) {
      try {
        const mongodb = await import("mongodb");
        this.MongoClient = mongodb.MongoClient;
        this.ObjectId = mongodb.ObjectId;
      } catch (err) {
        throw new Error(
          "Failed to load 'mongodb' package. Please install it with `npm install mongodb`."
        );
      }
    }
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  async connect() {
    await this.#loadDriver();
    if (this.client) return; // already connected

    this.client = new this.MongoClient(this.uri, { ignoreUndefined: true });
    await this.client.connect();
    this.db = this.client.db(this.dbName);
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */

  async insertOne(target, entity) {
    const collection = this.db.collection(target);
    const result = await collection.insertOne(entity);
    return { ...entity, _id: result.insertedId };
  }

  async insertMany(target, entities) {
    const collection = this.db.collection(target);
    const result = await collection.insertMany(entities);
    return result.insertedIds;
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */

  async findOne(target, criteria) {
    const collection = this.db.collection(target);
    return await collection.findOne(criteria);
  }

  async findMany(target, criteria) {
    const collection = this.db.collection(target);
    return await collection.find(criteria).toArray();
  }

  async findById(target, id) {
    const collection = this.db.collection(target);
    return await collection.findOne({ _id: new this.ObjectId(id) });
  }

  async count(target, criteria) {
    const collection = this.db.collection(target);
    return await collection.countDocuments(criteria);
  }

  async exists(target, criteria) {
    const collection = this.db.collection(target);
    const doc = await collection.findOne(criteria, { projection: { _id: 1 } });
    return !!doc;
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */

  async updateOne(target, entity) {
    const collection = this.db.collection(target);
    if (!entity._id) {
      throw new Error("updateOne requires entity with an _id field.");
    }
    const { _id, ...updates } = entity;
    const result = await collection.updateOne(
      { _id: new this.ObjectId(_id) },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  }

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
      results.push(result);
    }

    return results;
  }

  async upsert(target, entity) {
    const collection = this.db.collection(target);
    if (!entity._id) {
      const result = await collection.insertOne(entity);
      return { ...entity, _id: result.insertedId };
    }

    const { _id, ...updates } = entity;
    const result = await collection.updateOne(
      { _id: new this.ObjectId(_id) },
      { $set: updates },
      { upsert: true }
    );

    return result.upsertedId ? { ...entity, _id: result.upsertedId } : entity;
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */

  async deleteOne(target, entity) {
    const collection = this.db.collection(target);
    if (!entity._id)
      throw new Error("deleteOne requires entity with an _id field.");
    const result = await collection.deleteOne({
      _id: new this.ObjectId(entity._id),
    });
    return result.deletedCount > 0;
  }

  async deleteMany(target, entities) {
    const collection = this.db.collection(target);
    const ids = entities.map(e => new this.ObjectId(e._id));
    const result = await collection.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  async deleteAll(target) {
    const collection = this.db.collection(target);
    const result = await collection.deleteMany({});
    return result.deletedCount;
  }

  /* =============================================================
   * Advanced Operations
   * ============================================================= */

  async aggregate(target, pipelineOrCriteria) {
    const collection = this.db.collection(target);
    const pipeline = Array.isArray(pipelineOrCriteria)
      ? pipelineOrCriteria
      : [pipelineOrCriteria];
    return await collection.aggregate(pipeline).toArray();
  }

  async query(rawQuery, options = {}) {
    if (typeof rawQuery !== "function") {
      throw new Error(
        "MongoDBDAO.query expects a function that receives the db instance."
      );
    }
    return await rawQuery(this.db, options);
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  async startTransaction() {
    if (!this.client) throw new Error("Not connected to MongoDB.");
    this.session = this.client.startSession();
    this.session.startTransaction();
  }

  async commitTransaction() {
    if (this.session) {
      await this.session.commitTransaction();
      this.session.endSession();
      this.session = null;
    }
  }

  async rollbackTransaction() {
    if (this.session) {
      await this.session.abortTransaction();
      this.session.endSession();
      this.session = null;
    }
  }
}
