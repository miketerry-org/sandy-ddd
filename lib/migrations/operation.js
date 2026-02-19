// ./lib/migrations/operation.js

/**
 * Named constants for column options
 */
export const REQUIRED = { required: true };
export const UNIQUE = { unique: true };
export const PRIMARY = { primary: true };
export const DEFAULT_NOW = { default: "NOW()" };

// Capitalization / normalization constants
export const NO_CHANGE = "none";
export const UPPERCASE = "upper";
export const LOWERCASE = "lower";
export const SENTENCE_CASE = "sentence";
export const TITLE_CASE = "title";
export const UNDERSCORE_SPACES = "underscore";
export const DASH_SPACES = "dash";

/**
 * Operation
 * Base class for defining database DDL operations
 */
export default class Operation {
  constructor() {
    this.params = {
      tableName: null,
      columns: [],
      indexes: [],
    };
  }

  static createTable(name) {
    const op = new Operation();
    op.params.tableName = name;
    return op;
  }

  addInteger(name, options = {}) {
    const col = { name, type: "INTEGER", ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addPrimary(name) {
    const col = {
      name,
      type: "INTEGER",
      primary: true,
      required: true,
      unique: true,
      autoIncrement: true,
    };
    this.params.columns.push(col);
    this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
      primary: true,
      unique: true,
    });
    return this;
  }

  addNumber(name, options = {}) {
    const col = { name, type: "NUMERIC", ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addBoolean(name, options = {}) {
    const col = { name, type: "BOOLEAN", ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addDate(name, options = {}) {
    const col = { name, type: "DATE", ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addTime(name, options = {}) {
    const col = { name, type: "TIME", ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addTimestamp(name, options = {}) {
    const col = { name, type: "TIMESTAMP", ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addTimestamps() {
    this.params.columns.push({
      name: "created_at",
      type: "TIMESTAMP",
      required: true,
      default: "NOW()",
    });
    this.params.columns.push({
      name: "updated_at",
      type: "TIMESTAMP",
      required: false,
      default: null,
    });
    return this;
  }

  addVarChar(name, length, options = {}) {
    const col = { name, type: "VARCHAR", length, ...options };
    if (options.primary) {
      col.required = true;
      this.addIndex(`${this.params.tableName}_${name}_pk`, [name], {
        primary: true,
        unique: true,
      });
    }
    this.params.columns.push(col);
    return this;
  }

  addString(name, length, options = {}) {
    return this.addVarChar(name, length, options);
  }

  addIndex(name, columns, options = {}) {
    const cols = columns.map(col => {
      let order = "ASC";
      let colName = col;
      if (typeof col === "string" && col.toUpperCase().endsWith(" DESC")) {
        order = "DESC";
        colName = col.slice(0, -5).trim();
      }
      return { name: colName, order };
    });
    this.params.indexes.push({ name, columns: cols, ...options });
    return this;
  }

  finalize() {
    return this;
  }
}
