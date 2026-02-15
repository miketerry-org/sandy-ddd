// ./lib/migrations/migrationAdapterSQL.js:

import MigrationAdapter from "./migrationAdapter.js";
import knexLib from "knex";

/**
 * MigrationAdapterSQL
 * -------------------------------------------------------------
 * Cross-dialect migration adapter using Knex.
 * Supports: Postgres, MySQL, MariaDB, SQLite.
 */
export default class MigrationAdapterSQL extends MigrationAdapter {
  /**
   * @param {object} knexConfig - Knex config { client, connection, ... }
   */
  constructor(knexConfig) {
    super(knexConfig);
    this.knex = knexLib(knexConfig);
    this.clientName = this.knex.client.config.client;
  }

  /* =============================================================
   * Migration Tracking (_migrations table)
   * ============================================================= */

  async ensureMigrationTable() {
    const exists = await this.knex.schema.hasTable("_migrations");
    if (!exists) {
      await this.knex.schema.createTable("_migrations", t => {
        t.text("id").primary();
        t.timestamp("applied_at").defaultTo(this.knex.fn.now());
      });
    }
  }

  async fetchAppliedIds() {
    const rows = await this.knex("_migrations").select("id");
    return rows.map(r => r.id);
  }

  async recordAppliedMigration(id) {
    await this.knex("_migrations").insert({
      id,
      applied_at: this.knex.fn.now(),
    });
  }

  async recordRolledBackMigration(id) {
    await this.knex("_migrations").where({ id }).del();
  }

  /* =============================================================
   * Apply Operation (DDL)
   * ============================================================= */

  async executeOperation(operation) {
    if (operation.params.type !== "createTable") {
      throw new Error(`Unsupported operation type: ${operation.params.type}`);
    }

    const { tableName, columns, indexes } = operation.params;

    await this.knex.schema.createTable(tableName, table => {
      // Define columns
      for (const col of columns) {
        let colBuilder;

        switch (col.type) {
          case "INTEGER":
            colBuilder = col.primary
              ? table.increments(col.name)
              : table.integer(col.name);
            break;
          case "NUMERIC":
            colBuilder = table.decimal(col.name);
            break;
          case "BOOLEAN":
            colBuilder = table.boolean(col.name);
            break;
          case "VARCHAR":
            colBuilder = table.string(col.name, col.length);
            break;
          case "DATE":
            colBuilder = table.date(col.name);
            break;
          case "TIMESTAMP":
            colBuilder = table.timestamp(col.name);
            break;
          case "TIME":
            colBuilder = table.time(col.name);
            break;
          default:
            throw new Error(`Unsupported column type: ${col.type}`);
        }

        if (col.required && !col.primary) colBuilder.notNullable();
        if (col.unique) colBuilder.unique();
        if (col.default != null) {
          // Special case for boolean and numeric types (avoid quoting)
          const rawDefault =
            typeof col.default === "string" &&
            !["NOW()", "CURRENT_TIMESTAMP"].includes(col.default)
              ? col.default
              : this.knex.raw(col.default);
          colBuilder.defaultTo(rawDefault);
        }
      }

      // Define indexes
      for (const idx of indexes) {
        if (idx.primary) continue; // primary key handled in column

        // Postgres-only partial index
        if (this.clientName === "pg" && idx.where) {
          table.raw(
            `CREATE UNIQUE INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}" (${idx.columns
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

  /* =============================================================
   * Revert Operation
   * ============================================================= */

  async revertOperation(operation) {
    const { tableName, indexes } = operation.params;

    // Drop indexes first (ignore primary keys)
    for (const idx of indexes) {
      if (idx.primary) continue;
      await this.knex.raw(`DROP INDEX IF EXISTS "${idx.name}"`);
    }

    // Drop table
    await this.knex.schema.dropTableIfExists(tableName);
  }

  /* =============================================================
   * Close Connection
   * ============================================================= */

  async close() {
    await this.knex.destroy();
  }
}
