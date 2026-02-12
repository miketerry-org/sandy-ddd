// migrationManager.js

"use strict";

import Migration from "./migration.js";

export default class MigrationManager {
  /**
   * @param {MigrationAdapter} adapter
   * @param {Array<Migration>} migrations
   */
  constructor(adapter, migrations = []) {
    this.adapter = adapter;
    this.migrations = migrations
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async _init() {
    await this.adapter.ensureMigrationTable();
  }

  /**
   * Fetch the list of applied migration IDs from the database.
   * @returns {Promise<Set<string>>}
   */
  async getAppliedMigrations() {
    // adapter should provide a method to query applied migrations.
    // For now assume adapter has `fetchAppliedIds()` or similar.
    if (typeof this.adapter.fetchAppliedIds !== "function") {
      throw new Error("Adapter must implement fetchAppliedIds");
    }
    const applied = await this.adapter.fetchAppliedIds();
    return new Set(applied);
  }

  /**
   * Run all pending migrations (up).
   */
  async migrateUp() {
    await this._init();
    const appliedSet = await this.getAppliedMigrations();

    for (const migration of this.migrations) {
      if (!appliedSet.has(migration.id)) {
        console.log(
          `Applying migration ${migration.id}: ${migration.description}`
        );
        for (const op of migration.up) {
          await this.adapter.executeOperation(op);
        }
        await this.adapter.recordAppliedMigration(migration.id);
      }
    }
    console.log("Migrations complete.");
  }

  /**
   * Roll back the most recent applied migration.
   */
  async migrateDown() {
    await this._init();
    const appliedSet = await this.getAppliedMigrations();
    // Find the latest applied by ordering by id and picking last that is in appliedSet
    const appliedList = this.migrations.filter(m => appliedSet.has(m.id));
    if (appliedList.length === 0) {
      console.log("No migrations to roll back.");
      return;
    }
    const last = appliedList[appliedList.length - 1];
    console.log(`Rolling back migration ${last.id}: ${last.description}`);
    for (const op of last.down) {
      await this.adapter.revertOperation(op);
    }
    await this.adapter.recordRolledBackMigration(last.id);
    console.log("Rollback complete.");
  }

  /**
   * Show status of migrations.
   */
  async status() {
    await this._init();
    const appliedSet = await this.getAppliedMigrations();
    console.table(
      this.migrations.map(m => ({
        id: m.id,
        description: m.description,
        applied: appliedSet.has(m.id),
      }))
    );
  }
}
