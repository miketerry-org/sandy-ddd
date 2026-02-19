// operations.js

import { SchemaOperation, TableBuilder } from "./operation.js";

export default class Operations {
  constructor(migration) {
    this.migration = migration;
  }

  /* =============================================================
   * Create Table
   * ============================================================= */

  createTable(tableName, callback) {
    const builder = new TableBuilder(tableName);

    if (typeof callback === "function") {
      callback(builder);
    }

    const operation = builder.build();

    this.migration.up.push(operation);
    this.migration.down.unshift(
      new SchemaOperation("dropTable", { tableName })
    );

    return this;
  }

  /* =============================================================
   * Column Operations
   * ============================================================= */

  addColumn(tableName, columnDefinition) {
    this.migration.up.push(
      new SchemaOperation("addColumn", {
        tableName,
        column: columnDefinition,
      })
    );

    this.migration.down.unshift(
      new SchemaOperation("dropColumn", {
        tableName,
        columnName: columnDefinition.name,
      })
    );

    return this;
  }

  dropColumn(tableName, columnName, columnDefinition = null) {
    this.migration.up.push(
      new SchemaOperation("dropColumn", { tableName, columnName })
    );

    if (columnDefinition) {
      this.migration.down.unshift(
        new SchemaOperation("addColumn", {
          tableName,
          column: columnDefinition,
        })
      );
    }

    return this;
  }

  /* =============================================================
   * Index Operations
   * ============================================================= */

  createIndex(tableName, name, columns, { unique = false } = {}) {
    this.migration.up.push(
      new SchemaOperation("createIndex", {
        tableName,
        name,
        columns,
        unique,
      })
    );

    this.migration.down.unshift(new SchemaOperation("dropIndex", { name }));

    return this;
  }

  dropIndex(tableName, name, columns = null, options = {}) {
    this.migration.up.push(new SchemaOperation("dropIndex", { name }));

    if (columns) {
      this.migration.down.unshift(
        new SchemaOperation("createIndex", {
          tableName,
          name,
          columns,
          ...options,
        })
      );
    }

    return this;
  }
}
