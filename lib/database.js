// ./lib/database.js:

import BaseDriver from "./drivers/driver-base.js";
import MongoDBDriver from "./drivers/driver-mongodb.js";
import MySQLDriver from "./drivers/driver-mysql.js";
import PostgresDriver from "./drivers/driver-postgres.js";
import SQLiteDriver from "./drivers/driver-sqlite.js";

const DRIVER_MAP = {
  //!!mike  mariadb: MariaDBDriver,
  mongodb: MongoDBDriver,
  mysql: MySQLDriver,
  postgres: PostgresDriver,
  sqlite: SQLiteDriver,
};

export default class Database extends BaseDriver {
  _driver;
  _connected;

  constructor(config = {}) {
    super(config);

    if (!config?.database?.driver) {
      throw new Error(
        "Database config must include a 'database.driver' property"
      );
    }

    const driverKey = config?.database?.driver.toLowerCase();
    const DriverClass = DRIVER_MAP[driverKey];

    if (!DriverClass) {
      throw new Error(
        `Unsupported database driver '${config.database.driver}'. ` +
          `Supported drivers: ${Object.keys(DRIVER_MAP).join(", ")}`
      );
    }

    this._driver = new DriverClass(config);
    this.#validateDriverInterface();
  }

  /* =============================================================
   * Internal validation
   * ============================================================= */

  #validateDriverInterface() {
    const methods = Object.getOwnPropertyNames(BaseDriver.prototype).filter(
      name =>
        name !== "constructor" &&
        name !== "requireOverride" &&
        typeof BaseDriver.prototype[name] === "function"
    );

    for (const method of methods) {
      if (typeof this._driver[method] !== "function") {
        throw new Error(
          `Driver '${this._config.driver}' must implement '${method}()'`
        );
      }
    }
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  async connect() {
    let result = await this._driver.connect();
    this._connected = true;
    return result;
  }

  async disconnect() {
    let result = await this._driver.disconnect();
    this._connected = false;
    return result;
  }

  get connected() {
    return this._connected;
  }

  /* =============================================================
   * Create Operations
   * ============================================================= */

  async insertOne(target, entity) {
    return this._driver.insertOne(target, entity);
  }

  async insertMany(target, entities) {
    return this._driver.insertMany(target, entities);
  }

  /* =============================================================
   * Read Operations
   * ============================================================= */

  async findOne(target, criteria) {
    return this._driver.findOne(target, criteria);
  }

  async findMany(target, criteria) {
    return this._driver.findMany(target, criteria);
  }

  async findById(target, id) {
    return this._driver.findById(target, id);
  }

  async count(target, criteria) {
    return this._driver.count(target, criteria);
  }

  async exists(target, criteria) {
    return this._driver.exists(target, criteria);
  }

  /* =============================================================
   * Update Operations
   * ============================================================= */

  async updateOne(target, entity) {
    return this._driver.updateOne(target, entity);
  }

  async updateMany(target, entities) {
    return this._driver.updateMany(target, entities);
  }

  async upsert(target, entity) {
    return this._driver.upsert(target, entity);
  }

  /* =============================================================
   * Delete Operations
   * ============================================================= */

  async deleteOne(target, entity) {
    return this._driver.deleteOne(target, entity);
  }

  async deleteMany(target, entities) {
    return this._driver.deleteMany(target, entities);
  }

  async deleteAll(target) {
    return this._driver.deleteAll(target);
  }

  /* =============================================================
   * Advanced Operations
   * ============================================================= */

  async aggregate(target, pipelineOrCriteria) {
    return this._driver.aggregate(target, pipelineOrCriteria);
  }

  async query(rawQuery, options = {}) {
    return this._driver.query(rawQuery, options);
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  async startTransaction() {
    return this._driver.startTransaction();
  }

  async commitTransaction() {
    return this._driver.commitTransaction();
  }

  async rollbackTransaction() {
    return this._driver.rollbackTransaction();
  }
}
