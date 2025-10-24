// domainSchema.js:

"use strict";

/**
 * DomainSchema
 *
 * A lightweight, database-agnostic schema definition system for domain models.
 * Supports relational and document database targets through adapters.
 * Provides validation, indexing, and type-safe field declarations.
 */
export default class DomainSchema {
  constructor() {
    /**
     * @private
     * @type {{ fields: Record<string, object>, indexes: Array<object> }}
     */
    this.definition = {
      fields: {},
      indexes: [],
    };
  }

  // -------------------------------------------------------------------------
  // Core Schema Definition
  // -------------------------------------------------------------------------

  /**
   * Add a field to the schema.
   * @param {string} name - The field name.
   * @param {string} type - The field type (string, number, boolean, etc.).
   * @param {object} [options={}] - Additional field metadata and constraints.
   * @returns {DomainSchema} This instance (chainable).
   */
  addField(name, type, options = {}) {
    this.definition.fields[name] = { type, ...options };
    return this;
  }

  // -------------------------------------------------------------------------
  // Type Helpers
  // -------------------------------------------------------------------------

  /**
   * Add a boolean field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false] - Whether the field is required.
   * @param {boolean} [defaultValue] - Default value.
   * @returns {DomainSchema}
   */
  addBoolean(name, required = false, defaultValue) {
    return this.addField(name, "boolean", { required, defaultValue });
  }

  /**
   * Add a date field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {Date|string|number} [minValue]
   * @param {Date|string|number} [maxValue]
   * @param {Date|string|number} [defaultValue]
   * @returns {DomainSchema}
   */
  addDate(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "date", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  /**
   * Add an email field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {string} [defaultValue]
   * @returns {DomainSchema}
   */
  addEmail(name, required = false, defaultValue) {
    return this.addField(name, "email", { required, defaultValue });
  }

  /**
   * Add an enum field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {Array<string>} [values=[]] - Allowed values.
   * @param {string} [defaultValue]
   * @returns {DomainSchema}
   */
  addEnum(name, required = false, values = [], defaultValue) {
    return this.addField(name, "enum", { required, values, defaultValue });
  }

  /**
   * Add an integer field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {number} [minValue]
   * @param {number} [maxValue]
   * @param {number} [defaultValue]
   * @returns {DomainSchema}
   */
  addInteger(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "integer", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  /**
   * Add a number (float) field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {number} [minValue]
   * @param {number} [maxValue]
   * @param {number} [defaultValue]
   * @returns {DomainSchema}
   */
  addNumber(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "number", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  /**
   * Add a password field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {object} [options={}] - Options such as minLength or hashing strategy.
   * @returns {DomainSchema}
   */
  addPassword(name, required = false, options = {}) {
    return this.addField(name, "password", { required, ...options });
  }

  /**
   * Add a string field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {number} [minLength]
   * @param {number} [maxLength]
   * @param {string} [defaultValue]
   * @returns {DomainSchema}
   */
  addString(name, required = false, minLength, maxLength, defaultValue) {
    return this.addField(name, "string", {
      required,
      minLength,
      maxLength,
      defaultValue,
    });
  }

  /**
   * Add a time field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {Date|string|number} [minValue]
   * @param {Date|string|number} [maxValue]
   * @param {Date|string|number} [defaultValue]
   * @returns {DomainSchema}
   */
  addTime(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "time", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  /**
   * Add a timestamp field.
   * @param {string} name - Field name.
   * @param {boolean} [required=false]
   * @param {Date|string|number} [minValue]
   * @param {Date|string|number} [maxValue]
   * @param {Date|string|number} [defaultValue]
   * @returns {DomainSchema}
   */
  addTimestamp(name, required = false, minValue, maxValue, defaultValue) {
    return this.addField(name, "timestamp", {
      required,
      minValue,
      maxValue,
      defaultValue,
    });
  }

  /**
   * Adds standard createdAt/updatedAt timestamp fields.
   * @returns {DomainSchema}
   */
  addTimestamps() {
    this.addTimestamp("createdAt", true);
    this.addTimestamp("updatedAt", true);
    return this;
  }

  /**
   * Add a custom field type with a user-defined handler.
   * @param {string} name - Field name.
   * @param {string} type - Custom type label.
   * @param {object} [options={}] - Arbitrary options for the custom type.
   * @param {function} [handler=null] - Optional validation or transformation function.
   * @returns {DomainSchema}
   */
  addCustom(name, type, options = {}, handler = null) {
    return this.addField(name, type, { ...options, handler });
  }

  // -------------------------------------------------------------------------
  // Indexing
  // -------------------------------------------------------------------------

  /**
   * Add an index definition.
   * @param {string|string[]} fields - Field or fields to include in the index.
   * @param {object} [options={}] - Index metadata (e.g. unique, sparse, name).
   * @returns {DomainSchema}
   */
  addIndex(fields, options = {}) {
    if (!Array.isArray(fields)) fields = [fields];
    this.definition.indexes.push({ fields, ...options });
    return this;
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validate an object against the schema definition.
   * @param {object} data - The object to validate.
   * @returns {{ valid: boolean, errors: string[], value: object }}
   * - `valid`: true if all checks passed.
   * - `errors`: list of validation error messages.
   * - `value`: validated and default-applied result.
   */
  validate(data) {
    const errors = [];
    const validated = {};

    for (const [name, rules] of Object.entries(this.definition.fields)) {
      const value = data[name];

      // Required
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${name} is required`);
        continue;
      }

      // Default value
      const finalValue =
        value !== undefined && value !== null
          ? value
          : rules.defaultValue !== undefined
          ? rules.defaultValue
          : undefined;

      if (finalValue === undefined) continue;

      // Type validation
      if (!this.#validateType(finalValue, rules.type)) {
        errors.push(`${name} must be of type ${rules.type}`);
        continue;
      }

      // Length / range checks
      if (rules.minLength && finalValue.length < rules.minLength)
        errors.push(`${name} must be at least ${rules.minLength} characters`);
      if (rules.maxLength && finalValue.length > rules.maxLength)
        errors.push(`${name} must be at most ${rules.maxLength} characters`);

      if (rules.minValue !== undefined && finalValue < rules.minValue)
        errors.push(`${name} must be >= ${rules.minValue}`);
      if (rules.maxValue !== undefined && finalValue > rules.maxValue)
        errors.push(`${name} must be <= ${rules.maxValue}`);

      // Enum
      if (rules.type === "enum" && !rules.values.includes(finalValue))
        errors.push(`${name} must be one of: ${rules.values.join(", ")}`);

      // Custom handler
      if (typeof rules.handler === "function") {
        const result = rules.handler(finalValue, data);
        if (result !== true)
          errors.push(
            typeof result === "string"
              ? result
              : `${name} failed custom validation`
          );
      }

      validated[name] = finalValue;
    }

    return {
      valid: errors.length === 0,
      errors,
      value: validated,
    };
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /**
   * Get the raw schema definition object.
   * @returns {{ fields: Record<string, object>, indexes: Array<object> }}
   */
  getSchema() {
    return this.definition;
  }

  // -------------------------------------------------------------------------
  // Internal Helpers (minimal comments)
  // -------------------------------------------------------------------------

  #validateType(value, type) {
    switch (type) {
      case "string":
      case "email":
      case "password":
      case "enum":
        return typeof value === "string";
      case "boolean":
        return typeof value === "boolean";
      case "integer":
        return Number.isInteger(value);
      case "number":
        return typeof value === "number";
      case "date":
      case "time":
      case "timestamp":
        return value instanceof Date || !isNaN(Date.parse(value));
      default:
        return true;
    }
  }
}
