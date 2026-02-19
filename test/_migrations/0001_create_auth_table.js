// 0001_create_auth_tokens.js

import Operation from "../../lib/operation.js";

export default {
  id: "0001_create_auth_tokens",
  description: "Create auth_tokens table for email magic link login",
  up: [
    Operation.createTable("auth_tokens")
      .addPrimary("id")
      .addVarChar("email", 255, { required: true })
      .addVarChar("token", 512, { required: true })
      .addTimestamp("expires_at", { required: true })
      .addTimestamp("created_at", { required: true, default: "NOW()" })
      .addBoolean("used", { required: true, default: false })
      .addIndex("auth_tokens_email_idx", ["email"], { unique: false })
      .finalize()
  ],
  down: [
    Operation.createTable("auth_tokens") // dropping table for rollback
      .finalize()
  ]
};
// migrations/0001_create_auth_tokens.js

import Operation from "../lib/operation.js";

export default {
  id: "0001_create_auth_tokens",
  description: "Create auth_tokens table for email magic link login",
  up: [
    Operation.createTable("auth_tokens")
      .addPrimary("id")
      .addVarChar("email", 255, { required: true })
      .addVarChar("token", 512, { required: true })
      .addTimestamp("expires_at", { required: true })
      .addTimestamp("created_at", { required: true, default: "NOW()" })
      .addBoolean("used", { required: true, default: false })
      .addIndex("auth_tokens_email_idx", ["email"], { unique: false })
      .finalize()
  ],
  down: [
    Operation.createTable("auth_tokens") // dropping table for rollback
      .finalize()
  ]
};
