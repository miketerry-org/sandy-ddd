// runMigrations.js
import MigrationAdapterSQL from "./lib/migrationAdapterSQL.js";
import MigrationManager from "./lib/migrationManager.js";

// Import your auth table migration
import authMigration from "./migrations/20260215_create_auth_table.js";

// === 1. Configure your database ===
// Example: Postgres
const dbConfig = {
  client: "postgres", // or "mysql", "mariadb", "sqlite"
  host: "localhost",
  user: "your_user",
  password: "your_password",
  database: "your_db",
  port: 5432, // not required for MySQL/MariaDB/SQLite
};

// === 2. Initialize the unified SQL migration adapter ===
const adapter = new MigrationAdapterSQL(dbConfig);

// === 3. Initialize the migration manager with your migrations ===
const manager = new MigrationManager(adapter, [authMigration]);

// === 4. Run pending migrations (up) ===
async function migrateUp() {
  try {
    console.log("Starting migrations...");
    await manager.migrateUp();
    console.log("All migrations applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    if (adapter.close) await adapter.close(); // cleanup connections if needed
  }
}

// === 5. Rollback latest migration (optional) ===
async function migrateDown() {
  try {
    console.log("Rolling back latest migration...");
    await manager.migrateDown();
    console.log("Rollback complete.");
  } catch (err) {
    console.error("Rollback failed:", err);
  } finally {
    if (adapter.close) await adapter.close();
  }
}

// Execute migration (up)
migrateUp();

// To rollback, call migrateDown()
// migrateDown();
