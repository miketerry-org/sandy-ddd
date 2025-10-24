// migrate.js
import MigrationManager from "./migrationManager.js";
import usersMigration from "./migrations/usersMigration.js";
import MigrationAdapterMongoDB from "./migrationAdapterMongoDB.js";
import MigrationAdapterSQLite from "./migrationAdapterSQLite.js";
import MigrationAdapterMySQL from "./migrationAdapterMySQL.js";
import MigrationAdapterPostgres from "./migrationAdapterPostgres.js";

async function run() {
  // Choose your database adapter
  // const adapter = new MigrationAdapterMongoDB("mongodb://localhost:27017/mydb");
  // const adapter = new MigrationAdapterSQLite("file:mydb.sqlite");
  // const adapter = new MigrationAdapterMySQL({ host: "localhost", user: "root", password: "", database: "testdb" });
  // const adapter = new MigrationAdapterPostgres({ host: "localhost", user: "postgres", password: "", database: "testdb" });

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
