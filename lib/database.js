// ./lib/database.js

import BaseDriver from "./drivers/driver-base.js";
import PostgresDriver from "./drivers/driver-postgres.js";

const DRIVER_MAP = {
  postgres: PostgresDriver,
};

/**
 * Database
 *
 * High-level database manager that wraps specific driver implementations.
 * Delegates CRUD, query, transaction, and advanced operations to the driver.
 * Supports dynamic driver methods via proxy.
 */
export default class Database extends BaseDriver {
  #driver;
  _connected = false;

  /**
   * Create a new Database instance.
   * @param {object} config - Database configuration object.
   * @param {object} config.database - Database connection settings.
   * @param {string} config.database.driver - Driver name (e.g., "postgres").
   * @throws {Error} If driver is not specified or unsupported.
   */
  constructor(config = {}) {
    super(config);

    if (!config?.database?.driver) {
      throw new Error(
        "Database config must include a 'database.driver' property"
      );
    }

    const driverKey = config.database.driver.toLowerCase();
    const DriverClass = DRIVER_MAP[driverKey];

    if (!DriverClass) {
      throw new Error(
        `Unsupported database driver '${config.database.driver}'. ` +
          `Supported drivers: ${Object.keys(DRIVER_MAP).join(", ")}`
      );
    }

    this.#driver = new DriverClass(config);
    this.#validateDriverInterface();

    // Proxy driver methods to allow dynamic calls (custom methods)
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in target) return Reflect.get(target, prop, receiver);
        if (prop in target.#driver) {
          const value = target.#driver[prop];
          return typeof value === "function"
            ? value.bind(target.#driver)
            : value;
        }
        return undefined;
      },
    });
  }

  /* =============================================================
   * Driver Access
   * ============================================================= */

  /** Expose the underlying driver instance (read-only). */
  get driver() {
    return this.#driver;
  }

  /* =============================================================
   * Internal validation
   * ============================================================= */

  /**
   * Ensure the driver implements all required BaseDriver methods.
   * Warns if any are missing, but does not block extra methods.
   * @private
   */
  #validateDriverInterface() {
    const requiredMethods = [
      "connect",
      "disconnect",
      "insertOne",
      "insertMany",
      "updateOne",
      "updateMany",
      "deleteOne",
      "deleteMany",
      "deleteAll",
      "query",
      "startTransaction",
      "commitTransaction",
      "rollbackTransaction",
    ];

    for (const method of requiredMethods) {
      if (typeof this.#driver[method] !== "function") {
        console.warn(
          `Warning: Driver '${this.#driver.constructor.name}' does not implement '${method}()'`
        );
      }
    }
  }

  /* =============================================================
   * Connection Management
   * ============================================================= */

  /**
   * Connect to the database using the underlying driver.
   * @returns {Promise<any>} Driver-specific connection result.
   */
  async connect() {
    const result = await this.#driver.connect();
    this._connected = true;
    return result;
  }

  /**
   * Disconnect from the database using the underlying driver.
   * @returns {Promise<any>} Driver-specific disconnect result.
   */
  async disconnect() {
    const result = await this.#driver.disconnect();
    this._connected = false;
    return result;
  }

  /** @returns {boolean} True if connected, false otherwise. */
  get connected() {
    return this._connected;
  }

  /* =============================================================
   * CRUD & Query Operations
   * ============================================================= */

  /** @see BaseDriver.insertOne */
  async insertOne(target, entity) {
    return this.#driver.insertOne(target, entity);
  }

  /** @see BaseDriver.insertMany */
  async insertMany(target, entities) {
    return this.#driver.insertMany(target, entities);
  }

  /** @see BaseDriver.findOne */
  async findOne(target, criteria) {
    return this.#driver.findOne(target, criteria);
  }

  /** @see BaseDriver.findMany */
  async findMany(target, criteria) {
    return this.#driver.findMany(target, criteria);
  }

  /** @see BaseDriver.findById */
  async findById(target, id) {
    return this.#driver.findById(target, id);
  }

  /** @see BaseDriver.count */
  async count(target, criteria) {
    return this.#driver.count(target, criteria);
  }

  /** @see BaseDriver.exists */
  async exists(target, criteria) {
    return this.#driver.exists(target, criteria);
  }

  /** @see BaseDriver.updateOne */
  async updateOne(target, entity) {
    return this.#driver.updateOne(target, entity);
  }

  /** @see BaseDriver.updateMany */
  async updateMany(target, entities) {
    return this.#driver.updateMany(target, entities);
  }

  /** @see BaseDriver.upsert */
  async upsert(target, entity) {
    return this.#driver.upsert(target, entity);
  }

  /** @see BaseDriver.deleteOne */
  async deleteOne(target, entity) {
    return this.#driver.deleteOne(target, entity);
  }

  /** @see BaseDriver.deleteMany */
  async deleteMany(target, entities) {
    return this.#driver.deleteMany(target, entities);
  }

  /** @see BaseDriver.deleteAll */
  async deleteAll(target) {
    return this.#driver.deleteAll(target);
  }

  /** @see BaseDriver.aggregate */
  async aggregate(target, pipelineOrCriteria) {
    return this.#driver.aggregate(target, pipelineOrCriteria);
  }

  /** @see BaseDriver.query */
  async query(rawQuery, options = {}) {
    return this.#driver.query(rawQuery, options);
  }

  /* =============================================================
   * Transaction Management
   * ============================================================= */

  /** @see BaseDriver.startTransaction */
  async startTransaction() {
    return this.#driver.startTransaction();
  }

  /** @see BaseDriver.commitTransaction */
  async commitTransaction() {
    return this.#driver.commitTransaction();
  }

  /** @see BaseDriver.rollbackTransaction */
  async rollbackTransaction() {
    return this.#driver.rollbackTransaction();
  }
}
