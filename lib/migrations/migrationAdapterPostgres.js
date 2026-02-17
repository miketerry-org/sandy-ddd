// ./lib/migrationAdapterPostgres.js

import MigrationAdapter from "./migrationAdapter.js";
import PostgresDriver from "./driver-postgres.js";

/**
 * MigrationAdapterPostgres
 * -------------------------------------------------------------
 * Transaction-safe, reversible migration adapter using PostgresDriver.
 */
export default class MigrationAdapterPostgres extends MigrationAdapter {
  constructor(config) {
    super();
    this.driver = new PostgresDriver(config);
    this.connected = false;
  }

  async _connect() {
    if (!this.connected) {
      await this.driver.connect();
      this.connected = true;
      await this.ensureMigrationTable();
    }
  }

  async close() {
    if (this.connected) {
      await this.driver.disconnect();
      this.connected = false;
    }
  }

  async ensureMigrationTable() {
    const op = {
      params: {
        tableName: "_migrations",
        columns: [
          { name: "id", type: "TEXT", primary: true, required: true },
          {
            name: "applied_at",
            type: "TIMESTAMP",
            required: true,
            default: "CURRENT_TIMESTAMP",
          },
        ],
        indexes: [],
      },
    };
    await this.driver.createTable(op);
  }

  async fetchAppliedIds() {
    await this._connect();
    const rows = await this.driver.execute('SELECT id FROM "_migrations"');
    return rows.map(r => r.id);
  }

  async recordAppliedMigration(id) {
    await this._connect();
    const sql =
      'INSERT INTO "_migrations" (id, applied_at) VALUES ($1, CURRENT_TIMESTAMP)';
    await this.driver.execute(sql, [id]);
  }

  async recordRolledBackMigration(id) {
    await this._connect();
    const sql = 'DELETE FROM "_migrations" WHERE id = $1';
    await this.driver.execute(sql, [id]);
  }

  /* =============================================================
   * DDL Execution
   * ============================================================= */

  async executeOperation(operation) {
    await this._connect();
    await this.driver.transaction(async () => {
      const { type } = operation;
      switch (type) {
        case "createTable":
          await this.driver.createTable(operation);
          break;
        case "dropTable":
          await this.driver.dropTable(operation);
          break;
        case "renameTable":
          await this.driver.renameTable(operation);
          break;
        case "addColumn":
          await this.driver.addColumn(operation);
          break;
        case "dropColumn":
          await this.driver.dropColumn(operation);
          break;
        case "alterColumn":
          await this.driver.alterColumn(operation);
          break;
        case "renameColumn":
          await this.driver.renameColumn(operation);
          break;
        case "createIndex":
          await this.driver.createIndex(operation);
          break;
        case "dropIndex":
          await this.driver.dropIndex(operation);
          break;
        case "createForeignKey":
          await this.driver.createForeignKey(operation);
          break;
        case "dropForeignKey":
          await this.driver.dropForeignKey(operation);
          break;
        default:
          throw new Error(`Unsupported operation type: ${type}`);
      }
    });
  }

  async revertOperation(operation) {
    await this._connect();
    await this.driver.transaction(async () => {
      const { type } = operation;
      switch (type) {
        case "createTable":
          await this.driver.dropTable(operation);
          break;
        case "dropTable":
          await this.driver.createTable(operation);
          break;
        case "addColumn":
          await this.driver.dropColumn(operation);
          break;
        case "dropColumn":
          await this.driver.addColumn(operation);
          break;
        case "createIndex":
          await this.driver.dropIndex(operation);
          break;
        case "dropIndex":
          await this.driver.createIndex(operation);
          break;
        case "renameTable":
          await this.driver.renameTable({
            params: {
              oldName: operation.params.newName,
              newName: operation.params.oldName,
            },
          });
          break;
        case "renameColumn":
          await this.driver.renameColumn({
            params: {
              tableName: operation.params.tableName,
              oldName: operation.params.newName,
              newName: operation.params.oldName,
            },
          });
          break;
        case "alterColumn":
          if (!operation.params.oldDefinition)
            throw new Error("Cannot revert alterColumn without oldDefinition");
          await this.driver.alterColumn({
            params: {
              tableName: operation.params.tableName,
              columnName: operation.params.columnName,
              definition: operation.params.oldDefinition,
            },
          });
          break;
        case "createForeignKey":
          await this.driver.dropForeignKey(operation);
          break;
        case "dropForeignKey":
          await this.driver.createForeignKey(operation);
          break;
        default:
          console.warn(`Rollback not implemented for operation type: ${type}`);
      }
    });
  }
}
