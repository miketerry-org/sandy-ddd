// migrate_mongodb_01.js

"use strict";

import MigrationManager from "./migrationManager.js";
import usersMigration from "usersMigration.js";
import MigrationAdapterMongoDB from "./migrationAdapterMongoDB.js";

async function run() {
  // Choose your database adapter
  const adapter = new MigrationAdapterMongoDB("mongodb://localhost:27017/mydb");
  const adapter = new MigrationAdapterPostgres({
    host: "localhost",
    user: "postgres",
    password: "password",
    database: "testdb",
  });

  const manager = new MigrationManager(adapter, [usersMigration]);

  console.log("Running migrations UP...");
  await manager.migrateUp();

  console.log("Current migration status:");
  await manager.status();

  console.log("Rolling back last migration...");
  await manager.migrateDown();

  console.log("Migration status after rollback:");
  await manager.status();

  await adapter.close();
}

run().catch(console.error);
