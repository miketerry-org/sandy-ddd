// ./lib/migrations/migrationAdapter.js

import Operation from "./operation.js";
import Knex from "knex";

export default class MigrationAdapter {
  /**
   * @param {object} config - Knex-compatible config with { client, connection }
   */
  constructor(config) {
    this.knex = Knex(config);
  }

  /**
   * Apply a single Operation (table creation, columns, indexes)
   * @param {Operation} operation
   */
  async applyOperation(operation) {
    if (operation.params.type === "createTable") {
      await this.createTable(operation);
    } else {
      throw new Error(`Unsupported operation type: ${operation.params.type}`);
    }
  }

  /**
   * Create a table based on an Operation object
   * @param {Operation} op
   */
  async createTable(op) {
    await this.knex.schema.createTable(op.params.tableName, table => {
      // Columns
      for (const col of op.params.columns) {
        let columnBuilder;

        switch (col.type) {
          case "INTEGER":
            columnBuilder = col.primary
              ? table.increments(col.name)
              : table.integer(col.name);
            break;
          case "NUMERIC":
            columnBuilder = table.decimal(col.name);
            break;
          case "BOOLEAN":
            columnBuilder = table.boolean(col.name);
            break;
          case "VARCHAR":
            columnBuilder = table.string(col.name, col.length);
            break;
          case "DATE":
          case "TIMESTAMP":
            columnBuilder = table.timestamp(col.name);
            break;
          case "TIME":
            columnBuilder = table.time(col.name);
            break;
          default:
            throw new Error(`Unsupported column type: ${col.type}`);
        }

        if (col.required && !col.primary) columnBuilder.notNullable();
        if (col.unique) columnBuilder.unique();
        if (col.default != null) columnBuilder.defaultTo(col.default);
      }

      // Indexes
      for (const idx of op.params.indexes) {
        if (idx.primary) continue; // primary key handled in column
        if (idx.where) {
          // Partial index (Postgres only)
          table.raw(
            `CREATE UNIQUE INDEX IF NOT EXISTS "${idx.name}" ON "${op.params.tableName}" (${idx.columns
              .map(c => `"${c.name}"`)
              .join(", ")}) WHERE ${idx.where}`
          );
        } else {
          table.index(
            idx.columns.map(c => c.name),
            idx.name,
            idx.unique ? "unique" : undefined
          );
        }
      }
    });
  }

  /**
   * Drop a table
   * @param {string} tableName
   */
  async dropTable(tableName) {
    await this.knex.schema.dropTableIfExists(tableName);
  }

  /**
   * Close the underlying Knex connection
   */
  async close() {
    await this.knex.destroy();
  }
}
