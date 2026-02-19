// migrationManager.js

export default class MigrationManager {
  constructor(adapter, migrations = []) {
    this.adapter = adapter;

    this.migrations = migrations
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async _init() {
    await this.adapter.ensureMigrationTable();
  }

  async getAppliedMigrations() {
    const applied = await this.adapter.fetchAppliedIds();
    return new Set(applied);
  }

  /* =============================================================
   * Apply Pending Migrations
   * ============================================================= */

  async migrateUp() {
    await this._init();
    const appliedSet = await this.getAppliedMigrations();

    for (const migration of this.migrations) {
      if (!appliedSet.has(migration.id)) {
        console.log(
          `Applying migration ${migration.id}: ${migration.description}`
        );

        await this.adapter.transaction(async () => {
          for (const op of migration.up) {
            await this.adapter.executeOperation(op);
          }

          await this.adapter.recordAppliedMigration(migration.id);
        });
      }
    }

    console.log("Migrations complete.");
  }

  /* =============================================================
   * Rollback Last Migration
   * ============================================================= */

  async migrateDown() {
    await this._init();
    const appliedSet = await this.getAppliedMigrations();

    const appliedMigrations = this.migrations.filter(m => appliedSet.has(m.id));

    if (!appliedMigrations.length) {
      console.log("No migrations to roll back.");
      return;
    }

    const last = appliedMigrations[appliedMigrations.length - 1];

    console.log(`Rolling back migration ${last.id}: ${last.description}`);

    await this.adapter.transaction(async () => {
      for (const op of last.down) {
        await this.adapter.executeOperation(op);
      }

      await this.adapter.recordRolledBackMigration(last.id);
    });

    console.log("Rollback complete.");
  }

  /* =============================================================
   * Status
   * ============================================================= */

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
