// migration03.test.js:
"use strict";

import MigrationManager from "../migrationManager.js";
import Migration from "../migration.js";
import Operation from "../operation.js";

import MigrationAdapterMongoDB from "../migrationAdapterMongoDB.js";
import MigrationAdapterSQLite from "../migrationAdapterSQLite.js";
import MigrationAdapterMySQL from "../migrationAdapterMySQL.js";
import MigrationAdapterPostgres from "../migrationAdapterPostgres.js";

// Configs
const adaptersConfig = {
  mongodb: {
    adapterClass: MigrationAdapterMongoDB,
    config: "mongodb://localhost:27017/testdb",
  },
  sqlite: {
    adapterClass: MigrationAdapterSQLite,
    config: "file:testdb.sqlite?mode=memory&cache=shared",
  },
  mysql: {
    adapterClass: MigrationAdapterMySQL,
    config: {
      host: "localhost",
      user: "root",
      password: "",
      database: "testdb",
    },
  },
  postgres: {
    adapterClass: MigrationAdapterPostgres,
    config: {
      host: "localhost",
      user: "postgres",
      password: "password",
      database: "testdb",
    },
  },
};

// Full "users" migration with kitchen sink operations
const usersMigration = new Migration(
  "001_create_users_table",
  "Create users table with all features",
  [
    new Operation("users")
      .addInteger("id", { primary: true, autoInc: true }) // primary + required + unique auto set
      .addVarChar("firstname", 20, { case: "title" })
      .addVarChar("lastname", 20, { case: "title" })
      .addVarChar("email", 250, {
        required: true,
        unique: true,
        case: "lowercase",
      })
      .addVarChar("passwordHash", 32)
      .addBoolean("isActive", { required: true })
      .addDate("birthdate")
      .addNumber("balance")
      .addTime("loginTime")
      .addTimestamp("lastLogin")
      .addTimestamps() // created_at + updated_at
      .addIndex("email")
      .addIndex("lastname", "firstname desc"), // multi-column index with descending
  ],
  [
    // down operations
    new Operation("users").dropTable(),
  ]
);

// Helper functions per DB to extract schema info
async function getColumns(adapter, tableName) {
  if (adapter.constructor.name.includes("Mongo")) {
    const collection = await adapter.client.db().collection(tableName);
    const sample = await collection.findOne();
    return sample
      ? Object.keys(sample).map(k => ({ name: k, type: typeof sample[k] }))
      : [];
  }

  if (adapter.constructor.name.includes("SQLite")) {
    const res = await adapter.client.all(`PRAGMA table_info(${tableName})`);
    return res.map(c => ({
      name: c.name,
      type: c.type.toLowerCase(),
      primary: c.pk === 1,
      required: c.notnull === 1,
    }));
  }

  if (adapter.constructor.name.includes("MySQL")) {
    const [rows] = await adapter.client.query(
      `SELECT COLUMN_NAME, COLUMN_KEY, IS_NULLABLE, COLUMN_TYPE, EXTRA FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [adapter.config.database, tableName]
    );
    return rows.map(c => ({
      name: c.COLUMN_NAME,
      type: c.COLUMN_TYPE.toLowerCase(),
      primary: c.COLUMN_KEY === "PRI",
      unique: c.COLUMN_KEY === "UNI",
      required: c.IS_NULLABLE === "NO",
      autoInc: c.EXTRA.includes("auto_increment"),
    }));
  }

  if (adapter.constructor.name.includes("Postgres")) {
    const res = await adapter.client.query(
      `SELECT column_name, is_nullable, data_type, column_default
       FROM information_schema.columns
       WHERE table_name = $1`,
      [tableName]
    );
    return res.rows.map(c => ({
      name: c.column_name,
      type: c.data_type.toLowerCase(),
      required: c.is_nullable === "NO",
      autoInc: c.column_default && c.column_default.includes("nextval"),
    }));
  }
  return [];
}

async function getIndexes(adapter, tableName) {
  if (adapter.constructor.name.includes("Mongo")) {
    const collection = await adapter.client.db().collection(tableName);
    return collection.indexes();
  }
  if (adapter.constructor.name.includes("SQLite")) {
    return await adapter.client.all(`PRAGMA index_list(${tableName})`);
  }
  if (adapter.constructor.name.includes("MySQL")) {
    const [rows] = await adapter.client.query(`SHOW INDEX FROM ${tableName}`);
    return rows;
  }
  if (adapter.constructor.name.includes("Postgres")) {
    const res = await adapter.client.query(
      `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`,
      [tableName]
    );
    return res.rows;
  }
  return [];
}

describe.each(Object.entries(adaptersConfig))(
  "Kitchen sink migration test on %s",
  (dbName, { adapterClass, config }) => {
    let adapter;
    const tableName = "users";

    beforeAll(async () => {
      adapter = new adapterClass(config);
    });

    afterAll(async () => {
      if (adapter.close) await adapter.close();
    });

    test("Full schema validation including types, constraints, indexes, and rollback", async () => {
      const manager = new MigrationManager(adapter, [usersMigration]);
      await manager.migrateUp();

      const appliedMigrations = await manager.getAppliedMigrations();
      expect(appliedMigrations.has(usersMigration.id)).toBe(true);

      const columns = await getColumns(adapter, tableName);
      const colNames = columns.map(c => c.name);
      const expectedCols = [
        "id",
        "firstname",
        "lastname",
        "email",
        "passwordHash",
        "isActive",
        "birthdate",
        "balance",
        "loginTime",
        "lastLogin",
        "created_at",
        "updated_at",
      ];
      expectedCols.forEach(c => expect(colNames).toContain(c));

      // Validate primary/required/unique/autoInc
      const idCol = columns.find(c => c.name === "id");
      expect(idCol.primary || false).toBe(true);
      expect(idCol.required || false).toBe(true);
      expect(idCol.unique || false).toBe(true);
      expect(idCol.autoInc || false).toBe(true);

      // Validate timestamps
      const createdAt = columns.find(c => c.name === "created_at");
      const updatedAt = columns.find(c => c.name === "updated_at");
      expect(createdAt.required || false).toBe(true);
      expect(updatedAt.required || false).toBe(false);

      // Validate indexes (multi-column and descending)
      const indexes = await getIndexes(adapter, tableName);
      if (Array.isArray(indexes)) {
        const idxNames = indexes.map(i => i.name || i.indexname);
        expect(idxNames).toEqual(
          expect.arrayContaining(["email", "lastname_firstname_desc"])
        );
      }

      // Rollback migration
      await manager.migrateDown();
      const afterRollback = await manager.getAppliedMigrations();
      expect(afterRollback.has(usersMigration.id)).toBe(false);
    });
  }
);
