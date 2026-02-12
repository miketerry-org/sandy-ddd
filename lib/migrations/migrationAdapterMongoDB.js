// migrationAdapterMongoDB.js

"use strict";

import MigrationAdapter from "./migrationAdapter.js";
import { MongoClient } from "mongodb";

export default class MigrationAdapterMongoDB extends MigrationAdapter {
  /**
   * @param {string} uri - MongoDB connection string
   * @param {string} dbName - Database name
   */
  constructor(uri, dbName) {
    super();
    this.uri = uri;
    this.dbName = dbName;
    this.client = new MongoClient(uri);
  }

  async _connect() {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.migrationsCollection = this.db.collection("_migrations");
    }
  }

  async ensureMigrationTable() {
    await this._connect();
    // Ensure the migrations collection exists
    const collections = await this.db
      .listCollections({ name: "_migrations" })
      .toArray();
    if (collections.length === 0) {
      await this.db.createCollection("_migrations");
      await this.migrationsCollection.createIndex({ id: 1 }, { unique: true });
    }
  }

  async fetchAppliedIds() {
    await this._connect();
    const docs = await this.migrationsCollection.find({}).toArray();
    return docs.map(d => d.id);
  }

  async recordAppliedMigration(id) {
    await this._connect();
    await this.migrationsCollection.insertOne({
      id,
      appliedAt: new Date(),
    });
  }

  async recordRolledBackMigration(id) {
    await this._connect();
    await this.migrationsCollection.deleteOne({ id });
  }

  async executeOperation(operation) {
    await this._connect();
    const { tableName, columns, indexes } = operation.params;

    // Create collection if not exists
    const collections = await this.db
      .listCollections({ name: tableName })
      .toArray();
    if (collections.length === 0) {
      await this.db.createCollection(tableName);
    }

    // Create indexes
    for (const idx of indexes) {
      const indexSpec = {};
      for (const col of idx.columns) {
        indexSpec[col.name] = col.order === "DESC" ? -1 : 1;
      }
      await this.db
        .collection(tableName)
        .createIndex(indexSpec, { unique: idx.unique || false });
    }

    // MongoDB is schemaless; columns do not need to be created
  }

  async revertOperation(operation) {
    await this._connect();
    const { tableName, indexes } = operation.params;

    // Drop indexes created by this operation
    for (const idx of indexes) {
      try {
        await this.db.collection(tableName).dropIndex(idx.name);
      } catch (err) {
        // Index might not exist; ignore
      }
    }

    // MongoDB is schemaless; columns do not need to be dropped
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.db = null;
    }
  }
}
