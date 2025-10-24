// domainService.js

"use strict";

/**
 * DomainService
 * ---------------------------------------------------------------------------
 * A base class for defining higher-level business logic that coordinates
 * multiple DomainModel instances. Provides convenience access to the shared
 * DAO connection and transaction management.
 */
export default class DomainService {
  /**
   * @param {DomainModel[]} models - Array of DomainModel instances.
   * @throws {Error} If no models are provided or invalid model objects are passed.
   */
  constructor(models = []) {
    if (!Array.isArray(models) || models.length === 0) {
      throw new Error(
        "DomainService requires at least one DomainModel instance."
      );
    }

    for (const model of models) {
      if (!model || typeof model.name !== "string") {
        throw new Error(
          "Each model must have a public 'name' property (string)."
        );
      }

      const propName = model.name;
      if (this[propName]) {
        throw new Error(`Duplicate model name detected: "${propName}"`);
      }

      // Attach model directly to service
      this[propName] = model;
    }

    /**
     * The DAO instance shared by this service, taken from the first model.
     * @type {DAO}
     */
    this.dao = models[0].dao;

    if (!this.dao) {
      throw new Error(
        `DomainService could not determine DAO from model "${models[0].name}".`
      );
    }
  }

  // -------------------------------------------------------------------------
  // Model Accessors
  // -------------------------------------------------------------------------

  /**
   * Returns all registered domain models on this service.
   * @returns {Record<string, DomainModel>} Map of model name → model instance.
   */
  getModels() {
    const models = {};
    for (const key of Object.keys(this)) {
      const val = this[key];
      if (
        val &&
        typeof val === "object" &&
        val.constructor?.name === "DomainModel"
      ) {
        models[key] = val;
      }
    }
    return models;
  }

  /**
   * Retrieves a model by name.
   * @param {string} name - Model name (case-sensitive).
   * @returns {DomainModel} The corresponding model instance.
   * @throws {Error} If no model with that name exists.
   */
  getModel(name) {
    const model = this[name];
    if (!model) {
      throw new Error(`No model named "${name}" found in this DomainService.`);
    }
    return model;
  }

  // -------------------------------------------------------------------------
  // DAO / Transaction Convenience
  // -------------------------------------------------------------------------

  /**
   * Begins a database transaction using the underlying DAO.
   * @returns {Promise<void>}
   */
  async startTransaction() {
    await this.dao.startTransaction();
  }

  /**
   * Commits the current database transaction.
   * @returns {Promise<void>}
   */
  async commitTransaction() {
    await this.dao.commitTransaction();
  }

  /**
   * Rolls back the current database transaction.
   * @returns {Promise<void>}
   */
  async rollbackTransaction() {
    await this.dao.rollbackTransaction();
  }

  /**
   * Executes a function within a managed transaction.
   * Automatically commits or rolls back on success/failure.
   * @param {Function} callback - Async operation to execute within a transaction.
   * @returns {Promise<*>} The return value of the callback.
   */
  async transaction(callback) {
    await this.dao.startTransaction();
    try {
      const result = await callback();
      await this.dao.commitTransaction();
      return result;
    } catch (err) {
      await this.dao.rollbackTransaction();
      throw err;
    }
  }
}
