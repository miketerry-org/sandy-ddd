// operations.js
import Operation from "./operation.js";

export default class Operations {
  constructor(migration) {
    this.migration = migration;
  }

  createTable(tableName, { columns = {}, indexes = [], options = {} } = {}) {
    this.migration.up.push(
      new Operation("createTable", {
        table: tableName,
        columns,
        indexes,
        options,
      })
    );
    this.migration.down.unshift(
      new Operation("dropTable", {
        table: tableName,
      })
    );
    return this; // <— enable chaining
  }

  addColumn(tableName, columnName, definition) {
    this.migration.up.push(
      new Operation("addColumn", {
        table: tableName,
        column: columnName,
        definition,
      })
    );
    this.migration.down.unshift(
      new Operation("dropColumn", {
        table: tableName,
        column: columnName,
      })
    );
    return this;
  }

  createIndex(tableName, columns, { unique = false, name, options = {} } = {}) {
    this.migration.up.push(
      new Operation("createIndex", {
        table: tableName,
        columns,
        unique,
        name,
        options,
      })
    );
    this.migration.down.unshift(
      new Operation("dropIndex", {
        table: tableName,
        name,
        columns,
      })
    );
    return this;
  }

  // ... define other methods (dropTable, renameTable, dropColumn, alterColumn, dropIndex, executeSql) similarly, each returning this
}
