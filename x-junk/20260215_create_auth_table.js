// migrations/20260215_create_auth_table.js
import Migration from "../lib/migration.js";
import Operation from "../lib/operation.js";

const migrationId = "20260215_create_auth_table";
const description = "Create auth table with all required columns and indexes";

const migration = new Migration(migrationId, description);

// Define the table using the Operation DSL
const authTable = Operation.createTable("auth")
  .addPrimary("_id") // primary auto-increment integer

  .addVarChar("uuid", 255, { required: true, unique: true })
  .addVarChar("email", 255, { required: true, unique: true })
  .addVarChar("magic_token", 255, { required: false, unique: false })
  .addTimestamp("magic_token_expires", { required: false })

  .addBoolean("is_active", { required: true, default: true })
  .addTimestamp("last_login_at", { required: false })
  .addInteger("login_count", { required: true, default: 0 })

  .addTimestamp("created_at", { required: true, default: "NOW()" })
  .addTimestamp("updated_at", { required: true, default: "NOW()" })

  // Indexes
  .addIndex("idx_auth_magic_token", [{ name: "magic_token" }])
  // Postgres-only partial unique index
  .addIndex("idx_auth_active_magic_token", [{ name: "magic_token" }], {
    unique: true,
    where: "magic_token IS NOT NULL AND is_active = true", // only used in Postgres
  })
  .finalize();

// Add to migration
migration.up.push(authTable);

// Down migration: drop the table
migration.down.push(
  Operation.createTable("auth").finalize() // In revertOperation, this will drop the table
);

export default migration;
