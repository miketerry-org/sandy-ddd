// ./lib/driver-base.js

/**
 * BaseDriver
 * -------------------------------------------------------------
 * Abstract base class defining a common interface for database drivers.
 * Concrete drivers such as MariaDBDriver, MySQLDriver, PostgresDriver,
 * SQLiteDriver, and MongoDBDriver must override all abstract methods.
 */
export default class BaseDriver {
  _config;

  constructor(config = undefined) {
    this._config = config;
  }

  requireOverride(methodName) {
    const className = this.constructor.name;
    throw new Error(
      `${className} must override "${methodName}" from BaseDriver`
    );
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  async connect() {
    this.requireOverride("connect");
  }

  async disconnect() {
    this.requireOverride("disconnect");
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */

  async insertOne(target, entity) {
    this.requireOverride("insertOne");
  }

  async insertMany(target, entities) {
    this.requireOverride("insertMany");
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */

  async findOne(target, criteria) {
    this.requireOverride("findOne");
  }

  async findMany(target, criteria) {
    this.requireOverride("findMany");
  }

  async findById(target, id) {
    this.requireOverride("findById");
  }

  async count(target, criteria) {
    this.requireOverride("count");
  }

  async exists(target, criteria) {
    this.requireOverride("exists");
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */

  async updateOne(target, entity) {
    this.requireOverride("updateOne");
  }

  async updateMany(target, entities) {
    this.requireOverride("updateMany");
  }

  async upsert(target, entity) {
    this.requireOverride("upsert");
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */

  async deleteOne(target, entity) {
    this.requireOverride("deleteOne");
  }

  async deleteMany(target, entities) {
    this.requireOverride("deleteMany");
  }

  async deleteAll(target) {
    this.requireOverride("deleteAll");
  }

  /* =============================================================
   * Advanced Operations
   * ============================================================= */

  async aggregate(target, pipelineOrCriteria) {
    this.requireOverride("aggregate");
  }

  async query(rawQuery, options = {}) {
    this.requireOverride("query");
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

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

  async startTransaction() {
    this.requireOverride("startTransaction");
  }

  async commitTransaction() {
    this.requireOverride("commitTransaction");
  }

  async rollbackTransaction() {
    this.requireOverride("rollbackTransaction");
  }
}
